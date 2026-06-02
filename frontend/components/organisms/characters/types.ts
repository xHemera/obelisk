export type CharacterSkill = {
  id: 			    string;
  name: 		    string;
  image: 		    string;
  description: 	string | DescriptionSegment[];
  unlockLevel?: number;
  level: 		    number;
  cost:		    	number;
  xp:           number;
};

/**
 * Segment d'une description de compétence.
 * Peut être du texte statique, une valeur directe du scaling, ou une expression calculée.
 *
 * Exemples:
 * - { type: "text", content: "Deals " }
 * - { type: "calc", expression: "value1 * physicalDamage + value2", highlight: true }
 * - { type: "value", index: 2, highlight: true }
 */
export type DescriptionSegment =
  | { type: "text"; content: string }
  | { type: "value"; index: number; highlight?: boolean }
  | { type: "calc"; expression: string; highlight?: boolean };

export type CharacterStats = {
  physicalDamage: 		number;
  magicalDamage: 		  number;
  critChance: 			  number;
  critDamage: 			  number;
  hp: 					      number;
  mp: 					      number;
  physicalResistance:	number;
  magicalResistance:	number;
  speed:				      number;
};

export type CharacterData = {
    id:           string;
    name:         string;
    portrait:     string;
    body:         string;
    baseStats:    CharacterStats;
    stats:        CharacterStats;
    level:        number;
    xpPercent:    number;
    levelUpCost:  number;
    skills:       CharacterSkill[];
};

export type PlayerResources = {
  ruby: number;
};

export type SkillEffectSegment = {
  text: string;
  highlight?: boolean;
};

export type ResolvedSkillEffect = {
  title: string;
  segments: SkillEffectSegment[];
};
