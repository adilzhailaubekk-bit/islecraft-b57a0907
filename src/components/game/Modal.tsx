import type { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, icon, children, maxWidth = "max-w-2xl" }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div
            className={`relative w-full ${maxWidth} bg-card rounded-3xl shadow-pop border-4 border-white/60 overflow-hidden max-h-[85vh] flex flex-col`}
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-primary text-primary-foreground px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {icon && <span className="text-3xl">{icon}</span>}
                <h2 className="text-2xl font-display font-bold text-shadow-soft">{title}</h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center text-xl font-bold"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
