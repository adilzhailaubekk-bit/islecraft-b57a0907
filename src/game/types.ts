export type ResourceKey = "gold" | "wood" | "stone" | "energy";

export interface Resources {
  gold: number;
  wood: number;
  stone: number;
  energy: number;
}

export interface BuildingDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  produces: ResourceKey;
  baseCost: Partial<Resources>;
  baseRate: number; // per second at level 1
  costMultiplier: number;
  rateMultiplier: number;
  unlockLevel: number;
}

export interface BuildingState {
  id: string;
  level: number;
}

export interface IslandDef {
  id: string;
  name: string;
  emoji: string;
  unlockCost: number;
  rateBonus: number; // multiplier on all production
  description: string;
}

export interface BoosterState {
  doubleIncomeUntil: number; // ts
  speedBoostUntil: number;
  extraWorkers: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  goal: number;
  metric: "gold" | "level" | "buildings" | "islands" | "plots" | "streak";
  reward: number;
}

export interface GameState {
  resources: Resources;
  buildings: (BuildingState | null)[]; // sparse, indexed by plot slot
  unlockedIslands: string[];
  activeIsland: string;
  plots: number;
  level: number;
  xp: number;
  boosters: BoosterState;
  achievements: string[];
  lastTick: number;
  lastDailyClaim: number;
  dailyStreak: number;
  cosmetics: string[];
  totalGoldEarned: number;
}
