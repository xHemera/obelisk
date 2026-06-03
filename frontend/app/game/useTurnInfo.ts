"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { GameStatePayload, PlayerState, CharacterState, TurnQueueEntry } from "./types";

type UseTurnInfoReturn = {
  isYourTurn: boolean;
  myCharacters: CharacterState[];
  oppCharacters: CharacterState[];
  activeCharacterUid: string | null;
  activeHeroId: string | null;
  activeMp: number;
  isInfoModalOpen: boolean;
  setIsInfoModalOpen: (open: boolean) => void;
  isGameOver: boolean;
  isWinner: boolean;
  activeMaxMp: number;
  turnTransitioning: boolean;
};

function getPlayerChars(players: PlayerState[], playerIdx: number): CharacterState[] {
  return players[playerIdx]?.characters ?? [];
}

export function useTurnInfo(
  gameState: GameStatePayload | null,
  playerId: number | null,
): UseTurnInfoReturn {
  const prevTurnRef = useRef(0);
  const hasShownStartModal = useRef(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // Guard: track which turn's transition we are currently animating.
  // After Fast Refresh the setTimeout is cleared but state is preserved,
  // so we need to re-start the timer if it was lost.
  const lastTransitionTurnRef = useRef(-1);

  // Delayed turn transition: when events are present, keep the previous
  // active character / game phase visible for 1.5s so animations can play
  // before the turn visually advances.
  const [delayedTurnState, setDelayedTurnState] = useState<{
    uid: string | null;
    phase: string;
    winnerId: number | null;
  }>({ uid: null, phase: "battle", winnerId: null });
  const [turnTransitioning, setTurnTransitioning] = useState(false);
  const turnTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!gameState) return;

    const newUid   = gameState.turnQueue[0]?.characterUid ?? null;
    const newPhase = gameState.gamePhase;
    const newWinnerId = gameState.winnerId ?? null;
    const hasEvents = (gameState.damageEvents?.length ?? 0) > 0
      || (gameState.spellEvents?.length ?? 0) > 0;

    // Fast Refresh guard: if the timer was cleared by unmount but the
    // component re-mounts with the same turn and events, re-start it.
    const needsTimerRestart = hasEvents && gameState.turn > 0
      && gameState.turn === lastTransitionTurnRef.current
      && !turnTimerRef.current;

    // Skip if already handled for this turn (prevents double animation
    // when the same gameState is broadcast multiple times).
    if (gameState.turn === lastTransitionTurnRef.current && !needsTimerRestart) {
      return;
    }

    if (gameState.turn !== lastTransitionTurnRef.current) {
      lastTransitionTurnRef.current = gameState.turn;
    }

    console.log(
      `[useTurnInfo] turn=${gameState.turn} phase=${newPhase} activePlayerOwner=${gameState.activePlayerOwner} ` +
      `hasEvents=${hasEvents} newUid=${newUid} prevPhase=${delayedTurnState.phase}` +
      (needsTimerRestart ? " (timer restarted after Fast Refresh)" : "")
    );

    if (gameState.gamePhase === "end") {
      if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
      setTurnTransitioning(false);
      setDelayedTurnState(prev =>
        prev.uid === newUid && prev.phase === "end" && prev.winnerId === newWinnerId
          ? prev
          : { uid: newUid, phase: "end", winnerId: newWinnerId }
      );
      return;
    }

    if (hasEvents && gameState.turn > 0) {
      if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
      setTurnTransitioning(true);
      turnTimerRef.current = setTimeout(() => {
        setDelayedTurnState(prev =>
          prev.uid === newUid && prev.phase === newPhase && prev.winnerId === newWinnerId
            ? prev
            : { uid: newUid, phase: newPhase, winnerId: newWinnerId }
        );
        setTurnTransitioning(false);
      }, 1500);
    } else {
      if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
      setTurnTransitioning(false);
      setDelayedTurnState(prev =>
        prev.uid === newUid && prev.phase === newPhase && prev.winnerId === newWinnerId
          ? prev
          : { uid: newUid, phase: newPhase, winnerId: newWinnerId }
      );
    }

    return () => {
      if (turnTimerRef.current) {
        clearTimeout(turnTimerRef.current);
        turnTimerRef.current = null;
      }
    };
  }, [gameState]);

  const isYourTurn = playerId !== null && gameState !== null
    ? gameState.activePlayerOwner === playerId
    : false;

  const myCharacters = playerId !== null && gameState
    ? getPlayerChars(gameState.players, playerId)
    : [];

  const oppCharacters = playerId !== null && gameState
    ? getPlayerChars(gameState.players, 1 - playerId)
    : [];

  const activeCharacterUid = delayedTurnState.uid;
  const activeHeroId = activeCharacterUid?.split("_").at(-2) ?? null;

  const activeMp = useMemo(() => {
    if (!gameState || !activeCharacterUid) return 0;
    for (const player of gameState.players) {
      for (const char of player.characters) {
        if (char.uid === activeCharacterUid) return char.currentMp ?? 0;
      }
    }
    return 0;
  }, [gameState, activeCharacterUid]);

  const activeMaxMp = useMemo(() => {
    if (!gameState || !activeCharacterUid) return 0;
    for (const player of gameState.players) {
      for (const char of player.characters) {
        if (char.uid === activeCharacterUid) return char.maxMp ?? 0;
      }
    }
    return 0;
  }, [gameState, activeCharacterUid]);

  const isGameOver = delayedTurnState.phase === "end";
  const isWinner = delayedTurnState.winnerId === playerId;

  // Show InfoModal on game start or turn change (also delayed when damage events)
  useEffect(() => {
    if (!gameState || playerId === null) return;

    if (!hasShownStartModal.current) {
      hasShownStartModal.current = true;
      prevTurnRef.current = gameState.turn;
      requestAnimationFrame(() => setIsInfoModalOpen(true));
      return;
    }

    if (gameState.turn !== prevTurnRef.current) {
      prevTurnRef.current = gameState.turn;
      const hasEvents = (gameState.damageEvents?.length ?? 0) > 0
        || (gameState.spellEvents?.length ?? 0) > 0;
      if (hasEvents) {
        setTimeout(() => setIsInfoModalOpen(true), 1500);
      } else {
        requestAnimationFrame(() => setIsInfoModalOpen(true));
      }
    }
  }, [gameState, playerId]);

  return {
    isYourTurn,
    myCharacters,
    oppCharacters,
    activeCharacterUid,
    activeHeroId,
    activeMp,
    isInfoModalOpen,
    setIsInfoModalOpen,
    isGameOver,
    isWinner,
    activeMaxMp,
    turnTransitioning,
  };
}
