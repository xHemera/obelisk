import { CharacterInstance } from "../Instances/CharacterInstance";
import { applyDamage, resolvePhyDamage, pushSpellEvent } from "../Utils/resolveDamage";
import { Spell } from "./Spell";

export class PiercingShot extends Spell {

    constructor(scaling: number[][]) {
        super(scaling);
        this.id     	= "s1";
        this.name   	= "Piercing Shot";
        this.mpCost 	= 8;
        this.targeting 	= "single"
    }

    applyEffect(idUser: CharacterInstance, idTargets: CharacterInstance[]): void {
        const skillLevel  = idUser.character.skills.find(s => s.id === this.id)?.level ?? 1;
        const [multiplier, flat, armorPen] = this.scaling[skillLevel -1];

        const raw        = idUser.character.stats.physicalDamage * multiplier + flat;
        const reducedRes = idTargets[0].phyRes * (1 - armorPen / 100);
        const damage     = resolvePhyDamage(raw, idUser, idTargets[0], reducedRes);
		applyDamage(idTargets[0], damage);
    }
}

export class RainOfArrows extends Spell {

	constructor(scaling: number[][]) {
		super(scaling);
		this.id		= "s2";
		this.name	= "Rain of Arrows";
		this.mpCost	= 12;
		this.targeting = "aoe"
	}

	applyEffect(idUser: CharacterInstance, idTargets: CharacterInstance[]): void {
		const skillLevel = idUser.character.skills.find(s => s.id == this.id)?.level ?? 1;
		const [multiplier, flat] = this.scaling[skillLevel - 1];

		const raw = idUser.character.stats.physicalDamage * multiplier + flat;
		idTargets.forEach(target => {
			const damage = resolvePhyDamage(raw, idUser, target, undefined, true);
			applyDamage(target, damage);
		});
	}
}

export class PrecisionFocus extends Spell {

	constructor(scaling: number[][]) {
		super(scaling);
		this.id 	= "s3";
		this.name	= "Precision Focus";
		this.mpCost = 15;
		this.targeting = "self";
	}

	applyEffect(idUser: CharacterInstance): void {
		const skillLevel = idUser.character.skills.find(s => s.id === this.id)?.level ?? 1;
		const [critChance, critDamage, duration] = this.scaling[skillLevel -1];

		idUser.critChanceMod.push({ value: critChance, turn: duration });
		idUser.critDamageMod.push({ value: critDamage, turn: duration });
		pushSpellEvent({ type: "buff_crit", targetUid: idUser.uid });
	}
}
