#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "==> Nakconel Phase 1 setup"

if [ ! -f .env ]; then
  cat > .env << 'ENV'
DATABASE_URL="postgresql://nakconel:nakconel@localhost:5432/nakconel"
ENCRYPTION_KEY="nakconel-dev-encryption-key-change-in-prod"
NODE_ENV="development"
ENV
  echo "Created .env"
fi

echo "==> npm install"
npm install

if command -v docker >/dev/null 2>&1; then
  echo "==> Starting Postgres (Docker)"
  docker compose up -d db || true
  sleep 3
else
  echo "==> Docker not found — set DATABASE_URL to your Neon or Postgres URL"
fi

echo "==> Prisma generate + db push"
npx prisma generate
npx prisma db push

echo "Done. Start with: npm run dev"
echo "Health: http://localhost:3000/api/v1/health"
