#!/usr/bin/env bash
# Backup diário do PostgreSQL: pg_dump -Fc de todo o banco, criptografado com age (docs/IMPLEMENTACAO-DEVOPS.md, §14.1).
# A chave pública do age fica na VM; a privada fica fora dela, com a equipe.
# Retenção local: 7 diários, 4 semanais (domingo) e 3 mensais (dia 1), no fuso de Brasília.
# Cópia fora da VM: opcional via rclone (BACKUP_RCLONE_REMOTE); uma cópia só na VM não é backup.
# Escreve métricas em $BACKUP_DIR/metrics/aprova_backup.prom para o node-exporter (alerta "backup velho").
set -euo pipefail

cd "$(dirname "$(readlink -f "$0")")/.."

BACKUP_DIR="${BACKUP_DIR:-/opt/aprova/backups}"
AGE_RECIPIENT_FILE="${AGE_RECIPIENT_FILE:-/opt/aprova/secrets/age_recipient.txt}"
# Exemplo: oci:aprova-backups (remoto configurado com `rclone config` pelo usuário de deploy, fora do repositório).
BACKUP_RCLONE_REMOTE="${BACKUP_RCLONE_REMOTE:-}"
KEEP_DAILY=7
KEEP_WEEKLY=4
KEEP_MONTHLY=3

METRICS_FILE="$BACKUP_DIR/metrics/aprova_backup.prom"
mkdir -p "$BACKUP_DIR"/{daily,weekly,monthly,metrics}

[ -s "$AGE_RECIPIENT_FILE" ] || { echo "erro: chave pública do age ausente em $AGE_RECIPIENT_FILE" >&2; exit 1; }

exec 9>"$BACKUP_DIR/.backup.lock"
flock -n 9 || { echo "backup anterior em execução; nada a fazer."; exit 0; }

prune() { # diretório quantidade
  find "$1" -maxdepth 1 -name '*.age' -printf '%T@ %p\n' | sort -rn | tail -n +$(($2 + 1)) | cut -d' ' -f2- | xargs -r rm --
}

previous_metric() { # nome da métrica; devolve 0 se ainda não existe
  grep -s "^$1 " "$METRICS_FILE" | awk '{print $2}' | head -n 1 | grep . || echo 0
}

started=$SECONDS
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$BACKUP_DIR/daily/aprovaai-$stamp.dump.age"

# Grava em arquivo parcial: um backup interrompido nunca ocupa o lugar de um bom.
trap 'rm -f -- "$target.partial"' EXIT
docker compose exec -T postgres pg_dump -U aprova_admin -d aprovaai -Fc \
  | age -R "$AGE_RECIPIENT_FILE" -o "$target.partial"
[ -s "$target.partial" ] || { echo "erro: backup vazio" >&2; exit 1; }
mv -- "$target.partial" "$target"
chmod 0640 "$target"

if [ "$(TZ=America/Sao_Paulo date +%u)" -eq 7 ]; then cp -- "$target" "$BACKUP_DIR/weekly/"; fi
if [ "$(TZ=America/Sao_Paulo date +%d)" = "01" ]; then cp -- "$target" "$BACKUP_DIR/monthly/"; fi
prune "$BACKUP_DIR/daily" "$KEEP_DAILY"
prune "$BACKUP_DIR/weekly" "$KEEP_WEEKLY"
prune "$BACKUP_DIR/monthly" "$KEEP_MONTHLY"

now="$(date +%s)"
offsite_enabled=0
offsite_ok=0
offsite_last="$(previous_metric aprova_backup_offsite_last_success_timestamp_seconds)"
if [ -n "$BACKUP_RCLONE_REMOTE" ]; then
  offsite_enabled=1
  if rclone copy "$target" "$BACKUP_RCLONE_REMOTE/daily/"; then
    offsite_ok=1
    offsite_last="$now"
  else
    echo "aviso: a cópia fora da VM falhou; o backup local foi gravado." >&2
  fi
else
  echo "aviso: BACKUP_RCLONE_REMOTE não definido; sem cópia fora da VM." >&2
fi

metrics_tmp="$(mktemp "$BACKUP_DIR/metrics/.aprova_backup.XXXXXX")"
cat > "$metrics_tmp" <<EOF
# TYPE aprova_backup_last_success_timestamp_seconds gauge
aprova_backup_last_success_timestamp_seconds $now
# TYPE aprova_backup_last_size_bytes gauge
aprova_backup_last_size_bytes $(stat -c %s "$target")
# TYPE aprova_backup_last_duration_seconds gauge
aprova_backup_last_duration_seconds $((SECONDS - started))
# TYPE aprova_backup_offsite_enabled gauge
aprova_backup_offsite_enabled $offsite_enabled
# TYPE aprova_backup_offsite_last_run_ok gauge
aprova_backup_offsite_last_run_ok $offsite_ok
# TYPE aprova_backup_offsite_last_success_timestamp_seconds gauge
aprova_backup_offsite_last_success_timestamp_seconds $offsite_last
EOF
chmod 0644 "$metrics_tmp"
mv -- "$metrics_tmp" "$METRICS_FILE"

echo "backup concluído: $target ($(stat -c %s "$target") bytes, $((SECONDS - started)) s)"
