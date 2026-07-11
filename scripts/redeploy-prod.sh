#!/usr/bin/env bash
# Redeploy producción en el servidor (Ubuntu).
# Uso (en el server, desde el repo):
#   bash scripts/redeploy-prod.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> git pull"
git pull --ff-only

echo "==> Preparar artefactos Prisma + dist (en el host del server)"
# En el server Linux, prisma generate puede hacerse en Docker o en host.
# Preferimos stage desde host si hay node/pnpm; si no, el Dockerfile exige docker-prisma.
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
  pnpm docker:prepare
else
  echo "WARN: sin pnpm en el host. Asegure infra/docker-prisma/ y backend/dist antes del build."
fi

echo "==> docker compose build + up"
docker compose -f infra/docker-compose.prod.yml up -d --build

echo "==> health"
sleep 5
curl -skf https://127.0.0.1/api/v1/health || curl -skf https://localhost/api/v1/health || true

echo ""
echo "Listo. En el navegador: hard refresh (Ctrl+Shift+R) y borrar sitio si quedó un JWT viejo."
echo "Prueba: DevTools → Application → Local Storage → borrar agroerp_token"
