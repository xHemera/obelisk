import { CharacterInstance } from "../Instances/CharacterInstance";
import { EventBus } from "../Utils/EventBus";
import { Spell } from "./Spell";

export class HealingLight extends Spell {
	constructor(scaling: number[][]) {
		super(scaling);
		this.id        = "s1";
		this.name      = "Healing Light";
		this.mpCost    = 10;
		this.targeting = "teamSingle";
	}

	applyEffect(idUser: CharacterInstance, idTargets: CharacterInstance[], bus: EventBus): void {
		const skillLevel                    = idUser.character.skills.find(s => s.id === this.id)?.level ?? 1;
		const [healMultiplier, flatHeal]    = this.scaling[skillLevel - 1];
		const raw                           = idUser.character.stats.magicalDamage * healMultiplier + flatHeal;
		idTargets[0].currentHp              = Math.min(idTargets[0].character.stats.hp, idTargets[0].currentHp + raw);
		bus.pushSpell({ type: "heal", targetUid: idTargets[0].uid, value: Math.round(raw) });
	}
}

export class Sanctuary extends Spell {
	constructor(scaling: number[][]) {
		super(scaling);
		this.id        = "s2";
		this.name      = "Sanctuary";
		this.mpCost    = 18;
		this.targeting = "teamAoe";
	}

	applyEffect(idUser: CharacterInstance, idTargets: CharacterInstance[], bus: EventBus): void {
		const skillLevel                                          = idUser.character.skills.find(s => s.id === this.id)?.level ?? 1;
		const [healMultiplier, overHealth, defenseBonus, duration] = this.scaling[skillLevel - 1];
		idTargets.forEach(target => {
			const raw      = idUser.character.stats.magicalDamage * healMultiplier;
			target.currentHp = Math.min(target.character.stats.hp, target.currentHp + raw);
			target.overHp   += overHealth;
			target.phyResMod.push({ value: defenseBonus, turn: duration });
			target.magResMod.push({ value: defenseBonus, turn: duration });
			bus.pushSpell({ type: "heal",         targetUid: target.uid, value: Math.round(raw) });
			bus.pushSpell({ type: "buff_defense", targetUid: target.uid });
		});
	}
}

export class DivineProtection extends Spell {
	constructor(scaling: number[][]) {
		super(scaling);
		this.id        = "s3";
		this.name      = "Divine Protection";
		this.mpCost    = 35;
		this.targeting = "teamAoe";
	}

	applyEffect(_idUser: CharacterInstance, idTargets: CharacterInstance[], bus: EventBus): void {
		const skillLevel = _idUser.character.skills.find(s => s.id === this.id)?.level ?? 1;
		const [duration] = this.scaling[skillLevel - 1];
		idTargets.forEach(target => {
			target.invul += duration;
			bus.pushSpell({ type: "invulnerability", targetUid: target.uid });
		});
	}
}