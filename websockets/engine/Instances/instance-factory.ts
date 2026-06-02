import { archer } from "hero-data/archer";
import { assassin } from "hero-data/assassin";
import { healer } from "hero-data/healer";
import { knight } from "hero-data/knight";
import { mage } from "hero-data/mage";
import { HeroData } from "./HeroData";

function toHeroData(hero: typeof archer): HeroData {
	return {
		id:		hero.identity.id,
		name:	hero.identity.name,
		stats:	hero.baseStats,
		skills:	hero.skills.map(s => ({
			id:			s.id,
			level:		1,
			scaling:	s.scaling,
		})),
	};
}

const HERO_REGISTRY: Record<string, HeroData> = {
	archer:		toHeroData(archer),
	assassin:	toHeroData(assassin),
	healer:		toHeroData(healer),
	knight:		toHeroData(knight),
	mage:		toHeroData(mage),
};

export function getHeroData(characterId: string): HeroData {
	const data = HERO_REGISTRY[characterId];
	if (!data) throw new Error(`WHO IS THIS: ${characterId}`);
	return data;
}

export function getRawHero(characterId: string): typeof archer {
  const raw: Record<string, typeof archer> = {
    archer, assassin, healer, knight, mage,
  };
  const hero = raw[characterId];
  if (!hero) throw new Error(`WHO IS THIS: ${characterId}`);
  return hero;
}