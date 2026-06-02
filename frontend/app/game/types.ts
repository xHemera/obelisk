export type PlayerState = {
  id: number;
  characters: CharacterState[];
};

export type CharacterState = {
  uid: string;
  currentHp: number;
  currentMp: number;
  maxHp: number;
  maxMp: number;
  owner: number;
  stunned: number;
  invisible: number;
  shieldHp: number;
  overHp: number;
  invul: number;
  taunted: number;
  poison: { value: number; turn: number }[];
  lastStandUsable: boolean;
  lastStandUsed: boolean;
};

export type TurnQueueEntry = {
  characterUid: string;
  playerOwner: number;
  charge: number;
};

export type DamageSource = "basic" | "skill" | "poison";

export type DamageEvent = {
  targetUid: string;
  attackerUid: string;
  damage: number;
  isCrit: boolean;
  lethal: boolean;
  isAoE: boolean;
  source: DamageSource;
};

export type SpellEventType = "heal" | "buff_attack" | "buff_defense" | "buff_crit" | "invisible" | "invulnerability" | "buff_haste" | "buff_other";

export type SpellEvent = {
  type: SpellEventType;
  targetUid: string;
  value?: number;
};

export type GameStatePayload = {
  turn: number;
  gamePhase: string;
  winnerId: number | null;
  activePlayerOwner: number;
  turnQueue: TurnQueueEntry[];
  players: PlayerState[];
  damageEvents: DamageEvent[];
  spellEvents: SpellEvent[];
};
