import type { BuildingDef, IslandDef, Achievement } from "./types";

/**
 * Economy is tuned for slow, satisfying progression.
 * - Lower base rates and higher cost multipliers slow exponential growth.
 * - Upgrades scale ~1.45x per level so high tiers are a real commitment.
 * - Late-game buildings unlock at higher levels and cost noticeably more.
 */
export const BUILDINGS: BuildingDef[] = [
  {
    id: "hut",
    name: "Хижина золотоискателя",
    emoji: "🏚️",
    description: "Базовый источник золота",
    produces: "gold",
    baseCost: { gold: 50 },
    baseRate: 0.4,
    costMultiplier: 1.45,
    rateMultiplier: 1.14,
    unlockLevel: 1,
  },
  {
    id: "lumber",
    name: "Лесопилка",
    emoji: "🪵",
    description: "Добывает древесину из пальм",
    produces: "wood",
    baseCost: { gold: 180 },
    baseRate: 0.25,
    costMultiplier: 1.5,
    rateMultiplier: 1.15,
    unlockLevel: 2,
  },
  {
    id: "quarry",
    name: "Каменоломня",
    emoji: "⛰️",
    description: "Извлекает камень из утёсов",
    produces: "stone",
    baseCost: { gold: 600, wood: 60 },
    baseRate: 0.16,
    costMultiplier: 1.55,
    rateMultiplier: 1.16,
    unlockLevel: 4,
  },
  {
    id: "windmill",
    name: "Ветряк",
    emoji: "🌬️",
    description: "Преобразует ветер в энергию",
    produces: "energy",
    baseCost: { gold: 2200, wood: 220, stone: 90 },
    baseRate: 0.1,
    costMultiplier: 1.6,
    rateMultiplier: 1.17,
    unlockLevel: 6,
  },
  {
    id: "market",
    name: "Торговая площадь",
    emoji: "🏛️",
    description: "Стабильный поток золота",
    produces: "gold",
    baseCost: { gold: 9000, wood: 700, stone: 350 },
    baseRate: 3.5,
    costMultiplier: 1.65,
    rateMultiplier: 1.18,
    unlockLevel: 10,
  },
  {
    id: "refinery",
    name: "Алхимическая башня",
    emoji: "🗼",
    description: "Магическая переработка ресурсов",
    produces: "gold",
    baseCost: { gold: 75000, stone: 4000, energy: 1200 },
    baseRate: 18,
    costMultiplier: 1.7,
    rateMultiplier: 1.2,
    unlockLevel: 18,
  },
];

export const ISLANDS: IslandDef[] = [
  {
    id: "paradise",
    name: "Райская Бухта",
    emoji: "🏝️",
    unlockCost: 0,
    rateBonus: 1,
    description: "Ваш первый тропический дом",
  },
  {
    id: "volcano",
    name: "Остров Вулкана",
    emoji: "🌋",
    unlockCost: 250_000,
    rateBonus: 1.35,
    description: "Богат камнем и редкими минералами",
  },
  {
    id: "crystal",
    name: "Кристальный Атолл",
    emoji: "💎",
    unlockCost: 5_000_000,
    rateBonus: 1.8,
    description: "Сияет магической энергией",
  },
  {
    id: "golden",
    name: "Золотые Острова",
    emoji: "🏖️",
    unlockCost: 75_000_000,
    rateBonus: 2.5,
    description: "Легендарное место богатств",
  },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: "g1", name: "Первая монета", description: "Заработать 500 золота", goal: 500, metric: "gold", reward: 100 },
  { id: "g2", name: "Богач", description: "Накопить 25 000 золота", goal: 25_000, metric: "gold", reward: 1500 },
  { id: "g3", name: "Магнат", description: "Накопить 2 500 000 золота", goal: 2_500_000, metric: "gold", reward: 60_000 },
  { id: "g4", name: "Олигарх", description: "Накопить 250 000 000 золота", goal: 250_000_000, metric: "gold", reward: 3_000_000 },
  { id: "l1", name: "Новичок", description: "Достичь 5 уровня", goal: 5, metric: "level", reward: 400 },
  { id: "l2", name: "Эксперт", description: "Достичь 15 уровня", goal: 15, metric: "level", reward: 4_000 },
  { id: "l3", name: "Мастер", description: "Достичь 30 уровня", goal: 30, metric: "level", reward: 30_000 },
  { id: "l4", name: "Легенда", description: "Достичь 50 уровня", goal: 50, metric: "level", reward: 200_000 },
  { id: "b1", name: "Строитель", description: "Прокачать здания до 10 уровней суммарно", goal: 10, metric: "buildings", reward: 250 },
  { id: "b2", name: "Архитектор", description: "Суммарно 50 уровней зданий", goal: 50, metric: "buildings", reward: 3_500 },
  { id: "b3", name: "Градостроитель", description: "Суммарно 150 уровней зданий", goal: 150, metric: "buildings", reward: 30_000 },
  { id: "b4", name: "Император", description: "Суммарно 500 уровней зданий", goal: 500, metric: "buildings", reward: 350_000 },
  { id: "i1", name: "Первооткрыватель", description: "Открыть второй остров", goal: 2, metric: "islands", reward: 5_000 },
  { id: "i2", name: "Путешественник", description: "Открыть 3 острова", goal: 3, metric: "islands", reward: 40_000 },
  { id: "i3", name: "Покоритель морей", description: "Открыть все 4 острова", goal: 4, metric: "islands", reward: 300_000 },
  { id: "p1", name: "Землевладелец", description: "Иметь 8 участков", goal: 8, metric: "plots", reward: 2_000 },
  { id: "p2", name: "Магнат недвижимости", description: "Иметь 14 участков", goal: 14, metric: "plots", reward: 25_000 },
  { id: "p3", name: "Король острова", description: "Иметь 18 участков", goal: 18, metric: "plots", reward: 150_000 },
  { id: "s1", name: "Постоянство", description: "Серия ежедневных наград — 3 дня", goal: 3, metric: "streak", reward: 600 },
  { id: "s2", name: "Преданность", description: "Серия ежедневных наград — 7 дней", goal: 7, metric: "streak", reward: 4_000 },
  { id: "s3", name: "Фанат острова", description: "Серия ежедневных наград — 15 дней", goal: 15, metric: "streak", reward: 35_000 },
];

