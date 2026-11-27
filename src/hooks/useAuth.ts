import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Profile, Role } from "@/lib/types";

export interface AuthState {
  session: Session | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (!data.session) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (!nextSession) setProfile(null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    supabase
      .from("profiles")
      .select("id, full_name, role, created_at, updated_at")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data) setProfile(data as Profile);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const { data: p } = await supabase
      .from("profiles")
      .select("id, full_name, role, created_at, updated_at")
      .eq("id", data.session.user.id)
      .maybeSingle();
    if (p) setProfile(p as Profile);
  };

  const role = useMemo(() => (profile ? profile.role : null), [profile]);

  return { session, profile, role, loading, refreshProfile };
}
