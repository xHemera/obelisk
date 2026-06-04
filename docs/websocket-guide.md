# WebSocket Guide

Server: port 4001, Socket.IO. Client: `frontend/socket.js` (autoConnect: false).

## Events

| Category | Key Events |
|----------|------------|
| **Auth** | `login`, `online_users`, `disconnect` |
| **Chat** | `msg_sent/received`, `typing/isTyping`, `has_read/read` |
| **Friends** | `friend_request`, `friend_added`, `friend_or_user_blocked` |
| **Duels** | `challenge_sent`, `duel_accepted`, `duel_refused` |
| **Admin** | `banning`, `unbanning`, `addMod`, `reported` |
| **Game** | `initiate`, `gameStateUpdate`, `gameReady`, `gameAction`, `forfeit` |

## Matchmaking

REST + Redis (not socket events). `POST /api/home` → Redis queue → daemon pops 2 players → emits `"matchFound"`. Same for Pong.

## Storage

- Pseudo → socket ID: Redis `online_users` (hash)
- Matchmaking data: Redis `inGamePlayers` (hash)
- Game room: socket room `game:${roomId}`
- No multi-instance Redis adapter
