import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Modal } from "@/components/game/Modal";
import { toast } from "sonner";
import { fmt } from "@/game/format";
import type { GameState } from "@/game/types";
import {
  PRESTIGE_UPGRADES,
  PRESTIGE_ACHIEVEMENTS,
  prestigeUpgradeCost,
  calcPrestigeTokens,
  canPrestige,
  prestigeRequirementGold,
} from "@/game/prestige";

interface Props {
  open: boolean;
  onClose: () => void;
  state: GameState;
  onPrestige: () => { tokens: number; newAchievements: string[] } | null;
  onBuyUpgrade: (id: string) => void;
}

type Tab = "overview" | "upgrades" | "achievements";

export function PrestigeModal({ open, onClose, state, onPrestige, onBuyUpgrade }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [confirming, setConfirming] = useState(false);
  const [showRebirthFx, setShowRebirthFx] = useState(false);

  const tokensAvail = calcPrestigeTokens(state);
  const ready = canPrestige(state);
  const requirement = prestigeRequirementGold(state.prestigeCount);
  const progressPct = Math.min(100, (state.totalGoldEarned / requirement) * 100);

  const doPrestige = () => {
    const res = onPrestige();
    if (!res) return;
    setConfirming(false);
    setShowRebirthFx(true);
    setTimeout(() => {
      setShowRebirthFx(false);
      toast.success(`✨ Перерождение! +${res.tokens} Prestige Tokens`, {
        description: res.newAchievements.length
          ? `Открыто достижений: ${res.newAchievements.length}`
          : "Бонусы сохранены навсегда",
      });
    }, 2400);
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="Перерождение" icon="✨" maxWidth="max-w-3xl">
        {/* Token banner */}
        <div className="bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 rounded-2xl p-4 text-white shadow-pop border-4 border-white/60 flex items-center justify-between mb-4">
          <div>
            <div className="text-xs opacity-90 uppercase tracking-wider font-bold">Prestige Tokens</div>
            <div className="text-3xl font-display font-black drop-shadow flex items-center gap-2">
              💎 {fmt(state.prestigeTokens)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-90">Перерождений</div>
            <div className="text-2xl font-display font-black">{state.prestigeCount}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(["overview", "upgrades", "achievements"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
                tab === t
                  ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-card"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t === "overview" ? "Обзор" : t === "upgrades" ? "Улучшения" : "Достижения"}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-4">
            <div className="bg-card rounded-2xl p-4 border-2 border-violet-200">
              <h3 className="font-display font-bold text-lg mb-2">Готовность к Rebirth</h3>
              <div className="text-sm text-muted-foreground mb-3">
                Заработано всего золота: <b>{fmt(state.totalGoldEarned)}</b> / {fmt(requirement)}
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Stat label="Получите токенов" value={`💎 ${tokensAvail}`} />
                <Stat label="Сброс" value="Ресурсы и здания" />
                <Stat label="Сохранится" value="Острова, кубки, токены" />
                <Stat label="Следующая цель" value={fmt(prestigeRequirementGold(state.prestigeCount + 1))} />
              </div>
            </div>

            <button
              onClick={() => setConfirming(true)}
              disabled={!ready}
              className={`w-full py-4 rounded-2xl font-display font-black text-lg shadow-pop border-4 border-white/60 transition-all ${
                ready
                  ? "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white hover:-translate-y-0.5 active:translate-y-0.5"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {ready ? `✨ Переродиться · +${tokensAvail} 💎` : `Нужно ${fmt(requirement)} золота`}
            </button>

            <div className="text-xs text-muted-foreground bg-amber-50 border-2 border-amber-200 rounded-xl p-3">
              ⚠️ После перерождения золото, дерево, камень и здания будут сброшены. Постоянные улучшения, открытые острова, кубки и Prestige Tokens сохраняются.
            </div>
          </div>
        )}

        {tab === "upgrades" && (
          <div className="grid sm:grid-cols-2 gap-3">
            {PRESTIGE_UPGRADES.map((u) => {
              const lvl = state.prestigeUpgrades[u.id] ?? 0;
              const max = lvl >= u.maxLevel;
              const cost = prestigeUpgradeCost(u, lvl);
              const afford = state.prestigeTokens >= cost;
              return (
                <div key={u.id} className="bg-card rounded-2xl p-3 border-2 border-violet-200 shadow-card flex flex-col">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-200 flex items-center justify-center text-2xl shrink-0">
                      {u.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-sm leading-tight">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold">Ур. {lvl}/{u.maxLevel}</span>
                    {!max && <span className="text-violet-600 font-bold">💎 {cost}</span>}
                  </div>
                  <button
                    onClick={() => onBuyUpgrade(u.id)}
                    disabled={max || !afford}
                    className={`mt-auto py-2 rounded-xl text-sm font-bold transition-all ${
                      max
                        ? "bg-emerald-100 text-emerald-700"
                        : afford
                        ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-card hover:-translate-y-0.5"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    {max ? "Максимум" : "Купить"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === "achievements" && (
          <div className="space-y-2">
            {PRESTIGE_ACHIEVEMENTS.map((a) => {
              const done = state.prestigeAchievements.includes(a.id);
              const pct = Math.min(100, (state.prestigeCount / a.goal) * 100);
              return (
                <div
                  key={a.id}
                  className={`rounded-2xl p-3 border-2 flex items-center gap-3 ${
                    done ? "bg-emerald-50 border-emerald-300" : "bg-card border-violet-200"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-200 flex items-center justify-center text-2xl shrink-0">
                    {a.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-sm">{a.name}</div>
                    <div className="text-xs text-muted-foreground mb-1">{a.description}</div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right text-xs shrink-0">
                    <div className="font-bold text-violet-600">💎 {a.reward}</div>
                    <div className="text-muted-foreground">{state.prestigeCount}/{a.goal}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Confirmation overlay */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-card rounded-3xl p-6 max-w-sm w-full border-4 border-violet-300 shadow-pop text-center"
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
            >
              <div className="text-5xl mb-3">⚠️</div>
              <h3 className="font-display font-black text-xl mb-2">Подтвердите перерождение</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Все ресурсы и здания будут сброшены. Вы получите <b className="text-violet-600">💎 {tokensAvail}</b> Prestige Tokens.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 py-3 rounded-xl bg-muted font-bold"
                >
                  Отмена
                </button>
                <button
                  onClick={doPrestige}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold shadow-card"
                >
                  Переродиться
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rebirth animation */}
      <AnimatePresence>
        {showRebirthFx && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-radial from-fuchsia-400/80 via-violet-600/60 to-black"
              initial={{ scale: 0 }}
              animate={{ scale: 3 }}
              transition={{ duration: 1.4, ease: "easeOut" }}
            />
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]"
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{
                  x: Math.cos((i / 30) * Math.PI * 2) * 500,
                  y: Math.sin((i / 30) * Math.PI * 2) * 500,
                  opacity: 0,
                }}
                transition={{ duration: 1.8, ease: "easeOut" }}
              />
            ))}
            <motion.div
              className="relative z-10 text-center"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.4, type: "spring" }}
            >
              <div className="text-8xl drop-shadow-2xl mb-2">✨</div>
              <div className="font-display font-black text-4xl text-white drop-shadow-lg">
                ПЕРЕРОЖДЕНИЕ
              </div>
              <div className="text-2xl font-bold text-fuchsia-100 mt-2">
                +{tokensAvail} 💎
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-xl p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-bold text-sm">{value}</div>
    </div>
  );
}
