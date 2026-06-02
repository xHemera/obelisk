import { HEALER_S1_DESCRIPTION, HEALER_S2_DESCRIPTION, HEALER_S3_DESCRIPTION } from "./skill-description-segments";

const ID = "healer";

const PATH = `/gameResources/heroes/${ID}/assets`;

const portrait = `${PATH}/healer_icon.webp`;
const body = `${PATH}/healer_splash.webp`;
const chibi = `${PATH}/healer_chibi.webp`;
const spell1Icon = `${PATH}/spells/healing_spell.png`;
const spell2Icon = `${PATH}/spells/defense_boost.png`;
const spell3Icon = `${PATH}/spells/divine_protection_spell.png`;

export const healer = {
  identity: {
    id: ID,
    name: "Healer",
    assets: {
      portrait: portrait,
      body: body,
      chibi: chibi,
    },
  },

  baseStats: {
    physicalDamage: 65,
    magicalDamage: 155,

    critChance: 8,
    critDamage: 150,

    hp: 1380,
    mp: 320,

    physicalResistance: 9,
    magicalResistance: 14,

    speed: 95,
  },

  growth: {
    physicalDamage: 3,
    magicalDamage: 10,

    critChance: 1,
    critDamage: 2,

    hp: 9,
    mp: 10,

    physicalResistance: 2,
    magicalResistance: 4,

    speed: 1,
  },

  skills: [
    {
      id: "s1",
      type: "singleHeal",
      targeting: "teamSingle",
      info: {
        name: "Healing Light",
        icon: spell1Icon,
        description: HEALER_S1_DESCRIPTION,
      },

      unlockLevel: 1,
      manaCost: 10,
      scaling: [
        // [healMultiplier, flatHealBonus]
        [0.6, 25],
        [0.7, 30],
        [0.8, 35],
        [0.9, 40],
        [1.0, 45],
        [1.1, 50],
        [1.2, 56],
        [1.35, 64],
        [1.5, 72],
        [1.7, 85],
      ],
    },

    {
      id: "s2",
      type: "aoeHealBuff",
      targeting: "teamAoe",
      info: {
        name: "Sanctuary",
        icon: spell2Icon,
        description: HEALER_S2_DESCRIPTION,
      },
      unlockLevel: 7,
      manaCost: 18,
      scaling: [
        // [healMultiplier, flatHealBonus, defenseBonus%, duration]
        [0.4, 15, 3, 2],
        [0.5, 18, 4, 2],
        [0.6, 21, 5, 2],
        [0.7, 24, 6, 2],
        [0.8, 28, 7, 2],
        [0.9, 32, 8, 3],
        [1.0, 36, 10, 3],
        [1.15, 42, 12, 3],
        [1.3, 50, 15, 4],
        [1.5, 60, 20, 4],
      ],
    },

    {
      id: "s3",
      type: "invulnerability",
      targeting: "teamAoe",
      info: {
        name: "Divine Protection",
        icon: spell3Icon,
        description: HEALER_S3_DESCRIPTION,
      },
      unlockLevel: 14,
      manaCost: 35,
      scaling: [
        // [duration]
        [1],
        [1],
        [1],
        [1],
        [1],
        [1],
        [1],
        [1],
        [1],
        [2],
      ],
    },
  ],
}
