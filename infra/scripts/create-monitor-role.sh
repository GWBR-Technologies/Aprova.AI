#!/usr/bin/env bash
# Cria o papel aprova_monitor (ou atualiza a senha dele), de leitura de estatísticas (pg_monitor), usado só pelo
# postgres-exporter. Rodar uma vez depois do primeiro `docker compose up` e quando a senha for trocada.
# A senha vem de /opt/aprova/secrets/postgres_monitor_password (gerar com `openssl rand -hex 32`) e
# trafega por stdin, para não aparecer na lista de processos.
set -euo pipefail

cd "$(dirname "$(readlink -f "$0")")/.."

SECRET_FILE="${MONITOR_PASSWORD_FILE:-/opt/aprova/secrets/postgres_monitor_password}"
[ -s "$SECRET_FILE" ] || { echo "erro: $SECRET_FILE ausente ou vazio" >&2; exit 1; }
password="$(tr -d '\n' < "$SECRET_FILE")"
[[ "$password" =~ ^[0-9a-fA-F]+$ ]] || { echo "erro: use uma senha hexadecimal (openssl rand -hex 32)" >&2; exit 1; }

{
  printf "\\\\set pw '%s'\n" "$password"
  cat <<'SQL'
SELECT format('CREATE ROLE aprova_monitor LOGIN PASSWORD %L', :'pw')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aprova_monitor') \gexec
SELECT format('ALTER ROLE aprova_monitor PASSWORD %L', :'pw') \gexec
GRANT pg_monitor TO aprova_monitor;
SQL
} | docker compose exec -T postgres psql -U aprova_admin -d aprovaai -X -q -v ON_ERROR_STOP=1

echo "papel aprova_monitor pronto."
