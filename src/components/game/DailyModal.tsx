import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Modal } from "./Modal";
import type { GameState } from "@/game/types";
import { fmt } from "@/game/format";
import {
  DAILY_REWARDS,
  SPIN_SEGMENTS,
  dailyRewardAmount,
  type DailyRewardKind,
  type SpinSegment,
} from "@/game/data";

interface Props {
  open: boolean;
  onClose: () => void;
  state: GameState;
  onClaimDaily: () => { kind: DailyRewardKind; amount: number; day: number } | null;
  onSpin: () => SpinSegment | null;
  onClaimMission: (id: string) => void;
}

const DAY = 22 * 3600 * 1000;
type Tab = "rewards" | "spin" | "missions";

export function DailyModal({ open, onClose, state, onClaimDaily, onSpin, onClaimMission }: Props) {
  const [tab, setTab] = useState<Tab>("rewards");
  const dailyReady = Date.now() - state.lastDailyClaim >= DAY;
  const spinReady = Date.now() - (state.lastSpinAt ?? 0) >= DAY;
  const claimableMissions = state.dailyMissions.filter((m) => !m.claimed && m.progress >= m.goal).length;

  return (
    <Modal open={open} onClose={onClose} title="Ежедневно" icon="🎁" maxWidth="max-w-xl">
      <div className="flex gap-1 bg-secondary rounded-2xl p-1 mb-4">
        <TabBtn active={tab === "rewards"} onClick={() => setTab("rewards")} label="Награды" emoji="🎁" badge={dailyReady ? "•" : null} />
        <TabBtn active={tab === "spin"} onClick={() => setTab("spin")} label="Колесо" emoji="🎡" badge={spinReady ? "•" : null} />
        <TabBtn active={tab === "missions"} onClick={() => setTab("missions")} label="Задания" emoji="🎯" badge={claimableMissions > 0 ? String(claimableMissions) : null} />
      </div>

      <AnimatePresence mode="wait">
        {tab === "rewards" && (
          <motion.div key="rewards" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
            <RewardsTab state={state} onClaim={onClaimDaily} />
          </motion.div>
        )}
        {tab === "spin" && (
          <motion.div key="spin" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
            <SpinTab state={state} onSpin={onSpin} />
          </motion.div>
        )}
        {tab === "missions" && (
          <motion.div key="missions" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
            <MissionsTab state={state} onClaim={onClaimMission} />
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

function TabBtn({ active, onClick, label, emoji, badge }: { active: boolean; onClick: () => void; label: string; emoji: string; badge: string | null }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 rounded-xl py-2 px-3 text-sm font-display font-bold transition-all ${
        active ? "bg-white shadow-card text-foreground" : "text-muted-foreground"
      }`}
    >
      <span className="mr-1">{emoji}</span>
      {label}
      {badge && (
        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-white">
          {badge}
        </span>
      )}
    </button>
  );
}

// =================== REWARDS TAB ===================

function RewardsTab({ state, onClaim }: { state: GameState; onClaim: Props["onClaimDaily"] }) {
  const [reward, setReward] = useState<{ kind: DailyRewardKind; amount: number; day: number } | null>(null);
  const ready = Date.now() - state.lastDailyClaim >= DAY;
  const remaining = Math.max(0, DAY - (Date.now() - state.lastDailyClaim));
  const todayDay = state.dailyCycleDay || 1;

  return (
    <div>
      <div className="bg-gradient-to-br from-amber-100 to-rose-100 rounded-2xl p-3 mb-3 flex items-center gap-3 border-2 border-white">
        <div className="text-3xl">🔥</div>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">Серия входов</div>
          <div className="font-display font-bold text-xl">{state.dailyStreak} {pluralDays(state.dailyStreak)}</div>
        </div>
        <div className="text-xs text-right text-muted-foreground max-w-[120px]">
          {ready ? "Подтвердите вход!" : "Возвращайтесь завтра, чтобы продолжить серию"}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-4">
        {DAILY_REWARDS.map((def) => {
          const claimedToday = !ready && def.day === ((todayDay - 2 + 7) % 7) + 1;
          const isToday = ready && def.day === todayDay;
          const past = def.day < todayDay && !isToday;
          const amount = dailyRewardAmount(def, state.level);
          return (
            <motion.div
              key={def.day}
              whileHover={isToday ? { scale: 1.05 } : undefined}
              className={`relative rounded-xl p-2 text-center border-2 ${
                isToday
                  ? "bg-gradient-to-br from-amber-200 to-orange-300 border-amber-500 shadow-pop animate-pulse-slow"
                  : claimedToday
                  ? "bg-emerald-100 border-emerald-400"
                  : past
                  ? "bg-secondary border-transparent opacity-60"
                  : "bg-white border-amber-200"
              }`}
            >
              {def.rare && (
                <span className="absolute -top-1 -right-1 text-[9px] bg-violet-500 text-white px-1 rounded-full">RARE</span>
              )}
              <div className="text-[10px] font-bold text-muted-foreground">День {def.day}</div>
              <div className="text-2xl my-1">{def.emoji}</div>
              <div className="text-[10px] font-bold leading-tight">
                {def.kind === "speed" || def.kind === "double"
                  ? `${Math.round(amount / 60)}м`
                  : def.kind === "worker"
                    ? "+1"
                    : fmt(amount)}
              </div>
              {claimedToday && <div className="text-[10px] mt-1 text-emerald-700">✓</div>}
            </motion.div>
          );
        })}
      </div>

      {ready ? (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            const r = onClaim();
            if (r) setReward(r);
          }}
          className="btn-3d w-full bg-gradient-gold text-amber-900 font-display font-bold text-lg py-4 rounded-2xl"
        >
          🎁 Забрать награду дня {todayDay}
        </motion.button>
      ) : (
        <div className="bg-secondary rounded-2xl py-4 text-center font-bold">
          ⏳ Следующая награда через {fmtRemaining(remaining)}
        </div>
      )}

      <RewardPopup reward={reward} onClose={() => setReward(null)} />
    </div>
  );
}

// =================== SPIN TAB ===================

function SpinTab({ state, onSpin }: { state: GameState; onSpin: Props["onSpin"] }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [reward, setReward] = useState<SpinSegment | null>(null);
  const wonRef = useRef<SpinSegment | null>(null);
  const ready = Date.now() - (state.lastSpinAt ?? 0) >= DAY;
  const remaining = Math.max(0, DAY - (Date.now() - (state.lastSpinAt ?? 0)));
  const n = SPIN_SEGMENTS.length;
  const segAngle = 360 / n;

  const handleSpin = () => {
    if (spinning || !ready) return;
    const result = onSpin();
    if (!result) return;
    wonRef.current = result;
    const idx = SPIN_SEGMENTS.findIndex((s) => s.id === result.id);
    const targetAngle = 360 * 6 + (360 - (idx * segAngle + segAngle / 2));
    setSpinning(true);
    setRotation((r) => r + targetAngle);
    window.setTimeout(() => {
      setSpinning(false);
      setReward(result);
    }, 4200);
  };

  return (
    <div className="text-center">
      <div className="relative w-64 h-64 mx-auto mb-4">
        {/* pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20 w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-rose-600 drop-shadow" />
        <motion.div
          className="absolute inset-0 rounded-full border-[6px] border-white shadow-pop overflow-hidden"
          animate={{ rotate: rotation }}
          transition={{ duration: 4, ease: [0.17, 0.67, 0.2, 1] }}
        >
          <Wheel />
        </motion.div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 border-4 border-white shadow-pop z-10" />
      </div>

      {ready ? (
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          disabled={spinning}
          onClick={handleSpin}
          className="btn-3d bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white font-display font-bold text-lg py-3 px-8 rounded-2xl disabled:opacity-60"
        >
          {spinning ? "Крутится..." : "🎡 Крутить колесо"}
        </motion.button>
      ) : (
        <div className="bg-secondary rounded-2xl py-3 px-6 font-bold inline-block">
          ⏳ Следующий спин через {fmtRemaining(remaining)}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-3 max-w-sm mx-auto">
        Один бесплатный спин раз в сутки. Возможные призы: золото, ресурсы, ускорители и редкие сундуки.
      </p>

      <SpinReward reward={reward} onClose={() => setReward(null)} />
    </div>
  );
}

function Wheel() {
  const n = SPIN_SEGMENTS.length;
  const segAngle = 360 / n;
  return (
    <svg viewBox="-100 -100 200 200" className="w-full h-full">
      {SPIN_SEGMENTS.map((s, i) => {
        const a0 = (i * segAngle - 90) * (Math.PI / 180);
        const a1 = ((i + 1) * segAngle - 90) * (Math.PI / 180);
        const x0 = Math.cos(a0) * 100, y0 = Math.sin(a0) * 100;
        const x1 = Math.cos(a1) * 100, y1 = Math.sin(a1) * 100;
        const mid = ((i + 0.5) * segAngle - 90) * (Math.PI / 180);
        const tx = Math.cos(mid) * 62, ty = Math.sin(mid) * 62;
        const colorMap: Record<string, string> = {
          "from-amber-300 to-amber-500": "#fbbf24",
          "from-lime-300 to-emerald-500": "#10b981",
          "from-slate-300 to-slate-500": "#94a3b8",
          "from-yellow-300 to-orange-500": "#f97316",
          "from-cyan-300 to-sky-500": "#0ea5e9",
          "from-fuchsia-300 to-purple-500": "#a855f7",
          "from-emerald-400 to-teal-600": "#0d9488",
          "from-rose-400 to-pink-600": "#db2777",
        };
        const fill = colorMap[s.color] ?? "#999";
        return (
          <g key={s.id}>
            <path d={`M0 0 L ${x0} ${y0} A 100 100 0 0 1 ${x1} ${y1} Z`} fill={fill} stroke="#fff" strokeWidth={1.5} />
            <text
              x={tx} y={ty}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="22"
              transform={`rotate(${(i + 0.5) * segAngle} ${tx} ${ty})`}
            >
              {s.emoji}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// =================== MISSIONS TAB ===================

function MissionsTab({ state, onClaim }: { state: GameState; onClaim: (id: string) => void }) {
  const nextResetMs = useMemo(() => {
    const now = new Date();
    const reset = new Date(now);
    reset.setHours(24, 0, 0, 0);
    return reset.getTime() - now.getTime();
  }, []);
  if (!state.dailyMissions || state.dailyMissions.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Задания обновляются... вернитесь через секунду.</div>;
  }
  return (
    <div className="space-y-2">
      <div className="text-xs text-center text-muted-foreground mb-2">
        Обновление через {fmtRemaining(nextResetMs)}
      </div>
      {state.dailyMissions.map((m) => {
        const pct = Math.min(100, (m.progress / m.goal) * 100);
        const done = m.progress >= m.goal;
        return (
          <motion.div
            key={m.id}
            layout
            className={`bg-white rounded-2xl p-3 border-2 ${m.claimed ? "border-emerald-300 opacity-70" : done ? "border-amber-400 shadow-pop" : "border-amber-100"}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-300 flex items-center justify-center text-2xl flex-shrink-0">
                {m.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-sm leading-tight">{m.title}</div>
                <div className="text-xs text-muted-foreground">
                  Награда: 🪙 {fmt(m.rewardGold)} · +{m.rewardXp} XP
                </div>
                <div className="mt-1.5 h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${done ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gradient-to-r from-emerald-400 to-teal-500"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {fmt(Math.floor(m.progress))} / {fmt(m.goal)}
                </div>
              </div>
              {m.claimed ? (
                <div className="text-emerald-600 font-bold text-xs">✓</div>
              ) : (
                <button
                  disabled={!done}
                  onClick={() => onClaim(m.id)}
                  className={`btn-3d text-xs font-bold py-2 px-3 rounded-xl ${
                    done
                      ? "bg-gradient-gold text-amber-900"
                      : "bg-secondary text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  Забрать
                </button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// =================== REWARD POPUPS ===================

function RewardPopup({ reward, onClose }: { reward: { kind: DailyRewardKind; amount: number; day: number } | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {reward && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <motion.div
            className="relative bg-gradient-to-br from-amber-200 via-orange-200 to-rose-200 rounded-3xl p-8 text-center border-4 border-white shadow-pop max-w-sm"
            initial={{ scale: 0.4, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: "spring", damping: 16, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Particles />
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="text-7xl mb-3 drop-shadow-lg"
            >
              {kindEmoji(reward.kind)}
            </motion.div>
            <div className="font-display font-bold text-2xl text-amber-900 mb-1">
              День {reward.day}!
            </div>
            <div className="text-xl font-bold mb-4">
              {kindLabel(reward.kind, reward.amount)}
            </div>
            <button
              onClick={onClose}
              className="btn-3d bg-gradient-gold text-amber-900 font-display font-bold py-3 px-8 rounded-2xl"
            >
              Отлично!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SpinReward({ reward, onClose }: { reward: SpinSegment | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {reward && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          <motion.div
            className={`relative bg-gradient-to-br ${reward.color} rounded-3xl p-8 text-center border-4 border-white shadow-pop max-w-sm text-white`}
            initial={{ scale: 0.4 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: "spring", damping: 14 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Particles />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="text-7xl mb-3 drop-shadow-lg"
            >
              {reward.emoji}
            </motion.div>
            <div className="font-display font-bold text-2xl mb-1 text-shadow-soft">Выпало!</div>
            <div className="text-xl font-bold mb-4 text-shadow-soft">{reward.label}</div>
            <button onClick={onClose} className="btn-3d bg-white text-amber-900 font-display font-bold py-3 px-8 rounded-2xl">
              Забрать
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Particles() {
  // Use a deterministic pattern instead of Math.random() to avoid SSR hydration mismatch.
  const items = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    return {
      x: Math.cos(angle) * 80,
      y: Math.sin(angle) * 80,
      delay: i * 0.05,
    };
  });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {items.map((p, i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-yellow-300"
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 1.4 }}
          transition={{ duration: 1.2, delay: p.delay, repeat: Infinity, repeatDelay: 0.4 }}
        />
      ))}
    </div>
  );
}

// =================== HELPERS ===================

function pluralDays(n: number) {
  const m = n % 10;
  const m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return "дней";
  if (m === 1) return "день";
  if (m >= 2 && m <= 4) return "дня";
  return "дней";
}

function fmtRemaining(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

function kindEmoji(k: DailyRewardKind) {
  switch (k) {
    case "gold": return "🪙";
    case "wood": return "🪵";
    case "stone": return "🪨";
    case "speed": return "⚡";
    case "double": return "💎";
    case "worker": return "👷";
    case "chest": return "🎁";
  }
}

function kindLabel(k: DailyRewardKind, amount: number) {
  if (k === "gold" || k === "chest") return `+${fmt(amount)} золота`;
  if (k === "wood") return `+${fmt(amount)} дерева`;
  if (k === "stone") return `+${fmt(amount)} камня`;
  if (k === "speed") return `x2 скорость · ${Math.round(amount / 60)} мин`;
  if (k === "double") return `x2 золото · ${Math.round(amount / 60)} мин`;
  return "+1 рабочий";
}
