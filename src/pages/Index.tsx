import { Navigate, useNavigate } from "react-router-dom";
import {
  Bus,
  MapPin,
  Clock,
  Navigation,
  Radio,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { roleHome } from "@/lib/roles";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Radio,
    title: "Live shuttle map",
    text: "Every KNUST shuttle, moving in real time across campus on a beautiful 3D map.",
  },
  {
    icon: Clock,
    title: "Arrival ETAs",
    text: "See how many minutes until the next shuttle reaches your stop — no more guessing.",
  },
  {
    icon: Navigation,
    title: "Nearest stop",
    text: "Walking distance to the closest pickup point, so you always know where to head.",
  },
  {
    icon: ShieldCheck,
    title: "Built for campus",
    text: "Students track, drivers broadcast, and admins keep the fleet moving — all in one place.",
  },
];

export default function Index() {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();

  if (!loading && session && role) {
    return <Navigate to={roleHome(role)} replace />;
  }

  const go = () => navigate(role ? roleHome(role) : "/login");

  return (
    <div className="min-h-dvh bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 h-16 flex items-center gap-3">
          <span className="w-9 h-9 grid place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Bus className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-extrabold tracking-tight text-[15px]">KNUST Shuttle</span>
            <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Campus Transit Live
            </span>
          </span>
          <div className="ml-auto flex items-center gap-2">
            {session ? (
              <Button onClick={go} className="rounded-xl">
                Open app
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")} className="rounded-xl">
                  Sign in
                </Button>
                <Button onClick={() => navigate("/login")} className="rounded-xl">
                  Get started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-10 sm:pt-16 pb-12">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary">
              <MapPin className="h-3.5 w-3.5" />
              Kwame Nkrumah University of Science &amp; Technology
            </p>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05]">
              Your campus,
              <br />
              <span className="text-primary">on the move.</span>
            </h1>
            <p className="mt-4 max-w-md text-[15px] text-muted-foreground leading-relaxed">
              Track KNUST shuttle buses in real time, find the nearest stop and
              catch your ride without the wait — right from your phone.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Button size="lg" className="h-12 rounded-2xl px-6 text-base" onClick={go}>
                Track a shuttle
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-2xl px-6 text-base"
                onClick={() => navigate("/login")}
              >
                Driver sign in
              </Button>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Live updates while shuttles are running on campus.
            </p>
          </div>

          {/* Stylized preview card */}
          <div className="relative rounded-[2rem] border border-border/60 bg-card p-4 sm:p-6 shadow-[0_24px_60px_-24px_rgba(20,60,40,0.4)]">
            <div className="rounded-2xl border border-border/60 bg-[#E8E4D8] p-3">
              <div className="relative h-56 overflow-hidden rounded-xl bg-gradient-to-b from-[#CBDCC8] to-[#E9E4D9]">
                {/* Fake roads */}
                <div className="absolute left-0 right-0 top-1/2 h-2 -rotate-6 rounded-full bg-[#FCFAF4] shadow-sm" />
                <div className="absolute left-0 right-0 top-1/3 h-2 rotate-3 rounded-full bg-[#FCFAF4] shadow-sm" />
                <div className="absolute bottom-0 left-1/4 top-0 w-2 -rotate-12 rounded-full bg-[#FCFAF4] shadow-sm" />
                {/* Fake buildings */}
                <div className="absolute left-[12%] top-[18%] h-14 w-10 rounded-lg bg-[#E8C9BE]/80" />
                <div className="absolute left-[40%] top-[10%] h-20 w-14 rounded-lg bg-[#E5BFB4]/70" />
                <div className="absolute left-[68%] top-[26%] h-12 w-16 rounded-lg bg-[#E5BFB4]/80" />
                <div className="absolute left-[22%] bottom-[14%] h-16 w-20 rounded-lg bg-[#E2C4B9]/60" />
                <div className="absolute right-[10%] bottom-[10%] h-12 w-12 rounded-lg bg-[#E8C9BE]/70" />
                {/* Fake park */}
                <div className="absolute bottom-0 left-0 h-1/3 w-1/3 rounded-tr-[3rem] bg-[#BFD5B4]" />
                {/* Bus marker */}
                <div className="absolute left-[46%] top-[44%] -translate-y-1/2">
                  <div className="relative flex">
                    <span className="absolute -left-3 -top-3 h-10 w-10 animate-ping rounded-full bg-primary/20" />
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg rotate-45">
                      <Bus className="h-5 w-5 -rotate-45" />
                    </span>
                  </div>
                </div>
                {/* Stop chip */}
                <div className="absolute left-[68%] top-[58%] rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-emerald-800 shadow">
                  Great Hall · 2 min
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold">Shuttle 12 · North Loop</p>
                <p className="text-xs text-muted-foreground">Broadcasting live location</p>
              </div>
              <span className="gap-1.5 inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                Live on map
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-4 sm:px-6 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 font-bold">{f.title}</p>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 sm:px-6 pb-20">
        <div className="rounded-[2rem] bg-[#0E3B26] p-8 sm:p-12 text-[#F6EFDD] text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 15% 85%, #F5A623 0, transparent 30%), radial-gradient(circle at 85% 15%, #3B8E5F 0, transparent 34%)",
            }}
          />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Less waiting. More Kwadwo-worthy mornings.
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-[#F6EFDD]/75">
              Join the campus shuttle tracker and know exactly when your ride arrives.
            </p>
            <Button size="lg" className="mt-6 h-12 rounded-2xl px-6 bg-[#F5A623] text-[#3A2606] hover:bg-[#F5A623]/90 text-base" onClick={() => navigate("/login")}>
              Get started free
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>KNUST Shuttle · Campus Transit Live</p>
          <p>Kwame Nkrumah University of Science &amp; Technology · Kumasi, Ghana</p>
        </div>
      </footer>
    </div>
  );
}
