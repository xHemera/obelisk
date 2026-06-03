"use client";

import { useMemo, useState } from "react";
import type { CharacterData, CharacterSkill, PlayerResources } from "./types";
import { calculatePower, formatCompactPower } from "./character-utils";
import { CHARACTER_ROLES } from "./character-config";
import CharacterSelectionPanel from "./CharacterSelectionPanel";
import CharacterDisplayPanel from "./CharacterDisplayPanel";
import CharacterDetailsPanel from "./CharacterDetailsPanel";

interface CharacterViewerProps {
  characters: CharacterData[];
  selectedCharacter: CharacterData;
  onSelectCharacter: (id: string) => void;
  resources: PlayerResources;
  maxSkillLevel: number;
  onUpgradeSkill: (skillId: string) => Promise<boolean>;
  onPlusOneSkill: (skillId: string) => Promise<boolean>;
}

export default function CharacterViewer({
  characters,
  selectedCharacter,
  onSelectCharacter,
  resources,
  maxSkillLevel,
  onUpgradeSkill,
  onPlusOneSkill,
}: CharacterViewerProps) {
  const [selectedSkill, setSelectedSkill] = useState<CharacterSkill | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(true);

  const power = useMemo(() => calculatePower(selectedCharacter.name, selectedCharacter.level, selectedCharacter.stats, selectedCharacter.skills), [selectedCharacter.stats]);
  const characterRole = CHARACTER_ROLES[selectedCharacter.name] ?? {
    title: "Adventurer",
    color: "#c9a227",
    icon: "fa-user",
  };

  const canUpgradeSkill = (skill: CharacterSkill) => {
    return skill.level < maxSkillLevel && resources.ruby >= skill.cost;
  };

  return (
    <div className="relative flex h-full overflow-hidden bg-gradient-to-br from-[#0c0a0f] via-[#12101a] to-[#0a0810]">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9a227' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <CharacterSelectionPanel
        characters={characters}
        selectedCharacterId={selectedCharacter.id}
        onSelectCharacter={onSelectCharacter}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <CharacterDisplayPanel
          selectedCharacter={selectedCharacter}
          characterRoleTitle={characterRole.title}
          characterRoleColor={characterRole.color}
          powerLabel={formatCompactPower(power)}
        />

        {/* Toggle Button */}
        <button
          onClick={() => setShowDetailsPanel(!showDetailsPanel)}
          className="absolute right-0 top-1/2 z-30 -translate-y-1/2 rounded-l border border-[#c9a227]/30 bg-[#0c0a0f]/95 px-2 py-3 text-[#c9a227] transition-all hover:bg-[#1e1a24] hover:border-[#c9a227]/50 max-lg:z-50"
          title={showDetailsPanel ? "Hide details" : "Show details"}
        >
          <i className={`fa-solid ${showDetailsPanel ? "fa-chevron-right" : "fa-chevron-left"} text-sm`} />
        </button>

        {/* Mobile: right-side drawer */}
        <div className={`fixed top-0 right-0 bottom-0 z-40 w-full max-w-md overflow-y-auto border-l border-[#c9a227]/30 bg-[#15131d] shadow-2xl transition-transform duration-300 lg:hidden ${
          showDetailsPanel ? "translate-x-0" : "translate-x-full"
        }`}>
          <div className="![&>div]:w-full">
            <CharacterDetailsPanel
              selectedCharacter={selectedCharacter}
              selectedSkill={selectedSkill}
              resources={resources}
              maxSkillLevel={maxSkillLevel}
              onToggleSkill={(skill) => setSelectedSkill(selectedSkill?.id === skill.id ? null : skill)}
              onUpgradeSkill={onUpgradeSkill}
              onPlusOneSkill={onPlusOneSkill}
              canUpgradeSkill={canUpgradeSkill}
            />
          </div>
        </div>

        {/* Mobile backdrop */}
        {showDetailsPanel && (
          <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setShowDetailsPanel(false)} />
        )}

        {/* Details Panel for desktop */}
        <div className={`hidden lg:block transition-all duration-300 overflow-y-auto ${showDetailsPanel ? "w-[420px]" : "w-0"}`}>
          <CharacterDetailsPanel
            selectedCharacter={selectedCharacter}
            selectedSkill={selectedSkill}
            resources={resources}
            maxSkillLevel={maxSkillLevel}
            onToggleSkill={(skill) => setSelectedSkill(selectedSkill?.id === skill.id ? null : skill)}
            onUpgradeSkill={onUpgradeSkill}
            onPlusOneSkill={onPlusOneSkill}
            canUpgradeSkill={canUpgradeSkill}
          />
        </div>
      </div>
    </div>
  );
}
