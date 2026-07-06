#!/bin/bash
# Genera certificados SSL para AGROERP (nginx en Docker).
#
# Uso:
#   bash scripts/setup-ssl.sh selfsigned              # IP 20.231.96.53 (pruebas; navegador advierte)
#   bash scripts/setup-ssl.sh certbot mi-dominio.com    # Let's Encrypt (recomendado producción)
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSL_DIR="$ROOT/infra/ssl"
SERVER_IP="${SERVER_IP:-20.231.96.53}"
MODE="${1:-selfsigned}"
DOMAIN="${2:-}"

mkdir -p "$SSL_DIR"

if [[ "$MODE" == "selfsigned" ]]; then
  echo "==> Generando certificado autofirmado para IP $SERVER_IP ..."
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_DIR/privkey.pem" \
    -out "$SSL_DIR/fullchain.pem" \
    -subj "/CN=$SERVER_IP" \
    -addext "subjectAltName=IP:$SERVER_IP"
  echo "✅ Certificados en infra/ssl/"
  echo "   Los navegadores mostrarán advertencia (certificado no confiable)."
  echo "   Para producción sin avisos, use un dominio con: bash scripts/setup-ssl.sh certbot su-dominio.com"

elif [[ "$MODE" == "certbot" ]]; then
  if [[ -z "$DOMAIN" ]]; then
    echo "Indique el dominio: bash scripts/setup-ssl.sh certbot mi-dominio.com"
    exit 1
  fi
  echo "==> Instalando certbot si hace falta..."
  if ! command -v certbot &>/dev/null; then
    sudo apt-get update -y
    sudo apt-get install -y certbot
  fi
  echo "==> Obteniendo certificado Let's Encrypt para $DOMAIN ..."
  echo "    Asegúrese de que el puerto 80 esté libre (pare el contenedor frontend si corre)."
  sudo certbot certonly --standalone -d "$DOMAIN" --agree-tos -m "admin@$DOMAIN" --non-interactive || {
    echo "Si falla, ejecute interactivo: sudo certbot certonly --standalone -d $DOMAIN"
    exit 1
  }
  sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/fullchain.pem"
  sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/privkey.pem"
  sudo chown "$(whoami):$(whoami)" "$SSL_DIR"/*.pem
  echo "✅ Certificados copiados a infra/ssl/"
  echo "   Actualice .env: PUBLIC_URL=https://$DOMAIN  FRONTEND_URL=https://$DOMAIN  CORS_ORIGIN=https://$DOMAIN"
else
  echo "Modo desconocido: $MODE"
  exit 1
fi

chmod 600 "$SSL_DIR/privkey.pem"
