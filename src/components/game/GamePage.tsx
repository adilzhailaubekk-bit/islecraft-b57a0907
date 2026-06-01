import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useGameStore } from "@/game/store";
import { plotCost, ACHIEVEMENTS } from "@/game/data";
import { ResourceBar } from "@/components/game/ResourceBar";
import { IslandView } from "@/components/game/IslandView";
import { BuildMenu } from "@/components/game/BuildMenu";
import { ShopModal } from "@/components/game/ShopModal";
import { IslandsModal } from "@/components/game/IslandsModal";
import { AchievementsModal } from "@/components/game/AchievementsModal";
import { DailyModal } from "@/components/game/DailyModal";
import { OfflineModal } from "@/components/game/OfflineModal";
import { LevelBadge } from "@/components/game/LevelBadge";
import { fmt } from "@/game/format";

const ACTIONS = [
  { id: "shop", label: "Магазин", emoji: "🛒", gradient: "from-rose-400 to-rose-600" },
  { id: "upgrades", label: "Здания", emoji: "🔨", gradient: "from-amber-400 to-orange-500" },
  { id: "islands", label: "Острова", emoji: "🗺️", gradient: "from-emerald-400 to-teal-600" },
  { id: "daily", label: "Награды", emoji: "🎁", gradient: "from-violet-400 to-fuchsia-600" },
  { id: "achievements", label: "Кубки", emoji: "🏆", gradient: "from-sky-400 to-indigo-600" },
] as const;

type ModalId = (typeof ACTIONS)[number]["id"] | "build" | null;

