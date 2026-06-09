import type { CaptainOffer, CaptainResult, CaptainState, GameState, Resources } from "./types";

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

export const CAPTAIN_ACTIVE_DURATION_MS = 20 * MINUTE;

const resource = (state: GameState, key: keyof Resources) => Math.max(0, Math.floor(state.resources[key] ?? 0));

const clampCost = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.floor(value)));

export const randomCaptainDelayMs = () => (60 + Math.floor(Math.random() * 121)) * MINUTE;

export const defaultCaptainState = (): CaptainState => ({
  activePlayedMs: 0,
  nextAtActiveMs: randomCaptainDelayMs(),
  activeOffer: null,
  activeUntilActiveMs: 0,
  lastResult: null,
  offlineBoostUntil: 0,
});

const offerId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const pickWeighted = <T,>(items: { item: T; weight: number }[]) => {
  const total = items.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of items) {
    roll -= entry.weight;
    if (roll <= 0) return entry.item;
  }
  return items[0].item;
};

const resourceLabel = (resources: Partial<Resources>) =>
  Object.entries(resources)
    .filter(([, value]) => (value ?? 0) > 0)
    .map(([key, value]) => `${Math.floor(value ?? 0).toLocaleString("ru-RU")} ${key}`)
    .join(", ");

export const generateCaptainOffer = (state: GameState): CaptainOffer => {
  const levelMult = 1 + state.level * 0.18;
  const gold = resource(state, "gold");
  const wood = resource(state, "wood");
  const stone = resource(state, "stone");
  const category = pickWeighted([
    { item: "trade" as const, weight: 42 },
    { item: "chest" as const, weight: 28 },
    { item: "bonus" as const, weight: 20 },
    { item: "rare" as const, weight: 7 },
    { item: "risk" as const, weight: 3 },
  ]);

  if (category === "trade") {
    const trade = pickWeighted([
      { item: "goldToWood" as const, weight: 35 },
      { item: "woodToStone" as const, weight: 30 },
      { item: "resourcesToGold" as const, weight: 35 },
    ]);
    if (trade === "goldToWood") {
      const cost = clampCost(gold * 0.08, 120, 8000 * levelMult);
      const reward = Math.floor(cost * 0.22);
      return {
        id: offerId("captain-trade"),
        kind: "trade",
        rarity: "common",
        title: "Паруса лесорубов",
        description: "Капитан привез крепкие доски из северных бухт и готов обменять их на золото.",
        icon: "🪵",
        cost: { gold: cost },
        rewardPreview: `Получить ${reward.toLocaleString("ru-RU")} дерева`,
        payload: { type: "resource", resources: { wood: reward } },
      };
    }
    if (trade === "woodToStone") {
      const cost = clampCost(Math.max(wood * 0.12, 80), 60, 5000 * levelMult);
      const reward = Math.floor(cost * 0.42);
      return {
        id: offerId("captain-trade"),
        kind: "trade",
        rarity: "common",
        title: "Камни старого маяка",
        description: "В трюме лежит камень с разобранного маяка. Капитан просит дерево для ремонта корабля.",
        icon: "🪨",
        cost: { wood: cost },
        rewardPreview: `Получить ${reward.toLocaleString("ru-RU")} камня`,
        payload: { type: "resource", resources: { stone: reward } },
      };
    }
    const woodCost = clampCost(Math.max(wood * 0.1, 40), 40, 3200 * levelMult);
    const stoneCost = clampCost(Math.max(stone * 0.08, 20), 20, 1800 * levelMult);
    const reward = Math.floor((woodCost * 4 + stoneCost * 9) * 1.18);
    return {
      id: offerId("captain-trade"),
      kind: "trade",
      rarity: "common",
      title: "Золотой покупатель",
      description: "Капитан знает город, где стройматериалы сейчас на вес золота.",
      icon: "🪙",
      cost: { wood: woodCost, stone: stoneCost },
      rewardPreview: `Получить ${reward.toLocaleString("ru-RU")} золота`,
      payload: { type: "resource", resources: { gold: reward } },
    };
  }

  if (category === "chest") {
    const chest = pickWeighted([
      { item: { rarity: "common" as const, title: "Обычный сундук", mult: 1.2, icon: "📦", weight: 72 }, weight: 72 },
      { item: { rarity: "rare" as const, title: "Редкий сундук", mult: 2.8, icon: "🎁", weight: 23 }, weight: 23 },
      { item: { rarity: "legendary" as const, title: "Легендарный сундук", mult: 6, icon: "💎", weight: 5 }, weight: 5 },
    ]);
    const cost = clampCost(gold * (chest.rarity === "legendary" ? 0.14 : chest.rarity === "rare" ? 0.1 : 0.06), 180, 20000 * levelMult);
    const reward = Math.floor(cost * chest.mult);
    return {
      id: offerId("captain-chest"),
      kind: "chest",
      rarity: chest.rarity,
      title: chest.title,
      description: "Пломба на сундуке цела. Капитан уверяет, что внутри припасы с дальнего архипелага.",
      icon: chest.icon,
      cost: { gold: cost },
      rewardPreview: `Внутри примерно ${reward.toLocaleString("ru-RU")} золота и припасы`,
      payload: { type: "resource", resources: { gold: reward, wood: Math.floor(reward * 0.04), stone: Math.floor(reward * 0.02) } },
    };
  }

  if (category === "bonus") {
    const bonus = pickWeighted([
      { item: "double" as const, weight: 40 },
      { item: "speed" as const, weight: 38 },
      { item: "offline" as const, weight: 22 },
    ]);
    const cost = clampCost(gold * 0.07, 250, 15000 * levelMult);
    if (bonus === "offline") {
      return {
        id: offerId("captain-bonus"),
        kind: "bonus",
        rarity: "rare",
        title: "Ночная вахта",
        description: "Команда капитана останется сторожить склады и повысит оффлайн-доход.",
        icon: "🌙",
        cost: { gold: cost },
        rewardPreview: "Оффлайн-доход x1.5 на 8 часов",
        payload: { type: "booster", booster: "offline", durationSec: 8 * 3600, multiplier: 1.5 },
      };
    }
    return {
      id: offerId("captain-bonus"),
      kind: "bonus",
      rarity: "common",
      title: bonus === "speed" ? "Попутный ветер" : "Печать торговой гильдии",
      description: bonus === "speed" ? "Корабельные мастера помогут ускорить добычу на острове." : "Гильдия временно удвоит золотые сделки.",
      icon: bonus === "speed" ? "⚡" : "💰",
      cost: { gold: cost },
      rewardPreview: bonus === "speed" ? "x2 скорость добычи на 12 минут" : "x2 золото на 12 минут",
      payload: { type: "booster", booster: bonus, durationSec: 12 * 60 },
    };
  }

  if (category === "rare") {
    const rare = pickWeighted([
      { item: { id: "captain_treasure_map", name: "Карта сокровищ", icon: "🗺️", title: "Карта сокровищ" }, weight: 55 },
      { item: { id: "captain_anchor_statue", name: "Статуя якоря", icon: "⚓", title: "Декор капитана" }, weight: 30 },
      { item: { id: "captain_black_pearl", name: "Черная жемчужина", icon: "⚫", title: "Эксклюзивный предмет" }, weight: 15 },
    ]);
    const cost = clampCost(gold * 0.18, 1200, 50000 * levelMult);
    return {
      id: offerId("captain-rare"),
      kind: "rare",
      rarity: rare.id === "captain_black_pearl" ? "mythic" : "legendary",
      title: rare.title,
      description: `Редкость из дальних вод: ${rare.name}. Такие вещи капитан показывает не каждому правителю острова.`,
      icon: rare.icon,
      cost: { gold: cost },
      rewardPreview: `Получить предмет: ${rare.name}`,
      payload: { type: "cosmetic", cosmeticId: rare.id, name: rare.name },
    };
  }

  const stake = clampCost(gold * 0.12, 500, 25000 * levelMult);
  return {
    id: offerId("captain-risk"),
    kind: "risk",
    rarity: "rare",
    title: "Игра с морем",
    description: "Капитан предлагает вложить золото в тайную экспедицию. Итог зависит от ветра, карты и удачи.",
    icon: "🎲",
    cost: { gold: stake },
    rewardPreview: "Случайный результат: большая прибыль, малая прибыль или почти без изменений",
    risk: true,
    payload: { type: "risk", stake: { gold: stake } },
  };
};

