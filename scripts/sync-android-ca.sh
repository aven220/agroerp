#!/bin/bash
# Copia el certificado/CA del servidor al proyecto Android para Network Security Config.
# Ejecutar en el servidor tras regenerar SSL, o apuntando SERVER_HOST al servidor remoto.
#
# Uso:
#   bash scripts/sync-android-ca.sh
#   SERVER_HOST=20.231.96.53 bash scripts/sync-android-ca.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_HOST="${SERVER_HOST:-20.231.96.53}"
SERVER_PORT="${SERVER_PORT:-443}"
OUT="$ROOT/mobile-android/app/src/main/res/raw/agroerp_ca.pem"
SSL_CA="$ROOT/infra/ssl/agroerp-ca.pem"

mkdir -p "$(dirname "$OUT")"

if [[ -f "$SSL_CA" ]]; then
  echo "==> Usando CA local: $SSL_CA"
  cp "$SSL_CA" "$OUT"
elif [[ -f "$ROOT/infra/ssl/fullchain.pem" ]] && ! grep -q "BEGIN CERTIFICATE" "$ROOT/infra/ssl/fullchain.pem" 2>/dev/null; then
  echo "No hay certificados locales."
else
  if [[ -f "$ROOT/infra/ssl/agroerp-ca.pem" ]]; then
    cp "$ROOT/infra/ssl/agroerp-ca.pem" "$OUT"
  elif [[ -f "$ROOT/infra/ssl/fullchain.pem" ]]; then
    # CA interna: último cert del fullchain; autofirmado: el único certificado
    awk '/BEGIN CERTIFICATE/{i++} i>0{print}' "$ROOT/infra/ssl/fullchain.pem" | tail -n +1 > "$OUT.tmp"
    if [[ -s "$OUT.tmp" ]]; then
      cp "$OUT.tmp" "$OUT"
      rm -f "$OUT.tmp"
    fi
  fi
fi

if [[ ! -s "$OUT" ]]; then
  echo "==> Descargando certificado desde $SERVER_HOST:$SERVER_PORT ..."
  echo | openssl s_client -connect "${SERVER_HOST}:${SERVER_PORT}" -servername "$SERVER_HOST" 2>/dev/null \
    | openssl x509 -outform PEM > "$OUT"
fi

openssl x509 -in "$OUT" -noout -subject -issuer -dates
echo "✅ Certificado copiado a mobile-android/app/src/main/res/raw/agroerp_ca.pem"
echo "   Recompile la app Android: cd mobile-android && ./gradlew assembleDebug"
