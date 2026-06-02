# Engine Guide

## Architecture globale

```
Frontend (React/Next.js)
    ↕ socket.io
Serveur websocket (server.js)
    ↕ appels directs
gameManager.js ─── engine/ (TypeScript)
                        ├── GameEngine.ts       ← point d'entrée
                        ├── GameState/          ← structures de données
                        ├── Instances/          ← classes PlayerInstance, CharacterInstance
                        ├── Spells/             ← définitions de sorts
                        └── Utils/              ← dégâts, ciblage, critique
```

L'engine est un module **purement fonctionnel, sans side-effects**. Il ne fait pas de réseau, pas d'accès base de données, pas de logs. Il reçoit des objets et retourne des objets modifiés.

C'est `gameManager.js` qui fait la **colle** entre le monde asynchrone des websockets et le monde synchrone de l'engine.

---

## Engine (`/engine/`)

### Structure

| Fichier | Rôle |
|---|---|
| `GameEngine.ts` | Point d'entrée : `initGame()`, `processAction()`, `getCurrentTurnCharacter()` |
| `GameState/GameState.ts` | Type `GameState` : `{ players, activePlayer, turn, turnQueue, gamePhase, winnerId? }` |
| `GameState/TurnSystem.ts` | Gestion de la turn queue (système de charges basé sur la vitesse) |
| `Instances/PlayerInstance.ts` | Classe `PlayerInstance` : tableau de `CharacterInstance` + `id` |
| `Instances/CharacterInstance.ts` | Classe `CharacterInstance` : HP, MP, modificateurs, status, sorts |
| `Instances/HeroData.ts` | Interfaces `HeroData`, `HeroStats`, `HeroSkillInfo` |
| `Instances/instance-factory.ts` | Crée des `HeroData` depuis les fichiers héros du frontend |
| `Spells/Spell.ts` | Classe abstraite `Spell` : `applyEffect()`, `targeting`, `scaling` |
| `Spells/SpellRegistry.ts` | Map des IDs de sorts vers leurs constructeurs. `buildSpellMap()` instancie les sorts pour un personnage |
| `Utils/resolveDamage.ts` | Calcul des dégâts physiques/magiques, résistance, `applyDamage()` |
| `Utils/resolveTargets.ts` | Résolution des cibles avec mécanique de taunt |
| `Utils/crit.ts` | Jet de critique et application |
| `Utils/lastStand.ts` | Passif Last Stand du Knight |
| `Utils/GameAction.ts` | Type `GameAction` : `{ type, skillId?, userUid, targetUids }` |

### Les 3 fonctions publiques

```typescript
// 1. Initialiser la partie
initGame(state: GameState): GameState
  - Calcule la turn queue (charge = 200 - vitesse)
  - Passe gamePhase de "draft" à "battle"

// 2. Traiter une action
processAction(state: GameState, action: GameAction): GameState
  - Trouve le personnage qui agit
  - Si stun → tick les mods → advanceTurn
  - Résout les cibles (avec taunt)
  - Exécute l'action : basic attack ou skill
  - Vérifie Last Stand sur tous les personnages
  - Tick les mods, tick le poison
  - Supprime les personnages morts
  - Vérifie le winner (player sans perso)
  - Si game over → retourne
  - Sinon → advanceTurn (passe au tour suivant)

// 3. Qui doit jouer ?
getCurrentTurnCharacter(state: GameState): CharacterInstance | undefined
  - Retourne le premier de la turn queue
```

### Système de tours

Basé sur un système de **charges** :

- **Seuil** : `TURN_THRESHOLD = 200`
- Charge initiale : `200 - speed` (plus la vitesse est élevée, plus la charge est basse, plus le perso agit tôt)
- La queue est triée par charge croissante
- Quand un perso agit, il est réinséré avec `charge = 200 - speed`
- Les autres voient leur charge décrémentée par la charge du personnage qui vient d'agir

### Résolution des sorts

```
processAction()
  → resolveSkill(skillId, user, targets)
    → spell.applyEffect(user, targets)
      → resolvePhyDamage / resolveMagDamage
        → applyDamage(target, damage)
```

Chaque sort est une classe concrète (PiercingShot, Fireball, etc.) qui implémente `applyEffect()`.

---

## gameManager.js (`/websockets/gameManager.js`)

C'est le pont entre l'engine et le serveur websocket. Il fait deux choses :

### `createGameInstance(roomId, p1Data, p2Data)`

**Rôle :** Transformer les données des joueurs en un `GameState` que l'engine peut utiliser.

**Entrée :**
- `roomId` : identifiant de la room
- `p1Data`, `p2Data` : `{ pseudo, characters: string[], levels: number[], skillsLevels: number[] }`

