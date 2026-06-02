"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { CharacterData } from "@/components/organisms/characters/types";
import SpellButton from "@/components/atoms/game/SpellButton";
import type { SpellDescriptionSegment } from "@/lib/spell-description";
import { resolveSpellDescriptionSegments } from "@/lib/spell-description";
import { CHARACTERS } from "@/public/gameResources/heroes";

type HeroDefinition = (typeof CHARACTERS)[number];
type HeroSkill = HeroDefinition["skills"][number];

type ResolvedSpellPreview = {
  id: string;
  name: string;
  icon: string;
  manaCost: number;
  level: number;
  segments: SpellDescriptionSegment[];
  isMaxLevel: boolean;
  maxLevel: number;
};

type SpellSelectorProps = {
  hero: HeroDefinition;
  character: CharacterData | null;
  activeMp: number;
  onCastSpell: (type: "basic" | "skill", skillId?: string) => void;
  className?: string;
};

const manaIcon = "/gameResources/items/mana.webp";

const basicAttackIcon = "/gameResources/heroes/basic_attack.png";

const formatNumber = (value: number) => {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return (Math.round(value * 10) / 10).toString();
};

const getSkillLevel = (character: CharacterData | null, skill: HeroSkill, index: number) => {
  const byId = character?.skills.find((candidate) => candidate.id === skill.id)?.level;
  if (typeof byId === "number") {
    return byId;
  }

  const byName = character?.skills.find((candidate) => candidate.name === skill.info.name)?.level;
  if (typeof byName === "number") {
    return byName;
  }

  const byIndex = character?.skills[index]?.level;
  return byIndex ?? 1;
};

const getScalingRow = (skill: HeroSkill, level: number) => {
  const safeIndex = Math.min(Math.max(level - 1, 0), skill.scaling.length - 1);
  return skill.scaling[safeIndex] ?? skill.scaling[0] ?? [];
};

const buildContext = (stats: CharacterData["stats"], skillLevel: number, scalingRow: number[]) => {
  const context: Record<string, number> = {
    level: skillLevel,
    skilllevel: skillLevel,
    spelllevel: skillLevel,
    skill_level: skillLevel,
    physicaldamage: stats.physicalDamage,
    magicaldamage: stats.magicalDamage,
    critchance: stats.critChance,
    critdamage: stats.critDamage,
    hp: stats.hp,
    mp: stats.mp,
    physicalresistance: stats.physicalResistance,
    magicalresistance: stats.magicalResistance,
    speed: stats.speed,
  };

  scalingRow.forEach((value, index) => {
    context[`value${index + 1}`] = value;
    context[`v${index + 1}`] = value;
  });

  return context;
};

