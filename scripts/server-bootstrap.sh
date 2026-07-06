#!/bin/bash
# Bootstrap inicial en Ubuntu 24.04 (servidor virgen)
# Ejecutar como usuario con sudo: bash scripts/server-bootstrap.sh

set -euo pipefail

echo "==> Actualizando sistema..."
sudo apt-get update -y
sudo apt-get upgrade -y

echo "==> Instalando dependencias base..."
sudo apt-get install -y ca-certificates curl git ufw

echo "==> Instalando Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  echo "   Reinicie sesión SSH después de este script para usar docker sin sudo."
fi

echo "==> Configurando firewall (UFW)..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp comment 'AGROERP Web'
sudo ufw allow 3080/tcp comment 'AGROERP API (móvil)'
# sudo ufw allow 443/tcp comment 'HTTPS (cuando configure SSL)'
sudo ufw --force enable
sudo ufw status

echo ""
echo "Listo. Siguiente:"
echo "  1. git clone <tu-repo> agroerp && cd agroerp"
echo "  2. cp infra/env.production.example .env  # edite contraseñas y JWT"
echo "  3. docker compose -f infra/docker-compose.prod.yml up -d --build"
echo "  4. curl http://20.231.96.53:3080/api/v1/health"
echo "  5. Abra http://20.231.96.53/ en el navegador"
