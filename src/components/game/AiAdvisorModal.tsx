import { useState } from "react";
import { Bot, Send } from "lucide-react";
import { Modal } from "@/components/game/Modal";
import { getGeminiGameAdvice } from "@/lib/api/gemini.functions";
import type { GameState } from "@/game/types";

interface AiAdvisorModalProps {
  open: boolean;
  onClose: () => void;
  state: GameState;
}

export function AiAdvisorModal({ open, onClose, state }: AiAdvisorModalProps) {
  const [question, setQuestion] = useState("Что мне лучше улучшать дальше?");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ask = async () => {
    const text = question.trim();
    if (!text || loading) return;
    setLoading(true);
    setError("");
    try {
      const result = await getGeminiGameAdvice({
        data: {
          level: state.level,
          gold: state.resources.gold,
          wood: state.resources.wood,
          stone: state.resources.stone,
          plots: state.plots,
          buildings: state.buildings.filter(Boolean).length,
          islands: state.unlockedIslands.length,
          activeCaptain: !!state.captain.activeOffer,
          question: text,
        },
      });
      setAnswer(result.answer);
    } catch (err) {
      console.error(err);
      setError("ИИ сейчас недоступен. Проверь GEMINI_API_KEY на сервере и попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="ИИ-помощник" icon="✨" maxWidth="max-w-xl">
      <div className="space-y-4">
        <div className="flex gap-3 rounded-2xl border-2 border-sky-100 bg-sky-50 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 text-white shadow-card">
            <Bot className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg font-black text-slate-800">Gemini советник острова</div>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">
              Спросите про развитие, ресурсы, постройки или сделку капитана.
            </p>
          </div>
        </div>

        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={500}
          className="min-h-28 w-full resize-none rounded-2xl border-2 border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-sky-400"
        />

        <button
          type="button"
          onClick={ask}
          disabled={loading || !question.trim()}
          className="btn-3d flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 px-5 py-4 font-display text-lg font-black text-white shadow-pop disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
          {loading ? "Думаю..." : "Спросить Gemini"}
        </button>

        {error && (
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {answer && (
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold leading-relaxed text-emerald-950 whitespace-pre-wrap">
            {answer}
          </div>
        )}
      </div>
    </Modal>
  );
}
