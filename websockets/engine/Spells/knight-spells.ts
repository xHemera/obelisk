import { CharacterInstance } from "../Instances/CharacterInstance";
import { applyDamage, resolvePhyDamage, pushSpellEvent } from "../Utils/resolveDamage";
import { Spell } from "./Spell";

export class ShieldBash extends Spell {
	constructor(scaling: number[][]) {
		super(scaling);
		this.id			= "s1";
		this.name		= "Shield Bash";
		this.mpCost		= 12;
		this.targeting	= "single";
	}

  applyEffect(user: CharacterInstance, idTargets: CharacterInstance[]): void {
    const skillLevel = user.character.skills.find(s => s.id === this.id)?.level ?? 1;
    const [multiplier, flat, stunChance, stunDuration] = this.scaling[skillLevel - 1];

    const raw    = user.character.stats.physicalDamage * multiplier + flat;
    const damage = resolvePhyDamage(raw, user, idTargets[0]);
    applyDamage(idTargets[0], damage);

    if (Math.random() * 100 < stunChance) {
      idTargets[0].stunned = Math.max(idTargets[0].stunned, stunDuration);
    }
  }
}

export class IronWill extends Spell {
  constructor(scaling: number[][]) {
    super(scaling);
    this.id        = "s2";
    this.name      = "Iron Will";
    this.mpCost    = 15;
    this.targeting = "self";
  }

  applyEffect(user: CharacterInstance, targets: CharacterInstance[]): void {
    const skillLevel = user.character.skills.find(s => s.id === this.id)?.level ?? 1;
    const [damageReduction, duration] = this.scaling[skillLevel - 1];
    user.phyResMod.push({ value: damageReduction, turn: duration });
    user.magResMod.push({ value: damageReduction, turn: duration });
    pushSpellEvent({ type: "buff_defense", targetUid: user.uid });

    targets.forEach(enemy => {
      enemy.taunted = Math.max(enemy.taunted, duration);
      pushSpellEvent({ type: "buff_other", targetUid: enemy.uid });
    });
  }
}

export class LastStand extends Spell {
  constructor(scaling: number[][]) {
    super(scaling);
    this.id        = "s3";
    this.name      = "Last Stand";
    this.mpCost    = 25;
    this.targeting = "self";
  }

  applyEffect(user: CharacterInstance): void {
    user.lastStandUsable = true;
  }
}