import { ARCHER_S1_DESCRIPTION, ARCHER_S2_DESCRIPTION, ARCHER_S3_DESCRIPTION } from "./skill-description-segments";

const ID = "archer";

const PATH = `/gameResources/heroes/${ID}/assets`;

const portrait = `${PATH}/archer_icon.webp`;
const body = `${PATH}/archer_splash.webp`;
const chibi = `${PATH}/archer_chibi.webp`;
const spell1Icon = `${PATH}/spells/water_spell.png`;
const spell2Icon = `${PATH}/spells/attack_boost2.png`;
const spell3Icon = `${PATH}/spells/stunned.png`;

export const archer = {
  identity: {
    id: ID,
    name: "Archer",

    assets: {
      portrait: portrait,
      body: body,
      chibi: chibi,
    },
  },

	baseStats: {
      physicalDamage: 165,
      magicalDamage: 45,

      critChance: 12,
      critDamage: 175,

      hp: 1240,
      mp: 180,

      physicalResistance: 12,
      magicalResistance: 8,

      speed: 118,
    },

	// Per level growth % for each stat
  growth: {
    physicalDamage: 8,
    magicalDamage: 4,

    critChance: 1,
    critDamage: 2,

    hp: 10,
    mp: 5,

    physicalResistance: 3,
    magicalResistance: 2,

    speed: 1,
  },

  skills: [
    {
      id: "s1",
      type: "damage",
      targeting: "single",
      info: {
        name: "Piercing Shot",
        icon: spell1Icon,
        description: ARCHER_S1_DESCRIPTION,
      },
      unlockLevel: 1,
      manaCost: 8,
      scaling: [
  // [multiplier, flatDamagePerLevel, armorPen]
          [1.2, 15, 15],
          [1.3, 18, 17],
          [1.4, 21, 19],
          [1.5, 24, 21],
          [1.6, 27, 23],
          [1.7, 30, 25],
          [1.8, 33, 27],
          [1.9, 36, 29],
          [2.0, 40, 32],
          [2.2, 45, 35],
      ],
    },

    {
      id: "s2",
      type: "aoeDamage",
      targeting: "aoe",
      info: {
        name: "Rain of Arrows",
        icon: spell2Icon,
        description: ARCHER_S2_DESCRIPTION,
      },
      unlockLevel: 5,
      manaCost: 12,
      scaling: [
        // [multiplier, flatDamagePerLevel]
        [0.8, 10],
        [0.9, 12],
        [1.0, 14],
        [1.1, 16],
        [1.2, 18],
        [1.3, 20],
        [1.4, 22],
        [1.5, 24],
        [1.7, 28],
        [2.0, 35],
      ],
    },

    {
      id: "s3",
      type: "buff",
      targeting: "self",
      info: {
        name: "Precision Focus",
        icon: spell3Icon,
        description: ARCHER_S3_DESCRIPTION,
      },
      unlockLevel: 10,
      manaCost: 15,
      scaling: [
        // [critChance, critDamage, duration]
        [5, 8, 3],
        [7, 10, 3],
        [9, 12, 3],
        [11, 14, 3],
        [13, 16, 4],
        [15, 18, 4],
        [17, 20, 4],
        [20, 24, 5],
        [24, 28, 5],
        [30, 35, 5],
      ],
    },
  ],
}
