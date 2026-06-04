"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { CHARACTERS, HERO_MAP } from "@/public/gameResources/heroes";
import { useGameData } from "./useGameData";
import { useGameSocket } from "./useGameSocket";
import { useTurnInfo } from "./useTurnInfo";
import { useTargeting } from "./useTargeting";
import ProfileInfo from "@/components/atoms/game/ProfileInfo";
import Fighter, { type StatusEffect } from "@/components/atoms/game/Fighter";
import TurnQueue from "@/components/atoms/game/TurnQueue";
import InfoModal from "@/components/atoms/game/InfoModal";
import GameLoadingScreen from "@/components/atoms/game/GameLoadingScreen";
import GameArenaBackground from "@/components/backgrounds/GameArenaBackground";
import BottomBar from "@/components/backgrounds/BottomBar";
import FloatingDamage from "@/components/atoms/game/FloatingDamage";
import PixelAnimation from "@/components/atoms/game/PixelAnimation";
import { getTargetAnim, getSpellAnim, preloadAllAnimations } from "@/lib/animationManager";
import type { AnimDef } from "@/lib/animationManager";
import type { CharacterState, DamageEvent, ModEntry } from "./types";

type DamageAnim = {
  id: number;
  targetUid: string;
  targetHeroId: string;
  attackerUid: string;
  damage: number;
  isCrit: boolean;
  lethal: boolean;
  isAoE: boolean;
  source: string;
};

type PixelAnimInstance = {
  id: number;
  uid: string;
  anim: AnimDef;
};

function findCharByHeroId(chars: CharacterState[] | undefined, heroId: string) {
  return chars?.find(c => c.uid.split("_").at(-2) === heroId) ?? null;
}

function eventsToAnims(events: DamageEvent[], startId: number): DamageAnim[] {
  return events.map((e, i) => ({
    id: startId + i,
    targetUid: e.targetUid,
    targetHeroId: e.targetUid.split("_").at(-2) ?? "",
    attackerUid: e.attackerUid,
    damage: e.damage,
    isCrit: e.isCrit,
    lethal: e.lethal,
    isAoE: e.isAoE,
    source: e.source,
  }));
}

function findAnimsForFighter(
  anims: DamageAnim[],
  heroId: string,
  ownerPrefix: string,
  charState?: CharacterState | null,
): DamageAnim[] {
  if (charState) {
    return anims.filter(a => a.targetUid === charState.uid);
  }
  return anims.filter(
    a => a.targetHeroId === heroId && a.targetUid.startsWith(ownerPrefix + "_"),
  );
}

function maxTurns(mods: ModEntry[]): number | undefined {
  const max = mods.reduce((acc, m) => Math.max(acc, m.turn), 0);
  return max > 0 ? max : undefined;
}

function toStatusEffects(charState: CharacterState | undefined | null): StatusEffect[] {
  if (!charState) return [];
  const effects: StatusEffect[] = [];

  if (charState.stunned > 0) {
    effects.push({ type: "cc", label: "Stunned", turns: charState.stunned });
  }
  if (charState.invisible > 0) {
    effects.push({ type: "buff", label: "Invisible", turns: charState.invisible });
  }
  if (charState.shieldHp > 0) {
    effects.push({ type: "buff", label: "Shield" });
  }
  if (charState.overHp > 0) {
    effects.push({ type: "buff", label: "Overheal" });
  }
  if (charState.invul > 0) {
    effects.push({ type: "buff", label: "Invulnerable", turns: charState.invul });
  }
  if (charState.taunted > 0) {
    effects.push({ type: "debuff", label: "Taunted", turns: charState.taunted });
  }
  for (const p of charState.poison) {
    if (p.turn > 0) {
      effects.push({ type: "dot", label: "Poison", turns: p.turn });
    }
  }

  if (charState.phyMod.length > 0) {
    effects.push({ type: "buff", label: "Phys. Attack", turns: maxTurns(charState.phyMod) });
  }
  if (charState.magMod.length > 0) {
    effects.push({ type: "buff", label: "Mag. Attack", turns: maxTurns(charState.magMod) });
  }
  if (charState.phyResMod.length > 0) {
    effects.push({ type: "buff", label: "Phys. Defense", turns: maxTurns(charState.phyResMod) });
  }
  if (charState.magResMod.length > 0) {
    effects.push({ type: "buff", label: "Mag. Defense", turns: maxTurns(charState.magResMod) });
  }
  if (charState.critChanceMod.length > 0) {
    effects.push({ type: "buff", label: "Crit Chance", turns: maxTurns(charState.critChanceMod) });
  }
  if (charState.critDamageMod.length > 0) {
    effects.push({ type: "buff", label: "Crit Damage", turns: maxTurns(charState.critDamageMod) });
  }

  return effects;
}

