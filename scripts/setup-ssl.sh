#!/bin/bash
# Genera certificados SSL para AGROERP (nginx en Docker).
#
# Uso:
#   bash scripts/setup-ssl.sh selfsigned              # IP 20.231.96.53 + CA interna
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
  echo "==> Generando CA interna y certificado de servidor para IP $SERVER_IP ..."
  openssl genrsa -out "$SSL_DIR/agroerp-ca.key" 4096 2>/dev/null
  openssl req -x509 -new -nodes \
    -key "$SSL_DIR/agroerp-ca.key" \
    -sha256 -days 3650 \
    -out "$SSL_DIR/agroerp-ca.pem" \
    -subj "/CN=AGROERP Internal CA/O=AGROERP"

  openssl genrsa -out "$SSL_DIR/privkey.pem" 2048 2>/dev/null
  openssl req -new \
    -key "$SSL_DIR/privkey.pem" \
    -out "$SSL_DIR/server.csr" \
    -subj "/CN=$SERVER_IP" \
    -addext "subjectAltName=IP:$SERVER_IP"

  openssl x509 -req \
    -in "$SSL_DIR/server.csr" \
    -CA "$SSL_DIR/agroerp-ca.pem" \
    -CAkey "$SSL_DIR/agroerp-ca.key" \
    -CAcreateserial \
    -out "$SSL_DIR/server.pem" \
    -days 365 -sha256 \
    -copy_extensions copy

  cat "$SSL_DIR/server.pem" "$SSL_DIR/agroerp-ca.pem" > "$SSL_DIR/fullchain.pem"
  rm -f "$SSL_DIR/server.csr" "$SSL_DIR/server.pem" "$SSL_DIR/agroerp-ca.srl"

  echo "✅ Certificados en infra/ssl/ (CA + fullchain + privkey)"
  echo "   Sincronizando CA con app Android..."
  bash "$ROOT/scripts/sync-android-ca.sh"
  echo "   Los navegadores de escritorio seguirán advirtiendo hasta instalar la CA o usar un dominio con Let's Encrypt."

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
  echo "   Con Let's Encrypt la app Android puede usar solo trust-anchors del sistema (sin @raw/agroerp_ca)."
else
  echo "Modo desconocido: $MODE"
  exit 1
fi

chmod 600 "$SSL_DIR/privkey.pem" 2>/dev/null || true
[[ -f "$SSL_DIR/agroerp-ca.key" ]] && chmod 600 "$SSL_DIR/agroerp-ca.key"
