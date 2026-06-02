import { GameState } from "./GameState/GameState";
import { advanceTurn, getActiveCharacter, initTurnQueue } from "./GameState/TurnSystem";
import { CharacterInstance, ModEntry } from "./Instances/CharacterInstance";
import { applyDamage, applyPoisonDamage, resolvePhyDamage, clearDamageEvents, getDamageEvents, getSpellEvents } from "./Utils/resolveDamage";
import { GameAction } from "./Utils/GameAction";
import { findCharacter, resolveTargets } from "./Utils/resolveTargets";
import { PlayerInstance } from "./Instances/PlayerInstance";

function tickAllMods(character: CharacterInstance): void {
	const tick = (mods: ModEntry[]) =>
		mods
			.map(e => ({ ...e, turn: e.turn - 1 }))
			.filter(e => e.turn > 0);

	character.phyMod		= tick(character.phyMod);
	character.magMod		= tick(character.magMod);
	character.phyResMod		= tick(character.phyResMod);
	character.magResMod		= tick(character.magResMod);
	character.critChanceMod	= tick(character.critChanceMod);
	character.critDamageMod	= tick(character.critDamageMod);

	if (character.stunned   > 0) character.stunned   -= 1;
	if (character.invisible > 0) character.invisible -= 1;
	if (character.taunted   > 0) character.taunted   -= 1;
	if (character.invul     > 0) character.invul     -= 1;
}

function tickPoison(state: GameState): GameState {
	state.players.flatMap(p => p.characters).forEach(character => {
		const totalDamage   = character.poison.reduce((acc, { value }) => acc + value, 0);
		if (totalDamage > 0) {
			console.log(`[GameEngine] tickPoison — ${character.uid} takes ${totalDamage} poison damage (hp=${character.currentHp}→${Math.max(0, character.currentHp - totalDamage)})`);
			applyPoisonDamage(character, totalDamage, "");
		}
		character.poison    = character.poison
			.map(e => ({ ...e, turn: e.turn - 1 }))
			.filter(e => e.turn > 0);
	});
	return state;
}

function removeDeadCharacters(state: GameState): GameState {
	const updatedPlayers = state.players.map((player, pi) => {
		const alive = player.characters.filter(c => c.currentHp > 0);
		const dead = player.characters.filter(c => c.currentHp <= 0);
		if (dead.length > 0) {
			console.log(`[GameEngine] removeDeadCharacters — player ${pi}: ${dead.length} dead (${dead.map(c => `${c.uid} hp=${c.currentHp}`).join(", ")}), ${alive.length} alive`);
		}
		return { ...player, characters: alive };
	});

	const aliveUids    = new Set(updatedPlayers.flatMap(p => p.characters.map(c => c.uid)));
	const updatedQueue = state.turnQueue.filter(e => aliveUids.has(e.characterUid));

	return { ...state, players: updatedPlayers, turnQueue: updatedQueue };
}

function checkWinner(state: GameState): GameState {
	const charCounts = state.players.map(p => `${p.id}:${p.characters.length}`);
	const loser = state.players.find(p => p.characters.length === 0);
	if (!loser) return state;

	const winner = state.players.find(p => p !== loser);
	console.log(`[GameEngine] checkWinner — game end! remaining chars=${charCounts.join(",")} winnerId=${state.players.indexOf(winner!)}`);
	return {
		...state,
		gamePhase: "end",
		winnerId:  state.players.indexOf(winner!),
	};
}

function resolveBasicAttack(user: CharacterInstance, targets: CharacterInstance[]): void {
	const isAoE = targets.length > 1;
	targets.forEach(target => {
		const raw    = user.character.stats.physicalDamage;
		const damage = resolvePhyDamage(raw, user, target, undefined, isAoE, "basic");
		console.log(`[GameEngine] resolveBasicAttack — user=${user.character.name}(${user.uid}) raw=${raw} target=${target.character.name}(${target.uid}) hpBefore=${target.currentHp} damage=${damage}`);
		applyDamage(target, damage);
		console.log(`[GameEngine] resolveBasicAttack — after apply: ${target.uid} hp=${target.currentHp} shield=${target.shieldHp} invul=${target.invul}`);
	});

	user.currentMp = Math.min(
		user.character.stats.mp,
		user.currentMp + (user.character.stats.mp / 10)
	);
}

function resolveSkill(skillId: string, user: CharacterInstance, targets: CharacterInstance[]): void {
	const spell = user.spells.get(skillId);
	if (!spell) return;

	if (user.currentMp < spell.mpCost) return;
	user.currentMp -= spell.mpCost;

	spell.applyEffect(user, targets);
}

export function processAction(state: GameState, action: GameAction): GameState {
	clearDamageEvents();

	state.players
		.flatMap(p => p.characters)
		.forEach(c => c.hasBeenCrit = false);

	const character = findCharacter(state, action.userUid);

	if (!character) return { ...state, damageEvents: getDamageEvents(), spellEvents: getSpellEvents() };

	if (character.stunned > 0) {
		tickAllMods(character);
		const advanced = advanceTurn(state);
		return { ...advanced, damageEvents: getDamageEvents(), spellEvents: getSpellEvents() };
	}
	tickAllMods(character);

	let	newState = tickPoison(state);
		newState = removeDeadCharacters(newState);
		newState = checkWinner(newState);

	if (action.type === "skip") {
		character.currentMp = Math.min(
		character.character.stats.mp,
		character.currentMp + (character.character.stats.mp / 10)
		);
	} else {
		const targets = resolveTargets(newState, character, action);
		if (targets.length > 0) {
			if (action.type === "basic") {
				resolveBasicAttack(character, targets);
			} else if (action.type === "skill" && action.skillId) {
				resolveSkill(action.skillId, character, targets);
			}
		}
	}

		newState = removeDeadCharacters(newState);
		console.log(`[GameEngine] processAction — after removeDead: players chars=${newState.players.map(p => `P${p.id}:${p.characters.length}`).join(", ")} turnQueue=${newState.turnQueue.length}`);
		newState = checkWinner(newState);
		console.log(`[GameEngine] processAction — after checkWinner: phase=${newState.gamePhase} winnerId=${newState.winnerId}`);

	if (newState.gamePhase === "end") {
		console.log(`[GameEngine] processAction END (game over) — turn=${newState.turn} winnerId=${newState.winnerId}`);
		return { ...newState, damageEvents: getDamageEvents(), spellEvents: getSpellEvents() };
	}

	newState = advanceTurn(newState);
	console.log(`[GameEngine] processAction END — turn now ${newState.turn} active=${newState.turnQueue[0]?.characterUid} queue=${newState.turnQueue.map(e => `${e.characterUid}@${Math.round(e.charge)}`).join(" > ")}`);
	return { ...newState, damageEvents: getDamageEvents(), spellEvents: getSpellEvents() };
}

export function getCurrentTurnCharacter(state: GameState): CharacterInstance | undefined {
	const entry = getActiveCharacter(state);
	return findCharacter(state, entry.characterUid);
}