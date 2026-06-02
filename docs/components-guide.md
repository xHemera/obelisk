# Components — Atomic Design

Organisation dans `frontend/components/` :

```
atoms/       — composants de base (Button, Input, Card, etc.)
molecules/   — assemblage d'atomes (IconField, SpellSelector)
organisms/   — sections complètes (TeamBuilder, CharacterViewer)
```

## Atoms

### Button

Props : `variant` ("primary" | "secondary"), `onClick`, `className`, `children`.

### Input

Input text basique avec label.

### Card

Conteneur avec bordure thème RPG.

### IconButton, StatusPill, FeatureActionTile

Utilisés sur la home page. `FeatureActionTile` = tuile cliquable (PvP, Pong, Mine).

### Game atoms

| Composant | Rôle |
|-----------|------|
| `Fighter` | Perso allié avec chibi + barre de HP |
| `EnemyFighter` | Perso ennemi (barre rouge) |
| `ManaBar` | Barre de mana verticale |
| `TurnQueue` | Ordre du tour (sidebar) |
| `SpellButton` | Bouton de sort avec icône |
| `ProfileInfo` | Pseudo + avatar du joueur |
| `InfoModal` | Toaste "Your Turn" / "Opponent's Turn" |

## Molecules

| Composant | Rôle |
|-----------|------|
| `IconField` | Input avec icône |
| `SpellSelector` | Grille de sorts du héros sélectionné |
| `FriendRequestBanner` | Bannière de demande d'ami |
| `UserContact` | Contact dans la liste sociale |
| `MessageInput` | Zone de saisie de message |

## Organisms

| Composant | Rôle |
|-----------|------|
| `TeamBuilder` | Drag & drop de l'équipe (home) |
| `PvpMatchmakingModal` | Modal "Searching opponent..." |
| `PongMatchmakingModal` | Modal "Searching opponent..." pour le Pong |
| `CharacterViewer` | Page perso : stats, sorts, level up |
| `CharacterStatsSection` | Statistiques détaillées |
| `ProfileViewer` | Modal de profil utilisateur |
| `AdminPanel` | Interface d'admin |

### Backgrounds

Composants décoratifs dans `components/backgrounds/` : `BottomBar`, `GameArenaBackground`.

## Pages (app/)

| Route | Description |
|-------|-------------|
| `/` | Landing page (non connecté) |
| `/home` | Dashboard : Mine, PvP, Pong, TeamBuilder |
| `/game` | Écran de combat PvP |
| `/characters` | Gestion des héros |
| `/social` | Messagerie, amis, défis |
| `/pong` | Mini-jeu Pong multijoueur |
| `/admin` | Panel admin |
| `/profile/[pseudo]` | Profil public d'un joueur |
| `/not-connected` | Page "pas connecté" |
| `/policy` | Politique de confidentialité |
| `/terms` | Conditions d'utilisation |
