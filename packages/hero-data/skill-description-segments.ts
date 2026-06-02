/**
 * New skill description system using segments
 * Descriptions are built from segments that can be:
 * - Static text
 * - Calculated values (e.g., "value1 * physicalDamage + value2")
 * - Direct scaling indices (e.g., value3)
 */

export type DescriptionSegment = 
  | { type: "text"; content: string }
  | { type: "calc"; expression: string; highlight?: boolean }
  | { type: "value"; index: number; highlight?: boolean };

export type SkillDescriptionSegments = DescriptionSegment[];

/**
 * Helper to create a text segment
 */
export const text = (content: string): DescriptionSegment => ({
  type: "text",
  content,
});

/**
 * Helper to create a calculation segment
 * @example calc("value1 * physicalDamage + value2")
 */
export const calc = (expression: string, highlight = true): DescriptionSegment => ({
  type: "calc",
  expression,
  highlight,
});

/**
 * Helper to create a value segment (direct index reference)
 * @example value(2) // references scaling[2]
 */
export const value = (index: number, highlight = true): DescriptionSegment => ({
  type: "value",
  index,
  highlight,
});

// ============================================
// ARCHER DESCRIPTIONS
// ============================================

export const ARCHER_S1_DESCRIPTION: SkillDescriptionSegments = [
  text("Deals "),
  calc("value1 * physicalDamage + value2"),
  text(" Physical Damage. Ignores "),
  value(2),
  text("% armor."),
];

export const ARCHER_S2_DESCRIPTION: SkillDescriptionSegments = [
  text("Deals "),
  calc("value1 * physicalDamage + value2"),
  text(" Physical Damage to all enemies."),
];

export const ARCHER_S3_DESCRIPTION: SkillDescriptionSegments = [
  text("Increases Crit Chance by "),
  value(0),
  text("% and Crit Damage by "),
  value(1),
  text("% for "),
  value(2),
  text(" turns."),
];

// ============================================
// ASSASSIN DESCRIPTIONS
// ============================================

export const ASSASSIN_S1_DESCRIPTION: SkillDescriptionSegments = [
  text("Deals "),
  calc("value1 * physicalDamage + value2"),
  text(" Physical Damage. Damage increased by "),
  value(2),
  text("% if target HP is below "),
  value(3),
  text("%."),
];

export const ASSASSIN_S2_DESCRIPTION: SkillDescriptionSegments = [
  text("Deals "),
  calc("value1 * physicalDamage + value2"),
  text(" Physical Damage. Applies Poison for "),
  value(3),
  text(" turns dealing "),
  value(2),
  text(" damage per turn."),
];

export const ASSASSIN_S3_DESCRIPTION: SkillDescriptionSegments = [
  text("Grants Invisibility for "),
  value(0),
  text(" turn(s). The next attack deals "),
  value(1),
  text("% more damage."),
];

// ============================================
// HEALER DESCRIPTIONS
// ============================================

export const HEALER_S1_DESCRIPTION: SkillDescriptionSegments = [
  text("Restores "),
  calc("value1 * magicalDamage + value2"),
  text(" HP to a single ally."),
];

export const HEALER_S2_DESCRIPTION: SkillDescriptionSegments = [
  text("Heals all allies for "),
  calc("value1 * magicalDamage + value2"),
  text(" HP and grants +"),
  value(2),
  text("% Defense for "),
  value(3),
  text(" turns."),
];

export const HEALER_S3_DESCRIPTION: SkillDescriptionSegments = [
  text("Target ally becomes immune to all damage for "),
  value(0),
  text(" turn(s)."),
];

// ============================================
// KNIGHT DESCRIPTIONS
// ============================================

export const KNIGHT_S1_DESCRIPTION: SkillDescriptionSegments = [
  text("Deals "),
  calc("value1 * physicalDamage + value2"),
  text(" Physical Damage and has a "),
  value(2),
  text("% chance to Stun for "),
  value(3),
  text(" turn(s)."),
];

export const KNIGHT_S2_DESCRIPTION: SkillDescriptionSegments = [
  text("Taunts all enemies and reduces damage taken by "),
  value(0),
  text("% for "),
  value(1),
  text(" turns."),
];

export const KNIGHT_S3_DESCRIPTION: SkillDescriptionSegments = [
  text("When HP drops below "),
  value(0),
  text("%, automatically gain a shield equal to "),
  value(1),
  text("% of Max HP. Triggers once per battle."),
];

// ============================================
// MAGE DESCRIPTIONS
// ============================================

export const MAGE_S1_DESCRIPTION: SkillDescriptionSegments = [
  text("Deals "),
  calc("value1 * magicalDamage + value2"),
  text(" fire damage to a single target with a "),
  value(2),
  text("% chance to apply Burn for "),
  value(3),
  text(" turns."),
];

export const MAGE_S2_DESCRIPTION: SkillDescriptionSegments = [
  text("Launches "),
  value(0),
  text(" missiles, each dealing "),
  calc("value2 * magicalDamage"),
  text(" damage to random enemies."),
];

export const MAGE_S3_DESCRIPTION: SkillDescriptionSegments = [
  text("Deals "),
  calc("value1 * magicalDamage + value2"),
  text(" damage to all enemies."),
];
