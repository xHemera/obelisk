This project has been created as part of the 42 curriculum by mgarsaul, cfleuret, tobesnar and tlize

# What is Obelisk

A full-stack web-based **turn-based PvP RPG simulator** with a dark fantasy theme. Assemble a team of 3 heroes, queue for battle, and fight other players in real-time tactical combat.

Built with a Next.js frontend, a pure-TypeScript combat engine, a Socket.IO real-time layer, and PostgreSQL + Redis for persistence and matchmaking.

# Roles

### Tobesnar -> Project Owner / Project Manage
Frontend React et TailwindCSS. Responsive et Character/Game Design.

### Tlize -> Developer (game engine)
GameEngine dev. Website logo creator (graphic design is my passion)

### Cfleuret -> Project Manager / Technical lead
Main backend developer, made the social part

### Mgarsaul -> Developer (frontend)
Frontend React. Pong game. Helped with API connections.


# Project Management

## Organization
task distribution between group members (Roles).

## Tool used for project management
Github, Trello

## Communication channels used
Discord

# Tech Stack

| Category            | Technology                                        |
| ------------------- | ------------------------------------------------- |
| **Frontend**        | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| **Authentication**  | Better Auth 1.4                                   |
| **Database**        | PostgreSQL 16 + Prisma ORM 7                      |
| **Cache & Queue**   | Redis 7                                           |
| **Real-Time**       | Socket.IO 4.8                                     |
| **Package Manager** | Bun 1.2.5                                         |
| **Orchestration**   | Docker Compose                                    |

# Database Schema

![alt text](/frontend/public/database/database.png)


# Features

- **Turn-Based PvP Combat** — Charge-based turn system where faster heroes act more frequently. Choose from basic attacks, 15 unique hero spells, or skip. (tlize)
- **5 Playable Heroes** — Knight (tank), Mage (burst), Healer (support), Archer (physical DPS), Assassin (execute). Each with 3 unique skills scaling up to level (tobesnar) 10.
- **Real-Time Matchmaking** — Queue for PvP, get matched, and fight live via Socket.IO. (cfleuret)
- **Hero Progression** — Level up individual heroes and their skills by earning XP in battle or spending rubies. (tobesnar, tlize, mgarsaul, cfleuret)
- **Ruby Economy** — Click-to-earn rubies via the Mine button, spent on skill upgrades. (tobesnar)
- **Social System** — Real-time messaging, friend requests, block list, typing indicators, read receipts, and duel challenges. (cfleuret, mgarsaul)
- **Pong Mini-Game** — Real-time multiplayer Pong for XP farming. (mgarsaul)
- **Badge Progression** — Earn badges (BEGINNER → AMATEUR → EXPERT → MASTER) based on PvP wins. (cfleuret, mgarsaul)
- **Admin Panel** — Manage users, assign roles (ADMIN/MODERATOR), ban/unban accounts, handle reported conversations. (tobesnar, cfleuret, mgarsaul)
- **Pixel Animation System** — Damage numbers, spell effects, and status icons rendered on the battlefield. (tobesnar)
- **Dark JRPG/Fantasy Theme** — Inspired by Final Fantasy and Dragon Quest, with chibi sprites and a cohesive dark purple/beige palette. (tobesnar)


# RESOURCES

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

## Data Flow (PvP Match)

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

## AI

AI was used to help us during our project with differents tasks

# Getting Started (INSTRUCTIONS)

**Prerequisites**: Docker + Docker Compose

```bash
git clone <repository-url> obelisk
cd obelisk

# Option A: Dev helper script
./dev.sh

# Option B: Direct start
docker compose up --build -d
```

Open **https://localhost:3443** or **https://YourIpAdress:3443**

> WebSocket server runs on `http://localhost:4001` (used for real-time game state, chat, matchmaking)

## Documentation

Detailed documentation is available in `docs/`:

| Guide                                                | Description                                              |
| ---------------------------------------------------- | -------------------------------------------------------- |
| [Game Features](docs/game-features.md)               | Heroes, spells, combat mechanics, progression            |
| [Engine Guide](docs/engine-guide.md)                 | Combat engine architecture, turn system, damage formulas |
| [WebSocket Guide](docs/websocket-guide.md)           | All socket events (game, chat, friends, admin)           |
| [API Reference](docs/api-reference.md)               | REST endpoints, request/response formats                 |
| [Database Guide](docs/database-guide.md)             | Prisma schema, models, migrations                        |
| [Frontend Overview](docs/frontend-overview.md)       | Architecture, components, hooks                          |
| [Authentication Guide](docs/authentication-guide.md) | Better Auth setup, protected routes                      |
| [Components Guide](docs/components-guide.md)         | Atomic design component library                          |
| [Styling Guide](docs/styling-guide.md)               | Tailwind CSS theming, dark fantasy palette               |
| [Deployment Guide](docs/deployment.md)               | Production setup, environment config                     |
| [Development Workflow](docs/development-workflow.md) | Setup, debugging, common tasks                           |

# list of modules


## 1. Web
### Major : A framework for both frontend and backend : NextJS
Modern approch, used by newer industry and easier client-side/server-side rendering. (tobesnar, mgarsaul, cfleuret)

### Major : Basic chat
Chat to communicate with other players, play with them, share attachements, friend system to duel them and profile system to express yourself ! (mgarsaul, cfleuret)

### Major : A public API (more info in api-reference.md)
To link the website with the database, and permit the user to communicate with the website (tobesnar, cfleuret, mgarsaul)

### Major : Websocket
Dynamic actions for the users (tobesnar, cfleuret, mgarsaul)

### Minor : Frontend framework : React
Dynamic website, reusable components (sidebar for example) (tobesnar, mgarsaul)

### Minor : Backend framework : express
Server to handle sockets (cfleuret)

### Minor : ORM 
Use of prisma to use the database without pure SQL (cfleuret)

### Minor : Server-side rendering
Improve the performances (tobesnar, cfleuret, mgarsaul)

### Minor : Reusable components
To not multiply code lines in the project (tobesnar)



## 3. User management
### Major : Standard user management and authentification
Update users informations : profile, avatar, etc... to express yourself !! (cfleuret, mgarsaul)

### Major : Advanced permissions system
Role system for admins and moderators to handle and manage the community (cfleuret)



## 6. Gaming and user experience
### Major : Web based-game (PvP)
Pong, to gain XP for the characteres, matchmaking, online etc... (mgarsaul)

### Major : Second game
Charge-based turn system where faster heroes act more frequently. Choose from basic attacks, 15 unique hero spells, or skip with matchmaking and a user history (tlize, tobesnar)

### Minor : Gamification system
Achievements, badges, XP and rewards persistent, visual feedback, clear rules and progression mechanics (cfleuret, magarsaul)



# TOTAL : 22 POINTS