#!/usr/bin/env bash
# Vercel build: sync the database schema + seed, then build Next.js.
set -euo pipefail

DB_URL="${DATABASE_URL:-${DATABASE_URL_UNPOOLED:-${POSTGRES_URL_NON_POOLING:-${POSTGRES_PRISMA_URL:-${POSTGRES_URL:-}}}}}"

npx prisma generate

if [ -n "$DB_URL" ]; then
  npx prisma db push
  npx prisma db seed
elif [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "ERROR: DATABASE_URL is not set for this Production deployment." >&2
  echo "Add it in Vercel → Project → Settings → Environment Variables, then redeploy." >&2
  exit 1
else
  echo "WARNING: no DATABASE_URL set (VERCEL_ENV=${VERCEL_ENV:-unknown}); skipping prisma db push and seed." >&2
fi

npm run build
