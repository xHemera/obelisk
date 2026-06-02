FROM oven/bun:1-alpine

ENV CI=true

RUN apk add --no-cache postgresql16-client

WORKDIR /app

COPY package.json ./ bun.lock ./

RUN bun install --ignore-scripts

COPY prisma ./prisma

RUN bunx prisma generate

COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
