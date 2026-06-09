import { AnimatePresence, motion } from "motion/react";
import type { CaptainOffer } from "@/game/types";

interface CaptainShipProps {
  offer: CaptainOffer | null;
  onClick: () => void;
}

export function CaptainShip({ offer, onClick }: CaptainShipProps) {
  return (
    <AnimatePresence>
      {offer && (
        <motion.button
          type="button"
          onClick={onClick}
          aria-label="Таинственный Капитан"
          className="absolute right-[5%] bottom-[7%] z-20 flex h-28 w-36 sm:right-[9%] sm:bottom-[9%] sm:h-36 sm:w-48 items-center justify-center focus:outline-none"
          initial={{ opacity: 0, x: 90, y: 16, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 80, y: 18, scale: 0.86 }}
          transition={{ type: "spring", damping: 20, stiffness: 130 }}
        >
          <motion.div
            className="relative h-full w-full"
            animate={{ y: [0, -5, 0], rotate: [-1, 1, -1] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div
              className="absolute left-1/2 top-0 z-10 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-amber-300 to-orange-500 text-2xl shadow-pop sm:h-14 sm:w-14 sm:text-3xl"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              {offer.icon}
            </motion.div>

            <svg viewBox="0 0 220 150" className="absolute inset-x-0 bottom-0 h-full w-full drop-shadow-xl">
              <motion.path
                d="M30 125 C56 116 74 133 101 123 C134 110 157 132 192 121"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="10"
                strokeLinecap="round"
                animate={{ pathLength: [0.72, 1, 0.72], opacity: [0.6, 0.95, 0.6] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />
              <path d="M45 93 L178 93 L158 126 L68 126 C56 119 49 108 45 93Z" fill="#7c2d12" />
              <path d="M62 98 L165 98 L153 116 L75 116 C70 112 65 105 62 98Z" fill="#b45309" />
              <path d="M104 29 L111 96" stroke="#713f12" strokeWidth="8" strokeLinecap="round" />
              <path d="M111 35 C139 46 154 64 160 88 L116 88 Z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="3" />
              <path d="M101 40 C77 51 66 67 61 89 L99 89 Z" fill="#fde68a" stroke="#fbbf24" strokeWidth="3" />
              <path d="M111 30 L144 42" stroke="#713f12" strokeWidth="5" strokeLinecap="round" />
              <path d="M79 101 H91 M108 101 H120 M137 101 H149" stroke="#fef3c7" strokeWidth="5" strokeLinecap="round" />
            </svg>

            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-slate-900/80 px-3 py-1 text-[11px] font-black text-white shadow-card sm:text-xs">
              Капитан
            </div>
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
