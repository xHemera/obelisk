# Dev workflow

## Démarrer

```bash
git clone <repo> && cd obelisk
docker compose up --build -d
```

Services :
- Frontend → `http://localhost:3000`
- WebSocket → `http://localhost:4001`
- PostgreSQL → `postgresql://postgres:postgres@localhost:5432/obelisk`
- Redis → `redis://localhost:6380`

## Frontend

Hot reload automatique. Édite un fichier, le navigateur se met à jour.
Prisma Studio : `cd frontend && npx prisma studio`

## WebSocket

Modifier `websockets/server.js` → redémarrer le container :
```bash
docker compose restart websockets
```

## Engine (`websockets/engine/`)

TypeScript pur, sans side-effects. Les changements sont pris en compte au prochain rebuild Docker.

## Base de données

```bash
cd frontend
npx prisma migrate dev --name description
npx prisma generate
```

## Debug

```bash
docker compose logs -f            # Tous les logs
docker compose logs frontend -f   # Frontend uniquement
docker compose logs websockets -f # WebSocket uniquement
docker compose logs db -f         # PostgreSQL uniquement
```

Socket events : `socket.onAny((e, ...a) => console.log(e, a))`
