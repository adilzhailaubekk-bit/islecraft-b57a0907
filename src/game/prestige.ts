import type { GameState } from "./types";

export interface PrestigeUpgradeDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  /** Effect per level, e.g. 0.05 => +5% per level */
  perLevel: number;
}

/** Permanent upgrades purchased with Prestige Tokens. */
export const PRESTIGE_UPGRADES: PrestigeUpgradeDef[] = [
  { id: "goldMult",     name: "Золотая жила",    description: "+5% к добыче золота",         emoji: "🪙", maxLevel: 20, baseCost: 1, costMultiplier: 1.5, perLevel: 0.05 },
  { id: "woodMult",     name: "Густые леса",     description: "+5% к добыче дерева",         emoji: "🌲", maxLevel: 20, baseCost: 1, costMultiplier: 1.5, perLevel: 0.05 },
  { id: "stoneMult",    name: "Каменные жилы",   description: "+5% к добыче камня",          emoji: "🪨", maxLevel: 20, baseCost: 1, costMultiplier: 1.5, perLevel: 0.05 },
  { id: "buildSpeed",   name: "Мастер-строитель", description: "-10% к стоимости построек",  emoji: "🔨", maxLevel: 10, baseCost: 2, costMultiplier: 1.6, perLevel: 0.10 },
  { id: "offlineMult",  name: "Ночные смены",    description: "+10% к офлайн-доходу",        emoji: "🌙", maxLevel: 15, baseCost: 2, costMultiplier: 1.55, perLevel: 0.10 },
  { id: "worker",       name: "Дополнительный рабочий", description: "+5% к добыче навсегда", emoji: "👷", maxLevel: 10, baseCost: 3, costMultiplier: 1.7, perLevel: 1 },
  { id: "rareEvents",   name: "Удача островитянина", description: "+10% к шансу редких событий", emoji: "🍀", maxLevel: 10, baseCost: 2, costMultiplier: 1.5, perLevel: 0.10 },
  { id: "storageCap",   name: "Просторные склады",  description: "+25% к вместимости (визуальный бонус)", emoji: "📦", maxLevel: 8, baseCost: 2, costMultiplier: 1.6, perLevel: 0.25 },
];

export interface PrestigeAchievementDef {
  id: string;
  name: string;
  description: string;
  goal: number; // prestigeCount
  reward: number; // tokens
  emoji: string;
}

export const PRESTIGE_ACHIEVEMENTS: PrestigeAchievementDef[] = [
  { id: "p1",   name: "Первое перерождение", description: "Выполните 1 Rebirth",  goal: 1,   reward: 2,   emoji: "✨" },
  { id: "p5",   name: "Пятикратный мастер",  description: "Выполните 5 Rebirth",  goal: 5,   reward: 10,  emoji: "🌟" },
  { id: "p10",  name: "Десятикратный",       description: "Выполните 10 Rebirth", goal: 10,  reward: 25,  emoji: "💫" },
  { id: "p25",  name: "Перерождённый",       description: "Выполните 25 Rebirth", goal: 25,  reward: 75,  emoji: "🌠" },
  { id: "p50",  name: "Бессмертный",         description: "Выполните 50 Rebirth", goal: 50,  reward: 200, emoji: "👑" },
  { id: "p100", name: "Легенда островов",    description: "Выполните 100 Rebirth",goal: 100, reward: 500, emoji: "🏛️" },
];

export const prestigeUpgradeCost = (def: PrestigeUpgradeDef, level: number): number =>
  Math.ceil(def.baseCost * Math.pow(def.costMultiplier, level));

/**
 * How many Prestige Tokens a Rebirth would yield right now.
 * Scales with total gold, building investment, islands and achievements.
 */
export const calcPrestigeTokens = (s: GameState): number => {
  const fromGold = Math.floor(Math.sqrt(Math.max(0, s.totalGoldEarned) / 1_000_000));
  const buildingLevels = s.buildings.reduce((sum, b) => sum + (b?.level ?? 0), 0);
  const fromBuildings = Math.floor(buildingLevels / 8);
  const fromIslands = Math.max(0, s.unlockedIslands.length - 1) * 3;
  const fromAchievements = Math.floor(s.achievements.length / 2);
  // Scaling tax: each prestige requires more, so reward grows but not infinitely
  return Math.max(0, fromGold + fromBuildings + fromIslands + fromAchievements);
};

/** Minimum total gold ever earned required to perform first Rebirth. */
export const prestigeRequirementGold = (prestigeCount: number): number =>
  Math.floor(1_000_000 * Math.pow(2.2, prestigeCount));

export const canPrestige = (s: GameState): boolean =>
  s.totalGoldEarned >= prestigeRequirementGold(s.prestigeCount) && calcPrestigeTokens(s) >= 1;

export interface PrestigeBonuses {
  goldMult: number;
  woodMult: number;
  stoneMult: number;
  buildCostMult: number; // <=1
  offlineMult: number;   // multiplier applied to offline earn
  workerBonus: number;   // extra worker count (5% each)
  rareEventBonus: number;
  storageCapMult: number;
}

export const computePrestigeBonuses = (upgrades: Record<string, number>): PrestigeBonuses => {
  const lvl = (id: string) => upgrades[id] ?? 0;
  return {
    goldMult: 1 + lvl("goldMult") * 0.05,
    woodMult: 1 + lvl("woodMult") * 0.05,
    stoneMult: 1 + lvl("stoneMult") * 0.05,
    buildCostMult: Math.max(0.3, 1 - lvl("buildSpeed") * 0.10),
    offlineMult: 1 + lvl("offlineMult") * 0.10,
    workerBonus: lvl("worker"),
    rareEventBonus: 1 + lvl("rareEvents") * 0.10,
    storageCapMult: 1 + lvl("storageCap") * 0.25,
  };
};
