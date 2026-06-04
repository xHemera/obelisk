# Déploiement

## Docker Compose (dev actuel)

```yml
services:
  web: Next.js, port 3000
  db: PostgreSQL
  redis: Redis
  websocket: Socket.IO, port 4001
```

`docker compose up --build -d` pour tout lancer.

## Production

### Base de données

- PostgreSQL managé (Railway, Supabase, AWS RDS)
- `DATABASE_URL` en variable d'environnement
- Migrations : `npx prisma migrate deploy`

### Redis

- Redis Cloud ou self-hosted
- Utilisé pour : `online_users`, `inGamePlayers`, `players_queue`, rate limiting

### Frontend (Next.js)

- Build : `bun run build`
- Déploiement : Docker, Vercel, Railway
- Variables : `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `DATABASE_URL`

### WebSocket

- Doit être accessible publiquement
- CORS configuré (`origin: "*"`)
- HTTPS + WSS en production
- Pas de Redis adapter multi-instance pour l'instant

### Sécurité

- Rate limiting Redis sur toutes les routes API
- Session Better Auth (7 jours)
- Middleware de vérification de session
- Ban utilisateur via badge ADMIN