export default function Game() {
  const router = useRouter();
  const {
    userPseudo,
    userAvatar,
    oppAvatar,
    playerCharacters,
    team,
    oppTeam,
    opponent,
    roomId,
    loadingPhase: dataPhase,
  } = useGameData();

  const { gameState, playerId } = useGameSocket(userPseudo, opponent);

  const {
    isYourTurn,
    myCharacters,
    oppCharacters,
    activeCharacterUid,
    activeHeroId,
    activeMp,
    activeMaxMp,
    isInfoModalOpen,
    setIsInfoModalOpen,
    isGameOver,
    isWinner,
    turnTransitioning,
  } = useTurnInfo(gameState, playerId);

  // Active hero definition
  const activeHeroDef = useMemo(() => {
    if (activeHeroId) return HERO_MAP.byId.get(activeHeroId) ?? null;
    return null;
  }, [activeHeroId]);

  const {
    targetingMode,
    validTargetUids,
    confirmForfeit,
    setConfirmForfeit,
    handleCastSpell,
    handleTargetSelect,
    handleSkipTurn,
  } = useTargeting(activeCharacterUid, myCharacters, oppCharacters, activeHeroDef);

  // Preload all animation frames on mount (while loading screen is shown)
  useEffect(() => {
    Promise.allSettled(preloadAllAnimations());
  }, []);

  // Damage & pixel animations
  const [damageAnims, setDamageAnims] = useState<DamageAnim[]>([]);
  const [pixelAnims, setPixelAnims] = useState<PixelAnimInstance[]>([]);
  const animIdRef = useRef(0);
  const pixAnimIdRef = useRef(0);
  const lastEventsTurnRef = useRef(-1);

  useEffect(() => {
    if (!gameState || gameState.turn === lastEventsTurnRef.current) return;
    lastEventsTurnRef.current = gameState.turn;
    console.log(`[GamePage] processing turn ${gameState.turn}: ${gameState.damageEvents?.length ?? 0} damageEvents, ${gameState.spellEvents?.length ?? 0} spellEvents`);
    if (gameState.damageEvents?.length) {
      const newAnims = eventsToAnims(gameState.damageEvents, animIdRef.current);
      animIdRef.current += gameState.damageEvents.length;
      setDamageAnims(prev => [...prev, ...newAnims]);

      const newPix: PixelAnimInstance[] = [];
      for (const ev of gameState.damageEvents) {
        newPix.push({
          id: pixAnimIdRef.current,
          uid: ev.targetUid,
          anim: getTargetAnim(ev.isCrit, ev.isAoE, ev.source),
        });
        pixAnimIdRef.current += 1;
      }
      setPixelAnims(prev => [...prev, ...newPix]);
    }

    if (gameState.spellEvents?.length) {
      const newPix: PixelAnimInstance[] = [];
      for (const ev of gameState.spellEvents) {
        const anim = getSpellAnim(ev.type);
        if (!anim) continue;
        newPix.push({
          id: pixAnimIdRef.current,
          uid: ev.targetUid,
          anim,
        });
        pixAnimIdRef.current += 1;
      }
      setPixelAnims(prev => [...prev, ...newPix]);
    }
  }, [gameState]);

  const removeAnim = useCallback((id: number) => {
    setDamageAnims(prev => prev.filter(a => a.id !== id));
  }, []);

  const removePixelAnim = useCallback((id: number) => {
    setPixelAnims(prev => prev.filter(a => a.id !== id));
  }, []);

  const isAnimating = damageAnims.length > 0 || turnTransitioning;
  const animLogRef = useRef<{ t: boolean; d: number } | null>(null);
  useEffect(() => {
    const prev = animLogRef.current;
    if (!prev || prev.t !== turnTransitioning || prev.d !== damageAnims.length) {
      console.log(`[GamePage] isAnimating=${isAnimating} (turnTransitioning=${turnTransitioning}, damageAnims=${damageAnims.length})`);
      animLogRef.current = { t: turnTransitioning, d: damageAnims.length };
    }
  });

  // Team selection mapping — string[] → hero definitions
  const [teamSelected, setTeamSelected] = useState<Array<(typeof CHARACTERS)[number] | null> | null>(null);

  useEffect(() => {
    if (team) {
      const mapped = team.map((id) =>
        id ? (HERO_MAP.byName.get(id) ?? null) : null,
      );
      setTeamSelected(mapped);
      return;
    }
    // fallback: first three characters (original behavior)
    setTeamSelected(CHARACTERS.slice(0, 3));
  }, [team]);

  // Selected hero for spells — active character, or first team member
  const selectedHero = useMemo(() => {
    if (gameState && activeHeroDef) return activeHeroDef;
    if (teamSelected?.[0]) return teamSelected[0];
    return null;
  }, [gameState, activeHeroDef, teamSelected]);

  // Rewards state
  const [rewards, setRewards] = useState<{
    xpGained: number;
    rubisGained: number;
    isWinner: boolean;
    characters: { name: string; level: number; xp: number; leveledUp: boolean; levelsGained: number }[];
  } | null>(null);
  const [isRewarding, setIsRewarding] = useState(false);
  const rewardFetchedRef = useRef(false);
  const [redirectCountdown, setRedirectCountdown] = useState(10);

  const handleReturnHome = useCallback(() => {
    router.push("/home");
  }, [router]);

  // Auto-redirect countdown
  useEffect(() => {
    if (!rewards) return;
    setRedirectCountdown(10);
    const timer = setInterval(() => {
      setRedirectCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [rewards]);

  // Redirect when countdown hits 0
  useEffect(() => {
    if (redirectCountdown <= 0 && rewards) {
      handleReturnHome();
    }
  }, [redirectCountdown, rewards, handleReturnHome]);

  // Save match history + fetch rewards
  const userPseudoRef = useRef(userPseudo);
  const teamRef = useRef(team);
  const opponentRef = useRef(opponent);
  const oppTeamRef = useRef(oppTeam);
  const isWinnerRef = useRef(isWinner);
  useEffect(() => { userPseudoRef.current = userPseudo; }, [userPseudo]);
  useEffect(() => { teamRef.current = team; }, [team]);
  useEffect(() => { opponentRef.current = opponent; }, [opponent]);
  useEffect(() => { oppTeamRef.current = oppTeam; }, [oppTeam]);
  useEffect(() => { isWinnerRef.current = isWinner; }, [isWinner]);

  useEffect(() => {
    if (!isGameOver || rewardFetchedRef.current) return;
    rewardFetchedRef.current = true;
    setIsRewarding(true);

    const pseudo = userPseudoRef.current;
    const teamVal = teamRef.current;
    const opp = opponentRef.current;
    const oppT = oppTeamRef.current;
    const win = isWinnerRef.current;

    const finish = async () => {
      await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pseudo,
          team: teamVal,
          oppName: opp,
          oppTeam: oppT,
          winner: win,
        }),
      });

      const res = await fetch("/api/game/reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: pseudo, isWinner: win, team: teamVal }),
      });

      if (res.ok) {
        const data = await res.json();
        setRewards(data);
      }
      setIsRewarding(false);
    };

    finish();
  }, [isGameOver, router]);

  // Loading states
  if (dataPhase === "error") {
    return <GameLoadingScreen phase="error" />;
  }
  if (dataPhase !== "loaded") {
    return <GameLoadingScreen phase={dataPhase} />;
  }
  if (!teamSelected || !oppTeam) {
    return (
      <div className="flex w-full justify-center px-4">
        <div className="rounded border border-[#3c3650] bg-[#0f0e13] p-4 text-[#cfc8e6]">
          Loading...
        </div>
      </div>
    );
  }
  if (!gameState) {
    return <GameLoadingScreen phase="waiting" />;
  }

  // --- Render helpers ---
  const firstHero = teamSelected[0] ?? HERO_MAP.byId.get("archer");
  if (!firstHero) {
    return (
      <div className="flex w-full justify-center px-4">
        <div className="rounded border border-red-600 bg-[#0f0e13] p-4 text-red-200">
          Héros introuvable
        </div>
      </div>
    );
  }

  const enemyTeam = oppTeam
    .map((id) => HERO_MAP.byName.get(id) ?? null)
    .filter((c): c is (typeof CHARACTERS)[number] => Boolean(c));

  const selectedHeroCard = selectedHero ?? firstHero;
  const selectedCharacter =
    playerCharacters?.find((c) => c.name === selectedHeroCard.identity.name) ?? null;

  // --- Targeting helpers for render ---
  const isTarget = (uid: string | undefined, _chars: CharacterState[]) =>
    targetingMode && !!uid && validTargetUids.has(uid);

  return (
    <div
      className="relative flex min-h-screen w-full flex-col overflow-hidden px-4 py-4 text-[16px] leading-7 text-[#f5e6c8]"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <GameArenaBackground />

      <TurnQueue
        turnQueue={gameState?.turnQueue ?? []}
        isYourTurn={isYourTurn}
        userPseudo={userPseudo}
      />

      {/* Arena */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-2 py-2 sm:px-4 sm:py-6">
        <div className="w-full max-w-4xl -translate-y-16 rounded-3xl sm:-translate-y-20">
          <div className="flex flex-col gap-3 sm:gap-5">
            {/* Enemy team */}
            <div className="grid grid-cols-3 gap-1 sm:gap-3">
              {enemyTeam.map((character, slotIndex) => {
                const heroId = character.identity.id;
                const charState = findCharByHeroId(oppCharacters, heroId);
                const dead = !charState;
                const targetUid = charState?.uid;
                const anims = findAnimsForFighter(damageAnims, heroId, opponent, charState);
                const pixs = pixelAnims.filter(p => anims.some(a => a.targetUid === p.uid) || p.uid === targetUid);
                return (
                  <div key={heroId} className="relative w-full">
                    <div className={`transition-opacity duration-300 ${dead ? "opacity-30 pointer-events-none" : "opacity-90"}`}>
                      <Fighter
                        variant="enemy"
                        character={character}
                        currentHp={charState ? Math.round(charState.currentHp) : 0}
                        effects={toStatusEffects(charState)}
                        active={charState ? charState.uid === activeCharacterUid : false}
                        onClick={isTarget(charState?.uid, oppCharacters) && charState ? () => handleTargetSelect(charState.uid) : undefined}
                        isTargetable={isTarget(charState?.uid, oppCharacters)}
                      />
                    </div>
                    {pixs.map(p => (
                      <PixelAnimation
                        key={p.id}
                        anim={p.anim}
                        onComplete={() => removePixelAnim(p.id)}
                      />
                    ))}
                    {anims.map((anim, ai) => (
                      <FloatingDamage
                        key={anim.id}
                        damage={anim.damage}
                        isCrit={anim.isCrit}
                        lethal={anim.lethal}
                        delay={250 + ai * 300}
                        onComplete={() => removeAnim(anim.id)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Player team */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {teamSelected.map((character, index) => {
                const heroId = character?.identity.id;
                const charState = heroId
                  ? findCharByHeroId(myCharacters, heroId)
                  : undefined;
                const dead = !charState;
                const targetUid = charState?.uid;
                const anims = heroId ? findAnimsForFighter(damageAnims, heroId, userPseudo, charState) : [];
                const pixs = pixelAnims.filter(p => anims.some(a => a.targetUid === p.uid) || p.uid === targetUid);
                return (
                  <div key={heroId ?? `own-slot-${index}`}>
                    {character ? (
                      <div className="relative">
                        <div className={`transition-opacity duration-300 ${dead ? "opacity-30 pointer-events-none" : ""}`}>
                          <Fighter
                            character={character}
                            active={
                              charState
                                ? charState.uid === activeCharacterUid
                                : selectedHero?.identity.id === character.identity.id
                            }
                            currentHp={charState ? Math.round(charState.currentHp) : 0}
                            effects={toStatusEffects(charState)}
                            onClick={isTarget(charState?.uid, myCharacters) && charState ? () => handleTargetSelect(charState.uid) : undefined}
                            isTargetable={isTarget(charState?.uid, myCharacters)}
                          />
                        </div>
                        {pixs.map(p => (
                          <PixelAnimation
                            key={p.id}
                            anim={p.anim}
                            onComplete={() => removePixelAnim(p.id)}
                          />
                        ))}
                        {anims.map((anim, ai) => (
                          <FloatingDamage
                            key={anim.id}
                            damage={anim.damage}
                            isCrit={anim.isCrit}
                            lethal={anim.lethal}
                            delay={250 + ai * 300}
                            onComplete={() => removeAnim(anim.id)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex aspect-square items-center justify-center rounded-2xl border border-dashed border-gray-700 bg-[#0f0e13] text-sm text-gray-500">
                        Vide
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Opponent info */}
      <div className="flex flex-col items-end gap-1 pr-2 sm:pr-0">
        <div className="flex items-start justify-end gap-4">
          <ProfileInfo account={{ pseudo: opponent, profilePhoto: oppAvatar }} />
        </div>
        <p className="hidden text-xs text-[#8b82a6] sm:block">
          Session ID: {roomId || "—"}
        </p>
      </div>

      <div className="mt-auto" />

      <BottomBar
        isYourTurn={isYourTurn}
        activeMp={activeMp}
        confirmForfeit={confirmForfeit}
        setConfirmForfeit={setConfirmForfeit}
        selectedHeroCard={selectedHeroCard}
        selectedCharacter={selectedCharacter}
        handleCastSpell={handleCastSpell}
        handleSkipTurn={handleSkipTurn}
        userPseudo={userPseudo}
        userAvatar={userAvatar}
        activeMaxMp={activeMaxMp}
        animating={isAnimating}
      />

      {/* Game Over overlay */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-2">
          <div
            className={`relative w-full max-w-lg overflow-hidden rounded-3xl border-2 p-1 shadow-[0_0_60px_rgba(201,168,76,0.12)] ${
              isWinner
                ? "border-[#c9a84c] shadow-[0_0_60px_rgba(201,168,76,0.15)]"
                : "border-[#8b3a3a] shadow-[0_0_60px_rgba(139,58,58,0.12)]"
            }`}
          >
            {/* Animated background glow */}
            <div
              className={`absolute inset-0 opacity-20 ${
                isWinner
                  ? "bg-gradient-to-br from-[#c9a84c] via-[#a8883c] to-[#c9a84c]/30"
                  : "bg-gradient-to-br from-[#8b3a3a] via-[#5a2525] to-[#8b3a3a]/30"
              }`}
            />

            <div
              className={`relative rounded-2xl ${
                isWinner
                  ? "bg-gradient-to-b from-[#1f1810] to-[#15100a]"
                  : "bg-gradient-to-b from-[#1a0f0f] to-[#120a0a]"
              } p-4 sm:p-8`}
            >
              {/* Loading state */}
              {isRewarding && !rewards && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#c9a84c] border-t-transparent" />
                  <p className="font-serif text-lg text-[#c9b896]">Distribution des récompenses...</p>
                </div>
              )}

              {/* Rewards display */}
              {rewards && (
                <>
                  {/* Victory / Defeat banner */}
                  <div className="mb-4 text-center sm:mb-6">
                    <h1
                      className={`font-serif text-2xl font-bold tracking-wide sm:text-4xl ${
                        isWinner ? "text-[#e8dcc8]" : "text-[#c8a0a0]"
                      }`}
                    >
                      {isWinner ? "Victoire !" : "Défaite"}
                    </h1>
                  </div>

                  {/* Rewards summary */}
                  <div className="mb-5 grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="rounded-xl border border-[#3c3650]/50 bg-[#0f0e13]/80 px-2 py-2 sm:px-4 sm:py-3 text-center">
                      <p className="text-xs uppercase tracking-wider text-[#8b82a6]">XP gagnée</p>
                      <p className="mt-1 font-bold text-[#a8e6cf] text-xl">
                        +{rewards.xpGained}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#3c3650]/50 bg-[#0f0e13]/80 px-4 py-3 text-center">
                      <p className="text-xs uppercase tracking-wider text-[#8b82a6]">Rubis</p>
                      <p className="mt-1 flex items-center justify-center gap-1.5 font-bold text-[#e8a84c] text-xl">
                        +{rewards.rubisGained}
                        <img src="/gameResources/items/ruby.webp" alt="rubis" className="h-5 w-5" />
                      </p>
                    </div>
                  </div>

                  {/* Characters */}
                  <div className="mb-6 space-y-2">
                    <p className="text-xs uppercase tracking-wider text-[#8b82a6]">Personnages</p>
                    {rewards.characters.map((char) => {
                      const heroDef = HERO_MAP.byName.get(char.name);
                      return (
                        <div
                          key={char.name}
                          className="flex items-center justify-between rounded-xl border border-[#3c3650]/30 bg-[#0f0e13]/60 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 overflow-hidden rounded-full bg-[#1f1a2e]">
                              {heroDef && (
                                <img
                                  src={heroDef.identity.assets.portrait}
                                  alt={char.name}
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#e8dcc8]">{char.name}</p>
                              <p className="text-xs text-[#8b82a6]">
                                Niveau {char.level}{" "}
                                {char.leveledUp && (
                                  <span className="text-[#a8e6cf]">
                                    (+{char.levelsGained})
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-[#a8e6cf]">+{rewards.xpGained} XP</p>
                            <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-[#1f1a2e]">
                              <div
                                className="h-full rounded-full bg-[#a8e6cf] transition-all"
                                style={{ width: `${char.xp}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Return button */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleReturnHome}
                      className={`rounded-xl border-2 px-8 py-3 font-serif font-semibold transition-all duration-150 ${
                        isWinner
                          ? "border-[#c9a84c] bg-gradient-to-b from-[#c9a84c] to-[#a8883c] text-[#0a0806] hover:shadow-[0_0_20px_rgba(201,168,76,0.3)]"
                          : "border-[#8b3a3a] bg-gradient-to-b from-[#8b3a3a] to-[#6a2a2a] text-[#e8dcc8] hover:shadow-[0_0_20px_rgba(139,58,58,0.3)]"
                      }`}
                    >
                      Retour à l'accueil ({redirectCountdown}s)
                    </button>
                  </div>
                </>
              )}

              {/* Error fallback */}
              {!isRewarding && !rewards && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <p className="font-serif text-lg text-[#c9b896]">
                    {isWinner ? "Victoire !" : "Défaite"}
                  </p>
                  <button
                    type="button"
                    onClick={handleReturnHome}
                    className="rounded-xl border-2 border-[#c9a84c] bg-gradient-to-b from-[#c9a84c] to-[#a8883c] px-8 py-3 font-serif font-semibold text-[#0a0806]"
                  >
                    Retour à l'accueil
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Targeting mode banner */}
      {targetingMode && (
        <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-center bg-gradient-to-b from-[#c9a84c]/20 to-transparent py-3">
          <div className="rounded-lg border border-[#c9a84c]/40 bg-[#1f1810] px-6 py-2 font-serif text-sm text-[#e8dcc8] shadow-[0_0_20px_rgba(201,168,76,0.15)]">
            Select a target — <button onClick={() => handleTargetSelect(null)} className="underline text-[#8a7a5a] hover:text-[#c9b896]">Cancel (Esc)</button>
          </div>
        </div>
      )}

      <InfoModal
        open={isInfoModalOpen && !isGameOver}
        isYourTurn={isYourTurn}
        onClose={() => setIsInfoModalOpen(false)}
      />
    </div>
  );
}
