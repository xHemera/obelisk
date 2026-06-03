import { getCurrentTurnCharacter } from "./engine/GameEngine.ts";
import { initGame } from "./engine/GameState/initGameState.ts";
import { getHeroData } from "./engine/Instances/instance-factory.ts";
import { buildSpellMap } from "./engine/Spells/SpellRegistry.ts";
import { PlayerInstance } from "./engine/Instances/PlayerInstance.ts";
import { CharacterInstance } from "./engine/Instances/CharacterInstance.ts";
import { io, gameRooms } from "./server.js";

function makeCharacterInstances(pseudo, playerId, characters, levels, skillsLevels) {
  return characters.map((charName, i) => {
    const heroId = charName.toLowerCase();
    const heroData = structuredClone(getHeroData(heroId));
    const uid = `${pseudo}_${heroId}_${i}`;

    heroData.skills = heroData.skills.map((skill, j) => ({
      ...skill,
      level: skillsLevels?.[i * 3 + j] ?? 1,
    }));

    const instance = new CharacterInstance(uid, heroData, playerId);
    instance.currentHp = heroData.stats.hp;
    instance.currentMp = heroData.stats.mp;
    instance.spells = buildSpellMap(heroId, heroData.skills);

    return instance;
  });
}

export function createGameInstance(roomId, p1Data, p2Data) {
  console.log(`[GameServer] createGameInstance — P0=${p1Data.pseudo} chars=${JSON.stringify(p1Data.characters)} P1=${p2Data.pseudo} chars=${JSON.stringify(p2Data.characters)}`);

  const p1 = new PlayerInstance(0);
  const p2 = new PlayerInstance(1);

  p1.characters = makeCharacterInstances(
    p1Data.pseudo, 0,
    p1Data.characters, p1Data.levels, p1Data.skillsLevels,
  );
  p2.characters = makeCharacterInstances(
    p2Data.pseudo, 1,
    p2Data.characters, p2Data.levels, p2Data.skillsLevels,
  );

  const gameState = {
    players: [p1, p2],
    activePlayer: 0,
    turn: 0,
    turnQueue: [],
    gamePhase: "draft",
    damageEvents: [],
  };

  const result = initGame(gameState);

  const summary = result.turnQueue.map(e => {
    const heroId = e.characterUid.split("_").at(-2);
    return `P${e.playerOwner}:${heroId}@${e.charge}`;
  });
  console.log(`[GameServer]   → turnQueue order: ${summary.join(" > ")}`);

  return result;
}

export function broadcastGameState(roomId) {
  const room = gameRooms.get(roomId);
  if (!room?.gameState) {
    console.log(`[GameServer] broadcastGameState skipped — room ${roomId} has no gameState`);
    return;
  }

  const state = room.gameState;
  const turnCharacter = getCurrentTurnCharacter(state);
  const currentOwner = turnCharacter?.owner ?? 0;

  const activeUid = state.turnQueue[0]?.characterUid ?? "none";
  const charCounts = state.players.map(p => `P${p.id}:${p.characters.length}`).join(" ");
  console.log(
    `[GameServer] broadcastGameState room=${roomId} turn=${state.turn} phase=${state.gamePhase} activePlayer=${currentOwner} activeChar=${activeUid} chars=[${charCounts}]`
  );

  const payload = {
    turn: state.turn,
    gamePhase: state.gamePhase,
    winnerId: state.winnerId ?? null,
    activePlayerOwner: currentOwner,
    damageEvents: state.damageEvents ?? [],
    spellEvents: state.spellEvents ?? [],
    turnQueue: state.turnQueue.map(e => ({
      characterUid: e.characterUid,
      playerOwner: e.playerOwner,
      charge: e.charge,
    })),
    players: state.players.map(p => ({
      id: p.id,
      characters: p.characters.map(c => ({
        uid: c.uid,
        currentHp: c.currentHp,
        currentMp: c.currentMp,
        maxHp: c.character.stats.hp,
        maxMp: c.character.stats.mp,
        owner: c.owner,
        stunned: c.stunned,
        invisible: c.invisible,
        shieldHp: c.shieldHp,
        overHp: c.overHp,
        invul: c.invul,
        taunted: c.taunted,
        poison: [...c.poison],
        phyMod: c.phyMod.map(e => ({ ...e })),
        magMod: c.magMod.map(e => ({ ...e })),
        phyResMod: c.phyResMod.map(e => ({ ...e })),
        magResMod: c.magResMod.map(e => ({ ...e })),
        critChanceMod: c.critChanceMod.map(e => ({ ...e })),
        critDamageMod: c.critDamageMod.map(e => ({ ...e })),
        lastStandUsable: c.lastStandUsable,
        lastStandUsed: c.lastStandUsed,
      })),
    })),
  };

  room.playerConns?.forEach((sock, i) => {
    console.log(`[GameServer]   → emit gameStateUpdate to player ${i} (playerId=${i} activePlayerOwner=${currentOwner})`);
    sock?.emit("gameStateUpdate", { ...payload, playerId: i });
  });
}
