import { CharacterInstance } from "../Instances/CharacterInstance";
import { GameState } from "./GameState";

export type TurnEntry = {
	characterUid: 	string;
	playerOwner: 	number;
	charge:			number;
}

const	TURN_THRESHOLD = 200;

function sortQueue(queue: TurnEntry[]): TurnEntry[] {
    return [...queue].sort((a, b) => {
		if (a.charge !== b.charge) return a.charge - b.charge;
		return Math.random() - 0.5;
	});
}

export function initTurnQueue(state: GameState): TurnEntry[] {
	const allCharacters = state.players.flatMap(players => 
		players.characters.map(character => ({
			characterUid:	character.uid,
			playerOwner:	character.owner,
			charge:			TURN_THRESHOLD - character.character.stats.speed,
		}))
	);

	return sortQueue(allCharacters);
}

export function getActiveCharacter(state: GameState): TurnEntry | undefined {
	return state.turnQueue[0];
}

function findCharacter(state: GameState, uid: string): CharacterInstance | undefined {
    return state.players
        .flatMap(p => p.characters)
        .find(c => c.uid === uid);
}

export function advanceTurn(state: GameState): GameState {
    const [current, ...rest] = state.turnQueue;

    // If queue is empty, return state unchanged
    if (!current) return { ...state, turn: state.turn + 1 };

    const character = findCharacter(state, current.characterUid);
    const speed     = character?.character.stats.speed ?? 1;

    const decremented = rest.map(entry => ({
        ...entry,
        charge: entry.charge - current.charge,
    }));

    const requeued: TurnEntry = {
        ...current,
        charge: TURN_THRESHOLD - speed,
    };

    const newQueue = sortQueue([...decremented, requeued]);

    return {
        ...state,
        turn:      state.turn + 1,
        turnQueue: newQueue,
    };
}