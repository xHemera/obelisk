import { CharacterInstance, ModEntry } from "../Instances/CharacterInstance";
import { applyCrit, rollCrit } from "./crit";
import { EventBus } from "./EventBus";

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

export type DamageType = "phy" | "mag";

function resolveDamage(
    type: DamageType,
    raw: number,
    idUser: CharacterInstance,
    idTarget: CharacterInstance,
	bus: EventBus,
    resOverride?: number,
    isAoE: boolean = false,
    source: DamageSource = "skill",
): number {
    const [userMod, targetBaseRes, targetResMod]: [ModEntry[], number, ModEntry[]] = type === "phy"
        ? [idUser.phyMod, idTarget.phyRes, idTarget.phyResMod]
        : [idUser.magMod, idTarget.magRes, idTarget.magResMod];

    const { result: afterUser,   mods: newMod    } = applyAndTick(userMod, raw);
    const baseRes = resOverride ?? targetBaseRes;
    const { result: afterTarget, mods: newResMod } = applyResistance(afterUser, baseRes, targetResMod);

    if (type === "phy") {
        idUser.phyMod      = newMod;
        idTarget.phyResMod = newResMod;
    } else {
        idUser.magMod      = newMod;
        idTarget.magResMod = newResMod;
    }

    const isCrit   = rollCrit(idUser, idTarget);
    const finalDmg = isCrit ? applyCrit(afterTarget, idUser) : afterTarget;
    const rounded  = Math.round(finalDmg);

    bus.pushDamage({        // ← au lieu de damageEvents.push(...)
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

export function resolvePhyDamage(
    raw: number,
    idUser: CharacterInstance,
    idTarget: CharacterInstance,
    bus: EventBus,
    resOverride?: number,
    isAoE?: boolean,
    source?: DamageSource,
): number {
    return resolveDamage("phy", raw, idUser, idTarget, bus, resOverride, isAoE, source);
}

export function resolveMagDamage(
    raw: number,
    idUser: CharacterInstance,
    idTarget: CharacterInstance,
    bus: EventBus,
    resOverride?: number,
    isAoE?: boolean,
    source?: DamageSource,
): number {
    return resolveDamage("mag", raw, idUser, idTarget, bus, resOverride, isAoE, source);
}

export function applyPoisonDamage(
    target: CharacterInstance,
    damage: number,
    attackerUid: string,
    bus: EventBus,
): void {
    bus.pushDamage({
        targetUid: target.uid,
        attackerUid,
        damage: Math.round(damage),
        isCrit: false,
        lethal: target.currentHp - damage <= 0,
        isAoE: false,
        source: "poison",
    });
    applyDamage(target, damage);
}

export function applyDamage(target: CharacterInstance, damage: number): void {
	if (target.invul > 0) {
		return;
	}
	let originalDamage = damage;
    if (target.shieldHp > 0) {
        const absorbed  = Math.min(target.shieldHp, damage);
        target.shieldHp -= absorbed;
        damage          -= absorbed;
    }
	if (target.overHp > 0) {
		const absorbed = Math.min(target.overHp, damage);
		target.overHp -= absorbed;
		damage        -= absorbed;
	}
	target.currentHp = Math.max(0, target.currentHp - damage);
	checkLastStand(target);
}

function checkLastStand(character: CharacterInstance): void {
	if (character.lastStandUsed || !character.lastStandUsable) return;

	const spell = character.spells.get("s3");
	if (!spell) return;

	character.lastStandUsable = false;

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