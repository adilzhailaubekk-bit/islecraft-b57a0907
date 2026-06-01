import { useCallback, useEffect, useRef, useState } from "react";
import type { BuildingDef, BuildingState, DailyMission, GameState, Resources } from "./types";
import {
  BUILDINGS,
  ISLANDS,
  xpForLevel,
  plotCost,
  applySoftCap,
  DAILY_REWARDS,
  dailyRewardAmount,
  SPIN_SEGMENTS,
  pickSpinSegment,
  generateDailyMissions,
  todayKey,
  type DailyRewardKind,
  type SpinSegment,
} from "./data";

const STORAGE_KEY = "island-tycoon-save-v2";

const emptyCounters = (date = todayKey()) => ({
  date,
  goldEarned: 0,
  woodEarned: 0,
  stoneEarned: 0,
  upgrades: 0,
  builds: 0,
  goldSpent: 0,
});

const initialState = (): GameState => ({
  resources: { gold: 75, wood: 0, stone: 0, energy: 0 },
  buildings: [],
  unlockedIslands: ["paradise"],
  activeIsland: "paradise",
  plots: 3,
  level: 1,
  xp: 0,
  boosters: { doubleIncomeUntil: 0, speedBoostUntil: 0, extraWorkers: 0 },
  achievements: [],
  lastTick: Date.now(),
  lastDailyClaim: 0,
  dailyStreak: 0,
  cosmetics: [],
  totalGoldEarned: 0,
  dailyCycleDay: 1,
  lastSpinAt: 0,
  dailyMissions: [],
  dailyMissionsDate: "",
  dailyCounters: emptyCounters(),
});

// Normalize older save formats
const normalize = (s: GameState): GameState => {
  const buildings = Array.isArray(s.buildings)
    ? s.buildings.map((b) => (b && typeof b === "object" && "id" in b ? (b as BuildingState) : null))
    : [];
  return {
    ...s,
    buildings,
    dailyStreak: s.dailyStreak ?? 0,
    dailyCycleDay: s.dailyCycleDay ?? 1,
    lastSpinAt: s.lastSpinAt ?? 0,
    dailyMissions: Array.isArray(s.dailyMissions) ? s.dailyMissions : [],
    dailyMissionsDate: s.dailyMissionsDate ?? "",
    dailyCounters: s.dailyCounters ?? emptyCounters(),
  };
};

export const buildingCost = (def: BuildingDef, level: number): Partial<Resources> => {
  const mult = Math.pow(def.costMultiplier, level);
  const out: Partial<Resources> = {};
  for (const k of Object.keys(def.baseCost) as (keyof Resources)[]) {
    out[k] = Math.floor((def.baseCost[k] ?? 0) * mult);
  }
  return out;
};

export const buildingRate = (def: BuildingDef, level: number) =>
  def.baseRate * Math.pow(def.rateMultiplier, level - 1);

export const canAfford = (res: Resources, cost: Partial<Resources>) =>
  (Object.keys(cost) as (keyof Resources)[]).every((k) => res[k] >= (cost[k] ?? 0));

export const computeRates = (state: GameState): Resources => {
  const island = ISLANDS.find((i) => i.id === state.activeIsland)!;
  const islandMult = island.rateBonus;
  const speed = state.boosters.speedBoostUntil > Date.now() ? 2 : 1;
  const workerMult = 1 + state.boosters.extraWorkers * 0.05;
  const goldDouble = state.boosters.doubleIncomeUntil > Date.now() ? 2 : 1;

  const raw: Resources = { gold: 0, wood: 0, stone: 0, energy: 0 };
  for (const b of state.buildings) {
    if (!b) continue;
    const def = BUILDINGS.find((d) => d.id === b.id);
    if (!def) continue;
    let r = buildingRate(def, b.level) * islandMult * speed * workerMult;
    if (def.produces === "gold") r *= goldDouble;
    raw[def.produces] += r;
  }
  // Apply soft cap per resource to prevent early-game wealth explosions.
  return {
    gold: applySoftCap(raw.gold, state.level),
    wood: applySoftCap(raw.wood, state.level),
    stone: applySoftCap(raw.stone, state.level),
    energy: applySoftCap(raw.energy, state.level),
  };
};

