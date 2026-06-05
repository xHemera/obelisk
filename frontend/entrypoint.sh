#!/bin/sh
set -e

bun install --ignore-scripts
bunx prisma db push
bunx prisma generate
bunx next build

exec bun ./server.js

