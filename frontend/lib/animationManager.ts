export type AnimDef = {
  id: string;
  frames: number;
  path: string;
  frameMs: number;
};

const BASE = "/gameResources/animations/PNG";

function aPath(category: string, name: string, variant: string): string {
  return `${category}/${name}/${name}_${variant}`;
}

// ── Damage source animations ──────────────────────────

const SINGLE_NON_CRIT: AnimDef = {
  id: "single_non_crit",
  frames: 8,
  frameMs: 83,
  path: aPath("Impacts", "symmetrical_impact_006", "small_yellow"),
};

const SINGLE_CRIT: AnimDef = {
  id: "single_crit",
  frames: 8,
  frameMs: 83,
  path: aPath("Impacts", "symmetrical_impact_006", "large_yellow"),
};

const AOE_NON_CRIT: AnimDef = {
  id: "aoe_non_crit",
  frames: 7,
  frameMs: 83,
  path: aPath("Impacts", "directional_impact_002", "small_white"),
};

const AOE_CRIT: AnimDef = {
  id: "aoe_crit",
  frames: 7,
  frameMs: 83,
  path: aPath("Impacts", "directional_impact_002", "large_white"),
};

const POISON: AnimDef = {
  id: "poison",
  frames: 17,
  frameMs: 30,  // ~510ms total
  path: aPath("Fantasy Spells", "spell_poison_001", "small_green"),
};

// ── Spell event animations ────────────────────────────

const HEAL: AnimDef = {
  id: "heal",
  frames: 16,
  frameMs: 35,  // ~560ms total
  path: aPath("Fantasy Spells", "spell_heal_001", "small_red"),
};

const BUFF_ATTACK: AnimDef = {
  id: "buff_attack",
  frames: 18,
  frameMs: 33,  // ~594ms total
  path: aPath("Fantasy Spells", "spell_attack_up_001", "small_red"),
};

const BUFF_DEFENSE: AnimDef = {
  id: "buff_defense",
  frames: 18,
  frameMs: 33,
  path: aPath("Fantasy Spells", "spell_defense_up_001", "small_blue"),
};

const BUFF_CRIT: AnimDef = {
  id: "buff_crit",
  frames: 18,
  frameMs: 33,
  path: aPath("Fantasy Spells", "spell_attack_up_001", "small_red"),
};

const INVISIBLE: AnimDef = {
  id: "invisible",
  frames: 10,
  frameMs: 50,  // ~500ms total
  path: aPath("Sci-fi", "scifi_warp_001", "small_green"),
};

const INVULNERABILITY: AnimDef = {
  id: "invulnerability",
  frames: 14,
  frameMs: 43,  // ~602ms total
  path: aPath("Symbols", "symbol_alert_001", "small_red"),
};

const BUFF_OTHER: AnimDef = {
  id: "buff_other",
  frames: 18,
  frameMs: 33,
  path: aPath("Fantasy Spells", "spell_attack_up_001", "small_red"),
};

// ── Selectors ─────────────────────────────────────────

export function getTargetAnim(isCrit: boolean, isAoE: boolean, source: string): AnimDef {
  if (source === "poison") return POISON;
  if (isAoE) return isCrit ? AOE_CRIT : AOE_NON_CRIT;
  return isCrit ? SINGLE_CRIT : SINGLE_NON_CRIT;
}

export function getSpellAnim(type: string): AnimDef | undefined {
  switch (type) {
    case "heal":            return HEAL;
    case "buff_attack":     return BUFF_ATTACK;
    case "buff_defense":    return BUFF_DEFENSE;
    case "buff_crit":       return BUFF_CRIT;
    case "invisible":       return INVISIBLE;
    case "invulnerability": return INVULNERABILITY;
    case "buff_haste":      return undefined; // not available yet
    default:                return BUFF_OTHER;
  }
}

const ALL_ANIM_DEFS: AnimDef[] = [
  SINGLE_NON_CRIT,
  SINGLE_CRIT,
  AOE_NON_CRIT,
  AOE_CRIT,
  POISON,
  HEAL,
  BUFF_ATTACK,
  BUFF_DEFENSE,
  BUFF_CRIT,
  INVISIBLE,
  INVULNERABILITY,
  BUFF_OTHER,
];

export function preloadAllAnimations(): Promise<void>[] {
  const promises: Promise<void>[] = [];
  const seen = new Set<string>();
  for (const anim of ALL_ANIM_DEFS) {
    for (let i = 0; i < anim.frames; i++) {
      const url = frameUrl(anim, i);
      if (seen.has(url)) continue;
      seen.add(url);
      promises.push(
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = url;
        }),
      );
    }
  }
  return promises;
}

export function frameUrl(anim: AnimDef, frameIndex: number): string {
  const pad = String(frameIndex).padStart(4, "0");
  return `${BASE}/${anim.path}/frame${pad}.png`;
}
