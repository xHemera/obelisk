# Development Guide

## Quick Start

```bash
git clone https://github.com/xHemera/obelisk.git && cd obelisk
./dev.sh 1
```

| Service    | URL                                                     |
| ---------- | ------------------------------------------------------- |
| Frontend   | https://localhost:3443                                  |
| WebSocket  | http://localhost:4001                                   |
| PostgreSQL | `postgresql://postgres:postgres@localhost:5432/obelisk` |
| Redis      | `redis://localhost:6380`                                |

## Commands

| Task              | Command                                          |
| ----------------- | ------------------------------------------------ |
| Prisma Studio     | `cd frontend && npx prisma studio`               |
| New migration     | `cd frontend && npx prisma migrate dev --name x` |
| Restart WebSocket | `docker compose restart websockets`              |
| Logs              | `docker compose logs -f [service]`               |
| Socket debug      | `socket.onAny((e, ...a) => console.log(e, a))`   |

## Production

Docker Compose (4 services). For managed hosting:

- **DB**: PostgreSQL (Railway, Supabase, AWS RDS). Env: `DATABASE_URL`. Migrations: `npx prisma migrate deploy`
- **Redis**: Redis Cloud or self-hosted
- **Frontend**: `bun run build`. Env: `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `DATABASE_URL`
- **WebSocket**: Must be public. CORS: `*`. HTTPS/WSS required.

Security: Redis rate limiting, Better Auth sessions (7d), session middleware, ADMIN badge bans.
