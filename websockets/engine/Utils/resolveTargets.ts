import { GameState } from "../GameState/GameState";
import { CharacterInstance } from "../Instances/CharacterInstance";
import { SpellTargeting } from "../Spells/Spell";
import { GameAction } from "./GameAction";

export function findCharacter(state: GameState, uid: string): CharacterInstance | undefined {
  return state.players
    .flatMap(p => p.characters)
    .find(c => c.uid === uid);
}

export function resolveTargets(
  state:    GameState,
  user:     CharacterInstance,
  action:   GameAction
): CharacterInstance[] {
  const enemies = state.players
    .filter(p => p.id !== user.owner)
    .flatMap(p => p.characters);

  const tauntedKnight = enemies.find(e => e.taunted > 0);

  const spell = action.skillId ? user.spells.get(action.skillId) : null;

  const isAoe  = spell?.targeting === "aoe" || spell?.targeting === "teamAoe";
  if (isAoe) {
    const pool = spell?.targeting === "teamAoe"
      ? state.players.filter(p => p.id === user.owner).flatMap(p => p.characters)
      : enemies;
    return tauntedKnight ? [tauntedKnight] : pool;
  }

  const isTeamSingle = spell?.targeting === "teamSingle";
  if (isTeamSingle) {
	return action.targetUids
		.map(uid => findCharacter(state, uid))
		.filter((c): c is CharacterInstance => c !== undefined);
  }

  const rawTargets = action.targetUids
    .map(uid => findCharacter(state, uid))
    .filter((c): c is CharacterInstance => c !== undefined)
    .filter(c => c.invisible === 0);

  if (!tauntedKnight) return rawTargets;

  const targetsEnemies = rawTargets.some(t => t.owner !== user.owner);
  if (!targetsEnemies) return rawTargets;

  return [tauntedKnight];
}

export function getValidTargets(
  state: GameState,
  user:  CharacterInstance,
  targeting: SpellTargeting | "basic" = "basic"
): CharacterInstance[] {
  if (targeting === "teamSingle") {
    return state.players
      .filter(p => p.id === user.owner)
      .flatMap(p => p.characters);
  }
  return state.players
    .filter(p => p.id !== user.owner)
    .flatMap(p => p.characters)
    .filter(c => c.invisible === 0);
}