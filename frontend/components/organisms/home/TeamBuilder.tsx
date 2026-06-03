"use client";

import Image from "next/image";
import type { MutableRefObject } from "react";

type Character = {
  id: string;
  name: string;
  portrait: string;
};

type TeamDragState = {
  id: string;
  x: number;
  y: number;
};

type TeamBuilderProps = {
  roster: Character[];
  teamSlots: Array<string | null>;
  dragPreview: TeamDragState | null;
  hoveredSlotIndex: number | null;
  slotRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  suppressClickForIdRef: MutableRefObject<string | null>;
  onTeamSlotChange: (slotIndex: number, characterId: string) => void;
  onRosterPointerDown: (event: React.PointerEvent<HTMLButtonElement>, characterId: string) => void;
  onSlotClear: (slotIndex: number) => void;
};

export function TeamBuilder({
  roster,
  teamSlots,
  dragPreview,
  hoveredSlotIndex,
  slotRefs,
  suppressClickForIdRef,
  onTeamSlotChange,
  onRosterPointerDown,
  onSlotClear,
}: TeamBuilderProps) {
  const getTeamCharacter = (id: string | null) => roster.find((character) => character.id === id) ?? null;
  const isCharacterInTeam = (characterId: string) => teamSlots.includes(characterId);
  const teamPowerLabel = `${teamSlots.filter(Boolean).length}/3`;

  return (
    <div className="flex-1 overflow-hidden rounded-xl border border-[#c9a227]/25 bg-gradient-to-br from-[#120f17]/80 to-[#0f0c14]/60 p-3 sm:p-5 backdrop-blur-xs">
      <div className="mb-4 flex items-center justify-between border-b border-[#c9a227]/20 pb-4">
        <div className="flex flex-col gap-1">
          <h2
            className="text-lg font-black uppercase tracking-[0.14em] text-[#f5e6c8]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Your Squad
          </h2>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#c9b48a]">
            Assemble your champions
          </p>
        </div>
        <span className="rounded-lg border border-[#c9a227]/60 bg-gradient-to-r from-[#1e1828] to-[#15121a] px-3 py-1.5 text-xs font-black uppercase tracking-widest text-[#e6c55a]">
          {teamPowerLabel}
        </span>
      </div>

      <div className="space-y-4">
        {/* Active Team */}
        <div className="rounded-lg border border-[#c9a227]/25 bg-[#0a0810]/50 p-2 sm:p-4">
          <div className="mb-2 text-center sm:mb-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c9b48a]">
              ⚔️ Active Team
            </div>
          </div>
          <div className="flex justify-center gap-1 sm:gap-3">
            {teamSlots.map((slotCharacterId, index) => {
              const selectedCharacter = getTeamCharacter(slotCharacterId);
              const isSlotHovered = hoveredSlotIndex === index;
              return (
                <div
                  key={`home-team-slot-${index}`}
                  ref={(element) => {
                    slotRefs.current[index] = element;
                  }}
                  className={`group team-slot-item relative w-[76px] sm:w-[110px] overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                    isSlotHovered ? "border-[#c9a227] shadow-[0_0_16px_rgba(201,162,39,0.5)]" : "border-[#6b5a84]/70"
                  } ${selectedCharacter ? "bg-[#0f0c14]" : "bg-[#120f17]/50"}`}
                >
                  {selectedCharacter ? (
                    <>
                      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#0a0810]">
                        <Image
                          src={selectedCharacter.portrait}
                          alt={selectedCharacter.name}
                          fill
                          sizes="(max-width: 768px) 100vw"
                          loading="eager"
                          className="object-cover transition-transform group-hover:scale-110"
                        />
                      </div>
                      <div className="flex items-center justify-between bg-gradient-to-r from-[#1a1422] to-[#0f0c14] px-2 py-1.5">
                        <span className="truncate text-[8px] font-bold uppercase tracking-wider text-[#ead9aa]">
                          {selectedCharacter.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSlotClear(index)}
                          className="text-xs text-[#e6c55a] transition-colors hover:text-[#ffcf63]"
                          aria-label={`Clear slot ${index + 1}`}
                        >
                          ✕
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex aspect-[3/4] w-full items-center justify-center bg-gradient-to-br from-[#1e1a24] to-[#0f0c14] text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <i className="fa-solid fa-plus text-lg text-[#6b5a84]" aria-hidden="true" />
                        <div className="text-[8px] font-bold uppercase tracking-wider text-[#7b6d93]">
                          Slot
                          <br />
                          {index + 1}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Roster Selection */}
        <div className="rounded-lg border border-[#c9a227]/25 bg-[#0a0810]/50 p-2 sm:p-4">
          <div className="mb-2 text-center sm:mb-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c9b48a]">
              📜 Available Champions
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-1 sm:gap-3">
            {roster.map((character) => {
              const inTeam = isCharacterInTeam(character.id);
              return (
                <button
                  key={character.id}
                  type="button"
                  onPointerDown={(event) => onRosterPointerDown(event, character.id)}
                  onClick={() => {
                    if (suppressClickForIdRef.current === character.id) {
                      suppressClickForIdRef.current = null;
                      return;
                    }

                    const freeSlot = teamSlots.findIndex((slot) => slot === null);
                    onTeamSlotChange(freeSlot === -1 ? 0 : freeSlot, character.id);
                  }}
                  className={`group team-slot-item w-[68px] sm:w-[90px] overflow-hidden rounded-lg border-2 text-left transition-all duration-200 ${
                    inTeam
                      ? "border-[#c9a227] shadow-[0_0_12px_rgba(201,162,39,0.4)]"
                      : "border-[#433556]/60 hover:border-[#7a6599]/80"
                  } ${dragPreview?.id === character.id ? "opacity-40" : ""}`}
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#0a0810]">
                    <Image
                      src={character.portrait}
                      alt={character.name}
                      fill
                      sizes="(max-width: 768px) 100vw"
                      loading="eager"
                      className="object-cover transition-transform group-hover:scale-110"
                      draggable={false}
                    />
                  </div>
                  <div className="truncate bg-gradient-to-r from-[#1a1422] to-[#0f0c14] px-1.5 py-1 text-[7px] font-bold uppercase tracking-wider text-[#ead9aa]">
                    {character.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
