# infra/

Implantação do backend do Aprova.AI na Oracle Cloud (Always Free) com Docker Compose. Esta pasta contém **só configuração e scripts**: nenhuma regra de negócio e nenhum segredo (o repositório é público). O guia completo é `docs/IMPLEMENTACAO-DEVOPS.md`; o estado atual e os desvios dele estão no §21.

| Caminho | Conteúdo |
| --- | --- |
| `compose.yml` | Produção: Caddy, API, Worker, relay, migrate, PostgreSQL, Redis, Alloy e exportadores |
| `compose.dev.yml` | Desenvolvimento local: PostgreSQL e Redis em `127.0.0.1` |
| `Caddyfile` | HTTPS automático e proxy reverso da API; `/metrics` nunca sai pelo proxy |
| `env/` | Modelos (`*.env.example`) dos arquivos de `/opt/aprova/secrets`, só com nomes |
| `observability/` | `config.alloy`, `alerts.yml` (regras de alerta) e `dashboard-operacao.json` |
| `scripts/` | `bootstrap-host.sh`, `deploy.sh`, `backup.sh`, `restore-drill.sh`, `create-monitor-role.sh` |
| `systemd/` | Temporizadores de deploy (2 min) e de backup (03:30, horário de Brasília) |

O `Dockerfile` do backend fica em `backend/Dockerfile`; os fluxos de CI/CD em `.github/workflows/`; `eas.json` na raiz.

## Primeira implantação

1. Provisione a VM A1 e a rede (guia §4) e instale a chave SSH da equipe.
2. Na VM, como root: `sudo OPS_USER=ubuntu ./infra/scripts/bootstrap-host.sh` (baixe o script ou clone o repositório; ele clona em `/opt/aprova/repo`). Repete sem erro.
3. Crie os segredos em `/opt/aprova/secrets` (dono `deploy`, diretório modo 700) a partir de `infra/env/*.example`. Senhas dentro de URLs: `openssl rand -hex 32`; `JWT_SECRET`: `openssl rand -base64 48`. Arquivos `.env`: modo 600. `postgres_password`, `redis_password` e `postgres_monitor_password`: modo 644 dentro do diretório 700 (a imagem do PostgreSQL lê o arquivo como usuário não root). `age_recipient.txt`: chave pública gerada pela equipe com `age-keygen`; a privada nunca fica na VM.
4. Aponte o registro A `api` do domínio para o IP da VM e confirme com `dig +short api.<seu-domínio>`. Para depurar a emissão do certificado, ative `ACME_CA` em `caddy.env`.
5. Rode o `bootstrap-host.sh` de novo (liga os temporizadores quando os segredos existem) e, como `deploy`, `cd /opt/aprova/repo/infra && docker compose up -d` (a etiqueta `production` precisa existir: faça antes a primeira promoção). Depois, uma vez: `./scripts/create-monitor-role.sh`.
6. Confirme: `curl -fsS https://api.<seu-domínio>/readyz`; `docker compose exec redis sh -c 'redis-cli -a "$(cat /run/secrets/redis_password)" config get appendonly'` e `config get maxmemory-policy` (`yes` e `noeviction`).

## Operação

- **Deploy:** promova um commit pelo fluxo `promote-production` (exige aprovação do ambiente `production`). A VM busca a imagem a cada 2 minutos.
- **Rollback:** rode a promoção com o SHA anterior. Emergência na VM: grave `IMAGE_TAG=<sha>` em `infra/.env` e rode `docker compose up -d`; apague a linha depois.
- **Atualizar `infra/` na VM:** `git -C /opt/aprova/repo pull --ff-only`, revise e rode `docker compose up -d`. Imagens de terceiros (Caddy, PostgreSQL, Redis) são atualizadas na janela mensal com `docker compose pull`.
- **Backup:** automático às 03:30; cópia fora da VM com `BACKUP_RCLONE_REMOTE` em `backup.env`. Simulado mensal: `./scripts/restore-drill.sh --key <chave-privada-age>` a partir de uma máquina que tenha a chave.
- **Alertas:** carregue `observability/alerts.yml` no Grafana Cloud e importe `dashboard-operacao.json`. Runbooks: guia §18.

Nada aqui foi executado em uma VM real; as verificações feitas estão no §21.1 do guia.
