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
  goldBonus?: number; // extra multiplier on gold only
  offlineBonus?: number; // multiplier on offline earnings
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

export type MissionType =
  | "earnGold"
  | "earnWood"
  | "earnStone"
  | "upgrade"
  | "build"
  | "spend";

export interface DailyMission {
  id: string;
  type: MissionType;
  goal: number;
  progress: number;
  claimed: boolean;
  rewardGold: number;
  rewardXp: number;
  title: string;
  emoji: string;
}

export interface DailyCounters {
  date: string; // YYYY-MM-DD (local)
  goldEarned: number;
  woodEarned: number;
  stoneEarned: number;
  upgrades: number;
  builds: number;
  goldSpent: number;
}

export interface GameSettings {
  graphics: {
    quality: "low" | "medium" | "high";
    particles: boolean;
    animations: boolean;
  };
}

export const defaultSettings = (): GameSettings => ({
  graphics: {
    quality: "high",
    particles: true,
    animations: true,
  },
});

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
  // Daily retention
  dailyCycleDay: number; // next day index to claim (1..7)
  lastSpinAt: number;
  dailyMissions: DailyMission[];
  dailyMissionsDate: string;
  dailyCounters: DailyCounters;
  settings: GameSettings;
  // Prestige / Rebirth — permanent meta-progression
  prestigeTokens: number;
  prestigeCount: number;
  prestigeUpgrades: Record<string, number>;
  prestigeAchievements: string[];
  // Per-island saved buildings and plots (for inactive islands)
  islandStates?: Record<string, { buildings: (BuildingState | null)[]; plots: number }>;
}