// ============ DAILY HELPERS ============

const ensureDaily = (s: GameState): GameState => {
  const today = todayKey();
  let out = s;
  if (!s.dailyCounters || s.dailyCounters.date !== today) {
    out = { ...out, dailyCounters: emptyCounters(today) };
  }
  if (!s.dailyMissions || s.dailyMissions.length === 0 || s.dailyMissionsDate !== today) {
    out = {
      ...out,
      dailyMissions: generateDailyMissions(s.level, today),
      dailyMissionsDate: today,
    };
  }
  return out;
};

const bumpMissions = (missions: DailyMission[], type: DailyMission["type"], amount: number) => {
  let changed = false;
  const out = missions.map((m) => {
    if (m.type !== type || m.claimed) return m;
    const next = Math.min(m.goal, m.progress + amount);
    if (next === m.progress) return m;
    changed = true;
    return { ...m, progress: next };
  });
  return changed ? out : missions;
};

const applyGoldSpent = (s: GameState, amount: number): GameState => {
  if (amount <= 0) return s;
  return {
    ...s,
    dailyCounters: { ...s.dailyCounters, goldSpent: s.dailyCounters.goldSpent + amount },
    dailyMissions: bumpMissions(s.dailyMissions, "spend", amount),
  };
};

const applyBuild = (s: GameState): GameState => ({
  ...s,
  dailyCounters: { ...s.dailyCounters, builds: s.dailyCounters.builds + 1 },
  dailyMissions: bumpMissions(s.dailyMissions, "build", 1),
});

const applyUpgrade = (s: GameState): GameState => ({
  ...s,
  dailyCounters: { ...s.dailyCounters, upgrades: s.dailyCounters.upgrades + 1 },
  dailyMissions: bumpMissions(s.dailyMissions, "upgrade", 1),
});


