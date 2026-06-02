import { CharacterInstance } from "../Instances/CharacterInstance";
import { Spell } from "./Spell";
import { applyDamage, resolvePhyDamage, pushSpellEvent } from "../Utils/resolveDamage";

export class ShadowStrike extends Spell {
    constructor(scaling: number[][]) {
        super(scaling);
        this.id        = "s1";
        this.name      = "Shadow Strike";
        this.mpCost    = 10;
        this.targeting = "single";
    }

    applyEffect(idUser: CharacterInstance, idTargets: CharacterInstance[]): void {
        const skillLevel = idUser.character.skills.find(s => s.id === this.id)?.level ?? 1;
        const [multiplier, flat, executeBonus, hpThreshold] = this.scaling[skillLevel - 1];

        const raw   = idUser.character.stats.physicalDamage * multiplier + flat;
        const bonus = idTargets[0].currentHp < idTargets[0].character.stats.hp * (hpThreshold / 100)
            ? 1 + executeBonus / 100
            : 1;

        const damage = resolvePhyDamage(raw * bonus, idUser, idTargets[0]);
        applyDamage(idTargets[0], damage);
    }
}

export class VenomBlade extends Spell {
    constructor(scaling: number[][]) {
        super(scaling);
        this.id        = "s2";
        this.name      = "Venom Blade";
        this.mpCost    = 14;
        this.targeting = "single";
    }

    applyEffect(idUser: CharacterInstance, idTargets: CharacterInstance[]): void {
        const skillLevel = idUser.character.skills.find(s => s.id === this.id)?.level ?? 1;
        const [multiplier, flat, poisonDamage, duration] = this.scaling[skillLevel - 1];

        const raw    = idUser.character.stats.physicalDamage * multiplier + flat;
        const damage = resolvePhyDamage(raw, idUser, idTargets[0]);

        applyDamage(idTargets[0], damage);
        idTargets[0].poison.push({ value: poisonDamage, turn: duration });
    }
}

export class PhantomStep extends Spell {
    constructor(scaling: number[][]) {
		super(scaling);
        this.id        = "s3";
        this.name      = "Phantom Step";
        this.mpCost    = 18;
        this.targeting = "self";
    }

applyEffect(idUser: CharacterInstance, idTargets: CharacterInstance[]): void {
  const skillLevel = idUser.character.skills.find(s => s.id === this.id)?.level ?? 1;
  const [duration, nextAttackBonus] = this.scaling[skillLevel - 1];
  idUser.invisible       = Math.max(idUser.invisible, duration);
  idUser.nextAttackBonus = nextAttackBonus;
  pushSpellEvent({ type: "invisible", targetUid: idUser.uid });
}
}