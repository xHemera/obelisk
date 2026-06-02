# Game Features — ce qui existe vraiment

## Equipe

Chaque joueur a 3 slots d'équipe, stockés dans `GameState.team` (Prisma, `String[]`). L'équipe est choisie sur la page home via le `TeamBuilder` et persistée en localStorage + base de données.

## Héros disponibles

| Hero | HP | Phys Dmg | Mag Dmg | Speed | Rôle |
|------|----|----------|---------|-------|------|
| Knight | 2180 | 145 | 55 | 88 | Tank (stun, taunt, Last Stand) |
| Mage | 980 | 55 | 185 | 102 | Burst magique (burn, multi-hit, AOE) |
| Healer | 1380 | 65 | 155 | 95 | Support (heal, invul, buff défense) |
| Archer | 1240 | 165 | 45 | 118 | DPS physique (armor pen, AOE, crit) |
| Assassin | 1080 | 195 | 35 | 128 | Burst physique (execute, poison, invis) |

Chaque héro a 3 sorts, 10 niveaux de scaling chacun. Stats complètes : `physicalDamage`, `magicalDamage`, `critChance`, `critDamage`, `hp`, `mp`, `physicalResistance`, `magicalResistance`, `speed`.

Les héros sont dans `frontend/public/gameResources/heroes/<hero>/hero.ts`.

## Système de combat

L'engine est dans `/engine/`. C'est un module TypeScript pur, sans réseau ni base de données. Il prend un `GameState` et une `GameAction`, retourne le nouveau state.

### Phases

`"draft"` → `initGame()` → `"battle"` → `processAction()` → `"end"`

### Tours (charge-based)

```
charge = 200 - speed
```

La turn queue est triée par charge croissante. Quand un perso agit, il est réinséré avec `200 - speed` et les autres voient leur charge baisser. Les persos rapides (Assassin 128, Archer 118) agissent plus souvent.

### Actions disponibles

- **basic attack** : tape la cible, regen MP (10% du max)
- **skill** : utilise un sort, consomme du MP

### Sorts

| Hero | Sort 1 | Sort 2 | Sort 3 |
|------|--------|--------|--------|
| Archer | Piercing Shot (ignore armor) | Rain of Arrows (AOE) | Precision Focus (buff crit) |
| Assassin | Shadow Strike (execute si bas HP) | Venom Blade (poison) | Phantom Step (invis + bonus dmg) |
| Healer | Healing Light (single heal) | Sanctuary (AOE heal + def buff) | Divine Protection (invul team) |
| Knight | Shield Bash (stun) | Iron Will (taunt + def) | Last Stand (shield passif) |
| Mage | Fireball (burn) | Arcane Missiles (multi-hit) | Meteor (AOE) |

### Status effects

| Status | Effet |
|--------|-------|
| Stun | Saute le tour |
| Poison/Burn | Dégâts par tour |
| Taunt | Force les ennemis à cibler le taunteur |
| Invisible | Esquive / bonus sur prochaine attaque |
| Invulnérable | Bloque tous les dégâts |
| Shield | Absorbe les dégâts avant les HP |
| Overheal | HP bonus temporaires (heal en trop) |
| Last Stand | Bouclier auto quand HP < seuil |
| Mods attaque/défense | Buffs/débuffs en pourcentage, durée limitée |
| Mods crit | Chance/dégâts critiques modifiés |

### Formules dégâts

```
physDamage = raw * (1 + attaqueMod%/100)
physDamage = physDamage * 100 / (100 + resistance)
si crit: physDamage *= (1 + critDamage/100)

résistance = `damage * 100 / (100 + totalResistance)`
```

L'armor pen de Piercing Shot remplace `totalResistance` par `totalResistance * (1 - pen%/100)`.

## Matchmaking PvP

### Flow

1. Home page → clique sur "PvP" → POST /api/home (push dans Redis `players_queue`)
2. Matchmaking daemon (`matchmaking.js`) pop 2 joueurs toutes les 1s
3. Génère un `roomId` random (0-1000), stocke dans Redis `inGamePlayers`
4. Emet `"matchFound"` aux 2 sockets
5. Les 2 navigateurs vont sur `/game`
6. Chaque joueur fetch `/api/user/opponent` → récupère l'adversaire + roomId
7. Appelle `spells.initialData(team, roomId)` → socket `"initiate"`
8. Serveur reçoit les 2 initiate → `gameManager.createGameInstance()` → `initGame()` de l'engine
9. `broadcastGameState()` envoie l'état initial aux 2 joueurs
10. La partie est prête (event `"gameReady"`)

### État actuel

- ✅ Matchmaking fonctionnel
- ✅ GameState créé côté serveur avec l'engine
- ✅ État initial broadcast aux 2 joueurs
- ✅ Server-side `gameAction` → `processAction()` câblé
- 🚧 Frontend de combat en cours d'intégration (affichage temps réel, sélection de cibles)

## Pong Mini-Game

Un Pong multijoueur temps réel accessible depuis la home page. File d'attente dédiée (`pong_queue` dans Redis), matchmaking séparé (`matchmakingpong.js`). Les gains en XP sont reversés dans le système de progression des héros.

## Progression

### Personnages

- Chaque perso a un niveau (1-10+)
- Stats scaling linéaire : `stat = baseStat + growthStat * (level - 1)`
- API : `GET /api/characters?username=...` retourne tous les persos avec stats calculées

### Sorts

- Chaque sort a son propre niveau (1-10)
- `PUT /api/characters` → level up (`increment`)
- `PATCH /api/characters` → XP (`plus one`), coûte des rubis

### Badges

Badges attribués automatiquement selon les victoires PvP :
- BEGINNER → 5 victoires
- AMATEUR → 10 victoires
- EXPERT → 20 victoires
- MASTER → 50 victoires

### Rubis

- Click-to-earn sur le bouton Mine de la home page
- `POST /api/profile/resources` → gain aléatoire 12-35 rubis
- Stocké dans `GameState.rubis` (Prisma)

## Ce qui n'existe PAS (malgré ce que disent les vieux docs)

- ❌ Système d'expédition
- ❌ MMR / ranking / leaderboard
- ❌ Mode "Defend" / "Item" en combat
- ❌ Stats `attack`/`defense` plates (remplacées par `physicalDamage`/`magicalDamage`/`physicalResistance`/`magicalResistance`)
