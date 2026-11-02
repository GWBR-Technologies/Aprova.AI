#!/usr/bin/env bash
# Prepara e endurece a VM Ubuntu LTS (ARM64) da Oracle Cloud. Idempotente: pode rodar de novo sem erro.
# Procedimento descrito em docs/IMPLEMENTACAO-DEVOPS.md, §5 (runbook R6 recria a VM com este script).
#
# Uso (como root, a partir de um clone do repositório ou do arquivo baixado):
#   sudo OPS_USER=ubuntu ./bootstrap-host.sh
#
# Variáveis opcionais: OPS_USER (usuário de operação, padrão ubuntu), DEPLOY_USER (padrão deploy),
# REPO_URL e REPO_BRANCH (de onde clonar infra/), SWAP_SIZE (padrão 2G).
set -euo pipefail

OPS_USER="${OPS_USER:-ubuntu}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
REPO_URL="${REPO_URL:-https://github.com/GWBR-Technologies/Aprova.AI.git}"
REPO_BRANCH="${REPO_BRANCH:-master}"
SWAP_SIZE="${SWAP_SIZE:-2G}"
APP_DIR=/opt/aprova
# Impressão digital oficial da chave do repositório APT do Docker.
DOCKER_GPG_FINGERPRINT="9DC858229FC7DD38854AE2D88D81803C0EBFCD88"

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'erro: %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "execute como root (sudo)."
# shellcheck source=/dev/null
[ -r /etc/os-release ] && . /etc/os-release
[ "${ID:-}" = "ubuntu" ] || die "script feito para Ubuntu; sistema detectado: ${ID:-desconhecido}."
id "$OPS_USER" >/dev/null 2>&1 || die "o usuário de operação '$OPS_USER' não existe (na Oracle, o padrão é 'ubuntu')."
# Evita travar a própria VM: a senha e o root por SSH só são desligados se houver chave autorizada.
[ -s "/home/$OPS_USER/.ssh/authorized_keys" ] || die "/home/$OPS_USER/.ssh/authorized_keys está vazio; instale a chave SSH da equipe antes."

export DEBIAN_FRONTEND=noninteractive

log "Pacotes base"
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg git openssl age rclone fail2ban unattended-upgrades chrony iptables-persistent >/dev/null

log "Usuário de operação com sudo e usuário de deploy sem sudo"
usermod -aG sudo "$OPS_USER"
id "$DEPLOY_USER" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$DEPLOY_USER"

log "SSH: somente chaves, sem root"
# O sshd usa o primeiro valor lido; 00- vem antes do 50-cloud-init.conf, que costuma reativar senha.
cat > /etc/ssh/sshd_config.d/00-aprova-hardening.conf <<EOF
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
AllowUsers $OPS_USER
EOF
sshd -t
systemctl reload ssh

log "Firewall do host: 80 e 443 (a regra da porta 22 por IP fica na rede da Oracle, §4.2)"
# As imagens Ubuntu da Oracle trazem um REJECT final em INPUT. As regras entram antes dele, ao vivo e
# direto em rules.v4 (netfilter-persistent save gravaria também as cadeias do Docker).
ensure_rule() { # protocolo porta
  local proto="$1" port="$2"
  if ! iptables -C INPUT -p "$proto" -m "$proto" --dport "$port" -j ACCEPT 2>/dev/null; then
    local pos
    pos="$(iptables -L INPUT -n --line-numbers | awk '/REJECT/ {print $1; exit}')"
    if [ -n "$pos" ]; then iptables -I INPUT "$pos" -p "$proto" -m "$proto" --dport "$port" -j ACCEPT
    else iptables -A INPUT -p "$proto" -m "$proto" --dport "$port" -j ACCEPT; fi
  fi
  if [ -f /etc/iptables/rules.v4 ] && ! grep -q -- "-p $proto -m $proto --dport $port -j ACCEPT" /etc/iptables/rules.v4; then
    awk -v rule="-A INPUT -p $proto -m $proto --dport $port -j ACCEPT" \
      '!done && /^-A INPUT .*-j REJECT/ {print rule; done=1} {print}' /etc/iptables/rules.v4 > /etc/iptables/rules.v4.new
    mv /etc/iptables/rules.v4.new /etc/iptables/rules.v4
  fi
}
ensure_rule tcp 80
ensure_rule tcp 443
ensure_rule udp 443

