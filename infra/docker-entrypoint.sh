#!/bin/sh
set -e

cd /app/backend

if [ "${SKIP_PRISMA_GENERATE:-0}" != "1" ]; then
  echo "📦 Generating Prisma client..."
  pnpm db:generate
else
  echo "⏭️  Skipping Prisma generate (SKIP_PRISMA_GENERATE=1)"
fi

echo "⏳ Waiting for database (10s)..."
sleep 10

echo "🗄️  Pushing schema..."
pnpm exec prisma db push --accept-data-loss --skip-generate

echo "🌱 Seeding database (core)..."
if ! pnpm db:seed:core; then
  echo "⚠️  Core seed failed — run: docker compose exec backend pnpm db:seed:core"
fi

echo "🚀 Starting AGROERP backend..."
exec "$@"