export default function GamePage() {
  const game = useGameStore();
  const [modal, setModal] = useState<ModalId>(null);
  const [plotIndex, setPlotIndex] = useState(0);
  const [offlineSeen, setOfflineSeen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [movingFrom, setMovingFrom] = useState<number | null>(null);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="fixed inset-0 bg-gradient-sky" />;

  const dailyReady = Date.now() - game.state.lastDailyClaim >= 22 * 3600 * 1000;
  const claimableAchievements = ACHIEVEMENTS.filter((a) => {
    if (game.state.achievements.includes(a.id)) return false;
    const p =
      a.metric === "gold"
        ? game.state.totalGoldEarned
        : a.metric === "level"
          ? game.state.level
          : a.metric === "buildings"
            ? game.state.buildings.reduce((s, b) => s + (b?.level ?? 0), 0)
            : a.metric === "plots"
              ? game.state.plots
              : a.metric === "streak"
                ? game.state.dailyStreak
                : game.state.unlockedIslands.length;
    return p >= a.goal;
  }).length;

  const speedActive = game.state.boosters.speedBoostUntil > Date.now();
  const doubleActive = game.state.boosters.doubleIncomeUntil > Date.now();

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-gradient-sky">
      {/* TOP HUD */}
      <div className="relative z-10 p-2 sm:p-4 space-y-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <LevelBadge level={game.state.level} xp={game.state.xp} />
          <div className="flex-1">
            <ResourceBar resources={game.state.resources} rates={game.rates} />
          </div>
        </div>

        {/* Active boosts */}
        <AnimatePresence>
          {(speedActive || doubleActive || game.state.boosters.extraWorkers > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-wrap gap-2"
            >
              {speedActive && (
                <Badge color="from-cyan-400 to-sky-500">
                  ⚡ x2 скорость · {fmtTime(game.state.boosters.speedBoostUntil)}
                </Badge>
              )}
              {doubleActive && (
                <Badge color="from-amber-400 to-orange-500">
                  💰 x2 золото · {fmtTime(game.state.boosters.doubleIncomeUntil)}
                </Badge>
              )}
              {game.state.boosters.extraWorkers > 0 && (
                <Badge color="from-emerald-400 to-teal-500">
                  👷 +{game.state.boosters.extraWorkers * 10}% к добыче
                </Badge>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ISLAND */}
      <div className="flex-1 relative px-2 sm:px-4 min-h-0">
        <IslandView
          state={game.state}
          onPlotClick={(i) => {
            if (moveMode) {
              if (movingFrom === null) {
                if (game.state.buildings[i]) setMovingFrom(i);
              } else {
                if (movingFrom !== i) game.moveBuilding(movingFrom, i);
                setMovingFrom(null);
              }
              return;
            }
            setPlotIndex(i);
            setModal("build");
          }}
        />
        {moveMode && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-pop border-2 border-white pointer-events-none">
            {movingFrom === null ? "Выберите здание для переноса" : "Выберите участок назначения"}
          </div>
        )}
        <button
          onClick={() => {
            setMoveMode((v) => !v);
            setMovingFrom(null);
          }}
          className={`absolute top-3 right-3 btn-3d rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold shadow-pop border-2 border-white ${
            moveMode ? "bg-violet-500 text-white" : "bg-white text-violet-600"
          }`}
          title="Переместить здания"
        >
          🔀
        </button>
      </div>

      {/* BOTTOM ACTION DOCK */}
      <div className="relative z-10 p-2 sm:p-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border-2 border-white shadow-pop p-2 sm:p-3 flex gap-1 sm:gap-2 max-w-3xl mx-auto">
          {ACTIONS.map((a) => {
            const notif =
              a.id === "daily" ? (dailyReady ? "•" : null) :
              a.id === "achievements" ? (claimableAchievements > 0 ? String(claimableAchievements) : null) :
              null;
            return (
              <motion.button
                key={a.id}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setModal(a.id)}
                className={`btn-3d relative flex-1 bg-gradient-to-br ${a.gradient} text-white rounded-2xl py-3 px-2 flex flex-col items-center gap-1 font-display font-bold`}
              >
                <span className="text-2xl sm:text-3xl drop-shadow">{a.emoji}</span>
                <span className="text-[10px] sm:text-xs text-shadow-soft">{a.label}</span>
                {notif && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center border-2 border-white shadow"
                  >
                    {notif}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* MODALS */}
      <BuildMenu
        open={modal === "build"}
        onClose={() => setModal(null)}
        plotIndex={plotIndex}
        state={game.state}
        onBuild={game.buyOrUpgrade}
        onBuyPlot={game.buyPlot}
        plotPrice={plotCost(game.state.plots)}
      />
      <ShopModal
        open={modal === "shop"}
        onClose={() => setModal(null)}
        state={game.state}
        onBuyBooster={game.buyBooster}
        onBuyCosmetic={game.buyCosmetic}
      />
      <UpgradesShortcut
        open={modal === "upgrades"}
        onClose={() => setModal(null)}
        onPick={(i) => {
          setPlotIndex(i);
          setModal("build");
        }}
        state={game.state}
      />
      <IslandsModal
        open={modal === "islands"}
        onClose={() => setModal(null)}
        state={game.state}
        onUnlock={game.unlockIsland}
        onSwitch={game.switchIsland}
      />
      <DailyModal
        open={modal === "daily"}
        onClose={() => setModal(null)}
        state={game.state}
        onClaim={game.claimDaily}
      />
      <AchievementsModal
        open={modal === "achievements"}
        onClose={() => setModal(null)}
        state={game.state}
        onClaim={game.claimAchievement}
      />
      <OfflineModal
        open={!!game.offlineEarnings && !offlineSeen && game.offlineEarnings.gold > 1}
        onClose={() => {
          setOfflineSeen(true);
          game.resetOfflineNotice();
        }}
        gold={game.offlineEarnings?.gold ?? 0}
        seconds={game.offlineEarnings?.seconds ?? 0}
      />
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className={`bg-gradient-to-r ${color} text-white text-xs font-bold px-3 py-1 rounded-full shadow-card border-2 border-white`}>
      {children}
    </div>
  );
}

function fmtTime(until: number) {
  const s = Math.max(0, Math.floor((until - Date.now()) / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

// Quick list of all built buildings for upgrades shortcut
import { Modal } from "@/components/game/Modal";
import { BUILDINGS } from "@/game/data";
import type { GameState } from "@/game/types";

function UpgradesShortcut({
  open,
  onClose,
  onPick,
  state,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (i: number) => void;
  state: GameState;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Ваши здания" icon="🔨">
      {state.buildings.filter(Boolean).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Постройте первое здание, нажав на свободный участок на острове!
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {state.buildings.map((b, i) => {
            if (!b) return null;
            const def = BUILDINGS.find((d) => d.id === b.id)!;
            return (
              <button
                key={i}
                onClick={() => {
                  onPick(i);
                  onClose();
                }}
                className="text-left bg-white rounded-2xl p-3 border-2 border-amber-200 shadow-card hover:shadow-pop hover:-translate-y-0.5 transition-all flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-300 flex items-center justify-center text-2xl">
                  {def.emoji}
                </div>
                <div className="flex-1">
                  <div className="font-display font-bold">{def.name}</div>
                  <div className="text-xs text-muted-foreground">Уровень {b.level} · {fmt((def.baseRate * Math.pow(def.rateMultiplier, b.level - 1)))} /с</div>
                </div>
                <span className="text-amber-600 font-bold">▲</span>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
