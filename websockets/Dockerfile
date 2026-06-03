FROM oven/bun:1-alpine

WORKDIR /app

COPY websockets/package.json websockets/bun.lock ./
COPY packages /packages

RUN bun install --ignore-scripts

COPY websockets/ .

EXPOSE 4001

CMD ["bun", "run", "server.js"]
