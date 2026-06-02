import { CharacterInstance, ModEntry } from "../Instances/CharacterInstance";
import { applyCrit, rollCrit } from "./crit";

export type DamageSource = "basic" | "skill" | "poison";

export type SpellEventType = "heal" | "buff_attack" | "buff_defense" | "buff_crit" | "invisible" | "invulnerability" | "buff_haste" | "buff_other";

export type SpellEvent = {
	type: SpellEventType;
	targetUid: string;
	value?: number;
};

export type DamageEvent = {
	targetUid: string;
	attackerUid: string;
	damage: number;
	isCrit: boolean;
	lethal: boolean;
	isAoE: boolean;
	source: DamageSource;
};

const damageEvents: DamageEvent[] = [];
const spellEvents: SpellEvent[] = [];

export function clearDamageEvents(): void {
	damageEvents.length = 0;
	spellEvents.length = 0;
}

export function getDamageEvents(): DamageEvent[] {
	return [...damageEvents];
}

export function getSpellEvents(): SpellEvent[] {
	return [...spellEvents];
}

export function pushSpellEvent(event: SpellEvent): void {
	spellEvents.push(event);
}

function applyAndTick(mods: ModEntry[], raw: number): { result: number; mods: ModEntry[] } {
	const totalMod = mods.reduce((acc, { value }) => acc + value, 0);
	const result   = raw * (1 + totalMod / 100); // selon ta convention
    return {
        result,
        mods: mods
            .map(entry => ({ ...entry, turn: entry.turn - 1 }))
            .filter(entry => entry.turn > 0),
    };
}

function applyResistance(damage: number, baseRes: number, resMods: ModEntry[]): { result: number; mods: ModEntry[] } {
    const totalRes = resMods.reduce((acc, { value }) => acc + value, baseRes);
    const result   = damage * (100 / (100 + totalRes));
    return {
        result,
        mods: resMods
            .map(entry => ({ ...entry, turn: entry.turn - 1 }))
            .filter(entry => entry.turn > 0),
    };
}

export function resolvePhyDamage(
    raw: number,
    idUser: CharacterInstance,
    idTarget: CharacterInstance,
    resOverride?: number,
    isAoE: boolean = false,
    source: DamageSource = "skill",
): number {
    const { result: afterUser,   mods: newPhyMod    } = applyAndTick(idUser.phyMod, raw);
    const baseRes = resOverride ?? idTarget.phyRes;
    const { result: afterTarget, mods: newPhyResMod } = applyResistance(afterUser, baseRes, idTarget.phyResMod);

    idUser.phyMod      = newPhyMod;
    idTarget.phyResMod = newPhyResMod;

    const isCrit   = rollCrit(idUser, idTarget);
    const finalDmg = isCrit ? applyCrit(afterTarget, idUser) : afterTarget;
    const rounded  = Math.round(finalDmg);

    damageEvents.push({
        targetUid: idTarget.uid,
        attackerUid: idUser.uid,
        damage: rounded,
        isCrit,
        lethal: idTarget.currentHp - rounded <= 0,
        isAoE,
        source,
    });

    return rounded;
}

export function resolveMagDamage(
    raw: number,
    idUser: CharacterInstance,
    idTarget: CharacterInstance,
    resOverride?: number,
    isAoE: boolean = false,
    source: DamageSource = "skill",
): number {
    const { result: afterUser,   mods: newMagMod    } = applyAndTick(idUser.magMod, raw);
    const baseRes = resOverride ?? idTarget.magRes;
    const { result: afterTarget, mods: newMagResMod } = applyResistance(afterUser, baseRes, idTarget.magResMod);

    idUser.magMod      = newMagMod;
    idTarget.magResMod = newMagResMod;

    const isCrit   = rollCrit(idUser, idTarget);
    const finalDmg = isCrit ? applyCrit(afterTarget, idUser) : afterTarget;
    const rounded  = Math.round(finalDmg);

    damageEvents.push({
        targetUid: idTarget.uid,
        attackerUid: idUser.uid,
        damage: rounded,
        isCrit,
        lethal: idTarget.currentHp - rounded <= 0,
        isAoE,
        source,
    });

    return rounded;
}

export function applyPoisonDamage(target: CharacterInstance, damage: number, attackerUid: string): void {
	const isLethal = target.currentHp - damage <= 0;
	damageEvents.push({
		targetUid: target.uid,
		attackerUid,
		damage: Math.round(damage),
		isCrit: false,
		lethal: isLethal,
		isAoE: false,
		source: "poison",
	});
	applyDamage(target, damage);
}

export function applyDamage(target: CharacterInstance, damage: number): void {
	if (target.invul > 0) {
		console.log(`[applyDamage] ${target.uid} INVUL(${target.invul}) — damage blocked`);
		return;
	}
	let originalDamage = damage;
    if (target.shieldHp > 0) {
        const absorbed  = Math.min(target.shieldHp, damage);
        target.shieldHp -= absorbed;
        damage          -= absorbed;
		console.log(`[applyDamage] ${target.uid} shield absorbed ${absorbed}, remaining damage=${damage}`);
    }
	if (target.overHp > 0) {
		const absorbed = Math.min(target.overHp, damage);
		target.overHp -= absorbed;
		damage        -= absorbed;
	}
	const hpBefore = target.currentHp;
	target.currentHp = Math.max(0, target.currentHp - damage);
	console.log(`[applyDamage] ${target.uid} hp ${hpBefore} -> ${target.currentHp} (damage=${originalDamage}, net=${damage})`);
	checkLastStand(target);
	console.log(`[applyDamage] ${target.uid} after checkLastStand: hp=${target.currentHp} shield=${target.shieldHp} lastStandUsable=${target.lastStandUsable} lastStandUsed=${target.lastStandUsed}`);
}

function checkLastStand(character: CharacterInstance): void {
  if (character.lastStandUsed || !character.lastStandUsable) return;

  character.lastStandUsable = false;
  const spell = character.spells.get("s3");
  if (!spell) return;

  const skillLevel   = character.character.skills.find(s => s.id === "s3")?.level ?? 1;
  const [hpThreshold, shieldPercent] = spell.scaling[skillLevel - 1];

  const hpPercent = (character.currentHp / character.character.stats.hp) * 100;

  if (hpPercent < hpThreshold) {
    character.shieldHp      = Math.floor(character.character.stats.hp * shieldPercent / 100);
    character.lastStandUsed = true;
  }
  if (character.currentHp <= 0) {
	character.currentHp = 1;
  }
}