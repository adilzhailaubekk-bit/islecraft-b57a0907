import { useState } from "react";
import { motion } from "motion/react";
import { Modal } from "@/components/game/Modal";
import type { GameState } from "@/game/types";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: GameState["settings"];
  onUpdate: (patch: Partial<GameState["settings"]>) => void;
  onAddGold?: (amount: number) => void;
}

type TabId = "graphics" | "sound" | "language";

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: "graphics", label: "Графика", emoji: "🎨" },
  { id: "sound", label: "Звук", emoji: "🔊" },
  { id: "language", label: "Язык", emoji: "🌐" },
];

export function SettingsModal({ open, onClose, settings, onUpdate, onAddGold }: SettingsModalProps) {
  const [tab, setTab] = useState<TabId>("graphics");

  return (
    <Modal open={open} onClose={onClose} title="Настройки" icon="⚙" maxWidth="max-w-xl">
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${
              tab === t.id
                ? "bg-gradient-to-r from-sky-400 to-indigo-500 text-white border-white shadow-pop"
                : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
            }`}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-3">
        {tab === "graphics" && (
          <GraphicsTab settings={settings} onUpdate={onUpdate} />
        )}
        {tab === "sound" && (
          <div className="text-center py-10 text-muted-foreground">
            🔊 Настройки звука скоро появятся
          </div>
        )}
        {tab === "language" && (
          <div className="text-center py-10 text-muted-foreground">
            🌐 Выбор языка скоро появится
          </div>
        )}
      </div>
    </Modal>
  );
}

function GraphicsTab({
  settings,
  onUpdate,
}: {
  settings: GameState["settings"];
  onUpdate: (patch: Partial<GameState["settings"]>) => void;
}) {
  const g = settings.graphics;

  const toggle = (key: keyof typeof g) => {
    onUpdate({ graphics: { ...g, [key]: !g[key] } });
  };

  const setQuality = (quality: typeof g.quality) => {
    onUpdate({ graphics: { ...g, quality } });
  };

  const items: { label: string; key: keyof typeof g; desc: string }[] = [
    { label: "Частицы", key: "particles", desc: "Эффекты дыма, искр, свечения" },
    { label: "Анимации", key: "animations", desc: "Движение зданий, облака, волны" },
  ];

  return (
    <div className="space-y-4">
      {/* Quality */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 p-4">
        <div className="font-bold text-slate-800 mb-2">Качество графики</div>
        <div className="flex gap-2">
          {(["low", "medium", "high"] as const).map((q) => (
            <button
              key={q}
              onClick={() => setQuality(q)}
              className={`flex-1 py-2 rounded-xl font-bold text-sm border-2 transition-all ${
                g.quality === q
                  ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-white border-white shadow-pop"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-300"
              }`}
            >
              {q === "low" && "🥔 Низкое"}
              {q === "medium" && "⚖️ Среднее"}
              {q === "high" && "✨ Высокое"}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      {items.map((item) => (
        <ToggleRow
          key={item.key}
          label={item.label}
          desc={item.desc}
          checked={g[item.key] as boolean}
          onChange={() => toggle(item.key)}
        />
      ))}
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 flex items-center justify-between">
      <div>
        <div className="font-bold text-slate-800">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <button
        onClick={onChange}
        className={`relative w-12 h-7 rounded-full transition-colors border-2 ${
          checked ? "bg-emerald-400 border-emerald-500" : "bg-slate-200 border-slate-300"
        }`}
      >
        <motion.div
          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow"
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}
