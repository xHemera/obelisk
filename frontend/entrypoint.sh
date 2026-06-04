#!/bin/sh
set -e

bun install --ignore-scripts
bunx prisma db push

ln -sf /app/node_modules/.prisma /app/node_modules/@prisma/.prisma

rm -rf /app/.next/dev

if [ "$NODE_ENV" = "production" ]; then
  bun run build
  exec bun ./server.js
else
  exec bun start -- --hostname 0.0.0.0
fi
