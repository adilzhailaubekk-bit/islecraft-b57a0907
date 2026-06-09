import { motion } from "motion/react";
import { Modal } from "@/components/game/Modal";
import { describeCost } from "@/game/captain";
import type { CaptainOffer, CaptainResult, Resources } from "@/game/types";

interface CaptainModalProps {
  offer: CaptainOffer | null;
  result: CaptainResult | null;
  resources: Resources;
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}

const rarityLabel: Record<CaptainOffer["rarity"], string> = {
  common: "Обычное",
  rare: "Редкое",
  legendary: "Легендарное",
  mythic: "Эксклюзив",
};

const rarityClass: Record<CaptainOffer["rarity"], string> = {
  common: "from-sky-400 to-cyan-500",
  rare: "from-violet-500 to-fuchsia-600",
  legendary: "from-amber-400 to-orange-600",
  mythic: "from-rose-500 to-indigo-700",
};

const CAPTAIN_LORE_INTRO =
  "Из густого утреннего тумана медленно появляется старинный корабль с чёрными парусами. Никто не знает, откуда он приходит и куда исчезает.";

const CAPTAIN_LORE = [
  "Его деревянный корпус покрыт следами бесчисленных путешествий, а золотые элементы на бортах поблёскивают в лучах солнца. Над кораблём кружат чайки, а волны мягко бьются о его борт.",
  "На палубе стоит загадочный капитан в длинном тёмно-синем плаще. Его лицо скрыто под широкополой шляпой, а взгляд кажется таким, будто он видел каждый остров и каждую тайну океана.",
  "Одни считают его торговцем, другие - охотником за сокровищами, а некоторые уверены, что он хранит секреты давно затерянных цивилизаций.",
  "Каждый его визит приносит новые возможности: редкие товары, древние карты, загадочные артефакты или рискованные сделки.",
];

const hasEnoughResources = (resources: Resources, cost?: Partial<Resources>) => {
  if (!cost) return true;
  return (Object.keys(cost) as (keyof Resources)[]).every((key) => resources[key] >= (cost[key] ?? 0));
};

export function CaptainModal({
  offer,
  result,
  resources,
  open,
  onAccept,
  onDecline,
  onClose,
}: CaptainModalProps) {
  const canAccept = offer ? hasEnoughResources(resources, offer.cost) : false;
  const title = result ? result.title : offer?.title ?? "Таинственный Капитан";
  const icon = result?.icon ?? offer?.icon ?? "⚓";

  return (
    <Modal open={open} onClose={onClose} title={title} icon={icon} maxWidth="max-w-xl">
      {result ? (
        <div className="space-y-5">
          <CaptainPortrait mood="happy" />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 text-center"
          >
            <div className="text-5xl">{result.icon}</div>
            <p className="mt-3 text-sm font-semibold text-emerald-900">{result.description}</p>
          </motion.div>
          <button
            type="button"
            onClick={onClose}
            className="btn-3d w-full rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 px-5 py-4 font-display text-lg font-black text-white shadow-pop"
          >
            Забрать
          </button>
        </div>
      ) : offer ? (
        <div className="space-y-5">
          <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-900 to-blue-950 p-4 text-white shadow-card">
            <div className="flex items-center gap-2 font-display text-lg font-black">
              <span>🏴</span>
              <span>Таинственный Капитан</span>
            </div>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-100">{CAPTAIN_LORE_INTRO}</p>
            <details className="mt-3 group">
              <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-amber-200 transition-colors hover:text-amber-100">
                История капитана
              </summary>
              <div className="mt-3 space-y-2 text-sm font-medium leading-relaxed text-slate-200">
                {CAPTAIN_LORE.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </details>
          </div>

          <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
            <CaptainPortrait mood={offer.risk ? "risk" : "calm"} />
            <div className="space-y-3">
              <div
                className={`inline-flex rounded-full bg-gradient-to-r ${rarityClass[offer.rarity]} px-3 py-1 text-xs font-black text-white shadow-card`}
              >
                {rarityLabel[offer.rarity]}
              </div>
              <p className="text-sm font-semibold leading-relaxed text-slate-700">{offer.description}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoPanel label="Капитан просит" value={describeCost(offer.cost)} tone="amber" />
            <InfoPanel label="Награда" value={offer.rewardPreview} tone="emerald" />
          </div>

          {offer.risk && (
            <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-3 text-sm font-bold text-orange-900">
              Сделка с риском: итог будет выбран случайно после принятия.
            </div>
          )}

          {!canAccept && (
            <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
              Не хватает ресурсов для этой сделки.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onDecline}
              className="btn-3d rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 font-display text-base font-black text-slate-600 shadow-card"
            >
              Отказаться
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={!canAccept}
              className="btn-3d rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 px-4 py-4 font-display text-base font-black text-white shadow-pop disabled:cursor-not-allowed disabled:opacity-50"
            >
              Принять
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function CaptainPortrait({ mood }: { mood: "calm" | "risk" | "happy" }) {
  return (
    <motion.div
      initial={{ opacity: 0, rotate: -4, scale: 0.92 }}
      animate={{ opacity: 1, rotate: 0, scale: 1 }}
      className="relative mx-auto h-36 w-36 overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-br from-sky-100 via-amber-100 to-orange-200 shadow-pop"
    >
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-blue-700 to-blue-500" />
      <div className="absolute left-1/2 top-16 h-16 w-20 -translate-x-1/2 rounded-t-3xl bg-amber-700" />
      <div className="absolute left-1/2 top-10 h-20 w-20 -translate-x-1/2 rounded-full bg-amber-200" />
      <div className="absolute left-1/2 top-24 h-6 w-16 -translate-x-1/2 rounded-b-full bg-orange-800" />
      <div className="absolute left-[45px] top-[70px] h-2 w-2 rounded-full bg-slate-900" />
      <div className="absolute right-[45px] top-[70px] h-2 w-2 rounded-full bg-slate-900" />
      <div className="absolute left-1/2 top-7 h-12 w-28 -translate-x-1/2 rounded-t-full bg-slate-900" />
      <div className="absolute left-1/2 top-5 h-5 w-20 -translate-x-1/2 rounded-full bg-red-700" />
      <div className="absolute left-1/2 top-[86px] h-1.5 w-7 -translate-x-1/2 rounded-full bg-slate-900" />
      <div className="absolute right-4 top-4 rounded-full bg-white/80 px-2 py-1 text-xl">
        {mood === "risk" ? "🎲" : mood === "happy" ? "💰" : "⚓"}
      </div>
    </motion.div>
  );
}

function InfoPanel({ label, value, tone }: { label: string; value: string; tone: "amber" | "emerald" }) {
  const classes =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-emerald-200 bg-emerald-50 text-emerald-900";
  return (
    <div className={`rounded-2xl border-2 p-4 ${classes}`}>
      <div className="text-xs font-black uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-sm font-black leading-snug">{value}</div>
    </div>
  );
}
