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
import { SettingsModal } from "@/components/game/SettingsModal";
import { PrestigeModal } from "@/components/game/PrestigeModal";
import { CaptainShip } from "@/components/game/CaptainShip";
import { CaptainModal } from "@/components/game/CaptainModal";
import { AiAdvisorModal } from "@/components/game/AiAdvisorModal";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { fmt } from "@/game/format";
import { canPrestige } from "@/game/prestige";

const ACTIONS = [
  { id: "shop", label: "Магазин", emoji: "🛒", gradient: "from-rose-400 to-rose-600" },
  { id: "upgrades", label: "Здания", emoji: "🔨", gradient: "from-amber-400 to-orange-500" },
  { id: "islands", label: "Острова", emoji: "🗺️", gradient: "from-emerald-400 to-teal-600" },
  { id: "daily", label: "Награды", emoji: "🎁", gradient: "from-violet-400 to-fuchsia-600" },
  { id: "achievements", label: "Кубки", emoji: "🏆", gradient: "from-sky-400 to-indigo-600" },
  { id: "prestige", label: "Перерождение", emoji: "✨", gradient: "from-fuchsia-500 to-violet-700" },
  { id: "ai", label: "ИИ", emoji: "✨", gradient: "from-cyan-400 to-blue-600" },
] as const;

type ModalId = (typeof ACTIONS)[number]["id"] | "build" | "settings" | null;

