import { CHARACTERS } from "@/public/gameResources/heroes";
import { resolveSpellDescriptionSegments } from "@/lib/spell-description";
import type { SpellDescriptionSegment } from "@/lib/spell-description";
import type { CharacterSkill, CharacterStats, ResolvedSkillEffect } from "./types";
import type { DescriptionSegment } from "@/shared-heroes/skill-description-segments";

type HeroSkillDefinition = (typeof CHARACTERS)[number]["skills"][number];

export const LEVEL_UP_READY_CLASS = "!border-[#2f7f4f] !bg-[#1f5b37] !text-[#dcffe9] hover:!bg-[#286f44]";

export const STAT_GROUPS = [
  {
    id: "offense",
    title: "Offense",
    titleClassName: "border-[#6a2b2b] bg-[#311717] text-[#ffb3b3]",
    items: [
      { key: "physicalDamage", label: "P.ATK", icon: "fa-hand-fist", iconColor: "text-[#ff8a7a]" },
      { key: "magicalDamage", label: "M.ATK", icon: "fa-wand-magic-sparkles", iconColor: "text-[#7ecbff]" },
      { key: "critChance", label: "Crit%", icon: "fa-crosshairs", iconColor: "text-[#f0d27a]" },
      { key: "critDamage", label: "CritDMG", icon: "fa-star", iconColor: "text-[#ff9ecb]" },
    ],
  },
  {
    id: "defense",
    title: "Defense",
    titleClassName: "border-[#2c5b36] bg-[#16301c] text-[#b9efc5]",
    items: [
      { key: "hp", label: "HP", icon: "fa-heart", iconColor: "text-[#8fdf8f]" },
      { key: "mp", label: "Mana", icon: "fa-droplet", iconColor: "text-[#7fd9ff]" },
      { key: "physicalResistance", label: "P.Res", icon: "fa-shield", iconColor: "text-[#9ed7a8]" },
      { key: "magicalResistance", label: "M.Res", icon: "fa-wand-magic-sparkles", iconColor: "text-[#98b8ff]" },
    ],
  },
  {
    id: "mobility",
    title: "Mobility",
    titleClassName: "border-[#4a3a76] bg-[#21183b] text-[#d3c2ff]",
    items: [{ key: "speed", label: "Speed", icon: "fa-gauge-high", iconColor: "text-[#c0b3ff]" }],
  },
] as const;

export const CHARACTER_STAT_ROWS = [
  { key: "physicalDamage", label: "P. ATK", icon: "fa-hand-fist", iconColor: "text-[#ff8a7a]" },
  { key: "magicalDamage", label: "M. ATK", icon: "fa-wand-magic-sparkles", iconColor: "text-[#7ecbff]" },
  { key: "critChance", label: "Crit%", icon: "fa-crosshairs", iconColor: "text-[#f0d27a]" },
  { key: "critDamage", label: "Crit DMG", icon: "fa-star", iconColor: "text-[#ff9ecb]" },
  { key: "hp", label: "HP", icon: "fa-heart", iconColor: "text-[#8fdf8f]" },
  { key: "mp", label: "Mana", icon: "fa-droplet", iconColor: "text-[#7fd9ff]" },
  { key: "physicalResistance", label: "P. RES", icon: "fa-shield", iconColor: "text-[#9ed7a8]" },
  { key: "magicalResistance", label: "M. RES", icon: "fa-wand-magic-sparkles", iconColor: "text-[#98b8ff]" },
  { key: "speed", label: "Speed", icon: "fa-gauge-high", iconColor: "text-[#c0b3ff]" },
] as const;

export const getStatBonus = (baseValue: number, totalValue: number) => Math.max(totalValue - baseValue, 0);

const formatNumber = (value: number): string => {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  const str = value.toFixed(2);
  return str.replace(/\.?0+$/, "");
};

const buildContext = (stats: CharacterStats, skill: CharacterSkill) => {
  const scalingRow = getScalingRow(skill);
  const ctx: Record<string, number> = {
    level: skill.level,
    skilllevel: skill.level,
    spelllevel: skill.level,
    skill_level: skill.level,
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
    ctx[`value${index + 1}`] = value;
    ctx[`v${index + 1}`] = value;
  });
  return ctx;
};

