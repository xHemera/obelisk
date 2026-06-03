# Database — schéma Prisma

## Modèles

### User

```prisma
model User {
  id                String
  name              String          // pseudo
  email             String          @unique
  emailVerified     Boolean
  image             String?         // URL avatar
  badges            String[]        // ["ADMIN"] pour les admins, rien pour les autres
  blockedUsers      String[]        // liste de pseudos bloqués
  banned            Boolean
  profileBackground String?
  profileBanner     String?
  opponent          String?         // utilisé pour le matchmaking
  online            Boolean
  avatarId          String?
  avatar            Avatar?
  banner            ProfileBanner?
  gameState         GameState?      // 1:1 — les données du jeu
  friends           Friends[]
  inboxUser         Inbox_users[]
  messages          Messages[]
  inbox             Inbox[]
  matchHistory      Match_history[] // table créée mais pas utilisée par le jeu
  sessions          Session[]
  accounts          Account[]
}
```

### GameState

```prisma
model GameState {
  id          String
  user_id     String      @unique
  rubis       Int         // monnaie click-to-earn
  team        String[]    // ["Archer", "Knight", "Mage"] — équipe sélectionnée
  characters  Character[]
  user        User
}
```

### Character

```prisma
model Character {
  id          String
  gameStateId String
  name        String      // nom du héros
  hp          Int         // HP max (côté DB, les HP actuels sont dans l'engine)
  level       Int
  xp          Int
  spells      Spell[]
  gameState   GameState
}
```

### Spell

```prisma
model Spell {
  id          String
  characterId String
  name        String      // ex: "Piercing Shot"
  type        String      // ex: "damage"
  mpCost      Int
  level       Int         // 1-10
  xp          Int
  character   Character?
}
```

### Friends

```prisma
model Friends {
  friendId    String    // pseudo de l'ami
  userId      String
  request_sent Boolean  // true = en attente, false = accepté
  created_at  DateTime
  user        User
  @@id([userId, friendId])
}
```

### Messagerie

```
Inbox — conteneur de conversation (1:1)
Inbox_users — liaison inbox ↔ user + unread count
Messages — messages individuels
Attachment — fichiers joints aux messages
Reported_Conv — signalements de conversations
```

### Match_history

```prisma
model Match_history {
  id           String
  result       String      // "win" | "loss"
  playerTeam   String[]
  opponentTeam String[]
  opponent     String
  user_id      String
  user         User?
}
```

Enregistre les résultats de combat après chaque match PvP.

### Avatar / ProfileBanner

```prisma
model Avatar { ... }          // Options d'avatar disponibles
model ProfileBanner { ... }   // Bannières de profil
```

Modèles de cosmétiques pour la personnalisation du profil.

## Relations clés

- `User` 1:1 `GameState` (via `user_id`)
- `GameState` 1:N `Character` (3-5 persos)
- `Character` 1:N `Spell` (3 sorts par perso)
- `User` N:N `Friends` (self-ref via junction)
- `Inbox` N:N `User` via `Inbox_users`
- `Inbox` 1:N `Messages`
- `Messages` 1:N `Attachment`

## Migrations

```bash
cd frontend
npx prisma migrate dev --name ma_migration
npx prisma generate
```

Les migrations sont dans `frontend/prisma/migrations/`.

## Requêtes courantes

```ts
// Récupérer l'équipe + niveaux
const gameState = await prisma.gameState.findUnique({
  where: { user_id: userId },
  include: {
    characters: {
      include: { spells: true }
    }
  }
});

// Chercher un user par pseudo
const user = await prisma.user.findUnique({ where: { name: pseudo } });

// Liste d'amis
const friends = await prisma.friends.findMany({
  where: { userId: id }
});
```