export const COSMETICS = [
  { id: "torches", name: "Огненные факелы", price: 2_500, emoji: "🔥" },
  { id: "statue", name: "Каменная статуя", price: 8_000, emoji: "🗿" },
  { id: "lighthouse", name: "Маяк", price: 20_000, emoji: "🗼" },
  { id: "garden", name: "Цветочный сад", price: 5_000, emoji: "🌺" },
];

export const SHOP_BOOSTERS = [
  { id: "speed", name: "Ускоритель x2", description: "x2 скорость добычи на 5 минут", price: 2_500, emoji: "⚡", duration: 300 },
  { id: "double", name: "Удвоение дохода", description: "x2 ко всему золоту на 10 минут", price: 6_000, emoji: "💰", duration: 600 },
  { id: "worker", name: "Дополнительный рабочий", description: "+5% к добыче навсегда", price: 25_000, emoji: "👷", duration: 0 },
];

// Player levels much more slowly: each level costs ~1.6x more XP than the last.
export const xpForLevel = (lvl: number) => Math.floor(180 * Math.pow(1.6, lvl - 1));
// Plot expansion gets expensive fast — encourages building density before sprawl.
export const plotCost = (owned: number) => Math.floor(600 * Math.pow(2.1, owned - 1));

/**
 * Soft cap on income (per resource per second) that grows with player level.
 * Prevents "wealth explosion" in the first 10–15 minutes while letting
 * late-game progression breathe. Beyond the cap, excess income is heavily
 * compressed via a square-root curve (still rewards stacking, but smoothly).
 */
export const incomeSoftCap = (level: number) => 3 + level * level * 0.45;
export const applySoftCap = (rate: number, level: number) => {
  const cap = incomeSoftCap(level);
  if (rate <= cap) return rate;
  const excess = rate - cap;
  return cap + Math.sqrt(excess * cap);
};

// ============ DAILY RETENTION ============

export type DailyRewardKind = "gold" | "wood" | "stone" | "speed" | "double" | "worker" | "chest";

export interface DailyRewardDef {
  day: number; // 1..7
  kind: DailyRewardKind;
  amount: number; // for resources; for boosters: duration sec; for chest: gold base
  emoji: string;
  label: string;
  rare?: boolean;
}

// 7-day cycle. Resource amounts scale with level at claim time.
export const DAILY_REWARDS: DailyRewardDef[] = [
  { day: 1, kind: "gold",   amount: 250,  emoji: "🪙", label: "Золото" },
  { day: 2, kind: "wood",   amount: 120,  emoji: "🪵", label: "Дерево" },
  { day: 3, kind: "speed",  amount: 300,  emoji: "⚡", label: "Ускоритель x2 · 5м" },
  { day: 4, kind: "stone",  amount: 80,   emoji: "🪨", label: "Камень", rare: true },
  { day: 5, kind: "gold",   amount: 1200, emoji: "💰", label: "Сундучок золота" },
  { day: 6, kind: "double", amount: 600,  emoji: "💎", label: "x2 золото · 10м", rare: true },
  { day: 7, kind: "chest",  amount: 5000, emoji: "🎁", label: "Большой сундук", rare: true },
];

