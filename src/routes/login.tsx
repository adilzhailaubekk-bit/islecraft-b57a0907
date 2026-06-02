import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  // If already logged in → redirect to game
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/", replace: true });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.user) navigate({ to: "/", replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Аккаунт создан!", {
          description: "Проверьте почту для подтверждения адреса.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Добро пожаловать обратно! 🏝️");
      }
    } catch (err) {
      toast.error("Ошибка входа", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
    } catch (err) {
      toast.error("Не удалось войти через Google", {
        description: err instanceof Error ? err.message : String(err),
      });
      setBusy(false);
    }
  };

  return (
    <>
      <Toaster />
      <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-sky-400 via-cyan-300 to-emerald-300 flex items-center justify-center p-4">
        {/* Decorative orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-yellow-300/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-pink-300/40 rounded-full blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-md"
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border-4 border-white p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-2">🏝️</div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Lost Isles Tycoon
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {mode === "login" ? "Войдите, чтобы сохранить прогресс в облаке" : "Создайте аккаунт и стройте свою империю"}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100 rounded-2xl p-1 mb-5">
              {(["login", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                    mode === m
                      ? "bg-white shadow text-emerald-600"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {m === "login" ? "Вход" : "Регистрация"}
                </button>
              ))}
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-2xl py-3 font-semibold text-slate-700 transition-all disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Продолжить с Google
            </button>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">или</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Email form */}
            <form onSubmit={handleEmail} className="space-y-3">
              {mode === "signup" && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Имя игрока</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="КапитанПирата"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Пароль</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3 rounded-2xl shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50"
              >
                {busy ? "..." : mode === "login" ? "Войти в игру" : "Создать аккаунт"}
              </button>
            </form>

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
  head: () => ({
    meta: [
      { title: "Вход — Lost Isles Tycoon" },
      { name: "description", content: "Войдите в Lost Isles Tycoon, чтобы сохранить прогресс в облаке." },
    ],
  }),
  component: LoginPage,
});
