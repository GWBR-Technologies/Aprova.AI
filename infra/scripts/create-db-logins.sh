#!/usr/bin/env bash
# Cria os logins de banco da API, do relay e do Worker (ou atualiza a senha deles) a partir da DATABASE_URL de cada
# arquivo de ambiente, e os coloca nos papéis de grupo criados pela migração 0001 do Back-End:
#   api.env e relay.env -> aprova_api     worker.env -> aprova_worker
# Rodar depois do primeiro `docker compose up` (a migração cria os grupos) e quando uma senha for trocada.
# A senha fica só no arquivo de ambiente (fonte única), trafega por stdin e precisa ser hexadecimal
# (openssl rand -hex 32). O papel dono dos esquemas, aprova_admin, continua sendo o do migrate.
set -euo pipefail

cd "$(dirname "$(readlink -f "$0")")/.."

SECRETS_DIR="${SECRETS_DIR:-/opt/aprova/secrets}"

create_login() { # arquivo grupo
  local file="$SECRETS_DIR/$1" group="$2" url user password
  url="$(grep -E '^DATABASE_URL=' "$file" | head -n 1 | cut -d= -f2-)"
  [[ "$url" =~ ^postgres(ql)?://([a-z_][a-z0-9_]*):([0-9a-fA-F]+)@ ]] \
    || { echo "erro: $1 precisa de DATABASE_URL=postgres://<login>:<senha hexadecimal>@..." >&2; exit 1; }
  user="${BASH_REMATCH[2]}"
  password="${BASH_REMATCH[3]}"
  [ "$user" != "aprova_admin" ] || { echo "erro: $1 não pode usar o papel aprova_admin (reservado ao migrate)" >&2; exit 1; }
  {
    printf "\\\\set login '%s'\n\\\\set pw '%s'\n\\\\set grp '%s'\n" "$user" "$password" "$group"
    cat <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'login', :'pw')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'login') \gexec
SELECT format('ALTER ROLE %I PASSWORD %L', :'login', :'pw') \gexec
SELECT format('GRANT %I TO %I', :'grp', :'login') \gexec
SQL
  } | docker compose exec -T postgres psql -U aprova_admin -d aprovaai -X -q -v ON_ERROR_STOP=1
  echo "login $user pronto (grupo $group)."
}

for group in aprova_api aprova_worker; do
  docker compose exec -T postgres psql -U aprova_admin -d aprovaai -At -c "SELECT 1 FROM pg_roles WHERE rolname = '$group'" | grep -q 1 \
    || { echo "erro: o papel $group não existe; rode a migração antes (docker compose up -d migrate)" >&2; exit 1; }
done

create_login api.env aprova_api
create_login relay.env aprova_api
create_login worker.env aprova_worker