// Resource rewards scale with level (gentle quadratic).
export const dailyRewardAmount = (def: DailyRewardDef, level: number): number => {
  if (def.kind === "gold" || def.kind === "chest") {
    return Math.floor(def.amount * (1 + level * 0.35 + level * level * 0.04));
  }
  if (def.kind === "wood" || def.kind === "stone") {
    return Math.floor(def.amount * (1 + level * 0.25));
  }
  return def.amount; // duration / worker count
};

// ============ DAILY SPIN ============

export interface SpinSegment {
  id: string;
  kind: DailyRewardKind;
  amount: number;
  emoji: string;
  label: string;
  weight: number;
  color: string; // tailwind gradient classes
}

export const SPIN_SEGMENTS: SpinSegment[] = [
  { id: "s1", kind: "gold",   amount: 200,  emoji: "🪙", label: "Золото",       weight: 28, color: "from-amber-300 to-amber-500" },
  { id: "s2", kind: "wood",   amount: 60,   emoji: "🪵", label: "Дерево",       weight: 22, color: "from-lime-300 to-emerald-500" },
  { id: "s3", kind: "stone",  amount: 40,   emoji: "🪨", label: "Камень",       weight: 18, color: "from-slate-300 to-slate-500" },
  { id: "s4", kind: "gold",   amount: 600,  emoji: "💰", label: "Куча золота",  weight: 12, color: "from-yellow-300 to-orange-500" },
  { id: "s5", kind: "speed",  amount: 180,  emoji: "⚡", label: "x2 скорость 3м", weight: 8,  color: "from-cyan-300 to-sky-500" },
  { id: "s6", kind: "double", amount: 300,  emoji: "💎", label: "x2 доход 5м",  weight: 6,  color: "from-fuchsia-300 to-purple-500" },
  { id: "s7", kind: "wood",   amount: 250,  emoji: "🌲", label: "Много дерева", weight: 4,  color: "from-emerald-400 to-teal-600" },
  { id: "s8", kind: "chest",  amount: 1500, emoji: "🎁", label: "Сундук!",      weight: 2,  color: "from-rose-400 to-pink-600" },
];

export const pickSpinSegment = (): SpinSegment => {
  const total = SPIN_SEGMENTS.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const s of SPIN_SEGMENTS) {
    if ((r -= s.weight) <= 0) return s;
  }
  return SPIN_SEGMENTS[0];
};

// ============ DAILY MISSIONS ============

import type { DailyMission, MissionType } from "./types";

interface MissionTemplate {
  type: MissionType;
  title: string;
  emoji: string;
  baseGoal: number;
}

const MISSION_TEMPLATES: MissionTemplate[] = [
  { type: "earnGold",  title: "Заработать {n} золота",  emoji: "🪙", baseGoal: 800 },
  { type: "earnWood",  title: "Собрать {n} дерева",     emoji: "🪵", baseGoal: 300 },
  { type: "earnStone", title: "Добыть {n} камня",       emoji: "🪨", baseGoal: 150 },
  { type: "upgrade",   title: "Улучшить здания {n}×",  emoji: "🔨", baseGoal: 3 },
  { type: "build",     title: "Построить {n} здания",   emoji: "🏗️", baseGoal: 2 },
  { type: "spend",     title: "Потратить {n} золота",   emoji: "💸", baseGoal: 1500 },
];

export const generateDailyMissions = (level: number, date: string): DailyMission[] => {
  // Deterministic shuffle by date so refresh feels consistent within a day
  const seed = [...date].reduce((a, c) => a + c.charCodeAt(0), 0);
  const pool = [...MISSION_TEMPLATES].sort((a, b) => {
    const ha = (a.type.charCodeAt(0) * 17 + seed) % 100;
    const hb = (b.type.charCodeAt(0) * 17 + seed) % 100;
    return ha - hb;
  });
  const picks = pool.slice(0, 3);
  const scale = 1 + level * 0.4 + level * level * 0.03;
  return picks.map((t, i) => {
    const goal =
      t.type === "upgrade" || t.type === "build"
        ? Math.max(2, Math.floor(t.baseGoal + level * 0.5))
        : Math.floor(t.baseGoal * scale);
    return {
      id: `${date}-${i}-${t.type}`,
      type: t.type,
      goal,
      progress: 0,
      claimed: false,
      title: t.title.replace("{n}", goal.toLocaleString("ru-RU")),
      emoji: t.emoji,
      rewardGold: Math.floor(400 * scale * (1 + i * 0.25)),
      rewardXp: 20 + i * 15,
    };
  });
};

export const todayKey = (ts = Date.now()) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
