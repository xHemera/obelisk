# Game Guide

## Heroes

| Hero | HP | Phys | Mag | Speed | Role |
|------|----|------|-----|-------|------|
| Knight | 2180 | 145 | 55 | 88 | Tank (stun, taunt, shield) |
| Mage | 980 | 55 | 185 | 102 | Burst (burn, multi-hit, AOE) |
| Healer | 1380 | 65 | 155 | 95 | Support (heal, invul, buff) |
| Archer | 1240 | 165 | 45 | 118 | DPS (armor pen, AOE, crit) |
| Assassin | 1080 | 195 | 35 | 128 | Execute (poison, invis) |

3 spells per hero (levels 1-10).

## Combat

Charge-based turns: `charge = 200 - speed`. Fast heroes act more often.

Actions: basic attack (regen MP), skill (costs MP), skip.

Status effects: stun, poison/burn, taunt, invisibility, invulnerable, shield, Last Stand.

Damage formula: `damage = raw * (1 + atkMod%) * 100 / (100 + resistance)`, plus crit multiplier.

## Engine (`websockets/engine/`)

Pure TypeScript, no side-effects.

| Function | Description |
|----------|-------------|
| `initGame(state)` | Calculate turn queue, set phase to `"battle"` |
| `processAction(state, action)` | Resolve action, tick mods, check winner |
| `getCurrentTurnCharacter(state)` | Return first in turn queue |

`gameManager.js` bridges Socket.IO ↔ engine: `createGameInstance()` builds GameState, `broadcastGameState()` serializes and emits.

## Progression

- Level 1-10, linear stat scaling
- Spells upgraded with rubies (click Mine, 12-35 random)
- Badges: BEGINNER (5 wins) → AMATEUR → EXPERT → MASTER (50 wins)

## Pong

Real-time multiplayer Pong. Redis queue + dedicated matchmaking. XP feeds into hero progression.