export default function GamePage({ initialModal = null }: { initialModal?: ModalId } = {}) {
  const game = useGameStore();
  const [modal, setModal] = useState<ModalId>(initialModal);
  const [plotIndex, setPlotIndex] = useState(0);
  const [offlineSeen, setOfflineSeen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [movingFrom, setMovingFrom] = useState<number | null>(null);
  const [captainOpen, setCaptainOpen] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="fixed inset-0 bg-gradient-sky" />;

  const dailyReady = Date.now() - game.state.lastDailyClaim >= 22 * 3600 * 1000;
  const spinReady = Date.now() - (game.state.lastSpinAt ?? 0) >= 22 * 3600 * 1000;
  const claimableMissions = game.state.dailyMissions?.filter((m) => !m.claimed && m.progress >= m.goal).length ?? 0;
  const dailyTotalBadge = (dailyReady ? 1 : 0) + (spinReady ? 1 : 0) + claimableMissions;
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
      {/* TOP HUD — resources in a single row */}
      <div className="relative z-10 px-2 pt-2 sm:px-4 sm:pt-3 space-y-1.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <ResourceBar resources={game.state.resources} rates={game.rates} />
          </div>
          <GameAccountBadge />
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
          moveMode={moveMode}
          movingFrom={movingFrom}
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
        <CaptainShip offer={game.state.captain.activeOffer} onClick={() => setCaptainOpen(true)} />
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
          className={`absolute top-2 left-2 sm:top-3 sm:left-3 btn-3d rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-xl sm:text-2xl font-bold shadow-pop border-2 border-white ${
            moveMode ? "bg-violet-500 text-white" : "bg-white/90 text-violet-600"
          }`}
          title="Переместить здания"
        >
          🔀
        </button>
      </div>

      {/* BOTTOM ACTION DOCK */}
      <div className="relative z-10 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:p-5">
        <div className="bg-white/85 backdrop-blur-xl rounded-3xl border-2 border-white shadow-pop p-2 sm:p-4 grid grid-cols-4 gap-1.5 sm:flex sm:gap-3 max-w-3xl mx-auto">
          {ACTIONS.map((a) => {
            const notif =
              a.id === "daily" ? (dailyTotalBadge > 0 ? String(dailyTotalBadge) : null) :
              a.id === "achievements" ? (claimableAchievements > 0 ? String(claimableAchievements) : null) :
              a.id === "prestige" ? (canPrestige(game.state) ? "!" : null) :
              null;
            return (
              <motion.button
                key={a.id}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setModal(a.id)}
                className={`btn-3d relative sm:flex-1 bg-gradient-to-br ${a.gradient} text-white rounded-2xl py-2.5 sm:py-5 px-1 sm:px-3 flex flex-col items-center gap-0.5 sm:gap-2 font-display font-bold min-h-[60px] sm:min-h-0`}
              >
                <span className="text-2xl sm:text-4xl drop-shadow leading-none">{a.emoji}</span>
                <span className="text-[10px] sm:text-sm text-shadow-soft leading-tight text-center">{a.label}</span>
                {notif && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 bg-red-500 text-white text-[10px] sm:text-xs font-bold rounded-full min-w-[18px] sm:min-w-[22px] h-[18px] sm:h-[22px] px-1 flex items-center justify-center border-2 border-white shadow"
                  >
                    {notif}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
          <motion.div
            whileHover={{ y: -4 }}
            className="btn-3d relative sm:flex-1 bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 text-white rounded-2xl py-2.5 sm:py-5 px-1 sm:px-3 flex flex-col items-center justify-center gap-0.5 sm:gap-2 font-display font-bold min-h-[60px] sm:min-h-0"
            title={`Уровень ${game.state.level}`}
          >
            <span className="text-2xl sm:text-4xl drop-shadow leading-none">⭐</span>
            <span className="text-[10px] sm:text-sm text-shadow-soft leading-tight">Ур. {game.state.level}</span>
          </motion.div>
          <motion.button
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setModal("settings")}
            className="btn-3d relative sm:flex-1 bg-gradient-to-br from-slate-400 to-slate-600 text-white rounded-2xl py-2.5 sm:py-5 px-1 sm:px-3 flex flex-col items-center gap-0.5 sm:gap-2 font-display font-bold min-h-[60px] sm:min-h-0"
            title="Настройки"
          >
            <span className="text-2xl sm:text-4xl drop-shadow leading-none">⚙️</span>
            <span className="text-[10px] sm:text-sm text-shadow-soft leading-tight">Настройки</span>
          </motion.button>
        </div>
      </div>

      {/* MODALS */}
      <BuildMenu
        open={modal === "build"}
        onClose={() => setModal(null)}
        plotIndex={plotIndex}
        state={game.state}
        onBuild={game.buildAtPlot}
        onUpgrade={() => game.upgradeAtPlot(plotIndex)}
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
        onClaimDaily={game.claimDailyReward}
        onSpin={game.claimSpin}
        onClaimMission={game.claimMission}
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
      <SettingsModal
        open={modal === "settings"}
        onClose={() => setModal(null)}
        settings={game.state.settings}
        onUpdate={game.updateSettings}
        onAddGold={game.addGold}
      />
      <PrestigeModal
        open={modal === "prestige"}
        onClose={() => setModal(null)}
        state={game.state}
        onPrestige={game.performPrestige}
        onBuyUpgrade={game.buyPrestigeUpgrade}
      />
      <AiAdvisorModal
        open={modal === "ai"}
        onClose={() => setModal(null)}
        state={game.state}
      />
      <CaptainModal
        open={captainOpen || !!game.state.captain.lastResult}
        offer={captainOpen ? game.state.captain.activeOffer : null}
        result={game.state.captain.lastResult}
        resources={game.state.resources}
        onAccept={() => {
          game.acceptCaptainOffer();
        }}
        onDecline={() => {
          game.declineCaptainOffer();
          setCaptainOpen(false);
        }}
        onClose={() => {
          setCaptainOpen(false);
          game.clearCaptainResult();
        }}
      />
    </div>
  );
}

function GameAccountBadge() {
  const { user, loading } = useAuth();
  if (loading) return null;

  if (!user) {
    return (
      <div className="shrink-0 flex flex-col sm:flex-row gap-1.5">
        <Link
          to="/login"
          search={{ mode: "login" }}
          className="h-9 sm:h-14 rounded-2xl border border-white/80 bg-white/80 px-3 text-xs sm:text-sm font-bold text-slate-700 shadow-card backdrop-blur flex items-center justify-center"
        >
          Войти
        </Link>
        <Link
          to="/login"
          search={{ mode: "register" }}
          className="h-9 sm:h-14 rounded-2xl border border-white/80 bg-white/60 px-3 text-xs sm:text-sm font-bold text-slate-700 shadow-card backdrop-blur flex items-center justify-center"
        >
          Регистрация
        </Link>
      </div>
    );
  }

  const email = user.email ?? "Аккаунт";
  const name = user.user_metadata?.full_name || user.user_metadata?.name || email;
  const avatar = user.user_metadata?.avatar_url as string | undefined;

  return (
    <div className="h-11 sm:h-14 shrink-0 rounded-2xl border border-white/80 bg-white/85 pl-1.5 pr-2 sm:pr-3 shadow-card backdrop-blur flex items-center gap-2 max-w-[170px] sm:max-w-[240px]">
      {avatar ? (
        <img src={avatar} alt="" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 border-white object-cover" />
      ) : (
        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 border-white bg-emerald-200 text-emerald-900 flex items-center justify-center text-sm font-black">
          {email.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 hidden sm:block">
        <div className="truncate text-[12px] font-black leading-tight text-slate-800" title={name}>
          {name}
        </div>
        <div className="truncate text-[11px] font-semibold leading-tight text-slate-500" title={email}>
          {email}
        </div>
      </div>
      <div className="min-w-0 sm:hidden">
        <div className="truncate max-w-[72px] text-[11px] font-bold text-slate-700" title={email}>
          {email}
        </div>
      </div>
      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
        title="Выйти"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
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
