#!/usr/bin/env bash
# One-shot local dev bootstrap: infra deps -> db -> seed -> turbo dev.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "No .env found — copying .env.example -> .env (edit secrets before deploying anywhere real)."
  cp .env.example .env
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

echo "Starting postgres + minio (docker-compose.dev.yml)..."
docker compose -f docker-compose.dev.yml up -d

echo "Waiting for postgres..."
until docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U "${POSTGRES_USER:-abms}" >/dev/null 2>&1; do
  sleep 1
done
echo "postgres is ready."

pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed

echo "Starting apps (turbo dev)..."
pnpm dev
