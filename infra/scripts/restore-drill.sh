#!/usr/bin/env bash
# Simulado de restauração (docs/IMPLEMENTACAO-DEVOPS.md, §14.3): restaura o último backup num contêiner
# descartável, sem rede, verifica os esquemas e as contagens e registra a duração (compara com o RTO de 2 h).
# Rodar todo mês. A chave privada do age fica fora da VM; quem executa informa o arquivo com --key.
#
# Uso: ./restore-drill.sh --key /caminho/age-key.txt [--file /opt/aprova/backups/daily/<arquivo>.age]
# Variável opcional DRILL_SANITY_SQL: consulta que deve devolver um único valor booleano (t) após a restauração.
set -euo pipefail

cd "$(dirname "$(readlink -f "$0")")/.."

BACKUP_DIR="${BACKUP_DIR:-/opt/aprova/backups}"
DRILL_LOG="${DRILL_LOG:-$BACKUP_DIR/drill.log}"
RTO_SECONDS=7200
KEY_FILE=""
BACKUP_FILE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --key) KEY_FILE="${2:?--key exige um caminho}"; shift 2 ;;
    --file) BACKUP_FILE="${2:?--file exige um caminho}"; shift 2 ;;
    *) echo "argumento desconhecido: $1" >&2; exit 2 ;;
  esac
done
[ -r "$KEY_FILE" ] || { echo "erro: informe a chave privada do age com --key <arquivo>" >&2; exit 2; }
if [ -z "$BACKUP_FILE" ]; then
  BACKUP_FILE="$(find "$BACKUP_DIR/daily" -maxdepth 1 -name '*.age' -printf '%T@ %p\n' | sort -rn | head -n 1 | cut -d' ' -f2-)"
fi
[ -r "$BACKUP_FILE" ] || { echo "erro: nenhum backup legível encontrado" >&2; exit 2; }

# Mesma imagem do PostgreSQL de produção, para o formato do dump ser compatível.
image="$(docker compose config --images | grep -E '(^|/)postgres:' | head -n 1)"
name="aprova-restore-drill-$$"
started=$SECONDS
result="failed"

cleanup() {
  docker rm -f "$name" >/dev/null 2>&1 || true
  printf '%s backup=%s duration_s=%s result=%s\n' "$(date -u +%FT%TZ)" "$(basename "$BACKUP_FILE")" "$((SECONDS - started))" "$result" >> "$DRILL_LOG"
}
trap cleanup EXIT

echo "Restaurando $(basename "$BACKUP_FILE") em $image (sem rede, descartável)"
# Senha de um contêiner sem rede e descartável; não é segredo.
docker run -d --rm --name "$name" --network none -e POSTGRES_PASSWORD=drill-only -e POSTGRES_DB=drill "$image" >/dev/null
for _ in $(seq 1 60); do
  docker exec "$name" pg_isready -U postgres -d drill >/dev/null 2>&1 && break
  sleep 2
done
docker exec "$name" pg_isready -U postgres -d drill >/dev/null

# Sem --no-owner o pg_restore exigiria os papéis do cluster de produção, que o dump não carrega.
age -d -i "$KEY_FILE" "$BACKUP_FILE" \
  | docker exec -i "$name" pg_restore -U postgres -d drill --no-owner --no-privileges --exit-on-error

psql_drill() { docker exec -i "$name" psql -U postgres -d drill -X -q -v ON_ERROR_STOP=1 "$@"; }

echo "Esquemas e tabelas restaurados:"
tables="$(psql_drill -At -c "SELECT count(*) FROM information_schema.tables WHERE table_schema IN ('write','read') AND table_type = 'BASE TABLE'")"
schemas="$(psql_drill -At -c "SELECT count(*) FROM information_schema.schemata WHERE schema_name IN ('write','read')")"
echo "  esquemas write/read presentes: $schemas de 2; tabelas: $tables"
[ "$schemas" -eq 2 ] || { echo "erro: esquemas write e read não foram restaurados" >&2; exit 1; }
[ "$tables" -ge 1 ] || { echo "erro: nenhuma tabela restaurada" >&2; exit 1; }

echo "Contagem de linhas por tabela:"
psql_drill -At -F ' = ' <<'SQL'
SELECT format('SELECT %L, count(*) FROM %I.%I', table_schema || '.' || table_name, table_schema, table_name)
FROM information_schema.tables
WHERE table_schema IN ('write','read') AND table_type = 'BASE TABLE'
ORDER BY 1
\gexec
SQL

if [ -n "${DRILL_SANITY_SQL:-}" ]; then
  [ "$(psql_drill -At -c "$DRILL_SANITY_SQL")" = "t" ] || { echo "erro: a consulta de sanidade não devolveu t" >&2; exit 1; }
  echo "Consulta de sanidade: ok"
fi

result="ok"
duration=$((SECONDS - started))
echo "Simulado concluído em ${duration} s (RTO de referência: ${RTO_SECONDS} s)."
[ "$duration" -le "$RTO_SECONDS" ] || echo "aviso: a duração excedeu o RTO de referência." >&2
