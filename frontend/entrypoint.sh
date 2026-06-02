#!/bin/sh
set -e

bun install --ignore-scripts
bunx prisma migrate dev --name init --url "$DATABASE_URL"

# Turbopack misresolves require('.prisma/client/') from @prisma/client/
# as a relative path instead of a bare module specifier.
# This symlink makes both resolutions work.
ln -sf /app/node_modules/.prisma /app/node_modules/@prisma/.prisma

# Turbopack caches chunks keyed by module hashes. When prisma generate
# produces a new hash, stale .next/ chunks reference the old one and fail.
# Clearing the dev cache before starting ensures a fresh compile.
rm -rf /app/.next/dev

exec bun run dev -- --hostname 0.0.0.0
