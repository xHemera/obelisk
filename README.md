# Obelisk

A full-stack web-based **turn-based PvP Tabletop RPG simulator** with a dark fantasy theme. Assemble a team of 3 heroes, queue for battle, and fight other players in real-time tactical combat.

Built with a Next.js frontend, a pure-TypeScript combat engine, a Socket.IO real-time layer, and PostgreSQL + Redis for persistence and matchmaking.

## Features

- **Turn-Based PvP Combat** — Charge-based turn system where faster heroes act more frequently. Choose from basic attacks, 15 unique hero spells, or skip.
- **5 Playable Heroes** — Knight (tank), Mage (burst), Healer (support), Archer (physical DPS), Assassin (execute). Each with 3 unique skills scaling up to level 10.
- **Real-Time Matchmaking** — Queue for PvP, get matched, and fight live via Socket.IO.
- **Hero Progression** — Level up individual heroes and their skills by earning XP in battle or spending rubies.
- **Ruby Economy** — Click-to-earn rubies via the Mine button, spent on skill upgrades.
- **Social System** — Real-time messaging, friend requests, block list, typing indicators, read receipts, and duel challenges.
- **Pong Mini-Game** — Real-time multiplayer Pong for XP farming.
- **Badge Progression** — Earn badges (BEGINNER → AMATEUR → EXPERT → MASTER) based on PvP wins.
- **Admin Panel** — Manage users, assign roles (ADMIN/MODERATOR), ban/unban accounts, handle reported conversations.
- **Pixel Animation System** — Damage numbers, spell effects, and status icons rendered on the battlefield.
- **Dark JRPG/Fantasy Theme** — Inspired by Final Fantasy and Dragon Quest, with chibi sprites and a cohesive dark purple/beige palette.

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| **Authentication** | Better Auth 1.4 |
| **Database** | PostgreSQL 16 + Prisma ORM 7 |
| **Cache & Queue** | Redis 7 |
| **Real-Time** | Socket.IO 4.8 |
| **Package Manager** | Bun 1.2.5 |
| **Orchestration** | Docker Compose |

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Docker Compose                       │
│                                                         │
│  ┌───────────────────┐      ┌────────────────────────┐ │
│  │  Frontend         │      │  WebSocket Server      │ │
│  │  (Next.js :3000)  │◄────►│  (Bun + Socket.IO     │ │
│  │                   │      │   :4001)               │ │
│  │  - App Router     │      │                        │ │
│  │  - API Routes     │      │  server.js             │ │
│  │  - Socket.Client  │      │  gameManager.js        │ │
│  │  - Prisma Client  │      │  matchmaking.js        │ │
│  └────────┬──────────┘      │  engine/ (pure TS)     │ │
│           │                 └───────────┬────────────┘ │
│  ┌────────▼──────────┐                 │               │
│  │  PostgreSQL (:5432)│                 │               │
│  │  (persistence)    │                 │               │
│  └───────────────────┘                 │               │
│           │                            │               │
│  ┌────────▼──────────┐      ┌──────────▼────────────┐ │
│  │  Redis (:6379)    │◄────►│  Combat Engine        │ │
│  │  (queues, cache,  │      │  (websockets/engine/) │ │
│  │   online users)   │      │  Pure TypeScript,     │ │
│  └───────────────────┘      │  zero side-effects    │ │
│                             └───────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### Data Flow (PvP Match)

1. Player queues via `POST /api/home` → Redis `players_queue`
2. `matchmaking.js` daemon pops 2 players, assigns a room
3. Both receive `"matchFound"` socket event → navigate to `/game`
4. Both emit `"initiate"` with team data → server runs `initGame()`
5. `broadcastGameState()` sends serialized state to both players
6. Players send `"gameAction"` → `processAction()` → broadcast updated state
7. When all enemies are defeated → rewards distributed, match saved

## Project Structure

```text
obelisk/
├── frontend/                   # Next.js application
│   ├── app/                    # App Router pages + API
│   │   ├── (auth)/             # Login, register
│   │   ├── (main)/             # Home, game, characters, social
│   │   ├── api/                # REST endpoints
│   │   └── admin/              # Admin dashboard
│   ├── components/             # Atomic design
│   │   ├── atoms/              # Button, Input, Card, Fighter, etc.
│   │   ├── molecules/          # SpellSelector, FriendRequestBanner, etc.
│   │   └── organisms/          # TeamBuilder, PvpMatchmakingModal, etc.
│   ├── lib/                    # Utilities (auth, prisma, animations, etc.)
│   ├── prisma/                 # Schema + migrations
│   ├── public/gameResources/   # Sprites, animations, icons
│   ├── shared-heroes/          # Hero data definitions
│   └── socket.js               # Socket.IO client config
├── websockets/                 # Socket.IO server + game engine
│   ├── server.js               # Main server + socket event handlers
│   ├── matchmaking.js          # PvP matchmaking daemon
│   ├── matchmakingpong.js      # Pong matchmaking daemon
│   ├── gameManager.js          # Bridge: sockets ↔ engine
│   └── engine/                 # Pure TypeScript combat engine
│       ├── GameEngine.ts       # processAction(), getCurrentTurnCharacter()
│       ├── GameState/          # Turn system, game loop, state factory
│       ├── Instances/          # Character/Player instances, hero factory
│       ├── Spells/             # 15 spells across 5 heroes
│       ├── Utils/              # Damage resolution, targeting, crit logic
│       └── heroes/             # Base hero stat definitions
├── docs/                       # Documentation (13 guides)
├── docker-compose.yml          # PostgreSQL, Redis, Frontend, Websockets
└── dev.sh                      # Development helper script
```

## Getting Started

**Prerequisites**: Docker + Docker Compose

```bash
git clone <repository-url> obelisk
cd obelisk

# Option A: Dev helper script
./dev.sh

# Option B: Direct start
docker compose up --build -d
```

Open **http://localhost:3000**

> WebSocket server runs on `http://localhost:4001` (used for real-time game state, chat, matchmaking)

## Documentation

Detailed documentation is available in `docs/`:

| Guide | Description |
|-------|-------------|
| [Game Features](docs/game-features.md) | Heroes, spells, combat mechanics, progression |
| [Engine Guide](docs/engine-guide.md) | Combat engine architecture, turn system, damage formulas |
| [WebSocket Guide](docs/websocket-guide.md) | All socket events (game, chat, friends, admin) |
| [API Reference](docs/api-reference.md) | REST endpoints, request/response formats |
| [Database Guide](docs/database-guide.md) | Prisma schema, models, migrations |
| [Frontend Overview](docs/frontend-overview.md) | Architecture, components, hooks |
| [Authentication Guide](docs/authentication-guide.md) | Better Auth setup, protected routes |
| [Components Guide](docs/components-guide.md) | Atomic design component library |
| [Styling Guide](docs/styling-guide.md) | Tailwind CSS theming, dark fantasy palette |
| [Deployment Guide](docs/deployment.md) | Production setup, environment config |
| [Development Workflow](docs/development-workflow.md) | Setup, debugging, common tasks |