const findSkillDefinition = (skill: CharacterSkill): HeroSkillDefinition | null => {
  const normalizedName = skill.name.trim().toLowerCase();

  for (const hero of CHARACTERS) {
    const matchedSkill = hero.skills.find((definition) => definition.info.name.trim().toLowerCase() === normalizedName);
    if (matchedSkill) {
      return matchedSkill;
    }
  }

  return null;
};

const getScalingRow = (skill: CharacterSkill) => {
  const definition = findSkillDefinition(skill);
  if (!definition) {
    return [];
  }

  const safeIndex = Math.min(Math.max(skill.level - 1, 0), definition.scaling.length - 1);
  return definition.scaling[safeIndex] ?? definition.scaling[0] ?? [];
};

// Evaluate a formula expression safely
const evaluateFormula = (expression: string, stats: CharacterStats, skill: CharacterSkill): number | null => {
  try {
    let formula = expression.trim().toLowerCase();
    const context = buildContext(stats, skill);

    formula = formula
      .replace(/\bskill\s*level\b/gi, "skillLevel")
      .replace(/\bspell\s*level\b/gi, "spellLevel")
      .replace(/\bphysical\s*damage\b/gi, "physicalDamage")
      .replace(/\bmagical\s*damage\b/gi, "magicalDamage")
      .replace(/\bphysical\s*resistance\b/gi, "physicalResistance")
      .replace(/\bphysical\s*resist\b/gi, "physicalResistance")
      .replace(/\bmagical\s*resistance\b/gi, "magicalResistance")
      .replace(/\bmagic\s*resistance\b/gi, "magicalResistance")
      .replace(/\bcrit\s*chance\b/gi, "critChance")
      .replace(/\bcrit\s*damage\b/gi, "critDamage")
      .replace(/\bmax\s*hp\b/gi, "hp")
      .replace(/\bmax\s*mp\b/gi, "mp")
      .replace(/\b([a-z_][a-z0-9_]*)\b/gi, (match) => {
        const key = match.toLowerCase();
        return key in context ? `context.${key}` : match;
      });

    if (/[a-zA-Z]/.test(formula.replace(/context\./g, "")) && !/[\+\-\*\/\(\)\.]/.test(formula)) {
      return null;
    }

    const result = new Function("context", `"use strict"; return (${formula});`)(context);

    if (typeof result !== "number" || !Number.isFinite(result)) {
      return null;
    }

    return result;
  } catch {
    return null;
  }
};

// Parse a description and resolve all formulas
export const resolveSkillDescription = (
  description: string | DescriptionSegment[],
  stats: CharacterStats,
  skill: CharacterSkill,
  characterName?: string,
): ResolvedSkillEffect => {
  // Helper function to evaluate expressions
  const evaluateExpr = (expression: string): number | null => {
    const result = evaluateFormula(expression, stats, skill);
    return result;
  };

  // Helper function to build context
  const buildCtx = () => {
    const scalingRow = getScalingRow(skill);
    return buildContext(stats, skill);
  };

  // Check if description is the new segment format
  if (Array.isArray(description)) {
    const scalingRow = getScalingRow(skill);
    const segments: SpellDescriptionSegment[] = description.map((segment) => {
      if (segment.type === "text") {
        return { text: segment.content };
      }

      if (segment.type === "value") {
        const value = scalingRow[segment.index];
        if (typeof value === "number") {
          return {
            text: formatNumber(value),
            highlight: segment.highlight,
          };
        }
        return { text: `[VALUE ${segment.index}]` };
      }

      if (segment.type === "calc") {
        const result = evaluateExpr(segment.expression);
        if (result !== null) {
          return {
            text: formatNumber(result),
            highlight: segment.highlight,
          };
        }
        return { text: `[ERROR]` };
      }

      return { text: "[UNKNOWN]" };
    });

    return {
      title: skill.name,
      segments,
    };
  }

  // Fallback to old string-based parsing
  const segments = resolveSpellDescriptionSegments(description, ({ token }) => {
    const result = evaluateFormula(token, stats, skill);
    if (result !== null) {
      return formatNumber(result);
    }
    return null;
  });

  return {
    title: skill.name,
    segments,
  };
};

