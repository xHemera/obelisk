# API Reference

Toutes les routes sont dans `frontend/app/api/`. Rate limiting Redis sur la plupart.

## Auth — Better Auth

Tout passe par Better Auth. Pas de routes manuelles.

```ts
import { authClient } from '@/lib/auth-client';

authClient.signUp.email({ email, password, name });
authClient.signIn.email({ email, password });
authClient.signOut();
const { data: session } = await authClient.getSession();
```

Côté serveur :
```ts
const session = await auth.api.getSession({ headers: await headers() });
```

## User

### `GET /api/user?pseudo=xxx`

Retourne la team du joueur + niveaux :

```json
{ "team": ["Archer", "Knight", "Mage"], "levels": [1, 1, 1], "spellsLevels": [1, 1, 1, 1, 1, 1, 1, 1, 1] }
```

### `GET /api/user/opponent?pseudo=xxx`

Lit Redis `inGamePlayers`, retourne l'adversaire :

```json
{ "name": "Adversaire", "team": ["Archer", "Mage", "Assassin"], "avatar": null, "roomId": 42 }
```

## Characters

### `GET /api/characters?username=xxx`

Retourne tous les persos avec stats level-scalées :

```json
{ "characters": [{ "id": "...", "name": "Archer", "level": 1, "hp": 1240, "stats": { "physicalDamage": 165, ... }, "skills": [...] }], "maxSkillLevel": 10 }
```

### `POST /api/characters`

Crée un GameState avec les 5 héros level 1.

### `PUT /api/characters`

Level up d'un sort : `{ characterId, spellId, action: "increment" }`

### `PATCH /api/characters`

Ajoute XP à un sort (coûte des rubis) : `{ characterId, spellId, action: "increment" }`

## Social — REST

Toutes dans `frontend/app/api/social/`.

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/social/users` | GET | Liste d'utilisateurs |
| `/api/social/user` | GET | Cherche un user par name |
| `/api/social/inbox` | GET | Récupère les conversations |
| `/api/social/msg` | GET/POST | Messages paginés |
| `/api/social/friend` | GET/PATCH/DELETE | Gestion des amis |
| `/api/social/block` | POST | Bloquer un user |
| `/api/social/contact` | GET | Liste de contacts |
| `/api/social/invite` | GET | Invitations |
| `/api/social/unread` | GET | Messages non lus |
| `/api/social/upload` | POST | Upload fichier |
| `/api/social/attachment` | GET | Récupérer une pièce jointe |

## Profile

### `GET /api/profile`

Retourne le profil du user connecté :

```json
{ "image": null, "avatar": { "url": null }, "profileBackground": null, "profileBanner": null }
```

Les routes `/api/profile` sont listées dans la section Profile plus bas.

## Admin

| Route | Description |
|-------|-------------|
| `GET /api/admin/users` | Liste des users |
| `GET /api/admin/userByName?name=xxx` | Cherche un user |
| `POST /api/admin/role` | Ajoute/retire le badge ADMIN |
| `POST /api/admin/ban` | Ban/unban |

## Home

### `GET /api/home?currentUser=xxx`

Retourne l'équipe :

```json
{ "team": ["Archer", "Knight", "Mage"] }
```

### `POST /api/home`

Rejoint la file PvP : `{ userPseudo: "xxx" }` → Redis `players_queue`

### `PUT /api/home`

Sauvegarde l'équipe : `{ userPseudo, char: ["Archer", ...] }`

### `DELETE /api/home?userPseudo=xxx`

Quitte la file PvP.

## Pong

Même pattern que Home :

| Route | Description |
|-------|-------------|
| `POST /api/pong` | Rejoint la file Pong → Redis `pong_queue` |
| `DELETE /api/pong?userPseudo=xxx` | Quitte la file Pong |

## Profile

| Route | Méthode | Description |
|-------|---------|-------------|
| `GET /api/profile` | GET | Retourne le profil (avatar, bannière, fond) |
| `PUT /api/profile` | PUT | Déconnexion (signale offline) |
| `POST /api/profile/resources` | POST | Click-to-earn rubis (gain 12-35 aléatoire) |

## Error handling

```json
{ "error": "message", "status": 429 }
```

Codes : 400 (bad request), 401 (non auth), 403 (forbidden), 404, 429 (rate limit), 500.