log "Atualizações automáticas de segurança (atualizações maiores ficam para a janela mensal)"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

log "fail2ban para SSH"
cat > /etc/fail2ban/jail.d/aprova.local <<'EOF'
[sshd]
enabled = true
EOF
systemctl enable --now fail2ban >/dev/null
systemctl restart fail2ban

log "Relógio sincronizado e em UTC (tokens e cota dependem da hora)"
timedatectl set-timezone UTC
systemctl enable --now chrony >/dev/null
timedatectl set-ntp true

log "Swap de $SWAP_SIZE como rede de segurança"
if ! swapon --show=NAME --noheadings | grep -q '^/swapfile$'; then
  [ -e /swapfile ] || { fallocate -l "$SWAP_SIZE" /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null; }
  swapon /swapfile
fi
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab

log "Ajustes recomendados pelo Redis: overcommit e página enorme transparente desabilitada"
cat > /etc/sysctl.d/99-aprova.conf <<'EOF'
vm.overcommit_memory = 1
vm.swappiness = 10
EOF
sysctl --system >/dev/null
cat > /etc/systemd/system/aprova-disable-thp.service <<'EOF'
[Unit]
Description=Desabilita a página enorme transparente (recomendação do Redis)
After=sysinit.target local-fs.target

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'echo never > /sys/kernel/mm/transparent_hugepage/enabled'

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now aprova-disable-thp.service >/dev/null

log "Docker do repositório oficial"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
gpg --show-keys --with-colons /etc/apt/keyrings/docker.asc | awk -F: '/^fpr:/ {print $10}' | grep -qx "$DOCKER_GPG_FINGERPRINT" \
  || die "a chave do repositório do Docker não confere com a impressão digital esperada."
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null

DAEMON_JSON=$(mktemp)
cat > "$DAEMON_JSON" <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "5", "labels": "com.docker.compose.service" },
  "live-restore": true
}
EOF
if ! cmp -s "$DAEMON_JSON" /etc/docker/daemon.json; then
  install -m 0644 "$DAEMON_JSON" /etc/docker/daemon.json
  systemctl restart docker
fi
rm -f "$DAEMON_JSON"
systemctl enable --now docker >/dev/null
# Quem está no grupo docker tem poder equivalente a root; por isso só o usuário de deploy entra nele.
usermod -aG docker "$DEPLOY_USER"

log "Diretórios de $APP_DIR"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0755 "$APP_DIR"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0700 "$APP_DIR/secrets"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0750 "$APP_DIR/backups"
if [ ! -d "$APP_DIR/repo/.git" ]; then
  sudo -u "$DEPLOY_USER" git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_URL" "$APP_DIR/repo"
fi

log "Unidades do systemd"
install -m 0644 "$APP_DIR"/repo/infra/systemd/*.service "$APP_DIR"/repo/infra/systemd/*.timer /etc/systemd/system/
systemctl daemon-reload
# Os temporizadores só são ligados com os segredos no lugar; antes disso falhariam a cada execução.
missing=0
for f in common.env api.env worker.env relay.env migrate.env caddy.env alloy.env postgres_password redis_password postgres_monitor_password; do
  [ -f "$APP_DIR/secrets/$f" ] || { echo "ausente: $APP_DIR/secrets/$f"; missing=1; }
done
if [ "$missing" -eq 0 ]; then
  systemctl enable --now aprova-deploy.timer aprova-backup.timer
else
  echo "Temporizadores não ligados: crie os segredos (infra/env/*.example) e rode este script de novo."
fi

log "Concluído"
echo "Confira:"
echo "  sudo iptables -L INPUT -n --line-numbers"
echo "  sudo sshd -T | grep -E 'passwordauthentication|permitrootlogin'"
echo "  docker compose version"