export const formatCompactPower = (value: number) => {
  const units = ["", "k", "M", "B"];
  let scaledValue = value;
  let unitIndex = 0;

  while (scaledValue >= 1000 && unitIndex < units.length - 1) {
    scaledValue /= 1000;
    unitIndex += 1;
  }

  let formattedValue = Number(scaledValue.toFixed(1));

  if (formattedValue >= 1000 && unitIndex < units.length - 1) {
    formattedValue = Number((formattedValue / 1000).toFixed(1));
    unitIndex += 1;
  }

  return `${formattedValue}${units[unitIndex]}`;
};

export const calculatePower = (
  name: string,
  level: number,
  stats: CharacterStats,
  skills: CharacterSkill[]
) => {

  const critChance = Math.min(stats.critChance, 100);

  let power = 0;

  const physicalDamage = stats.physicalDamage;
  const magicalDamage = stats.magicalDamage;

  const hp = stats.hp;

  const defense =
    (stats.physicalResistance * 7) +
    (stats.magicalResistance * 7);

  const speed =
    stats.speed * 10;

  const crit =
    critChance *
    (stats.critDamage / 100) *
    6;

  if (name === "Archer")
  {
    power =
      (physicalDamage * 1.45) +
      (speed * 1.2) +
      (crit * 1.4) +
      (hp * 0.12) +
      (defense * 0.7) +

      (skills[0].level * 220) +
      (skills[1].level * 120) +
      (skills[2].level * 180);
  }

  if (name === "Assassin")
  {
    power =
      (physicalDamage * 1.45) +
      (speed * 1.35) +
      (crit * 1.7) +
      (hp * 0.08) +
      (defense * 0.45) +

      (skills[0].level * 180) +
      (skills[1].level * 240) +
      (skills[2].level * 260);
  }

  if (name === "Healer")
  {
    power =
      (magicalDamage * 1.35) +
      (hp * 0.30) +
      (defense * 1.55) +
      (speed * 0.7) +
      (crit * 0.6) +

      (skills[0].level * 180) +
      (skills[1].level * 320) +
      (skills[2].level * 240);
  }

  if (name === "Knight")
  {
    power =
      (physicalDamage * 1.2) +
      (hp * 0.42) +
      (defense * 2.4) +
      (speed * 0.5) +
      (crit * 0.4) +

      (skills[0].level * 240) +
      (skills[1].level * 150) +
      (skills[2].level * 340);
  }

  if (name === "Mage")
  {
    power =
      (magicalDamage * 2.0) +
      (hp * 0.12) +
      (defense * 0.7) +
      (speed * 0.9) +
      (crit * 1.45) +

      (skills[0].level * 320) +
      (skills[1].level * 140) +
      (skills[2].level * 280);
  }

  const levelMultiplier =
    1 + ((level - 1) * 0.04);

  power *= levelMultiplier;

  return Math.round(power);
};

export const getLevelUpState = (currentLevel: number, maxLevel: number, cost: number, availableResource: number) => {
  const hasUpgradeAvailable = currentLevel < maxLevel;
  const hasEnoughResources = availableResource >= cost;
  const canLevelUp = hasUpgradeAvailable && hasEnoughResources;

  return { hasUpgradeAvailable, hasEnoughResources, canLevelUp };
};

export const getSkillTooltipPositionClassName = (index: number) => {
  if (index === 0) return "left-0 -translate-x-0";
  if (index === 2) return "left-auto right-0 translate-x-0";
  return "left-1/2 -translate-x-1/2";
};

export const resolveSkillEffect = (skill: CharacterSkill, stats: CharacterStats): ResolvedSkillEffect | null => {
  if (!skill.description) return null;

  return resolveSkillDescription(skill.description, stats, skill);
};
