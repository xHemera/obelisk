"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { spells, type Team } from "./index";
import { emitGlobalError } from "@/lib/error-events";
import type { CharacterData } from "@/components/organisms/characters/types";

export type LoadingPhase = "connecting" | "fetching" | "loaded" | "error";

export function useGameData() {
  const [userPseudo, setUserPseudo] = useState("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [oppAvatar, setOppAvatar] = useState<string | null>(null);
  const [playerCharacters, setPlayerCharacters] = useState<CharacterData[] | null>(null);
  const [team, setTeam] = useState<string[] | null>([]);
  const [oppTeam, setOppTeam] = useState<string[] | null>([]);
  const [opponent, setOpponent] = useState("");
  const [roomId, setRoomId] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("connecting");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoadingPhase("fetching");

        const { data } = await authClient.getSession();
        if (cancelled) return;
        if (!data || !data.user.name) throw new Error("Session non trouvée");
        setUserPseudo(data.user.name);

        await loadTeamAndOpponent(data.user.name);
        if (cancelled) return;

        setLoadingPhase("loaded");

        await Promise.all([
          loadPlayerCharacters(data.user.name),
          loadProfileAvatar(),
        ]);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Une erreur est survenue";
        emitGlobalError(message);
        setLoadingPhase("error");
      }
    }

    async function loadTeamAndOpponent(pseudo: string) {
      const [cres, ores] = await Promise.all([
        fetch(`/api/user?pseudo=${pseudo}`, { method: "GET" }),
        fetch(`/api/user/opponent?pseudo=${pseudo}`, { method: "GET" }),
      ]);

      if (!cres.ok || !ores.ok) {
        if (ores.status === 429) {
          const result = await retryWithBackoff(async () => {
            if (cancelled) return null;
            const [cres2, ores2] = await Promise.all([
              fetch(`/api/user?pseudo=${pseudo}`, { method: "GET" }),
              fetch(`/api/user/opponent?pseudo=${pseudo}`, { method: "GET" }),
            ]);
            if (!cres2.ok || !ores2.ok) return null;
            const res2 = await cres2.json();
            const opp2 = await ores2.json();
            return { res: res2, opp: opp2 };
          }, () => cancelled);
          if (cancelled) return;
          if (!result) throw new Error("Impossible de récupérer les données adverses après plusieurs tentatives");
          finishInit(pseudo, result.res, result.opp);
          return;
        }
        throw new Error("Impossible de récupérer les données adverses");
      }

      const res = await cres.json();
      const opp = await ores.json();
      finishInit(pseudo, res, opp);
    }

    function finishInit(pseudo: string, res: { team: string[]; levels: number[]; spellsLevels: number[] }, opp: { name: string; team: string[]; avatar: string | null; roomId: number }) {
      const teamData: Team = {
        owner: pseudo,
        characters: res.team,
        levels: res.levels,
        skillsLevels: res.spellsLevels,
      };
      setTeam(res.team);
      setOpponent(opp.name);
      setOppTeam(opp.team);
      setOppAvatar(opp.avatar);
      setRoomId(opp.roomId);
      spells.initialData(teamData, opp.roomId);
    }

    async function loadPlayerCharacters(pseudo: string) {
      try {
        const response = await fetch(
          `/api/characters?username=${encodeURIComponent(pseudo)}`,
          { method: "GET", cache: "no-store" },
        );
        if (response.ok && !cancelled) {
          const payload = await response.json() as { characters: CharacterData[] };
          setPlayerCharacters(payload.characters);
        }
      } catch {
        // Non-critical, silently ignore
      }
    }

    async function loadProfileAvatar() {
      try {
        const response = await fetch("/api/profile/", {
          method: "GET",
          cache: "no-store",
        });
        if (response.ok && !cancelled) {
          const profile = await response.json() as {
            image: string | null;
            avatar: { url: string | null } | null;
          };
          setUserAvatar(profile.image ?? profile.avatar?.url ?? null);
        }
      } catch {
        // Non-critical, silently ignore
      }
    }

    load();

    return () => { cancelled = true; };
  }, []);

  return {
    userPseudo,
    userAvatar,
    oppAvatar,
    playerCharacters,
    team,
    oppTeam,
    opponent,
    roomId,
    loadingPhase,
  };
}

async function retryWithBackoff<T>(
  fn: () => Promise<T | null>,
  isCancelled: () => boolean,
  maxRetries = 10,
  delay = 2000,
): Promise<T | null> {
  for (let i = 0; i < maxRetries; i++) {
    if (isCancelled()) return null;
    const result = await fn();
    if (result !== null) return result;
    if (isCancelled()) return null;
    await new Promise(r => setTimeout(r, delay));
  }
  return null;
}
