import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Bus, Home, MapPin, ArrowRight, Route, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { roleHome } from "@/lib/roles";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, role } = useAuth();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  // Guests land on the marketing home; signed-in users go to their dashboard.
  const back = () => navigate(session && role ? roleHome(role) : "/");

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 h-16 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 text-left"
            aria-label="KNUST Shuttle home"
          >
            <span className="w-9 h-9 grid place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Bus className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block font-extrabold tracking-tight text-[15px]">
                KNUST Shuttle
              </span>
              <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Campus Transit Live
              </span>
            </span>
          </button>
          <div className="ml-auto">
            <Button variant="ghost" onClick={back} className="rounded-xl">
              <Home className="h-4 w-4" />
              Back home
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-12 sm:px-6">
        <div className="grid w-full items-center gap-10 lg:grid-cols-2">
          {/* Illustration — a lost shuttle at the end of the line */}
          <div className="animate-in fade-in-0 slide-in-from-bottom-6 duration-700 ease-out">
            <div className="relative rounded-[2rem] border border-border/60 bg-card p-4 sm:p-6 shadow-[0_24px_60px_-24px_rgba(20,60,40,0.4)]">
              <div className="rounded-2xl border border-border/60 bg-[#E8E4D8] p-3">
                <div className="relative h-64 sm:h-72 overflow-hidden rounded-2xl bg-gradient-to-b from-[#CBDCC8] to-[#E9E4D9]">
                  {/* Main dashed route */}
                  <div className="absolute left-[-10%] right-[-10%] top-[56%] h-3.5 -rotate-2 rounded-full bg-[#FCFAF4]/95 shadow-sm">
                    <div
                      className="absolute inset-x-8 inset-y-[3px]"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(to right, hsl(150,26%,24%) 0 12px, transparent 12px 20px)",
                      }}
                    />
                  </div>

                  {/* Dead-end off-ramp */}
                  <div className="absolute right-[22%] top-[53%] h-3 w-40 origin-bottom-left rotate-[26deg] rounded-full bg-[#FCFAF4]/90 shadow-sm">
                    <div
                      className="absolute inset-x-3 inset-y-[3px]"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(to right, hsl(150,26%,24%) 0 10px, transparent 10px 18px)",
                      }}
                    />
                  </div>

                  {/* Closed-route pin */}
                  <div className="absolute right-[14%] top-[74%] z-10 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full bg-[#D64545] text-white shadow-lg">
                    <X className="h-4 w-4" strokeWidth={3} />
                  </div>

                  {/* Lost shuttle */}
                  <div className="absolute left-[34%] top-[45%] z-10 -translate-y-1/2">
                    <div className="relative flex">
                      <span className="absolute -inset-3 animate-ping rounded-full bg-primary/20" />
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg rotate-45">
                        <Bus className="h-6 w-6 -rotate-45" />
                      </span>
                    </div>
                  </div>

                  {/* Confused bubble */}
                  <div className="absolute left-[34%] top-[17%] z-10 -translate-x-1/2">
                    <div className="relative grid h-9 w-9 place-items-center rounded-full bg-[#F5A623] text-[#3A2606] shadow-lg">
                      <span className="text-base font-extrabold">?</span>
                      <span className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 rounded-[2px] bg-[#F5A623]" />
                    </div>
                  </div>

                  {/* 404 signpost */}
                  <div className="absolute right-[8%] top-[9%] flex flex-col items-center">
                    <span className="rounded-lg bg-[#F5A623] px-2 py-0.5 text-xs font-extrabold text-[#3A2606] shadow">
                      404
                    </span>
                    <span className="h-5 w-1 rounded bg-[#8A7356]" />
                    <span className="h-2.5 w-7 rounded-b bg-[#8A7356]" />
                  </div>

                  {/* Stop dot */}
                  <div className="absolute left-[9%] top-[52%] h-2.5 w-2.5 rounded-full border-2 border-white bg-[#0E3B26] shadow" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold">Shuttle lost · End of the line</p>
                  <p className="text-xs text-muted-foreground">This route doesn't run anymore</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  No route here
                </span>
              </div>
            </div>
          </div>

          {/* Copy */}
          <div className="space-y-5 animate-in fade-in-0 slide-in-from-bottom-6 duration-700 ease-out delay-150 fill-mode-both">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary">
              <Route className="h-3.5 w-3.5" />
              Error 404 · Route not found
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight leading-[1.05] sm:text-5xl">
              Looks like you took
              <br />
              a <span className="text-primary">wrong turn.</span>
            </h1>
            <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
              That stop isn't on our campus map. The link may be outdated, or
              the route was rerouted — no worries, we'll get you back on track.
            </p>

            {location.pathname !== "/" && (
              <p className="inline-flex max-w-full items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate font-mono font-semibold">
                  {location.pathname}
                </span>
                <span className="hidden shrink-0 sm:inline">— not on this campus map</span>
              </p>
            )}

            <div className="flex flex-wrap gap-2.5 pt-1">
              <Button size="lg" className="h-12 rounded-2xl px-6 text-base" onClick={back}>
                Take me back on route
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-2xl px-6 text-base"
                onClick={() => navigate("/")}
              >
                <Home className="h-4 w-4" />
                Go to homepage
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>KNUST Shuttle · Campus Transit Live</p>
          <p>Kwame Nkrumah University of Science &amp; Technology · Kumasi, Ghana</p>
        </div>
      </footer>
    </div>
  );
}
