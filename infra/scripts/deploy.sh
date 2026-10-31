#!/usr/bin/env bash
# Entrega por consulta (pull): executado pelo aprova-deploy.timer a cada 2 minutos na VM.
# O CI nunca se conecta à VM; a VM busca no registro a imagem que a etiqueta "production" aponta.
# Ver docs/IMPLEMENTACAO-DEVOPS.md, §11.3. O Compose só recria os contêineres cuja imagem mudou.
#
# Rollback de emergência: grave IMAGE_TAG=<sha> em infra/.env (ignorado pelo Git) e rode
# `docker compose up -d`. A etiqueta fixada vale para este script também; remova a linha para
# voltar a seguir "production".
set -euo pipefail

cd "$(dirname "$(readlink -f "$0")")/.."

LOG_FILE="${DEPLOY_LOG:-/opt/aprova/deploy.log}"
HEALTH_TIMEOUT_S="${HEALTH_TIMEOUT_S:-150}"

# Uma execução por vez: se a anterior (ex.: migração longa) ainda roda, esta sai sem erro.
exec 9>"${DEPLOY_LOCK:-/opt/aprova/deploy.lock}"
flock -n 9 || { echo "deploy anterior em execução; nada a fazer."; exit 0; }

app_image_id() {
  local ref
  ref="$(docker compose config --images | grep 'aprovaai-backend' | head -n 1)"
  docker image inspect --format '{{.Id}}' "$ref" 2>/dev/null || true
}

record() { printf '%s tag=%s image=%s result=%s\n' "$(date -u +%FT%TZ)" "${IMAGE_TAG:-production}" "$1" "$2" >> "$LOG_FILE"; }

before="$(app_image_id)"
# Só as imagens do próprio app são buscadas aqui; Caddy, PostgreSQL e Redis ficam fixados e
# são atualizados à mão na janela de manutenção (docker compose pull).
docker compose pull --quiet api worker relay migrate
after="$(app_image_id)"

# Subir é necessário quando a imagem mudou ou quando algum serviço de longa duração não está rodando.
# Sem essa checagem o serviço migrate (uma execução e saída) rodaria de novo a cada 2 minutos.
need_up=0
[ "$before" != "$after" ] && need_up=1
running="$(docker compose ps --services --status running)"
for service in caddy api worker relay postgres redis; do
  grep -qx "$service" <<<"$running" || need_up=1
done
[ "$need_up" -eq 1 ] || exit 0

docker compose up -d --remove-orphans
docker image prune -f >/dev/null

# O healthcheck do Compose consulta /readyz; o resultado fica registrado e, se falhar, o systemd marca a unidade.
api_container="$(docker compose ps -q api)"
deadline=$((SECONDS + HEALTH_TIMEOUT_S))
status="starting"
while [ "$SECONDS" -lt "$deadline" ]; do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$api_container" 2>/dev/null || echo missing)"
  [ "$status" = "healthy" ] && break
  sleep 5
done

if [ "$status" = "healthy" ]; then
  record "${after:-desconhecida}" healthy
  echo "deploy concluído: api healthy."
else
  record "${after:-desconhecida}" "unhealthy(${status})"
  echo "api não ficou saudável em ${HEALTH_TIMEOUT_S}s (estado: ${status}); veja: docker compose logs api" >&2
  exit 1
fi
