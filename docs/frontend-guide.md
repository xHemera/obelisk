# Frontend Guide

## Structure

```
frontend/
├── app/          Pages + API routes
│   ├── home/     Dashboard (Mine, PvP, Team)
│   ├── game/     PvP combat screen
│   ├── characters/ Hero management
│   ├── social/   Messaging / friends
│   ├── admin/    Admin panel
│   └── pong/     Pong mini-game
├── components/   Atomic design
├── lib/          auth, prisma, redis, animations
└── socket.js     Socket.IO client
```

## Components

| Level | Examples |
|-------|----------|
| atoms/ | Button, Input, Card, Fighter, ManaBar, TurnQueue |
| molecules/ | SpellSelector, FriendRequestBanner, MessageInput |
| organisms/ | TeamBuilder, PvpMatchmakingModal, CharacterViewer |

## Styling

Dark JRPG theme. Tailwind classes inline.

| Usage | Class | Hex |
|-------|-------|-----|
| Background | `bg-[#0f0e13]` | Deep black |
| Text | `text-[#f5e6c8]` | Beige |
| Borders | `border-[#3c3650]` | Dark purple |

Fonts: Cinzel + Cormorant Garamond (Google Fonts).

## Auth

Better Auth. Client: `authClient.signUp/SignIn/SignOut/getSession`. Server: `auth.api.getSession({ headers })`. Admin check: `user.badges.includes("ADMIN")`. Middleware in `middleware.ts`.
