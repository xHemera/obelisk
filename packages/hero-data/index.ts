import { archer } from "./archer";
import { assassin } from "./assassin";
import { healer } from "./healer";
import { knight } from "./knight";
import { mage } from "./mage";

export const CHARACTERS = [archer, assassin, healer, knight, mage];

function buildHeroMaps() {
  const byId = new Map<string, (typeof CHARACTERS)[number]>();
  const byName = new Map<string, (typeof CHARACTERS)[number]>();
  for (const hero of CHARACTERS) {
    byId.set(hero.identity.id, hero);
    byName.set(hero.identity.name, hero);
  }
  return { byId, byName };
}

export const HERO_MAP = buildHeroMaps();
