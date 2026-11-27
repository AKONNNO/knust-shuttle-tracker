import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Bus, MapPin, Navigation, ShieldCheck, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { authUrls } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { roleHome } from "@/lib/roles";

const FEATURES = [
  { icon: MapPin, title: "Live campus map", text: "Every shuttle, every stop, right where you are." },
  { icon: Clock, title: "Arrival ETAs", text: "Know exactly when the next shuttle pulls in." },
  { icon: Navigation, title: "Nearest stop", text: "Walk straight to the closest pickup point." },
];

export default function Login() {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<"sign_in" | "sign_up">("sign_in");

  // Once a session lands (e.g. magic-link auto sign-in), route by role.
  useEffect(() => {
    if (session && role) navigate(roleHome(role), { replace: true });
  }, [session, role, navigate]);

  if (!loading && session && role) {
    return <Navigate to={roleHome(role)} replace />;
  }

  const redirectTo = new URL("/auth/callback", window.location.origin).href;

  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-background">
      {/* Brand / hero panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#0E3B26] text-[#F6EFDD] p-10">
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 80%, #F5A623 0, transparent 34%), radial-gradient(circle at 80% 15%, #3B8E5F 0, transparent 42%)",
          }}
        />
        <div className="absolute inset-0 grid grid-cols-6 gap-2 p-8 opacity-[0.05]">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="h-3 w-3 rounded-full bg-[#F6EFDD]/70" />
          ))}
        </div>

        <div className="relative flex items-center gap-3">
          <span className="w-11 h-11 grid place-items-center rounded-2xl bg-[#F5A623] text-[#3A2606] shadow-lg">
            <Bus className="h-6 w-6" />
          </span>
          <div>
            <p className="font-extrabold text-xl tracking-tight">KNUST Shuttle</p>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#F5A623] font-semibold">
              Campus Transit Live
            </p>
          </div>
        </div>

        <div className="relative max-w-md space-y-10">
          <div className="space-y-4">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-[#F5A623]/40 bg-[#F5A623]/10 px-3 py-1 text-xs font-semibold text-[#F5A623]">
              <ShieldCheck className="h-3.5 w-3.5" />
              KNUST Community Access
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight leading-[1.1]">
              Your campus,
              <br />
              on the move.
            </h1>
            <p className="text-[#F6EFDD]/75 leading-relaxed text-[15px]">
              Track KNUST shuttle buses in real time, find the nearest stop and
              catch your ride without the wait.
            </p>
          </div>

          <ul className="space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10">
                  <f.icon className="h-4.5 w-4.5 h-5 w-5 text-[#F5A623]" />
                </span>
                <div>
                  <p className="font-bold text-[15px]">{f.title}</p>
                  <p className="text-sm text-[#F6EFDD]/65">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-[#F6EFDD]/50">
          Kwame Nkrumah University of Science &amp; Technology · Kumasi, Ghana
        </p>
      </div>

      {/* Auth panel */}
      <div className="flex flex-col items-center justify-center px-5 py-10 sm:px-10">
        {/* Mobile brand */}
        <div className="lg:hidden mb-8 flex items-center gap-3">
          <span className="w-11 h-11 grid place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Bus className="h-6 w-6" />
          </span>
          <div>
            <p className="font-extrabold text-lg tracking-tight">KNUST Shuttle</p>
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-primary">
              Campus Transit Live
            </p>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold tracking-tight">
              {view === "sign_in" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {view === "sign_in"
                ? "Sign in to find your shuttle."
                : "Join the KNUST shuttle tracker."}
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-[0_14px_40px_-18px_rgba(20,60,40,0.35)]">
            <Auth
              supabaseClient={supabase}
              redirectTo={redirectTo}
              providers={[]}
              onlyThirdPartyProviders={false}
              view={view}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: "#107C41",
                      brandAccent: "#0D6836",
                      brandButtonText: "white",
                      defaultButtonBackground: "white",
                      defaultButtonBackgroundHover: "#F3F7F2",
                      inputBackground: "#FBF9F3",
                      inputText: "#17251D",
                      inputBorder: "#E1D9C8",
                      inputBorderHover: "#107C41",
                      inputBorderFocus: "#107C41",
                    },
                    radii: { borderRadiusButton: "12px", buttonBorderRadius: "12px", inputBorderRadius: "12px" },
                    space: { buttonPadding: "12px 16px", inputPadding: "12px 14px" },
                  },
                },
                className: {
                  button: "font-semibold text-sm",
                  input: "text-sm",
                },
              }}
              localization={{
                variables: {
                  sign_in: { email_label: "KNUST email or phone", password_label: "Password" },
                  sign_in_password_label: "Password",
                },
              }}
            />
          </div>

          {view === "sign_in" && (
            <p className="mt-5 text-center text-sm text-muted-foreground">
              New to campus transit?{" "}
              <button
                onClick={() => setView("sign_up")}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Create an account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
