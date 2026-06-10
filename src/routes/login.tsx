import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

type LoginSearch = {
  mode?: "login" | "register";
  auth_error?: string;
};

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const mode = search.mode === "register" ? "register" : "login";
  const isRegister = mode === "register";

  useEffect(() => {
    if (search.auth_error) {
      const isInvalidKey = /invalid api key|UNAUTHORIZED_INVALID_API_KEY/i.test(search.auth_error);
      toast.error("Не удалось завершить вход через Google", {
        description: isInvalidKey
          ? "Supabase отклонил API key. Обновите VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY в переменных окружения."
          : search.auth_error,
      });
    }
  }, [search.auth_error]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/", replace: true });
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) navigate({ to: "/", replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(isRegister ? "Не удалось зарегистрироваться через Google" : "Не удалось войти через Google", {
        description: err instanceof Error ? err.message : String(err),
      });
      setBusy(false);
    }
  };

  return (
    <>
      <Toaster />
      <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-sky-400 via-cyan-300 to-emerald-300 flex items-center justify-center p-4">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-yellow-300/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-pink-300/40 rounded-full blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-md"
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border-4 border-white p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-2">🏝️</div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Islecraft
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {isRegister
                  ? "Зарегистрируйтесь через Google, чтобы сохранять прогресс в облаке"
                  : "Войдите через Google, чтобы сохранять прогресс в облаке"}
              </p>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              <Link
                to="/login"
                search={{ mode: "login" }}
                className={`rounded-xl py-2 text-center text-sm font-semibold transition ${
                  !isRegister ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Войти
              </Link>
              <Link
                to="/login"
                search={{ mode: "register" }}
                className={`rounded-xl py-2 text-center text-sm font-semibold transition ${
                  isRegister ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Регистрация
              </Link>
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-2xl py-3 font-semibold text-slate-700 transition-all disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {busy ? "..." : isRegister ? "Зарегистрироваться через Google" : "Войти через Google"}
            </button>

            <div className="mt-5 text-center">
              <Link to="/" className="text-xs text-slate-500 hover:text-slate-700">
                ← Играть без аккаунта
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    mode: search.mode === "register" ? "register" : "login",
    auth_error: typeof search.auth_error === "string" ? search.auth_error : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Вход — Islecraft" },
      {
        name: "description",
        content: "Войдите или зарегистрируйтесь в Islecraft через Google, чтобы сохранять прогресс в облаке.",
      },
    ],
  }),
  component: LoginPage,
});
