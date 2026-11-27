import { useEffect, useState } from "react";
import {
  Bus,
  LayoutList,
  MapPin,
  Radio,
  Route,
  UserRound,
  CalendarClock,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRoutes } from "@/hooks/useRoutes";
import { useStops } from "@/hooks/useStops";
import { useLiveBuses } from "@/hooks/useLiveBuses";
import { useAuth } from "@/hooks/useAuth";
import { StatCard } from "./StatCard";
import { Button } from "@/components/ui/button";

interface OverviewTabProps {
  onGo: (tab: string) => void;
}

export function OverviewTab({ onGo }: OverviewTabProps) {
  const { routes } = useRoutes();
  const { stops } = useStops();
  const { buses, offline, loading: liveLoading } = useLiveBuses();
  const { profile } = useAuth();

  const [busCount, setBusCount] = useState<number>(0);
  const [driverCount, setDriverCount] = useState<number>(0);
  const [tripsToday, setTripsToday] = useState<number>(0);

  useEffect(() => {
    supabase.from("buses").select("id", { count: "exact" }).then(({ count }) => setBusCount(count ?? 0));
    supabase
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("role", "driver")
      .then(({ count }) => setDriverCount(count ?? 0));

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    supabase
      .from("trips")
      .select("id", { count: "exact" })
      .gte("started_at", start.toISOString())
      .then(({ count }) => setTripsToday(count ?? 0));
  }, []);

  const liveCount = buses.filter((b) => !offline[b.id]).length;

  const quickActions = [
    { tab: "stops", label: "Manage stops", hint: "Add, move or rename pickup points", icon: MapPin },
    { tab: "routes", label: "Edit routes", hint: "Draw routes and snap them to roads", icon: Route },
    { tab: "buses", label: "Assign shuttles", hint: "Link buses to routes and drivers", icon: Bus },
    { tab: "drivers", label: "Manage people", hint: "Create drivers and set roles", icon: UserRound },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/70 bg-primary/[0.06] p-6 sm:p-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          <Radio className="h-3.5 w-3.5" />
          Operations overview
        </p>
        <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.
        </h2>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Keep the campus moving — manage shuttles, routes and stops from one
          dashboard. Students see your live updates instantly.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
        <StatCard icon={Bus} label="Shuttles" value={busCount} hint={`${buses.length} active`} />
        <StatCard
          icon={Radio}
          label="Live now"
          value={liveLoading ? "…" : liveCount}
          hint={`${busCount - buses.length} offline`}
          accent="text-emerald-700 bg-emerald-100"
        />
        <StatCard icon={Route} label="Routes" value={routes.length} hint="including loops" accent="text-amber-700 bg-amber-100" />
        <StatCard icon={MapPin} label="Stops" value={stops.length} hint="campus pickup points" accent="text-blue-700 bg-blue-100" />
        <StatCard icon={UserRound} label="Drivers" value={driverCount} hint="active accounts" accent="text-violet-700 bg-violet-100" />
        <StatCard icon={CalendarClock} label="Trips today" value={tripsToday} hint="since midnight" accent="text-rose-700 bg-rose-100" />
      </div>

      <div>
        <p className="mb-2.5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <LayoutList className="h-3.5 w-3.5" />
          Quick actions
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {quickActions.map((a) => (
            <button
              key={a.tab}
              onClick={() => onGo(a.tab)}
              className="group rounded-2xl border border-border/70 bg-card p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <a.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 flex items-center gap-1 font-bold">
                {a.label}
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{a.hint}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-card/60 p-5">
        <p className="text-sm font-bold">Keep in mind</p>
        <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          <li>• Drivers broadcast their location automatically while a trip is live.</li>
          <li>• Buses without a recent GPS update drop to “offline” on the tracker after 45 s.</li>
          <li>• Remove a bus and its trip history is deleted too.</li>
        </ul>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => onGo("routes")}>
          <Route className="h-4 w-4" />
          Start with routes
        </Button>
      </div>
    </div>
  );
}
