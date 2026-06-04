# API Reference

Routes in `frontend/app/api/`. Redis rate limiting. Auth via Better Auth.

## User

`GET /api/user?pseudo=x` → `{ team, levels, spellsLevels }`
`GET /api/user/opponent?pseudo=x` → `{ name, team, roomId }` (Redis)

## Characters

`GET /api/characters?username=x` — all heroes with scaled stats
`POST /api/characters` — create GameState
`PUT /api/characters` — level up a spell
`PATCH /api/characters` — add XP (costs rubies)

## Social

`/api/social/msg` (GET/POST), `/api/social/friend` (GET/PATCH/DELETE), `/api/social/block`, `/api/social/upload`, etc.

## Admin

`GET /api/admin/users`, `GET/POST /api/admin/userByName`, `POST /api/admin/role`, `POST /api/admin/ban`

## Home & Pong

`GET/POST/PUT/DELETE /api/home` — team & PvP queue
`POST/DELETE /api/pong` — Pong queue

## Profile

`GET /api/profile`, `POST /api/profile/resources` (rubies, 12-35 random)

## Errors

`{ error, status }` — 400, 401, 403, 404, 429, 500.