**Étapes :**
1. Crée 2 `PlayerInstance` (ids 0 et 1)
2. Pour chaque personnage de chaque joueur :
   - Convertit le nom (`"Archer"`) en ID (`"archer"`)
   - Récupère les stats via `getHeroData("archer")` (lit les fichiers héros du frontend)
   - Crée un `CharacterInstance` avec UID unique (`"pseudo_archer_0"`)
   - Build sa map de sorts via `buildSpellMap()` (instancie toutes les classes de sorts)
3. Assemble le `GameState` brut : `{ players, turn: 0, turnQueue: [], gamePhase: "draft" }`
4. Appelle `initGame(gameState)` → l'engine calcule la turn queue et passe en phase `"battle"`
5. **Retourne** le `GameState` initialisé

### `broadcastGameState(roomId)`

**Rôle :** Sérialiser le `GameState` (qui contient des instances de classes) en JSON simple et l'envoyer aux deux joueurs.

L'engine manipule des objets complexes :
- `CharacterInstance` avec des `Map<string, Spell>`
- `ModEntry[]`, `PoisonEntry[]`
- Des getters TypeScript

Ces objets ne sont pas directement sérialisables en JSON. `broadcastGameState` les transforme en objets plats :

```javascript
{
  turn: number,
  gamePhase: "battle" | "end",
  winnerId: number | null,
  activePlayerOwner: number,  // 0 ou 1
  turnQueue: [{ characterUid, playerOwner, charge }],
  players: [{
    id: number,
    characters: [{
      uid, currentHp, currentMp, maxHp, maxMp,
      owner, stunned, invisible, shieldHp,
      overHp, invul, taunted, poison,
      lastStandUsable, lastStandUsed
    }]
  }]
}
```

**Émet :** `io.to("game:${roomId}").emit("gameStateUpdate", payload)`

---

## server.js — Modifications pour l'engine

### Store `gameRooms`

Map qui stocke l'état de chaque partie active :

```
Map<roomId, {
  gameState:     GameState | null   // l'objet engine (créé après les 2 "initiate")
  players:       [pseudo1, pseudo2] // pseudos des 2 joueurs
  playerSockets: [socketId1, socketId2]
  teamData: {
    [pseudo]: { characters, levels, skillsLevels }
  }
}>
```

### Handler `"initiate"`

Émis par le frontend (`spells.initialData(team, roomId)`) quand un joueur arrive sur la page `/game`.

1. Le joueur rejoint le socket room `game:${roomId}`
2. Sa team data est stockée dans `gameRooms[roomId].teamData[pseudo]`
3. Dès que **les 2 joueurs** ont envoyé leur `"initiate"` (`players.length === 2`) :
   - `createGameInstance(roomId, ...)` → crée le GameState
   - Stocke le GameState dans `room.gameState`
   - `broadcastGameState(roomId)` → envoie l'état initial aux 2 joueurs
   - Émet `"gameReady"` → le frontend sait que la partie est prête

### Handler `"gameAction"`

Reçoit les actions des joueurs (`{ userUid, targetUids, type, skillId }`) et appelle `processAction()` côté serveur. Le câblage côté serveur est fonctionnel ; le frontend est en cours d'intégration pour envoyer et écouter ces events.

---

## Flux complet

```
Matchmaking (matchmaking.js)
  ↓ randomInt(0, 1000) → roomId
  ↓ stocke dans Redis: inGamePlayers[pseudo] = { opp, roomId }
  ↓ émet "matchFound" aux 2 joueurs

Frontend (page.tsx)
  ↓ GET /api/user?pseudo=...     → { team, levels, spellsLevels }
  ↓ GET /api/user/opponent?pseudo=... → { name, team, roomId }
  ↓ spells.initialData(team, roomId) → socket "initiate"

Serveur (server.js)
  ↓ stocke teamData dans gameRooms
  ↓ quand 2 joueurs ont "initiate" → createGameInstance()
  ↓ createGameInstance()
      → getHeroData() pour chaque perso
      → new CharacterInstance() × 3 par joueur
      → buildSpellMap() pour chaque perso
      → new PlayerInstance() × 2
      → initGame() → calcule la turn queue
  ↓ broadcastGameState() → "gameStateUpdate" aux 2 joueurs
  ↓ "gameReady"

Frontend
  ↓ reçoit "gameStateUpdate" → affiche l'état initial
  ↓ reçoit "gameReady" → la partie peut commencer
```

---

## Notes techniques

- **L'engine dépend du frontend** : `instance-factory.ts` et `SpellRegistry.ts` importent les fichiers héros depuis `frontend/public/gameResources/heroes/`. C'est un couplage fort à garder en tête.
- **L'engine est en TypeScript, le serveur en JavaScript** : avec Bun (`bun run server.js`), l'import de fichiers `.ts` depuis du `.js` fonctionne nativement.
- **Le GameState n'est pas persistant** : il vit uniquement en mémoire dans le Map `gameRooms`. Une panne du serveur perd toutes les parties en cours.
- **L'engine ne produit pas d'event log** : pour savoir ce qui s'est passé (ex: "X a infligé 50 dégâts à Y"), il faut comparer le state avant/après `processAction()`.
