# Structure du projet

```
obelisk/
├── frontend/                   — Next.js app (port 3000)
│   ├── app/                    — Pages + API routes
│   │   ├── (auth)/             — Login, register
│   │   ├── (main)/             — Pages protégées
│   │   ├── api/                — REST (auth, user, characters, social, admin, profile, home, pong)
│   │   ├── admin/              — Panel admin
│   │   ├── characters/         — Gestion des héros
│   │   ├── game/               — Écran de combat PvP
│   │   ├── home/               — Dashboard
│   │   ├── pong/               — Mini-jeu Pong
│   │   ├── profile/[pseudo]/   — Profil public
│   │   ├── social/             — Messagerie / amis
│   │   ├── policy/             — Politique de confidentialité
│   │   └── terms/              — Conditions d'utilisation
│   ├── components/             — Atomic design
│   │   ├── atoms/              — Button, Input, Card, Fighter, ManaBar, etc.
│   │   ├── backgrounds/        — BottomBar, GameArenaBackground
│   │   ├── molecules/          — IconField, SpellSelector, FriendRequestBanner
│   │   └── organisms/          — TeamBuilder, CharacterViewer, PvpMatchmakingModal
│   ├── lib/                    — auth-client, auth server, prisma, redis, rateLimit, animations
│   ├── prisma/                 — Schema + migrations (15 modèles)
│   ├── public/gameResources/   — Sprites chibi, animations pixel, icônes
│   ├── shared-heroes/          — Définitions de héros partagées avec l'engine
│   ├── socket.js               — Client Socket.IO
│   └── middleware.ts           — Middleware d'auth Next.js
│
├── websockets/                 — Socket.IO server (port 4001)
│   ├── server.js               — Connexions, events sociaux + jeu
│   ├── matchmaking.js          — Boucle de matchmaking PvP
│   ├── matchmakingpong.js      — Boucle de matchmaking Pong
│   ├── gameManager.js          — Pont entre sockets et engine
│   └── engine/                 — Moteur de combat (TypeScript pur)
│       ├── GameEngine.ts       — initGame, processAction, getCurrentTurnCharacter
│       ├── GameState/          — TurnSystem (charge-based), game loop
│       ├── Instances/          — PlayerInstance, CharacterInstance, HeroData
│       ├── Spells/             — 15 sorts, SpellRegistry
│       └── Utils/              — Damage, targets, crit, lastStand
│
├── docs/                       — 13 guides de documentation
├── docker-compose.yml          — PostgreSQL, Redis, Frontend, Websockets
├── dev.sh                      — Script de développement
├── package.json                — Déps racine (Redis, Socket.IO, Next.js)
└── tsconfig.json               — Configuration TypeScript
```

## Frontend — fichiers clés

| Fichier | Rôle |
|---------|------|
| `app/game/page.tsx` | Écran de combat |
| `app/game/spells.tsx` | Event socket "initiate" + Team type |
| `app/home/page.tsx` | Dashboard (Mine, PvP, team) |
| `app/api/home/route.ts` | Queue PvP + save team |
| `app/api/user/opponent/route.ts` | Récupère adversaire + roomId |
| `app/api/characters/route.ts` | CRUD persos + level up sorts |
| `socket.js` | Client Socket.IO |
| `lib/auth-client.ts` | Better Auth client |
| `lib/prisma.ts` | Prisma client singleton |

## Websocket — flow

1. `matchmaking.js` pop 2 joueurs → stocke dans Redis `inGamePlayers`
2. Les 2 frontends recoivent `"matchFound"` → vont sur `/game`
3. Chacun envoie `"initiate"` avec sa team
4. `server.js` stocke les teams → quand les 2 sont là → `gameManager.createGameInstance()`
5. `gameManager.js` crée les `PlayerInstance`/`CharacterInstance` → `initGame()` de l'engine
6. `broadcastGameState()` envoie l'état aux 2 joueurs

## Conventions

- Fichiers : `kebab-case.ts` / `PascalCase.tsx` (composants)
- Routes API : `app/api/<name>/route.ts`
- Composants : `components/<atomic>/<domain>/<Name>.tsx`
- Base de données : `PascalCase` (User, GameState, Match_history)
