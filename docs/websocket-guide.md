# WebSocket — les events qui existent vraiment

Le serveur tourne sur le port 4001 avec Socket.IO. Le client est dans `frontend/socket.js` (autoConnect: false). La connexion se fait côté frontend via `socket.connect()` + emission de `"login"`.

## Tous les events socket côté serveur (`websockets/server.js`)

### Authentification / connexion

| Event | Sens | Description |
|-------|------|-------------|
| `login` | client → serveur | Enregistre le pseudo → socket ID dans Redis `online_users` |
| `online_users` | serveur → tous | Broadcast de la map `{pseudo: socketId}` de tous les connectés |
| `disconnect` | client → serveur | Nettoie le mapping Redis quand un socket se déconnecte |

### Messagerie

| Event | Sens | Description |
|-------|------|-------------|
| `msg_sent` → `received` | client A → serveur → client B | Envoie un message à un destinataire |
| `new_conv` → `add_conv` | client → serveur → destinataire | Préviens qu'une nouvelle conversation est créée |
| `typing` → `isTyping` | client → serveur → destinataire | "est en train d'écrire" |
| `notTyping` → `isNotTyping` | client → serveur → destinataire | Arrête d'écrire |
| `has_read` → `read` | client → serveur → destinataire | Accusé de lecture |

### Amis

| Event | Sens | Description |
|-------|------|-------------|
| `friend_request` → `request` | client → serveur → destinataire | Demande d'ami envoyée |
| `friend_added` → `adding` | client → serveur → les 2 | Demande acceptée (préviens les 2) |
| `friend_denied` → `refusing` | client → serveur → demandeur | Demande refusée |
| `friend_or_user_blocked` → `blocked` | client → serveur → bloqué | Utilisateur bloqué |
| `blocking_friend_or_user` → `blocking` | serveur → émetteur | Confirmation du block |
| `user_unblocked` → `unblocking` | client → serveur → les 2 | Utilisateur débloqué |

### Duels / Challenges

| Event | Sens | Description |
|-------|------|-------------|
| `challenge_sent` → `challenge` | client → serveur → les 2 | Challenge PvP envoyé |
| `duel_accepted` → `accept` | client → serveur → les 2 | Duel accepté |
| `duel_refused` → `refuse` | client → serveur → les 2 | Duel refusé |
| `duel_cancelled` → `cancel` | client → serveur → les 2 | Duel annulé |

### Modération / Admin

| Event | Sens | Description |
|-------|------|-------------|
| `banning` → `ban` | serveur → tous | Utilisateur banni |
| `unbanning` → `unban` | serveur → tous | Utilisateur débanni |
| `addMod` → `newMod` | serveur → tous | Nouveau modo |
| `removeMod` → `noMod` | serveur → tous | Modo retiré |
| `reported` → `newReport` | serveur → tous | Nouveau report |
| `reviewed` → `lessReports` | serveur → tous | Report traité |

### Comptes

| Event | Sens | Description |
|-------|------|-------------|
| `has_delete` → `deletion` | client → serveur → tous | Compte supprimé |
| `creation` → `newUser` | client → serveur → tous | Nouvel utilisateur créé |
| `isconnecting` → `online` | client → serveur → tous | Utilisateur en ligne |
| `isdisconnecting` → `offline` | client → serveur → tous | Utilisateur hors ligne |

### Jeu (engine)

| Event | Sens | Description |
|-------|------|-------------|
| `initiate` | client → serveur | Envoie sa team data + roomId pour init la partie |
| `"gameStateUpdate"` | serveur → room | Broadcast le state sérialisé aux 2 joueurs |
| `"gameReady"` | serveur → room | La partie est prête (GameState créé) |
| `gameAction` | client → serveur | Action de jeu (`{ userUid, targetUids, type, skillId }`) → `processAction()` |
| `forfeit` | client → serveur | Abandonner la partie |

### Matchmaking

Le matchmaking n'utilise PAS d'events socket pour rejoindre la queue. Il utilise :

1. `POST /api/home` → Redis `rPush("players_queue", pseudo)`
2. `DELETE /api/home` → Redis `lRem("players_queue", ...)`
3. Daemon `matchmaking.js` pop 2 joueurs toutes les 1s
4. Emet `"matchFound"` aux 2 sockets (event socket standard)

Même système pour le Pong avec `pong_queue` et `"matchFoundPong"`.

## Setup

### Serveur (`websockets/server.js`)

```js
const io = new Server(httpServer, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"],
});
```

Lancé via Docker avec `bun run server.js`. Pas de script npm.

### Client (`frontend/socket.js`)

```ts
export const socket = io("http://localhost:4001", {
  transports: ["websocket", "polling"],
  autoConnect: false,
  reconnection: true
});
```

Pas de Redis adapter, pas de pub/sub multi-instance. L'état est en mémoire + Redis direct.

## Ajouter un nouvel event

**Serveur** — dans le `io.on("connection", socket => { ... })` :

```js
socket.on("monEvent", async ({data}) => {
  const destSock = await redis.hGet("online_users", destinataire);
  if (destSock) io.to(destSock).emit("monEventResponse", data);
});
```

**Client** — importer `socket` depuis `@/socket` :

```ts
socket.emit("monEvent", { data: "hello" });
socket.on("monEventResponse", (res) => console.log(res));
```

Toujours `socket.off()` dans le cleanup du `useEffect`.

## Notes

- Le mapping pseudo → socket ID est dans Redis `online_users` (hash)
- Les infos de matchmaking sont dans Redis `inGamePlayers` (hash, JSON stringifié)
- La room socket `game:${roomId}` est utilisée pour broadcaster aux 2 joueurs d'une partie
- Pas de heartbeat / ping personnalisé — laisse Socket.IO gérer
