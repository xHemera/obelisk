import { CharacterInstance } from "../Instances/CharacterInstance";
import { EventBus } from "../Utils/EventBus";
 
export type SpellTargeting = "single" | "aoe" | "self" | "teamAoe" | "teamSingle";
 
export abstract class Spell {
	id:        string;
	name:      string;
	effect:    number;
	mpCost:    number;
	level:     number;
	targeting: SpellTargeting;
	scaling:   number[][];
 
	constructor(scaling: number[][]) {
		this.id        = "default_id";
		this.name      = "default_name";
		this.effect    = 0;
		this.mpCost    = 0;
		this.level     = 0;
		this.targeting = "single";
		this.scaling   = scaling;
	}
 
	abstract applyEffect(idUser: CharacterInstance, idTargets: CharacterInstance[], bus: EventBus): void;
}
