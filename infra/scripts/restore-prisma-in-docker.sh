#!/bin/sh
# Restaura clientes Prisma pre-generados (host) dentro de la imagen.
set -e
BACKEND_ROOT="${1:-/app/backend}"
STAGE="${2:-/prisma-stage}"

cd "$BACKEND_ROOT"

# pnpm: .../node_modules/@prisma/client → .../node_modules/.prisma/client
DOT_PRISMA=$(node -p "require('path').resolve(require('path').dirname(require.resolve('@prisma/client/package.json')), '../../.prisma/client')")

mkdir -p "$(dirname "$DOT_PRISMA")"
rm -rf "$DOT_PRISMA"
cp -a "$STAGE/dot-prisma-client" "$DOT_PRISMA"
echo "✓ restored .prisma/client → $DOT_PRISMA"

mkdir -p node_modules/@agroerp
for d in "$STAGE"/agroerp/prisma-*-client; do
  name=$(basename "$d")
  rm -rf "node_modules/@agroerp/$name"
  cp -a "$d" "node_modules/@agroerp/$name"
  echo "✓ restored @agroerp/$name"
done
