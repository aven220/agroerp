#!/bin/sh
set -e

cd /app/backend

echo "📦 Generating Prisma client..."
pnpm db:generate

echo "⏳ Waiting for database (15s)..."
sleep 15

echo "🗄️  Pushing schema..."
pnpm exec prisma db push --accept-data-loss

echo "🌱 Seeding database..."
if ! pnpm db:seed; then
  echo "⚠️  Full seed failed — trying minimal auth seed..."
  pnpm db:seed:minimal || echo "❌ Seed failed — run manually: docker compose exec backend pnpm db:seed:minimal"
fi

echo "🚀 Starting AGROERP backend..."
exec "$@"
