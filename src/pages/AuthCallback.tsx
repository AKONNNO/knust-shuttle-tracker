import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { roleHome } from "@/lib/roles";
import type { Role } from "@/lib/types";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      // PKCE/OTP flow: supabase-js turns the `code`/hash in the URL into a session.
      const { data, error: sessionErr } = await supabase.auth.getSession();

      if (cancelled) return;

      if (sessionErr) {
        setError(sessionErr.message);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const isRecovery =
        params.get("type") === "recovery" ||
        params.get("type") === "invite";

      const session = data.session;
      if (!session) {
        setError("No session found. Please try signing in again.");
        return;
      }

      if (isRecovery) {
        navigate("/reset-password", { replace: true });
        return;
      }

      // Resolve the user's role from their profile.
      const { data: p } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (cancelled) return;
      const role = (p?.role ?? "student") as Role;
      navigate(roleHome(role), { replace: true });
    };

    finish();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-dvh grid place-items-center bg-background px-6">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <p className="text-sm font-semibold text-destructive">{error}</p>
            <button
              onClick={() => navigate("/login")}
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 border border-primary/20">
              <LoaderCircle className="h-7 w-7 animate-spin text-primary" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Completing sign in…
            </p>
          </>
        )}
      </div>
    </div>
  );
}
