import { CharacterInstance } from "../Instances/CharacterInstance";

export function rollCrit(character: CharacterInstance, target:CharacterInstance): boolean {
	const crit: boolean = Math.random() * 100 < character.critChance;
	if (crit) {
		target.hasBeenCrit = true;
	}
	return crit;
}

export function applyCrit(damage: number, character:CharacterInstance): number {
	return damage * (1 + character.critDamage / 100)
}