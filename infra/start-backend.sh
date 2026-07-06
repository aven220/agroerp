#!/bin/sh
set -e
cd /app/backend

if [ -f dist/src/main.js ]; then
  exec node dist/src/main.js
fi
if [ -f dist/main.js ]; then
  exec node dist/main.js
fi

echo "❌ No se encontró main.js. Contenido de dist/:"
ls -la dist/ 2>/dev/null || true
ls -la dist/src/ 2>/dev/null || true
exit 1
