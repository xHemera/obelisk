"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { CHARACTERS } from "@/public/gameResources/heroes";

type TurnQueueEntry = {
  characterUid: string;
  playerOwner: number;
  charge: number;
};

type TurnQueueProps = {
  turnQueue: TurnQueueEntry[];
  isYourTurn: boolean;
  userPseudo: string;
};

export default function TurnQueue({ turnQueue, isYourTurn, userPseudo }: TurnQueueProps) {
  const visibleTurns = turnQueue.slice(0, 6).map((entry, index) => {
    const heroId = entry.characterUid.split("_").at(-2)!;
    const character = CHARACTERS.find((h) => h.identity.id === heroId);
    const isOwn = entry.characterUid.startsWith(userPseudo + "_");
    return { ...entry, character, isOwn, index };
  });

  const hasData = visibleTurns.length > 0;
  const activeEntry = visibleTurns[0];

  const turnLabel = hasData
    ? isYourTurn ? "Your Turn" : "Opponent Turn"
    : "Waiting...";

  const activeUidRef = useRef(activeEntry?.characterUid);
  useEffect(() => {
    if (!hasData) return;
    const uid = activeEntry?.characterUid;
    if (uid && uid !== activeUidRef.current) {
      activeUidRef.current = uid;
      const name = activeEntry?.character?.identity.name ?? "?";
    }
  });

  const labelColor = hasData
    ? isYourTurn ? "text-[#f5e6c8]" : "text-[#e8586a]"
    : "text-[#8b82a6]";

  return (
    <div className="fixed left-4 top-4 z-30 sm:left-4 sm:top-4">
      <p className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] sm:text-xs sm:mb-3 ${labelColor}`}>
        {turnLabel}
      </p>

      <div className="relative flex flex-row gap-1 sm:flex-col sm:gap-2">
        {visibleTurns.map((entry) => {
          if (!entry.character) return null;

          const isActive = entry.index === 0;

          return (
            <div
              key={entry.characterUid}
              className="flex items-center gap-1 sm:gap-2"
            >
              <div
                className={`relative h-8 w-8 shrink-0 overflow-hidden rounded-full transition-all duration-200 sm:h-12 sm:w-12 ${
                  isActive
                    ? "ring-2 ring-[#c9a84c] ring-offset-1 ring-offset-[#0a0806] shadow-[0_0_10px_rgba(201,168,76,0.4)] sm:ring-offset-2"
                    : "opacity-50"
                }`}
              >
                <Image
                  src={entry.character.identity.assets.portrait}
                  alt={entry.character.identity.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 32px, 44px"
                  unoptimized
                />
                {isActive && (
                  <div className="absolute inset-0 rounded-full border-2 border-[#c9a84c]/40" />
                )}
              </div>
              <span
                className={`text-[8px] font-semibold uppercase tracking-wider sm:text-[10px] ${
                  entry.isOwn ? "text-[#7aaa6a]" : "text-[#8a5a5a]"
                }`}
              >
                {isActive ? "ACTIVE" : `#${entry.index + 1}`}
              </span>
            </div>
          );
        })}
        {!hasData && (
          <p className="text-xs text-[#5a5470]">Awaiting game start...</p>
        )}
      </div>
    </div>
  );
}
