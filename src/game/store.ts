import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { BuildingDef, BuildingState, DailyMission, GameState, Resources } from "./types";
import { defaultSettings } from "./types";
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
import {
  PRESTIGE_UPGRADES,
  PRESTIGE_ACHIEVEMENTS,
  prestigeUpgradeCost,
  calcPrestigeTokens,
  computePrestigeBonuses,
  canPrestige,
} from "./prestige";

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
  resources: { gold: 150, wood: 0, stone: 0, energy: 0 },
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
  settings: defaultSettings(),
  prestigeTokens: 0,
  prestigeCount: 0,
  prestigeUpgrades: {},
  prestigeAchievements: [],
  islandStates: {},
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
    settings: s.settings ?? defaultSettings(),
    prestigeTokens: s.prestigeTokens ?? 0,
    prestigeCount: s.prestigeCount ?? 0,
    prestigeUpgrades: s.prestigeUpgrades && typeof s.prestigeUpgrades === "object" ? s.prestigeUpgrades : {},
    prestigeAchievements: Array.isArray(s.prestigeAchievements) ? s.prestigeAchievements : [],
    islandStates: s.islandStates && typeof s.islandStates === "object" ? s.islandStates : {},
  };
};

export const buildingCost = (def: BuildingDef, level: number, costMult = 1): Partial<Resources> => {
  const mult = Math.pow(def.costMultiplier, level);
  const out: Partial<Resources> = {};
  for (const k of Object.keys(def.baseCost) as (keyof Resources)[]) {
    out[k] = Math.max(1, Math.floor((def.baseCost[k] ?? 0) * mult * costMult));
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
  const bonuses = computePrestigeBonuses(state.prestigeUpgrades);
  const workerCount = state.boosters.extraWorkers + bonuses.workerBonus;
  const workerMult = 1 + workerCount * 0.05;
  const goldDouble = state.boosters.doubleIncomeUntil > Date.now() ? 2 : 1;

  const raw: Resources = { gold: 0, wood: 0, stone: 0, energy: 0 };
  for (const b of state.buildings) {
    if (!b) continue;
    const def = BUILDINGS.find((d) => d.id === b.id);
    if (!def) continue;
    let r = buildingRate(def, b.level) * islandMult * speed * workerMult;
    if (def.produces === "gold") {
      r *= goldDouble * bonuses.goldMult;
      if (island.goldBonus) r *= island.goldBonus;
    } else if (def.produces === "wood") r *= bonuses.woodMult;
    else if (def.produces === "stone") r *= bonuses.stoneMult;
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

const userMetaString = (user: User, key: string) => {
  const value = user.user_metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const profileNameFromUser = (user: User) =>
  userMetaString(user, "display_name") ||
  userMetaString(user, "full_name") ||
  userMetaString(user, "name") ||
  user.email?.split("@")[0] ||
  null;

const profileUsernameFromUser = (user: User) =>
  userMetaString(user, "username") ||
  user.email?.split("@")[0] ||
  null;

const profileAvatarFromUser = (user: User) =>
  userMetaString(user, "avatar_url") ||
  userMetaString(user, "picture");


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
      const island = ISLANDS.find((i) => i.id === s.activeIsland)!;
      const offlineMult =
        0.25 *
        computePrestigeBonuses(s.prestigeUpgrades).offlineMult *
        (island.offlineBonus ?? 1);
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
      setState((prev) => {
        const p = ensureDaily(prev);
        const rates = computeRates(p);
        const dt = 0.5;
        const dg = rates.gold * dt;
        const dw = rates.wood * dt;
        const ds = rates.stone * dt;
        const de = rates.energy * dt;
        let missions = p.dailyMissions;
        if (dg > 0) missions = bumpMissions(missions, "earnGold", dg);
        if (dw > 0) missions = bumpMissions(missions, "earnWood", dw);
        if (ds > 0) missions = bumpMissions(missions, "earnStone", ds);
        return {
          ...p,
          resources: {
            gold: p.resources.gold + dg,
            wood: p.resources.wood + dw,
            stone: p.resources.stone + ds,
            energy: p.resources.energy + de,
          },
          totalGoldEarned: p.totalGoldEarned + dg,
          dailyCounters: {
            ...p.dailyCounters,
            goldEarned: p.dailyCounters.goldEarned + dg,
            woodEarned: p.dailyCounters.woodEarned + dw,
            stoneEarned: p.dailyCounters.stoneEarned + ds,
          },
          dailyMissions: missions,
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

  // ====== CLOUD SYNC (profiles.game_state) ======
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let saveTimer: number | undefined;

    const pullFromCloud = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("game_state, settings, gold, level, xp, updated_at")
          .eq("user_id", userId)
          .maybeSingle();
        if (cancelled || error || !data) return false;
        const cloud = data.game_state as Partial<GameState> | null;
        if (cloud && typeof cloud === "object" && Object.keys(cloud).length > 0) {
          const cloudTick = (cloud as GameState).lastTick ?? 0;
          if (cloudTick >= stateRef.current.lastTick) {
            setState(normalize({ ...initialState(), ...cloud }));
          }
          return true;
        }
        setState((prev) =>
          normalize({
            ...prev,
            resources: { ...prev.resources, gold: Number(data.gold ?? prev.resources.gold) },
            level: Number(data.level ?? prev.level),
            xp: Number(data.xp ?? prev.xp),
            settings:
              data.settings && typeof data.settings === "object"
                ? (data.settings as GameState["settings"])
                : prev.settings,
          })
        );
        return true;
      } catch (error) {
        console.warn("[Cloud Save] Failed to load player profile", error);
      }
      return false;
    };

    const pushToCloud = async (user: User) => {
      try {
        const s = stateRef.current;
        const now = new Date().toISOString();
        const { error } = await supabase
          .from("profiles")
          .upsert(
            {
              user_id: user.id,
              username: profileUsernameFromUser(user),
              display_name: profileNameFromUser(user),
              avatar_url: profileAvatarFromUser(user),
            game_state: s as never,
              settings: s.settings as never,
            gold: Math.floor(s.resources.gold),
            level: s.level,
            xp: Math.floor(s.xp),
              trophies: s.achievements.length + s.prestigeAchievements.length,
              last_seen_at: now,
              updated_at: now,
            },
            { onConflict: "user_id" }
          );
        if (error) throw error;
      } catch (error) {
        console.warn("[Cloud Save] Failed to save player profile", error);
      }
    };

    const startAutosave = (user: User) => {
      if (saveTimer) window.clearInterval(saveTimer);
      saveTimer = window.setInterval(() => pushToCloud(user), 15000);
    };

    let currentUser: User | null = null;

    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled || !data.user) return;
      currentUser = data.user;
      const foundCloudProfile = await pullFromCloud(data.user.id);
      if (!cancelled && !foundCloudProfile) void pushToCloud(data.user);
      if (!cancelled) startAutosave(data.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      if (session?.user) {
        currentUser = session.user;
        const foundCloudProfile = await pullFromCloud(session.user.id);
        if (!cancelled && !foundCloudProfile) void pushToCloud(session.user);
        if (!cancelled) startAutosave(session.user);
      } else {
        currentUser = null;
        if (saveTimer) window.clearInterval(saveTimer);
      }
    });

    const onUnload = () => {
      if (currentUser) {
        // Best-effort final save (fire-and-forget)
        void pushToCloud(currentUser);
      }
    };
    window.addEventListener("beforeunload", onUnload);

    return () => {
      cancelled = true;
      if (saveTimer) window.clearInterval(saveTimer);
      subscription.unsubscribe();
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
    setState((prev) => {
      const p = ensureDaily(prev);
      const def = BUILDINGS.find((b) => b.id === buildingId);
      if (!def) return p;
      const existingIdx = p.buildings.findIndex((b) => b && b.id === buildingId);
      const level = existingIdx >= 0 ? p.buildings[existingIdx]!.level : 0;
      const cost = buildingCost(def, level, computePrestigeBonuses(p.prestigeUpgrades).buildCostMult);
      if (!canAfford(p.resources, cost)) return p;
      const newRes = { ...p.resources };
      for (const k of Object.keys(cost) as (keyof Resources)[]) {
        newRes[k] -= cost[k] ?? 0;
      }
      const buildings = p.buildings.slice();
      const isUpgrade = existingIdx >= 0;
      if (isUpgrade) {
        buildings[existingIdx] = { id: buildingId, level: level + 1 };
      } else {
        let slot = -1;
        for (let i = 0; i < buildings.length; i++) {
          if (!buildings[i]) { slot = i; break; }
        }
        if (slot < 0) slot = buildings.length;

        while (buildings.length <= slot) buildings.push(null);
        buildings[slot] = { id: buildingId, level: 1 };
      }
      let next: GameState = { ...p, resources: newRes, buildings };
      next = applyGoldSpent(next, cost.gold ?? 0);
      next = isUpgrade ? applyUpgrade(next) : applyBuild(next);
      return next;
    });
    addXp(5);
  }, [addXp]);

  const buildAtPlot = useCallback((buildingId: string, plotIdx: number) => {
    setState((prev) => {
      const p = ensureDaily(prev);
      const def = BUILDINGS.find((b) => b.id === buildingId);
      if (!def) return p;
      if (plotIdx < 0) return p;
      if (p.buildings[plotIdx]) return p;
      const cost = buildingCost(def, 0, computePrestigeBonuses(p.prestigeUpgrades).buildCostMult);
      if (!canAfford(p.resources, cost)) return p;
      const newRes = { ...p.resources };
      for (const k of Object.keys(cost) as (keyof Resources)[]) {
        newRes[k] -= cost[k] ?? 0;
      }
      const buildings = p.buildings.slice();
      while (buildings.length <= plotIdx) buildings.push(null);
      buildings[plotIdx] = { id: buildingId, level: 1 };
      let next: GameState = { ...p, resources: newRes, buildings };
      next = applyGoldSpent(next, cost.gold ?? 0);
      next = applyBuild(next);
      return next;
    });
    addXp(5);
  }, [addXp]);

  const upgradeAtPlot = useCallback((plotIdx: number) => {
    setState((prev) => {
      const p = ensureDaily(prev);
      const existing = p.buildings[plotIdx];
      if (!existing) return p;
      const def = BUILDINGS.find((b) => b.id === existing.id);
      if (!def) return p;
      const cost = buildingCost(def, existing.level, computePrestigeBonuses(p.prestigeUpgrades).buildCostMult);
      if (!canAfford(p.resources, cost)) return p;
      const newRes = { ...p.resources };
      for (const k of Object.keys(cost) as (keyof Resources)[]) {
        newRes[k] -= cost[k] ?? 0;
      }
      const buildings = p.buildings.slice();
      buildings[plotIdx] = { ...existing, level: existing.level + 1 };
      let next: GameState = { ...p, resources: newRes, buildings };
      next = applyGoldSpent(next, cost.gold ?? 0);
      next = applyUpgrade(next);
      return next;
    });
    addXp(5);
  }, [addXp]);

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
    setState((prev) => {
      const p = ensureDaily(prev);
      const cost = plotCost(p.plots);
      if (p.resources.gold < cost) return p;
      const next = { ...p, resources: { ...p.resources, gold: p.resources.gold - cost }, plots: p.plots + 1 };
      return applyGoldSpent(next, cost);
    });
    addXp(10);
  }, [addXp]);

  const unlockIsland = useCallback((islandId: string) => {
    setState((prev) => {
      const p = ensureDaily(prev);
      const isle = ISLANDS.find((i) => i.id === islandId);
      if (!isle || p.unlockedIslands.includes(islandId)) return p;
      if (p.resources.gold < isle.unlockCost) return p;
      const next = {
        ...p,
        resources: { ...p.resources, gold: p.resources.gold - isle.unlockCost },
        unlockedIslands: [...p.unlockedIslands, islandId],
      };
      return applyGoldSpent(next, isle.unlockCost);
    });
    addXp(80);
  }, [addXp]);

  const switchIsland = useCallback((islandId: string) => {
    setState((p) => {
      if (!p.unlockedIslands.includes(islandId)) return p;
      if (p.activeIsland === islandId) return p;
      const islandStates = { ...(p.islandStates ?? {}) };
      // Save current island's buildings/plots
      islandStates[p.activeIsland] = { buildings: p.buildings, plots: p.plots };
      // Load target island's saved state (or fresh start)
      const target = islandStates[islandId] ?? { buildings: [], plots: 3 };
      delete islandStates[islandId];
      return {
        ...p,
        activeIsland: islandId,
        buildings: target.buildings,
        plots: target.plots,
        islandStates,
      };
    });
  }, []);

  const buyBooster = useCallback((boosterId: string, price: number, duration: number) => {
    setState((prev) => {
      const p = ensureDaily(prev);
      if (p.resources.gold < price) return p;
      const now = Date.now();
      const b = { ...p.boosters };
      if (boosterId === "speed") b.speedBoostUntil = Math.max(b.speedBoostUntil, now) + duration * 1000;
      if (boosterId === "double") b.doubleIncomeUntil = Math.max(b.doubleIncomeUntil, now) + duration * 1000;
      if (boosterId === "worker") b.extraWorkers += 1;
      const next = { ...p, resources: { ...p.resources, gold: p.resources.gold - price }, boosters: b };
      return applyGoldSpent(next, price);
    });
  }, []);

  const buyCosmetic = useCallback((id: string, price: number) => {
    setState((prev) => {
      const p = ensureDaily(prev);
      if (p.resources.gold < price || p.cosmetics.includes(id)) return p;
      const next = {
        ...p,
        resources: { ...p.resources, gold: p.resources.gold - price },
        cosmetics: [...p.cosmetics, id],
      };
      return applyGoldSpent(next, price);
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

  // ============ DAILY ACTIONS ============

  // Apply a reward kind/amount to state (gold/wood/stone/booster/chest).
  const applyReward = (p: GameState, kind: DailyRewardKind, amount: number): GameState => {
    const now = Date.now();
    if (kind === "gold") {
      return { ...p, resources: { ...p.resources, gold: p.resources.gold + amount }, totalGoldEarned: p.totalGoldEarned + amount };
    }
    if (kind === "wood") {
      return { ...p, resources: { ...p.resources, wood: p.resources.wood + amount } };
    }
    if (kind === "stone") {
      return { ...p, resources: { ...p.resources, stone: p.resources.stone + amount } };
    }
    if (kind === "speed") {
      const b = { ...p.boosters, speedBoostUntil: Math.max(p.boosters.speedBoostUntil, now) + amount * 1000 };
      return { ...p, boosters: b };
    }
    if (kind === "double") {
      const b = { ...p.boosters, doubleIncomeUntil: Math.max(p.boosters.doubleIncomeUntil, now) + amount * 1000 };
      return { ...p, boosters: b };
    }
    if (kind === "worker") {
      return { ...p, boosters: { ...p.boosters, extraWorkers: p.boosters.extraWorkers + 1 } };
    }
    // chest: gold + a small booster bundle
    const goldAdd = amount;
    const b = {
      ...p.boosters,
      speedBoostUntil: Math.max(p.boosters.speedBoostUntil, now) + 300 * 1000,
      doubleIncomeUntil: Math.max(p.boosters.doubleIncomeUntil, now) + 300 * 1000,
    };
    return {
      ...p,
      resources: { ...p.resources, gold: p.resources.gold + goldAdd },
      totalGoldEarned: p.totalGoldEarned + goldAdd,
      boosters: b,
    };
  };

  // Claim today's slot in the 7-day cycle.
  const claimDailyReward = useCallback((): { kind: DailyRewardKind; amount: number; day: number } | null => {
    let result: { kind: DailyRewardKind; amount: number; day: number } | null = null;
    setState((prev) => {
      const p = ensureDaily(prev);
      const now = Date.now();
      if (now - p.lastDailyClaim < 22 * 3600 * 1000) return p;
      const within = p.lastDailyClaim > 0 && now - p.lastDailyClaim < 48 * 3600 * 1000;
      const streak = within ? p.dailyStreak + 1 : 1;
      // Determine cycle day (1..7). Reset to 1 if streak broke.
      const day = within ? ((p.dailyCycleDay - 1) % 7) + 1 : 1;
      const def = DAILY_REWARDS.find((r) => r.day === day) ?? DAILY_REWARDS[0];
      const amount = dailyRewardAmount(def, p.level);
      const streakMult = 1 + Math.min(streak - 1, 30) * 0.04; // up to +120% at streak 30
      const scaledAmount =
        def.kind === "gold" || def.kind === "wood" || def.kind === "stone" || def.kind === "chest"
          ? Math.floor(amount * streakMult)
          : amount;
      let next = applyReward(p, def.kind, scaledAmount);
      next = {
        ...next,
        lastDailyClaim: now,
        dailyStreak: streak,
        dailyCycleDay: (day % 7) + 1,
      };
      result = { kind: def.kind, amount: scaledAmount, day };
      return next;
    });
    return result;
  }, []);

  // Free daily spin — returns the segment that was won, or null if not ready.
  const claimSpin = useCallback((): SpinSegment | null => {
    const p = stateRef.current;
    const now = Date.now();
    if (now - (p.lastSpinAt ?? 0) < 22 * 3600 * 1000) return null;
    const segment = pickSpinSegment();
    setState((prev) => {
      const s = ensureDaily(prev);
      const amount =
        segment.kind === "gold" || segment.kind === "chest"
          ? Math.floor(segment.amount * (1 + s.level * 0.2))
          : segment.kind === "wood" || segment.kind === "stone"
            ? Math.floor(segment.amount * (1 + s.level * 0.15))
            : segment.amount;
      let next = applyReward(s, segment.kind, amount);
      next = { ...next, lastSpinAt: now };
      return next;
    });
    return segment;
  }, []);

  // Claim a completed mission's reward.
  const claimMission = useCallback((missionId: string) => {
    setState((prev) => {
      const p = ensureDaily(prev);
      const m = p.dailyMissions.find((x) => x.id === missionId);
      if (!m || m.claimed || m.progress < m.goal) return p;
      const next: GameState = {
        ...p,
        resources: { ...p.resources, gold: p.resources.gold + m.rewardGold },
        totalGoldEarned: p.totalGoldEarned + m.rewardGold,
        dailyMissions: p.dailyMissions.map((x) => (x.id === missionId ? { ...x, claimed: true } : x)),
      };
      // small XP bonus
      let xp = next.xp + m.rewardXp;
      let level = next.level;
      while (xp >= xpForLevel(level)) {
        xp -= xpForLevel(level);
        level++;
      }
      return { ...next, xp, level };
    });
  }, []);

  // Legacy alias so existing callers still work.
  const claimDaily = claimDailyReward;

  const resetOfflineNotice = useCallback(() => {
    offlineEarnings.current = null;
  }, []);

  const addGold = useCallback((amount: number) => {
    setState((p) => ({
      ...p,
      resources: { ...p.resources, gold: p.resources.gold + amount },
      totalGoldEarned: p.totalGoldEarned + amount,
    }));
  }, []);

  const updateSettings = useCallback((patch: Partial<GameState["settings"]>) => {
    setState((p) => ({
      ...p,
      settings: { ...p.settings, ...patch },
    }));
  }, []);

  // ============ PRESTIGE / REBIRTH ============

  const performPrestige = useCallback((): { tokens: number; newAchievements: string[] } | null => {
    const cur = stateRef.current;
    if (!canPrestige(cur)) return null;
    const tokens = calcPrestigeTokens(cur);
    let result: { tokens: number; newAchievements: string[] } = { tokens, newAchievements: [] };
    setState((p) => {
      const prestigeCount = p.prestigeCount + 1;
      // Auto-award prestige achievements
      const newAch: string[] = [];
      for (const a of PRESTIGE_ACHIEVEMENTS) {
        if (!p.prestigeAchievements.includes(a.id) && prestigeCount >= a.goal) {
          newAch.push(a.id);
        }
      }
      const achievementReward = newAch.reduce((s, id) => {
        const a = PRESTIGE_ACHIEVEMENTS.find((x) => x.id === id);
        return s + (a?.reward ?? 0);
      }, 0);
      result = { tokens, newAchievements: newAch };
      const base = initialState();
      return {
        ...base,
        // Permanent meta — preserved across rebirths
        prestigeTokens: p.prestigeTokens + tokens + achievementReward,
        prestigeCount,
        prestigeUpgrades: p.prestigeUpgrades,
        prestigeAchievements: [...p.prestigeAchievements, ...newAch],
        unlockedIslands: p.unlockedIslands, // keep discovered islands
        achievements: p.achievements,       // keep normal achievements
        cosmetics: p.cosmetics,             // keep cosmetics
        settings: p.settings,
        // Track lifetime progress
        totalGoldEarned: p.totalGoldEarned,
        // Keep daily streak so retention isn't punished
        dailyStreak: p.dailyStreak,
        lastDailyClaim: p.lastDailyClaim,
        dailyCycleDay: p.dailyCycleDay,
        lastSpinAt: p.lastSpinAt,
        dailyMissions: p.dailyMissions,
        dailyMissionsDate: p.dailyMissionsDate,
        dailyCounters: p.dailyCounters,
      };
    });
    return result;
  }, []);

  const buyPrestigeUpgrade = useCallback((upgradeId: string) => {
    setState((p) => {
      const def = PRESTIGE_UPGRADES.find((u) => u.id === upgradeId);
      if (!def) return p;
      const level = p.prestigeUpgrades[upgradeId] ?? 0;
      if (level >= def.maxLevel) return p;
      const cost = prestigeUpgradeCost(def, level);
      if (p.prestigeTokens < cost) return p;
      return {
        ...p,
        prestigeTokens: p.prestigeTokens - cost,
        prestigeUpgrades: { ...p.prestigeUpgrades, [upgradeId]: level + 1 },
      };
    });
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
    claimDailyReward,
    claimSpin,
    claimMission,
    offlineEarnings: offlineEarnings.current,
    resetOfflineNotice,
    updateSettings,
    performPrestige,
    buyPrestigeUpgrade,
    addGold,
  };
}
