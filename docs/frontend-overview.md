# Frontend — structure

Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 + Prisma + Better Auth.

## Dossiers clés

```
frontend/
├── app/              — Pages + API routes
│   ├── api/          — REST (auth, user, characters, social, admin, profile, home)
│   ├── home/         — Dashboard
│   ├── game/         — Combat PvP
│   ├── characters/   — Gestion héros
│   ├── social/       — Messagerie / amis
│   ├── admin/        — Panel admin
│   └── not-connected/
├── components/       — Atomic design
│   ├── atoms/        — Composants de base (Button, Card, Fighter, ManaBar...)
│   ├── molecules/    — Assemblages (IconField, SpellSelector, FriendRequestBanner...)
│   └── organisms/    — Sections (TeamBuilder, CharacterViewer, PvpMatchmakingModal...)
├── lib/              — auth-client, auth server, prisma, redis, rateLimit, hero-portraits
├── prisma/           — Schema + migrations
└── public/           — gameResources/heroes/, icônes, assets
```

## Pages

| Route | Page | Type |
|-------|------|------|
| Route | Page | Type |
|-------|------|------|
| `/` | Landing page (non connecté) | Server component |
| `/home` | Dashboard (Mine, PvP, Team) | Client component |
| `/game` | Combat PvP | Client component (sockets) |
| `/characters` | Gestion des héros | Client component |
| `/social` | Messagerie / amis / défis | Client component (sockets) |
| `/pong` | Mini-jeu Pong multijoueur | Client component (sockets) |
| `/admin` | Panel admin | Client component |
| `/profile/[pseudo]` | Profil public | Client component |
| `/policy` | Politique de confidentialité | Server component |
| `/terms` | Conditions d'utilisation | Server component |
| `/not-connected` | Page erreur | Server component |

## Conventions

- Nouveau composant → créer dans `components/<type>/<domaine>/Nom.tsx`
- Nouvelle page → créer `app/mapage/page.tsx`
- Nouvelle API → créer `app/api/maroute/route.ts`
- Toujours `'use client'` si tu utilises `useState`, `useEffect`, ou `socket`
- Path alias `@/` = `frontend/`
