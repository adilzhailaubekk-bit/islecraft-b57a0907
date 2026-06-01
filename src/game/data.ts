import type { BuildingDef, IslandDef, Achievement } from "./types";

export const BUILDINGS: BuildingDef[] = [
  {
    id: "hut",
    name: "Хижина золотоискателя",
    emoji: "🏚️",
    description: "Базовый источник золота",
    produces: "gold",
    baseCost: { gold: 25 },
    baseRate: 1.2,
    costMultiplier: 1.18,
    rateMultiplier: 1.22,
    unlockLevel: 1,
  },
  {
    id: "lumber",
    name: "Лесопилка",
    emoji: "🪵",
    description: "Добывает древесину из пальм",
    produces: "wood",
    baseCost: { gold: 60 },
    baseRate: 0.8,
    costMultiplier: 1.2,
    rateMultiplier: 1.25,
    unlockLevel: 1,
  },
  {
    id: "quarry",
    name: "Каменоломня",
    emoji: "⛰️",
    description: "Извлекает камень из утёсов",
    produces: "stone",
    baseCost: { gold: 150, wood: 20 },
    baseRate: 0.5,
    costMultiplier: 1.22,
    rateMultiplier: 1.27,
    unlockLevel: 2,
  },
  {
    id: "windmill",
    name: "Ветряк",
    emoji: "🌬️",
    description: "Преобразует ветер в энергию",
    produces: "energy",
    baseCost: { gold: 400, wood: 80, stone: 30 },
    baseRate: 0.35,
    costMultiplier: 1.25,
    rateMultiplier: 1.3,
    unlockLevel: 3,
  },
  {
    id: "market",
    name: "Торговая площадь",
    emoji: "🏛️",
    description: "Стабильный поток золота",
    produces: "gold",
    baseCost: { gold: 1200, wood: 200, stone: 100 },
    baseRate: 14,
    costMultiplier: 1.28,
    rateMultiplier: 1.32,
    unlockLevel: 5,
  },
  {
    id: "refinery",
    name: "Алхимическая башня",
    emoji: "🗼",
    description: "Магическая переработка ресурсов",
    produces: "gold",
    baseCost: { gold: 8000, stone: 800, energy: 200 },
    baseRate: 80,
    costMultiplier: 1.3,
    rateMultiplier: 1.35,
    unlockLevel: 8,
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
    unlockCost: 25000,
    rateBonus: 1.5,
    description: "Богат камнем и редкими минералами",
  },
  {
    id: "crystal",
    name: "Кристальный Атолл",
    emoji: "💎",
    unlockCost: 250000,
    rateBonus: 2.25,
    description: "Сияет магической энергией",
  },
  {
    id: "golden",
    name: "Золотые Острова",
    emoji: "🏖️",
    unlockCost: 2500000,
    rateBonus: 3.5,
    description: "Легендарное место богатств",
  },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: "g1", name: "Первая монета", description: "Заработать 100 золота", goal: 100, metric: "gold", reward: 50 },
  { id: "g2", name: "Богач", description: "Накопить 10 000 золота", goal: 10000, metric: "gold", reward: 1000 },
  { id: "g3", name: "Магнат", description: "Накопить 1 000 000 золота", goal: 1_000_000, metric: "gold", reward: 50000 },
  { id: "l1", name: "Новичок", description: "Достичь 5 уровня", goal: 5, metric: "level", reward: 500 },
  { id: "l2", name: "Эксперт", description: "Достичь 15 уровня", goal: 15, metric: "level", reward: 5000 },
  { id: "b1", name: "Строитель", description: "Прокачать здания до 10 уровней суммарно", goal: 10, metric: "buildings", reward: 300 },
  { id: "b2", name: "Архитектор", description: "Суммарно 50 уровней зданий", goal: 50, metric: "buildings", reward: 3000 },
  { id: "i1", name: "Первооткрыватель", description: "Открыть второй остров", goal: 2, metric: "islands", reward: 2000 },
];

export const COSMETICS = [
  { id: "torches", name: "Огненные факелы", price: 800, emoji: "🔥" },
  { id: "statue", name: "Каменная статуя", price: 2500, emoji: "🗿" },
  { id: "lighthouse", name: "Маяк", price: 6000, emoji: "🗼" },
  { id: "garden", name: "Цветочный сад", price: 1500, emoji: "🌺" },
];

export const SHOP_BOOSTERS = [
  { id: "speed", name: "Ускоритель x2", description: "x2 скорость добычи на 5 минут", price: 500, emoji: "⚡", duration: 300 },
  { id: "double", name: "Удвоение дохода", description: "x2 ко всему золоту на 10 минут", price: 1200, emoji: "💰", duration: 600 },
  { id: "worker", name: "Дополнительный рабочий", description: "+10% к добыче навсегда", price: 5000, emoji: "👷", duration: 0 },
];

export const xpForLevel = (lvl: number) => Math.floor(100 * Math.pow(1.35, lvl - 1));
export const plotCost = (owned: number) => Math.floor(200 * Math.pow(1.6, owned - 1));