const evaluateExpression = (expression: string, context: Record<string, number>) => {
  try {
    const normalized = expression
      .replace(/\bskill\s*level\b/gi, "skillLevel")
      .replace(/\bspell\s*level\b/gi, "spellLevel")
      .replace(/\bphysical\s*damage\b/gi, "physicalDamage")
      .replace(/\bmagical\s*damage\b/gi, "magicalDamage")
      .replace(/\bphysical\s*resistance\b/gi, "physicalResistance")
      .replace(/\bmagical\s*resistance\b/gi, "magicalResistance")
      .replace(/\bcrit\s*chance\b/gi, "critChance")
      .replace(/\bcrit\s*damage\b/gi, "critDamage")
      .replace(/\blevel\b/gi, "level")
      .replace(/\b([a-z_][a-z0-9_]*)\b/gi, (match) => {
        const key = match.toLowerCase();
        return key in context ? `context.${key}` : match;
      });

    const result = new Function("context", `"use strict"; return (${normalized});`)(context);

    return typeof result === "number" && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
};

const resolveToken = (
  token: string,
  tokenIndex: number,
  scalingRow: number[],
  stats: CharacterData["stats"],
  skillLevel: number,
) => {
  // Tokens map to scaling array values by position — prefer the scaling value
  // This ensures {critChance} returns the spell's scaling value, not the hero's base critChance stat
  if (typeof scalingRow[tokenIndex] === "number") {
    return scalingRow[tokenIndex];
  }

  const normalizedToken = token.trim().toLowerCase();
  const context = buildContext(stats, skillLevel, scalingRow);
  if (normalizedToken in context) {
    return context[normalizedToken];
  }

  return null;
};

const resolveSpellPreview = (
  hero: HeroDefinition,
  skill: HeroSkill,
  character: CharacterData | null,
  index: number,
): ResolvedSpellPreview => {
  const level = getSkillLevel(character, skill, index);
  const stats = character?.stats ?? hero.baseStats;
  const scalingRow = getScalingRow(skill, level);
  const segments = resolveSpellDescriptionSegments(skill.info.description, ({ token, tokenIndex }) => {
    const resolved = resolveToken(token, tokenIndex, scalingRow, stats, level);
    return resolved !== null ? formatNumber(resolved) : null;
  });

  return {
    id: skill.id,
    name: skill.info.name,
    icon: skill.info.icon,
    manaCost: skill.manaCost,
    level,
    segments,
    isMaxLevel: level >= skill.scaling.length,
    maxLevel: skill.scaling.length,
  };
};

const resolveBasicAttackPreview = (hero: HeroDefinition, character: CharacterData | null): ResolvedSpellPreview => {
  return {
    id: "basic-attack",
    name: "Basic Attack",
    icon: basicAttackIcon,
    manaCost: 0,
    level: 1,
    segments: [{ text: "A simple attack that deals damage based on the hero's stats." }],
    isMaxLevel: true,
    maxLevel: 1,
  };
};

export default function SpellSelector({ hero, character, activeMp, onCastSpell, className }: SpellSelectorProps) {
  const [hoveredSpellId, setHoveredSpellId] = useState<string | null>(null);

  const spells = useMemo(() => {
    const resolved = hero.skills.map((skill, index) => resolveSpellPreview(hero, skill, character, index));

    return [resolveBasicAttackPreview(hero, character), ...resolved];
  }, [character, hero]);

  const hoveredSpell = spells.find((spell) => spell.id === hoveredSpellId) ?? null;

  return (
    <div className={`mx-auto min-h-0 w-full p-0 sm:p-4 ${className ?? ""}`}>
      <div onMouseLeave={() => setHoveredSpellId(null)}>
        {/* hover preview - parchment scroll */}
        <div className="mb-2 hidden min-h-[120px] sm:mb-3 sm:block">
          {hoveredSpell ? (
            <div className="animate-fade-in relative rounded-lg border-2 border-[#6b5a3e] bg-gradient-to-b from-[#1f1810] to-[#15100a] p-4 shadow-[0_0_24px_rgba(0,0,0,0.6),inset_0_0_20px_rgba(201,168,76,0.04)]">
              {/* corner flourishes */}
              <div className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-[#c9a84c]/40" />
              <div className="pointer-events-none absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-[#c9a84c]/40" />
              <div className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-[#c9a84c]/40" />
              <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-[#c9a84c]/40" />

              {/* header row */}
              <div className="relative mb-3 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-lg font-bold tracking-wide text-[#e8dcc8] sm:text-xl">
                    {hoveredSpell.name}
                  </p>
                  {/* sigil dots for level */}
                  <div className="mt-1.5 flex items-center gap-1">
                    {Array.from({ length: hoveredSpell.maxLevel }, (_, i) => (
                      <span
                        key={i}
                        className={`inline-block h-1.5 w-1.5 rotate-45 ${
                          i < hoveredSpell.level ? "bg-[#c9a84c] shadow-[0_0_4px_rgba(201,168,76,0.5)]" : "bg-[#3d2e1f]"
                        }`}
                      />
                    ))}
                    <span className="ml-2 font-serif text-[11px] tracking-wider text-[#8a7a5a]">
                      LV {hoveredSpell.level}
                    </span>
                  </div>
                </div>

                {/* mana crystal */}
                {hoveredSpell.manaCost > 0 ? (
                  <div className="relative shrink-0">
                    <div className="flex items-center gap-1.5 rounded border border-[#2a4560] bg-gradient-to-b from-[#0a1520] to-[#060d14] px-2.5 py-1 shadow-[inset_0_0_8px_rgba(0,0,0,0.5),0_0_8px_rgba(60,130,200,0.1)]">
                      <Image src={manaIcon} alt="Mana" width={16} height={16} className="drop-shadow-[0_0_4px_rgba(100,180,255,0.4)]" unoptimized />
                      <span className="font-bold text-[#8ab8e8] drop-shadow-[0_0_6px_rgba(100,180,255,0.3)]">
                        {hoveredSpell.manaCost}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* decorative divider */}
              <div className="relative mb-3">
                <div className="border-t border-dashed border-[#4a3a28]" />
                <div className="absolute left-1/2 top-1/2 h-px w-8 -translate-x-1/2 -translate-y-1/2 bg-[#c9a84c]/30" />
              </div>

              {/* description */}
              <p className="font-serif text-sm leading-relaxed text-[#c9b896] sm:text-base">
                {hoveredSpell.segments.map((segment: SpellDescriptionSegment, index: number) => (
                  <span
                    key={`${hoveredSpell.id}-${index}`}
                    style={segment.highlight ? { color: "#e8dcc8", fontWeight: 600 } : undefined}
                  >
                    {segment.text}
                  </span>
                ))}
              </p>
            </div>
          ) : null}
        </div>

        {/* spell buttons grid */}
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4 md:gap-4">
          {spells.slice(0, 4).map((spell) => {
            const isBasic = spell.id === "basic-attack";
            const isDisabled = !isBasic && spell.manaCost > activeMp;
            return (
              <SpellButton
                key={spell.id}
                name={spell.name}
                icon={spell.icon}
                disabled={isDisabled}
                onMouseEnter={() => setHoveredSpellId(spell.id)}
                onClick={() => onCastSpell(isBasic ? "basic" : "skill", isBasic ? undefined : spell.id)}
              />
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.15s ease-out;
        }
      `}</style>
    </div>
  );
}
