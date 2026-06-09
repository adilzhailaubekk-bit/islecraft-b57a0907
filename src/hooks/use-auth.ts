import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refreshSession = () => {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setLoading(false);
      });
    };

    // Register listener FIRST so we don't miss events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    refreshSession();
    window.addEventListener("supabase-auth-updated", refreshSession);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("supabase-auth-updated", refreshSession);
    };
  }, []);

  return { session, user, loading };
}
