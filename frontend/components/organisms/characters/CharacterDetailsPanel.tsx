import type { CharacterData, CharacterSkill, PlayerResources } from "./types";
import SectionDivider from "@/components/atoms/characters/SectionDivider";
import SkillCard from "@/components/molecules/characters/SkillCard";
import CharacterStatsSection from "./CharacterStatsSection";
import { OFFENSE_STATS, DEFENSE_STATS, UTILITY_STATS } from "./character-config";

type CharacterDetailsPanelProps = {
  selectedCharacter: CharacterData;
  selectedSkill: CharacterSkill | null;
  resources: PlayerResources;
  maxSkillLevel: number;
  onToggleSkill: (skill: CharacterSkill) => void;
  onUpgradeSkill: (skillId: string) => Promise<boolean>;
  onPlusOneSkill: (skillId: string) => Promise<boolean>;
  canUpgradeSkill: (skill: CharacterSkill) => boolean;
};

const ruby = "/gameResources/items/ruby.webp";

// Organism: panneau droit stats + competences.
export default function CharacterDetailsPanel({
  selectedCharacter,
  selectedSkill,
  resources,
  maxSkillLevel,
  onToggleSkill,
  onUpgradeSkill,
  onPlusOneSkill,
  canUpgradeSkill,
}: CharacterDetailsPanelProps) {
  return (
    <div className="z-20 flex w-[420px] flex-col border-l border-[#c9a227]/20 bg-[#0c0a0f]/95 p-5">
      <div className="mb-4 flex items-center justify-between rounded-lg border border-[#c9a227]/30 bg-gradient-to-r from-[#1e1a24] to-[#15121a] px-4 py-3">
        <div className="flex items-center gap-2">
          <img
          src={ruby}
          alt="Ruby"
          width={34}
          height={34}
          />
          <span className="font-bold text-[#f5e6c8]" style={{ fontFamily: "var(--font-display), serif" }}>
            {resources.ruby}
          </span>
        </div>
        <span className="text-xs uppercase tracking-wider text-[#8a7a5a]">Rubies</span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <SectionDivider label="Statistics" />

        <CharacterStatsSection
          title="Offense"
          titleClassName="mb-3 text-xs font-bold uppercase tracking-wider text-[#cd5c5c]"
          stats={selectedCharacter.stats}
          baseStats={selectedCharacter.baseStats}
          definitions={OFFENSE_STATS}
        />

        <CharacterStatsSection
          title="Defense"
          titleClassName="mb-3 text-xs font-bold uppercase tracking-wider text-[#8fbc8f]"
          stats={selectedCharacter.stats}
          baseStats={selectedCharacter.baseStats}
          definitions={DEFENSE_STATS}
        />

        <CharacterStatsSection
          title="Utility"
          titleClassName="mb-3 text-xs font-bold uppercase tracking-wider text-[#dda0dd]"
          stats={selectedCharacter.stats}
          baseStats={selectedCharacter.baseStats}
          definitions={UTILITY_STATS}
        />

        <SectionDivider label="Abilities" />

        <div className="space-y-3">
          {selectedCharacter.skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              stats={selectedCharacter.stats}
              maxSkillLevel={maxSkillLevel}
              selectedSkillId={selectedSkill?.id ?? null}
              canUpgrade={canUpgradeSkill(skill)}
              onToggleDetails={onToggleSkill}
              onUpgrade={onUpgradeSkill}
              onPlusOne={onPlusOneSkill}
              characterName={selectedCharacter.name}
            />
          ))}
        </div>

        <div className="mt-4 text-center text-xs italic text-[#5a5668]">
          Click on an ability to view details
        </div>
      </div>
    </div>
  );
}
