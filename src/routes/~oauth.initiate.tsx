import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type OAuthSearch = {
  provider?: string;
  redir?: string;
  redirect_uri?: string;
};

function OAuthInitiatePage() {
  const search = Route.useSearch();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const provider = search.provider === "google" ? "google" : null;
    if (!provider) {
      setError("Поддерживается только вход через Google.");
      return;
    }

    const redirectTo = search.redir || search.redirect_uri || window.location.origin;

    supabase.auth
      .signInWithOAuth({
        provider,
        options: { redirectTo },
      })
      .then(({ error: oauthError }) => {
        if (oauthError) setError(oauthError.message);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [search.provider, search.redir, search.redirect_uri]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold">Вход через Google</h1>
        <p className="mt-3 text-sm text-slate-300">
          {error ?? "Перенаправляем в Supabase Auth..."}
        </p>
        {error && (
          <Link
            to="/login"
            className="mt-5 inline-flex rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Вернуться ко входу
          </Link>
        )}
      </div>
    </main>
  );
}

export const Route = createFileRoute("/~oauth/initiate")({
  validateSearch: (search: Record<string, unknown>): OAuthSearch => ({
    provider: typeof search.provider === "string" ? search.provider : undefined,
    redir: typeof search.redir === "string" ? search.redir : undefined,
    redirect_uri: typeof search.redirect_uri === "string" ? search.redirect_uri : undefined,
  }),
  component: OAuthInitiatePage,
});
