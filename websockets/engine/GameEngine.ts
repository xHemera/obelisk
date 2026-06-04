import { GameState } from "./GameState/GameState";
import { advanceTurn, getActiveCharacter } from "./GameState/TurnSystem";
import { CharacterInstance, ModEntry } from "./Instances/CharacterInstance";
import { applyDamage, applyPoisonDamage, resolvePhyDamage } from "./Utils/resolveDamage";
import { EventBus } from "./Utils/EventBus";
import { GameAction } from "./Utils/GameAction";
import { findCharacter, resolveTargets } from "./Utils/resolveTargets";

const bus = new EventBus();

function tickAllMods(character: CharacterInstance): void {
	const tick = (mods: ModEntry[]) =>
		mods
			.map(e => ({ ...e, turn: e.turn - 1 }))
			.filter(e => e.turn > 0);

	character.phyMod        = tick(character.phyMod);
	character.magMod        = tick(character.magMod);
	character.phyResMod     = tick(character.phyResMod);
	character.magResMod     = tick(character.magResMod);
	character.critChanceMod = tick(character.critChanceMod);
	character.critDamageMod = tick(character.critDamageMod);

	if (character.stunned   > 0) character.stunned   -= 1;
	if (character.invisible > 0) character.invisible -= 1;
	if (character.taunted   > 0) character.taunted   -= 1;
	if (character.invul     > 0) character.invul     -= 1;
}

function tickPoison(state: GameState): GameState {
	state.players.flatMap(p => p.characters).forEach(character => {
		const totalDamage = character.poison.reduce((acc, { value }) => acc + value, 0);
		if (totalDamage > 0) applyPoisonDamage(character, totalDamage, "", bus);
		character.poison = character.poison
			.map(e => ({ ...e, turn: e.turn - 1 }))
			.filter(e => e.turn > 0);
	});
	return state;
}

function removeDeadCharacters(state: GameState): GameState {
	const updatedPlayers = state.players.map(player => ({
		...player,
		characters: player.characters.filter(c => c.currentHp > 0),
	}));

	const aliveUids    = new Set(updatedPlayers.flatMap(p => p.characters.map(c => c.uid)));
	const updatedQueue = state.turnQueue.filter(e => aliveUids.has(e.characterUid));

	return { ...state, players: updatedPlayers, turnQueue: updatedQueue };
}

function checkWinner(state: GameState): GameState {
	const loser = state.players.find(p => p.characters.length === 0);
	if (!loser) return state;

	const winner = state.players.find(p => p !== loser);
	return {
		...state,
		gamePhase: "end",
		winnerId:  state.players.indexOf(winner!),
	};
}

function resolveBasicAttack(user: CharacterInstance, targets: CharacterInstance[]): void {
	const isAoE = targets.length > 1;
	targets.forEach(target => {
		const damage = resolvePhyDamage(user.character.stats.physicalDamage, user, target, bus, undefined, isAoE, "basic");
		applyDamage(target, damage);
	});

	user.currentMp = Math.min(
		user.character.stats.mp,
		user.currentMp + (user.character.stats.mp / 10),
	);
}

function resolveSkill(skillId: string, user: CharacterInstance, targets: CharacterInstance[]): void {
	const spell = user.spells.get(skillId);
	if (!spell) return;
	if (user.currentMp < spell.mpCost) return;
	user.currentMp -= spell.mpCost;
	spell.applyEffect(user, targets, bus);
}

function flushEvents(): Pick<GameState, "damageEvents" | "spellEvents"> {
	const result = {
		damageEvents: bus.getDamageEvents(),
		spellEvents:  bus.getSpellEvents(),
	};
	bus.clear();
	return result;
}

export function processAction(state: GameState, action: GameAction): GameState {
	bus.clear();

	const activeEntry = state.turnQueue[0];
	if (!activeEntry || action.userUid !== activeEntry.characterUid) {
		return { ...state, ...flushEvents() };
	}

	state.players
		.flatMap(p => p.characters)
		.forEach(c => c.hasBeenCrit = false);

	const character = findCharacter(state, action.userUid);

	if (!character) {
		let newState = tickPoison(state);
		newState = removeDeadCharacters(newState);
		newState = checkWinner(newState);
		if (newState.gamePhase === "end") return { ...newState, ...flushEvents() };
		return { ...advanceTurn(newState), ...flushEvents() };
	}

	if (character.stunned > 0) {
		tickAllMods(character);
		let newState = tickPoison(state);
		newState = removeDeadCharacters(newState);
		newState = checkWinner(newState);
		if (newState.gamePhase === "end") return { ...newState, ...flushEvents() };
		return { ...advanceTurn(newState), ...flushEvents() };
	}

	tickAllMods(character);

	let newState = tickPoison(state);
	newState = removeDeadCharacters(newState);
	newState = checkWinner(newState);
	if (newState.gamePhase === "end") return { ...newState, ...flushEvents() };

	if (action.type === "skip") {
		character.currentMp = Math.min(
			character.character.stats.mp,
			character.currentMp + (character.character.stats.mp / 10),
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
	newState = checkWinner(newState);
	if (newState.gamePhase === "end") return { ...newState, ...flushEvents() };

	return { ...advanceTurn(newState), ...flushEvents() };
}

export function getCurrentTurnCharacter(state: GameState): CharacterInstance | undefined {
	const entry = getActiveCharacter(state);
	if (!entry) return undefined;
	return findCharacter(state, entry.characterUid);
}