import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bus, KeyRound, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Recovery links land here with a session already established (type=recovery).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/login", { replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    toast.success("Password updated. Sign in with your new password.");
  };

  return (
    <div className="min-h-dvh grid place-items-center bg-background px-5">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-3 justify-center">
          <span className="w-11 h-11 grid place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Bus className="h-6 w-6" />
          </span>
          <div>
            <p className="font-extrabold text-lg tracking-tight">KNUST Shuttle</p>
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-primary">
              Reset password
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-[0_14px_40px_-18px_rgba(20,60,40,0.35)]">
          {done ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <h2 className="font-extrabold text-xl tracking-tight">All set!</h2>
              <p className="text-sm text-muted-foreground">
                Your password has been updated. Sign in to continue.
              </p>
              <Button className="w-full mt-3" onClick={() => navigate("/login")}>
                Go to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="text-center">
                <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700">
                  <KeyRound className="h-6 w-6" />
                </span>
                <h1 className="font-extrabold text-xl tracking-tight">Choose a new password</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Make it at least 6 characters and something you'll remember.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pw">New password</Label>
                <Input
                  id="pw"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cpw">Confirm new password</Label>
                <Input
                  id="cpw"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
