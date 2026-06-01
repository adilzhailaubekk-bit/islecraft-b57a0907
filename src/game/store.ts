import { useCallback, useEffect, useRef, useState } from "react";
import type { BuildingDef, GameState, Resources } from "./types";
import { BUILDINGS, ISLANDS, xpForLevel, plotCost } from "./data";

const STORAGE_KEY = "island-tycoon-save-v1";

const initialState = (): GameState => ({
  resources: { gold: 50, wood: 10, stone: 0, energy: 0 },
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
  cosmetics: [],
  totalGoldEarned: 0,
});

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
  const workerMult = 1 + state.boosters.extraWorkers * 0.1;
  const goldDouble = state.boosters.doubleIncomeUntil > Date.now() ? 2 : 1;

  const rates: Resources = { gold: 0, wood: 0, stone: 0, energy: 0 };
  for (const b of state.buildings) {
    const def = BUILDINGS.find((d) => d.id === b.id);
    if (!def) continue;
    let r = buildingRate(def, b.level) * islandMult * speed * workerMult;
    if (def.produces === "gold") r *= goldDouble;
    rates[def.produces] += r;
  }
  return rates;
};

export function useGameStore() {
  const [state, setState] = useState<GameState>(() => {
    if (typeof window === "undefined") return initialState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...initialState(), ...JSON.parse(raw) };
    } catch {}
    return initialState();
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Offline catch-up on mount
  const offlineEarnings = useRef<{ gold: number; seconds: number } | null>(null);
  useEffect(() => {
    const s = stateRef.current;
    const now = Date.now();
    const elapsed = Math.min((now - s.lastTick) / 1000, 60 * 60 * 8); // cap 8h
    if (elapsed > 30 && s.buildings.length) {
      const rates = computeRates(s);
      const earned: Resources = {
        gold: rates.gold * elapsed * 0.5,
        wood: rates.wood * elapsed * 0.5,
        stone: rates.stone * elapsed * 0.5,
        energy: rates.energy * elapsed * 0.5,
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

  // tick loop
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

  // autosave
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

  const buyOrUpgrade = useCallback((buildingId: string) => {
    setState((p) => {
      const def = BUILDINGS.find((b) => b.id === buildingId);
      if (!def) return p;
      const existing = p.buildings.find((b) => b.id === buildingId);
      const level = existing?.level ?? 0;
      const cost = buildingCost(def, level);
      if (!canAfford(p.resources, cost)) return p;
      const usedPlots = p.buildings.length;
      if (!existing && usedPlots >= p.plots) return p;
      const newRes = { ...p.resources };
      for (const k of Object.keys(cost) as (keyof Resources)[]) {
        newRes[k] -= cost[k] ?? 0;
      }
      const buildings = existing
        ? p.buildings.map((b) => (b.id === buildingId ? { ...b, level: b.level + 1 } : b))
        : [...p.buildings, { id: buildingId, level: 1 }];
      return { ...p, resources: newRes, buildings };
    });
    addXp(15);
  }, [addXp]);

  const buyPlot = useCallback(() => {
    setState((p) => {
      const cost = plotCost(p.plots);
      if (p.resources.gold < cost) return p;
      return { ...p, resources: { ...p.resources, gold: p.resources.gold - cost }, plots: p.plots + 1 };
    });
    addXp(25);
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
    addXp(200);
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
      const reward = 500 + p.level * 100;
      return {
        ...p,
        resources: { ...p.resources, gold: p.resources.gold + reward },
        lastDailyClaim: now,
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
