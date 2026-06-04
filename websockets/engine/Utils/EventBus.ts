import { DamageEvent, SpellEvent } from "./resolveDamage";

export class EventBus {
	private damageEvents:	DamageEvent[] = [];
	private spellEvents:	SpellEvent[] = [];

	clear(): void {
		this.damageEvents.length = 0;
		this.spellEvents.length = 0;
	}

	getDamageEvents(): DamageEvent[] {
        return [...this.damageEvents];
    }

    getSpellEvents(): SpellEvent[] {
        return [...this.spellEvents];
    }

    pushDamage(event: DamageEvent): void {
        this.damageEvents.push(event);
    }

    pushSpell(event: SpellEvent): void {
        this.spellEvents.push(event);
    }
}