export function useGameStore() {
  const [state, setState] = useState<GameState>(() => {
    if (typeof window === "undefined") return initialState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return normalize({ ...initialState(), ...JSON.parse(raw) });
    } catch {}
    return initialState();
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const offlineEarnings = useRef<{ gold: number; seconds: number } | null>(null);
  useEffect(() => {
    const s = stateRef.current;
    const now = Date.now();
    const elapsed = Math.min((now - s.lastTick) / 1000, 60 * 60 * 4);
    if (elapsed > 30 && s.buildings.some(Boolean)) {
      const rates = computeRates(s);
      const offlineMult = 0.25; // offline earns 25% of online rate
      const earned: Resources = {
        gold: rates.gold * elapsed * offlineMult,
        wood: rates.wood * elapsed * offlineMult,
        stone: rates.stone * elapsed * offlineMult,
        energy: rates.energy * elapsed * offlineMult,
      };
      offlineEarnings.current = { gold: earned.gold, seconds: elapsed };
      setState((p) => ({
        ...p,
        resources: {
          gold: p.resources.gold + earned.gold,
          wood: p.resources.wood + earned.wood,
          stone: p.resources.stone + earned.stone,
          energy: p.resources.energy + earned.energy,
        },
        totalGoldEarned: p.totalGoldEarned + earned.gold,
        lastTick: now,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setState((p) => {
        const rates = computeRates(p);
        const dt = 0.5;
        return {
          ...p,
          resources: {
            gold: p.resources.gold + rates.gold * dt,
            wood: p.resources.wood + rates.wood * dt,
            stone: p.resources.stone + rates.stone * dt,
            energy: p.resources.energy + rates.energy * dt,
          },
          totalGoldEarned: p.totalGoldEarned + rates.gold * dt,
          lastTick: Date.now(),
        };
      });
    }, 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current));
      } catch {}
    }, 3000);
    const onUnload = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current));
      } catch {}
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      clearInterval(id);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, []);

  const addXp = useCallback((amount: number) => {
    setState((p) => {
      let xp = p.xp + amount;
      let level = p.level;
      while (xp >= xpForLevel(level)) {
        xp -= xpForLevel(level);
        level++;
      }
      return { ...p, xp, level };
    });
  }, []);

  // Build into the FIRST empty slot among existing plots, or upgrade if same id elsewhere
  const buyOrUpgrade = useCallback((buildingId: string) => {
    setState((p) => {
      const def = BUILDINGS.find((b) => b.id === buildingId);
      if (!def) return p;
      const existingIdx = p.buildings.findIndex((b) => b && b.id === buildingId);
      const level = existingIdx >= 0 ? p.buildings[existingIdx]!.level : 0;
      const cost = buildingCost(def, level);
      if (!canAfford(p.resources, cost)) return p;
      const newRes = { ...p.resources };
      for (const k of Object.keys(cost) as (keyof Resources)[]) {
        newRes[k] -= cost[k] ?? 0;
      }
      let buildings = p.buildings.slice();
      if (existingIdx >= 0) {
        buildings[existingIdx] = { id: buildingId, level: level + 1 };
      } else {
        // find first empty slot within owned plots
        let slot = -1;
        for (let i = 0; i < p.plots; i++) {
          if (!buildings[i]) {
            slot = i;
            break;
          }
        }
        if (slot < 0) return p;
        while (buildings.length <= slot) buildings.push(null);
        buildings[slot] = { id: buildingId, level: 1 };
      }
      return { ...p, resources: newRes, buildings };
    });
    addXp(5);
  }, [addXp]);

  // Build at a specific plot (used when player taps an empty plot directly)
  const buildAtPlot = useCallback((buildingId: string, plotIdx: number) => {
    setState((p) => {
      const def = BUILDINGS.find((b) => b.id === buildingId);
      if (!def) return p;
      if (plotIdx < 0 || plotIdx >= p.plots) return p;
      if (p.buildings[plotIdx]) return p;
      const cost = buildingCost(def, 0);
      if (!canAfford(p.resources, cost)) return p;
      const newRes = { ...p.resources };
      for (const k of Object.keys(cost) as (keyof Resources)[]) {
        newRes[k] -= cost[k] ?? 0;
      }
      const buildings = p.buildings.slice();
      while (buildings.length <= plotIdx) buildings.push(null);
      buildings[plotIdx] = { id: buildingId, level: 1 };
      return { ...p, resources: newRes, buildings };
    });
    addXp(5);
  }, [addXp]);

  const upgradeAtPlot = useCallback((plotIdx: number) => {
    setState((p) => {
      const existing = p.buildings[plotIdx];
      if (!existing) return p;
      const def = BUILDINGS.find((b) => b.id === existing.id);
      if (!def) return p;
      const cost = buildingCost(def, existing.level);
      if (!canAfford(p.resources, cost)) return p;
      const newRes = { ...p.resources };
      for (const k of Object.keys(cost) as (keyof Resources)[]) {
        newRes[k] -= cost[k] ?? 0;
      }
      const buildings = p.buildings.slice();
      buildings[plotIdx] = { ...existing, level: existing.level + 1 };
      return { ...p, resources: newRes, buildings };
    });
    addXp(5);
  }, [addXp]);

  // Swap (or move into empty) two plot slots. Moving costs nothing and
  // can target any legal slot on the island grid, regardless of owned-plot count.
  const moveBuilding = useCallback((from: number, to: number) => {
    setState((p) => {
      if (from === to || to < 0 || from < 0) return p;
      const buildings = p.buildings.slice();
      while (buildings.length <= Math.max(from, to)) buildings.push(null);
      const a = buildings[from] ?? null;
      const b = buildings[to] ?? null;
      buildings[from] = b;
      buildings[to] = a;
      return { ...p, buildings };
    });
  }, []);

  const buyPlot = useCallback(() => {
    setState((p) => {
      const cost = plotCost(p.plots);
      if (p.resources.gold < cost) return p;
      return { ...p, resources: { ...p.resources, gold: p.resources.gold - cost }, plots: p.plots + 1 };
    });
    addXp(10);
  }, [addXp]);

  const unlockIsland = useCallback((islandId: string) => {
    setState((p) => {
      const isle = ISLANDS.find((i) => i.id === islandId);
      if (!isle || p.unlockedIslands.includes(islandId)) return p;
      if (p.resources.gold < isle.unlockCost) return p;
      return {
        ...p,
        resources: { ...p.resources, gold: p.resources.gold - isle.unlockCost },
        unlockedIslands: [...p.unlockedIslands, islandId],
      };
    });
    addXp(80);
  }, [addXp]);

  const switchIsland = useCallback((islandId: string) => {
    setState((p) =>
      p.unlockedIslands.includes(islandId) ? { ...p, activeIsland: islandId } : p,
    );
  }, []);

  const buyBooster = useCallback((boosterId: string, price: number, duration: number) => {
    setState((p) => {
      if (p.resources.gold < price) return p;
      const now = Date.now();
      const b = { ...p.boosters };
      if (boosterId === "speed") b.speedBoostUntil = Math.max(b.speedBoostUntil, now) + duration * 1000;
      if (boosterId === "double") b.doubleIncomeUntil = Math.max(b.doubleIncomeUntil, now) + duration * 1000;
      if (boosterId === "worker") b.extraWorkers += 1;
      return { ...p, resources: { ...p.resources, gold: p.resources.gold - price }, boosters: b };
    });
  }, []);

  const buyCosmetic = useCallback((id: string, price: number) => {
    setState((p) => {
      if (p.resources.gold < price || p.cosmetics.includes(id)) return p;
      return {
        ...p,
        resources: { ...p.resources, gold: p.resources.gold - price },
        cosmetics: [...p.cosmetics, id],
      };
    });
  }, []);

  const claimAchievement = useCallback((id: string, reward: number) => {
    setState((p) => {
      if (p.achievements.includes(id)) return p;
      return {
        ...p,
        achievements: [...p.achievements, id],
        resources: { ...p.resources, gold: p.resources.gold + reward },
      };
    });
  }, []);

  const claimDaily = useCallback(() => {
    setState((p) => {
      const now = Date.now();
      if (now - p.lastDailyClaim < 22 * 3600 * 1000) return p;
      // streak continues if claimed within 48h, otherwise resets
      const within = p.lastDailyClaim > 0 && now - p.lastDailyClaim < 48 * 3600 * 1000;
      const streak = within ? p.dailyStreak + 1 : 1;
      // Smaller flat base early, but grows quadratically with level so it scales late
      const base = 150 + p.level * p.level * 25;
      const streakBonus = Math.min(streak - 1, 14) * 0.12; // up to +168% at streak 15
      const reward = Math.floor(base * (1 + streakBonus));
      return {
        ...p,
        resources: { ...p.resources, gold: p.resources.gold + reward },
        lastDailyClaim: now,
        dailyStreak: streak,
      };
    });
  }, []);

  const resetOfflineNotice = useCallback(() => {
    offlineEarnings.current = null;
  }, []);

  return {
    state,
    rates: computeRates(state),
    buyOrUpgrade,
    buildAtPlot,
    upgradeAtPlot,
    moveBuilding,
    buyPlot,
    unlockIsland,
    switchIsland,
    buyBooster,
    buyCosmetic,
    claimAchievement,
    claimDaily,
    offlineEarnings: offlineEarnings.current,
    resetOfflineNotice,
  };
}
