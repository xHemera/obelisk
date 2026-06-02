/**
 * Helper functions to generate readable skill descriptions
 * These descriptions are meant to be static and readable, WITHOUT parsing formulas
 */

export type SkillScalingParams = {
  multiplier?: number;
  flatDamage?: number;
  armorPen?: number;
  critChance?: number;
  critDamage?: number;
  duration?: number;
  healing?: number;
  shieldAmount?: number;
  [key: string]: number | undefined;
};

/**
 * Defines how to map placeholder names (like {multiplier}) to scaling array indices
 * For example: archerS1 has scaling [multiplier, flat, armorPen]
 * So value1 = multiplier (index 0), value2 = flat (index 1), value3 = armorPen (index 2)
 */
export const SKILL_SCALING_MAPPING: Record<string, Record<string, number>> = {
  // Archer
  archerS1: { multiplier: 0, flat: 1, armorPen: 2 },
  archerS2: { multiplier: 0, flat: 1 },
  archerS3: { critChance: 0, critDamage: 1, duration: 2 },

  // Assassin
  assassinS1: { multiplier: 0, flat: 1, executeBonus: 2, hpThreshold: 3 },
  assassinS2: { multiplier: 0, flat: 1, poisonDmg: 2, duration: 3 },
  assassinS3: { duration: 0, nextAttackBonus: 1 },

  // Healer
  healerS1: { multiplier: 0, flat: 1 },
  healerS2: { multiplier: 0, flat: 1, defenseBonus: 2, duration: 3 },
  healerS3: { duration: 0 },

  // Knight
  knightS1: { multiplier: 0, flat: 1, stunChance: 2, duration: 3 },
  knightS2: { damageReduction: 0, duration: 1 },
  knightS3: { hpThreshold: 0, shieldPercent: 1 },

  // Mage
  mageS1: { multiplier: 0, flat: 1, burnChance: 2, duration: 3 },
  mageS2: { missileCount: 0, multiplier: 1 },
  mageS3: { multiplier: 0, flat: 1 },
};

/**
 * Helper function to get the skill mapping key from character name and skill id
 * @example getSkillMappingKey("Archer", "s1") => "archerS1"
 */
export const getSkillMappingKey = (characterName: string, skillId: string): string => {
  return `${characterName.toLowerCase()}${skillId}`;
};

/**
 * Get the scaling mapping for a specific skill
 */
export const getSkillScalingMapping = (characterName: string, skillId: string): Record<string, number> | null => {
  const key = getSkillMappingKey(characterName, skillId);
  return SKILL_SCALING_MAPPING[key] ?? null;
};

// Readable skill description patterns for all characters
export const SKILL_DESCRIPTION_PATTERNS = {
  // Archer skills
  archerS1: () => "Deals {multiplier}x Physical Damage + {flat} bonus. Ignores {armorPen}% armor.",
  archerS2: () => "Deals {multiplier}x Physical Damage + {flat} bonus to all enemies.",
  archerS3: () => "Increases Crit Chance by {critChance}% and Crit Damage by {critDamage}% for {duration} turns.",

  // Assassin skills
  assassinS1: () => "Deals {multiplier}x Physical Damage + {flat} bonus. Damage increased by {executeBonus}% if target HP is below {hpThreshold}%.",
  assassinS2: () => "Deals {multiplier}x Physical Damage + {flat} bonus. Applies Poison for {duration} turns dealing {poisonDmg} damage per turn.",
  assassinS3: () => "Grants Invisibility for {duration} turn(s). The next attack deals {nextAttackBonus}% more damage.",

  // Healer skills
  healerS1: () => "Restores {multiplier}x M.ATK + {flat} bonus HP to a single ally.",
  healerS2: () => "Heals all allies for {multiplier}x M.ATK + {flat} bonus HP and grants +{defenseBonus}% Defense for {duration} turns.",
  healerS3: () => "Target ally becomes immune to all damage for {duration} turn(s).",

  // Knight skills
  knightS1: () => "Deals {multiplier}x Physical Damage + {flat} bonus and has a {stunChance}% chance to Stun for {duration} turn(s).",
  knightS2: () => "Taunts all enemies and reduces damage taken by {damageReduction}% for {duration} turns.",
  knightS3: () => "When HP drops below {hpThreshold}%, automatically gain a shield equal to {shieldPercent}% of Max HP. Triggers once per battle.",

  // Mage skills
  mageS1: () => "Deals {multiplier}x M.ATK + {flat} bonus fire damage to a single target with a {burnChance}% chance to apply Burn for {duration} turns.",
  mageS2: () => "Launches {missileCount} missiles, each dealing {multiplier}x M.ATK damage to random enemies.",
  mageS3: () => "Deals {multiplier}x M.ATK + {flat} bonus damage to all enemies.",
};
