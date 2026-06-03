import { CharacterInstance } from "../Instances/CharacterInstance";
import { getHeroData, getRawHero } from "../Instances/instance-factory";
import { PlayerInstance } from "../Instances/PlayerInstance";
import { buildSpellMap } from "../Spells/SpellRegistry";
import { GameState } from "./GameState";
import { initTurnQueue } from "./TurnSystem";

export function initGame(state: GameState): GameState {
	const turnQueue = initTurnQueue(state);
	return { ...state, gamePhase: "battle", turnQueue };
}

export type Team = {
	owner:			string;
	characters:		string[];
	levels:			number[];
	skillLevels:	number[];
}

function createCharacter(
  heroId:      string,
  ownerIndex:  number,
  level:       number,
  skillLevels: number[]
): CharacterInstance {
  const hero    = getRawHero(heroId);
  const heroData = getHeroData(heroId);
  const grownStats = { ...heroData.stats };
  for (const key in hero.baseStats) {
    const k = key as keyof typeof hero.baseStats;
    grownStats[k] = hero.baseStats[k] + hero.growth[k] * (level - 1);
  }
  const characterWithLevels = {
    ...heroData,
    stats:  grownStats,
    skills: heroData.skills.map((s, i) => ({
      ...s,
      level: skillLevels[i] ?? 1,
    })),
  };
  const uid      = `${heroId}_${ownerIndex}_${Date.now()}`;
  const instance = new CharacterInstance(uid, characterWithLevels, ownerIndex);
  instance.spells = buildSpellMap(heroId, characterWithLevels.skills);
  return instance;
}

export function initGameState(teamA: Team, teamB: Team): GameState {
  const teams = [teamA, teamB];

  const players: PlayerInstance[] = teams.map((team, ownerIndex) => {
    const player = new PlayerInstance(ownerIndex);

    player.characters = team.characters.map((heroId, i) =>
      createCharacter(
        heroId,
        ownerIndex,
        team.levels[i]      ?? 1,
        team.skillLevels.slice(i * 3, i * 3 + 3)
      )
    );

    return player;
  });

  const draft: GameState = {
    players,
    activePlayer: 0,
    turn:         0,
    turnQueue:    [],
    gamePhase:    "battle",
    damageEvents: [],
  };

  return initGame(draft);
}
