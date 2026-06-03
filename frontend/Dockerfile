FROM oven/bun:1-alpine

ENV CI=true

RUN apk add --no-cache postgresql16-client

WORKDIR /app

COPY frontend/package.json frontend/bun.lock ./

RUN bun install --ignore-scripts

COPY frontend/prisma ./prisma

RUN bunx prisma generate

COPY frontend/ .

COPY frontend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
