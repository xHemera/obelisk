import { archer } from "hero-data/archer";
import { assassin } from "hero-data/assassin";
import { healer } from "hero-data/healer";
import { knight } from "hero-data/knight";
import { mage } from "hero-data/mage";
import { PiercingShot, PrecisionFocus, RainOfArrows } from "./archer-spells";
import { PhantomStep, ShadowStrike, VenomBlade } from "./assassin-spells";
import { DivineProtection, HealingLight, Sanctuary } from "./healer-spells";
import { IronWill, LastStand, ShieldBash } from "./knight-spells";
import { ArcaneMissiles, Fireball, Meteor } from "./mage-spells";
import { Spell } from "./Spell";

type SpellFactory = () => Spell;

const SPELL_REGISTRY: Record<string, SpellFactory> = {
	"archer_s1":	() => new PiercingShot(archer.skills[0].scaling),
	"archer_s2":	() => new RainOfArrows(archer.skills[1].scaling),
	"archer_s3":	() => new PrecisionFocus(archer.skills[2].scaling),
    "assassin_s1":	() => new ShadowStrike(assassin.skills[0].scaling),
    "assassin_s2":	() => new VenomBlade(assassin.skills[1].scaling),
    "assassin_s3":	() => new PhantomStep(assassin.skills[2].scaling),
	"healer_s1":	() => new HealingLight(healer.skills[0].scaling),
	"healer_s2":	() => new Sanctuary(healer.skills[1].scaling),
	"healer_s3":	() => new DivineProtection(healer.skills[2].scaling),
	"knight_s1":	() => new ShieldBash(knight.skills[0].scaling),
	"knight_s2":	() => new IronWill(knight.skills[1].scaling),
	"knight_s3":	() => new LastStand(knight.skills[2].scaling),
	"mage_s1":		() => new Fireball(mage.skills[0].scaling),
	"mage_s2":		() => new ArcaneMissiles(mage.skills[1].scaling),
	"mage_s3":		() => new Meteor(mage.skills[2].scaling),
};

export function buildSpellMap(characterId: string, skills: { id: string }[]): Map<string, Spell> {
	const map = new Map<string, Spell>();
	skills.forEach(skill => {
		const key 		= `${characterId}_${skill.id}`;
		const factory	= SPELL_REGISTRY[key];
		if (factory) map.set(skill.id, factory());
	});
	return map;
}