import type { CharacterStats } from "./types";
import StatRow from "@/components/atoms/characters/StatRow";

type StatDefinition = {
  key: keyof CharacterStats;
  shortLabel: string;
  icon: string;
  suffix?: string;
};

type CharacterStatsSectionProps = {
  title: string;
  titleClassName: string;
  stats: CharacterStats;
  baseStats: CharacterStats;
  definitions: readonly StatDefinition[];
};

// Organism: section de statistiques (offense/defense/utility).
export default function CharacterStatsSection({
  title,
  titleClassName,
  stats,
  baseStats,
  definitions,
}: CharacterStatsSectionProps) {
  return (
    <div className="mb-4 rounded-lg border border-[#c9a227]/20 bg-[#15121a]/80 p-4">
      <div
        className={titleClassName}
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        {title}
      </div>
      <div className="space-y-3">
        {definitions.map((definition) => {
          const value = stats[definition.key];
          const baseValue = baseStats[definition.key];
          const bonus = value - baseValue;

          return (
            <StatRow
              key={definition.key}
              icon={definition.icon}
              shortLabel={definition.shortLabel}
              value={value}
              suffix={definition.suffix}
              bonus={bonus}
            />
          );
        })}
      </div>
    </div>
  );
}
