"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CHARACTERS } from "@/public/gameResources/heroes";
import { spells, type GameAction } from "./index";
import type { CharacterState } from "./types";

type PendingAction = {
  type: "basic" | "skill";
  skillId?: string;
  characterUid: string;
};

type UseTargetingReturn = {
  targetingMode: boolean;
  validTargetUids: Set<string>;
  confirmForfeit: boolean;
  setConfirmForfeit: (v: boolean) => void;
  handleCastSpell: (type: "basic" | "skill", skillId?: string) => void;
  handleTargetSelect: (targetUid: string | null) => void;
  handleSkipTurn: () => void;
};

function getSkillTargeting(
  skillId: string | undefined | null,
  activeHeroDef: (typeof CHARACTERS)[number] | null,
): string | null {
  if (!skillId || !activeHeroDef) return null;
  const skill = activeHeroDef.skills.find(s => s.id === skillId);
  if (!skill) return null;
  if (!("targeting" in skill)) return null;
  const targeting = (skill as Record<string, unknown>).targeting;
  return typeof targeting === "string" ? targeting : null;
}

function getTargetsFromTargeting(
  targeting: string | null,
  activeCharacterUid: string | null,
  myCharacters: CharacterState[],
  oppCharacters: CharacterState[],
): string[] {
  if (!targeting) return [];
  if (targeting === "self") return activeCharacterUid ? [activeCharacterUid] : [];
  if (targeting === "aoe" || targeting === "teamAoe") return [];
  if (targeting === "teamSingle") return myCharacters.map(c => c.uid);
  if (targeting === "single") return oppCharacters.map(c => c.uid);
  return [];
}

export function useTargeting(
  activeCharacterUid: string | null,
  myCharacters: CharacterState[],
  oppCharacters: CharacterState[],
  activeHeroDef: (typeof CHARACTERS)[number] | null,
): UseTargetingReturn {
  const [targetingMode, setTargetingMode] = useState(false);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [validTargetUids, setValidTargetUids] = useState<Set<string>>(new Set());
  const myCharactersRef = useRef(myCharacters);
  const oppCharactersRef = useRef(oppCharacters);
  const activeCharacterUidRef = useRef(activeCharacterUid);
  const targetingModeRef = useRef(targetingMode);
  const pendingActionRef = useRef(pendingAction);
  useEffect(() => { myCharactersRef.current = myCharacters; }, [myCharacters]);
  useEffect(() => { oppCharactersRef.current = oppCharacters; }, [oppCharacters]);
  useEffect(() => { activeCharacterUidRef.current = activeCharacterUid; }, [activeCharacterUid]);
  useEffect(() => { targetingModeRef.current = targetingMode; }, [targetingMode]);
  useEffect(() => { pendingActionRef.current = pendingAction; }, [pendingAction]);

  const handleCastSpell = useCallback((type: "basic" | "skill", skillId?: string) => {
    const targeting = type === "basic" ? "single" : getSkillTargeting(skillId, activeHeroDef);
    if (!targeting) return;
    const uid = activeCharacterUidRef.current;
    if (!uid) return;

    if (targeting === "aoe" || targeting === "self" || targeting === "teamAoe") {
      const action: GameAction = {
        type,
        skillId: type === "skill" ? skillId : undefined,
        userUid: uid,
        targetUids: targeting === "self" ? [uid] : [],
      };
      spells.submitAction(action);
      return;
    }

    const targets = getTargetsFromTargeting(targeting, uid, myCharactersRef.current, oppCharactersRef.current);
    if (targets.length === 0) return;

    setPendingAction({ type, skillId, characterUid: uid });
    setValidTargetUids(new Set(targets));
    setTargetingMode(true);
  }, [activeHeroDef]);

  const handleTargetSelect = useCallback((targetUid: string | null) => {
    if (!targetingModeRef.current) return;
    const current = pendingActionRef.current;
    if (!current) return;
    const uid = activeCharacterUidRef.current;
    if (!uid || current.characterUid !== uid) return;

    if (targetUid === null) {
      setTargetingMode(false);
      setPendingAction(null);
      setValidTargetUids(new Set());
      return;
    }

    const action: GameAction = {
      type: current.type,
      skillId: current.skillId,
      userUid: uid,
      targetUids: [targetUid],
    };
    spells.submitAction(action);
    setTargetingMode(false);
    setPendingAction(null);
    setValidTargetUids(new Set());
  }, []);

  const handleSkipTurn = useCallback(() => {
    const uid = activeCharacterUidRef.current;
    if (!uid) return;
    setTargetingMode(false);
    setPendingAction(null);
    setValidTargetUids(new Set());
    const action: GameAction = {
      type: "skip",
      userUid: uid,
      targetUids: [],
    };
    spells.submitAction(action);
  }, []);

  // Cancel targeting on Escape
  useEffect(() => {
    if (!targetingMode) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleTargetSelect(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [targetingMode, handleTargetSelect]);

  return {
    targetingMode,
    validTargetUids,
    confirmForfeit,
    setConfirmForfeit,
    handleCastSpell,
    handleTargetSelect,
    handleSkipTurn,
  };
}
