#!/bin/sh
set -e

bun install --ignore-scripts
bunx prisma migrate dev --name init --url "$DATABASE_URL"

ln -sf /app/node_modules/.prisma /app/node_modules/@prisma/.prisma

rm -rf /app/.next/dev

exec bun run dev -- --hostname 0.0.0.0
