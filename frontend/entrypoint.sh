#!/bin/sh
set -e

bunx prisma db push
bun run build

exec bun ./server.js
