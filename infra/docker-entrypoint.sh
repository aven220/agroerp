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
pnpm db:seed || echo "Seed skipped"

echo "🚀 Starting AGROERP backend..."
exec "$@"
