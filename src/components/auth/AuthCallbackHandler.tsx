import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

function redirectToLoginWithError(error: string) {
  const params = new URLSearchParams({ mode: "login", auth_error: error });
  window.history.replaceState({}, "", `/login?${params.toString()}`);
  window.dispatchEvent(new CustomEvent("supabase-auth-error", { detail: error }));
}

export function AuthCallbackHandler() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error_description") || url.searchParams.get("error");

    if (error) {
      console.error("[Supabase Auth] OAuth callback error:", error);
      redirectToLoginWithError(error);
      return;
    }

    if (!code) return;

    let cancelled = false;

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error: exchangeError }) => {
        if (cancelled) return;
        if (exchangeError) {
          console.error("[Supabase Auth] Could not finish Google login:", exchangeError.message);
          redirectToLoginWithError(exchangeError.message);
          return;
        }

        url.searchParams.delete("code");
        url.searchParams.delete("state");
        url.searchParams.delete("provider");
        const nextPath = url.pathname === "/login" ? "/" : url.pathname;
        window.history.replaceState({}, "", `${nextPath}${url.search}${url.hash}`);
        window.dispatchEvent(new Event("supabase-auth-updated"));
      })
      .catch((err) => {
        if (!cancelled) console.error("[Supabase Auth] OAuth callback failed:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