export const canPayCaptainCost = (state: GameState, cost?: Partial<Resources>) => {
  if (!cost) return true;
  return (Object.keys(cost) as (keyof Resources)[]).every((key) => state.resources[key] >= (cost[key] ?? 0));
};

export const subtractCaptainCost = (resources: Resources, cost?: Partial<Resources>): Resources => {
  const next = { ...resources };
  if (!cost) return next;
  for (const key of Object.keys(cost) as (keyof Resources)[]) {
    next[key] -= cost[key] ?? 0;
  }
  return next;
};

export const rollRiskResult = (stake: Partial<Resources>): CaptainResult => {
  const goldStake = stake.gold ?? 0;
  const roll = Math.random();
  if (roll < 0.22) {
    const gold = Math.floor(goldStake * 2.6);
    return {
      title: "Большая прибыль",
      description: `Экспедиция вернулась с полными трюмами: +${gold.toLocaleString("ru-RU")} золота.`,
      icon: "💎",
      resources: { gold },
    };
  }
  if (roll < 0.72) {
    const gold = Math.floor(goldStake * 1.35);
    return {
      title: "Небольшая прибыль",
      description: `Рейс окупился без чудес: +${gold.toLocaleString("ru-RU")} золота.`,
      icon: "🪙",
      resources: { gold },
    };
  }
  const gold = Math.floor(goldStake * 0.92);
  return {
    title: "Почти без изменений",
    description: `Море было неспокойным. Капитан вернул большую часть вклада: +${gold.toLocaleString("ru-RU")} золота.`,
    icon: "🌫️",
    resources: { gold },
  };
};

export const describeCost = (cost?: Partial<Resources>) => (cost ? resourceLabel(cost) : "Бесплатно");
