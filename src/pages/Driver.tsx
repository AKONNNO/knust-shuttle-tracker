import { useCallback, useEffect, useState } from "react";
import type * as maplibregl from "maplibre-gl";
import {
  Bus as BusIcon,
  CirclePower,
  Gauge,
  MapPin,
  Moon,
  Navigation,
  Play,
  Route,
  Square,
  Timer,
  Wifi,
  WifiOff,
  CalendarDays,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDriverSession } from "@/hooks/useDriverSession";
import { CampusMap } from "@/components/map/CampusMap";
import { addRouteLayers, updateRoutes } from "@/components/map/mapLayers";
import { addOrUpdateSource, routeFeatures } from "@/components/map/sources";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistance, formatDuration } from "@/lib/geo";
import { routeColor } from "@/lib/routeColors";
import type { Trip } from "@/lib/types";

interface HistoryTrip extends Trip {
  buses: { name: string } | null;
}

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3.5 flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</p>
        <p className={"text-sm font-extrabold truncate " + (tone ?? "text-foreground")}>{value}</p>
      </div>
    </div>
  );
}

export default function Driver() {
  const {
    myBus,
    activeTrip,
    position,
    gpsError,
    cumulativeMeters,
    tripSeconds,
    wakeLockActive,
    loading,
    startTrip,
    endTrip,
    refresh,
  } = useDriverSession();

  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [history, setHistory] = useState<HistoryTrip[]>([]);
  const [busy, setBusy] = useState<"start" | "end" | null>(null);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from("trips")
      .select("*, buses(name)")
      .order("started_at", { ascending: false })
      .limit(8);
    setHistory((data ?? []) as HistoryTrip[]);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Map: draw the assigned bus's route line.
  useEffect(() => {
    if (!map || !myBus) return;
    addRouteLayers(map);
    supabase
      .from("buses")
      .select("id, routes(id, geometry)")
      .eq("id", myBus.id)
      .maybeSingle()
      .then(({ data }) => {
        const geom = data?.routes?.[0]?.geometry ?? null;
        if (geom) {
          updateRoutes(map, routeFeatures([{ geometry: geom as never, color: routeColor(0) }]));
        }
      });
  }, [map, myBus]);

  // Own marker (blue dot once GPS arrives).
  useEffect(() => {
    if (!map || !position) return;
    addOrUpdateSource(map, "me-dot", {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [position.lng, position.lat] },
          properties: {},
        },
      ],
    });
    if (!map.getLayer("me-dot")) {
      map.addLayer({
        id: "me-dot",
        type: "circle",
        source: "me-dot",
        paint: {
          "circle-radius": 9,
          "circle-color": "#2F80ED",
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 2.5,
        },
      });
    }
  }, [map, position]);

  const avgSpeed = tripSeconds > 0 ? (cumulativeMeters / tripSeconds) * 3.6 : 0;

  const handleStart = async () => {
    setBusy("start");
    try {
      await startTrip();
      toast.success("Trip started — your shuttle is now live.");
      await loadHistory();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start the trip.");
    } finally {
      setBusy(null);
    }
  };

  const handleEnd = async () => {
    setBusy("end");
    try {
      await endTrip();
      toast.success("Trip ended. Great shift!");
      await Promise.all([refresh(), loadHistory()]);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not end the trip.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <BusIcon className="h-7 w-7 animate-pulse" />
          <p className="text-sm">Finding your shuttle…</p>
        </div>
      </div>
    );
  }

  if (!myBus) {
    return (
      <div className="max-w-md mx-auto mt-10 rounded-3xl border border-border/70 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-muted text-muted-foreground">
          <BusIcon className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight">No shuttle assigned yet</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Ask a campus administrator to assign a bus to your driver account. Once assigned,
          this console will let you start trips and broadcast your live location.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <UserRound className="h-4 w-4" />
          Your driver account is ready.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Driver Console</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {myBus.name} · current shift
          </p>
        </div>
        <Badge
          className={
            activeTrip
              ? "bg-primary text-primary-foreground gap-1.5"
              : "bg-muted text-muted-foreground gap-1.5"
          }
        >
          <span className={"h-1.5 w-1.5 rounded-full " + (activeTrip ? "bg-white" : "bg-zinc-400")} />
          {activeTrip ? "On duty" : "Idle"}
        </Badge>
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Stat
          icon={position ? Wifi : WifiOff}
          label="GPS fix"
          value={gpsError ? "Unavailable" : position ? `${Math.round(position.accuracy ?? 0)} m` : "…"}
          tone={gpsError ? "text-destructive" : position ? "text-emerald-600" : "text-muted-foreground"}
        />
        <Stat
          icon={CirclePower}
          label="Trip"
          value={activeTrip ? "Live" : "Standby"}
          tone={activeTrip ? "text-primary" : "text-muted-foreground"}
        />
        <Stat
          icon={Moon}
          label="Screen lock"
          value={wakeLockActive ? "Prevented" : "Standard"}
          tone={wakeLockActive ? "text-amber-600" : "text-muted-foreground"}
        />
        <Stat
          icon={Gauge}
          label="Avg speed"
          value={activeTrip ? `${avgSpeed.toFixed(0)} km/h` : "—"}
        />
      </div>

      {/* Map + controls */}
      <div className="lg:grid lg:grid-cols-[1.6fr_1fr] lg:gap-4 items-stretch">
        <div className="relative h-[42dvh] lg:h-auto lg:min-h-[380px] rounded-[1.5rem] overflow-hidden border border-border/60 bg-card shadow-sm">
          <CampusMap onReady={setMap} className="h-full w-full" dragRotate />
          <div className="absolute top-2.5 left-2.5 z-10 glass rounded-full px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5">
            <Navigation className="h-3 w-3 text-primary" />
            {position ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` : "Waiting for GPS…"}
          </div>
        </div>

        {/* Trip control card */}
        <div className="mt-4 lg:mt-0 rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-sm flex flex-col">
          {activeTrip ? (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-primary/[0.07] py-3">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Time</p>
                  <p className="text-lg font-extrabold tabular-nums">{formatDuration(tripSeconds)}</p>
                </div>
                <div className="rounded-2xl bg-primary/[0.07] py-3">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Distance</p>
                  <p className="text-lg font-extrabold tabular-nums">{formatDistance(cumulativeMeters)}</p>
                </div>
                <div className="rounded-2xl bg-primary/[0.07] py-3">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Avg</p>
                  <p className="text-lg font-extrabold tabular-nums">{avgSpeed.toFixed(0)}<span className="text-xs"> km/h</span></p>
                </div>
              </div>

              <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Broadcasting your location to the tracker (≈ every 4 s).
              </p>

              <Button
                onClick={handleEnd}
                disabled={busy === "end"}
                className="mt-4 w-full h-12 rounded-2xl bg-destructive hover:bg-destructive/90 text-base gap-2"
              >
                <Square className="h-4 w-4 fill-current" />
                {busy === "end" ? "Ending…" : "End trip"}
              </Button>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
              <div className="mb-3 grid h-16 w-16 place-items-center rounded-3xl bg-primary/10 text-primary">
                <BusIcon className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-extrabold tracking-tight">Ready to roll?</h3>
              <p className="mt-1 max-w-[240px] text-sm text-muted-foreground">
                Start a trip to broadcast your live location to students on campus.
              </p>
              <Button
                onClick={handleStart}
                disabled={busy === "start" || !!gpsError}
                className="mt-5 w-full h-12 rounded-2xl text-base gap-2 shadow-lg shadow-primary/20"
              >
                <Play className="h-4 w-4 fill-current" />
                {busy === "start" ? "Starting…" : "Start trip"}
              </Button>
              {gpsError && (
                <p className="mt-2 text-[11px] font-semibold text-destructive">{gpsError}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Trip history */}
      <div className="rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-sm">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          Recent trips
        </p>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No completed trips yet — your first journey will appear here.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border/60">
            {history.map((t) => {
              const dur = t.ended_at
                ? Math.max(0, (new Date(t.ended_at).getTime() - new Date(t.started_at).getTime()) / 1000)
                : null;
              return (
                <li key={t.id} className="py-3 flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <Route className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{t.buses?.name ?? "Shuttle"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.started_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold tabular-nums">{formatDistance(t.distance_m)}</p>
                    <p className="text-xs text-muted-foreground">
                      {dur != null ? formatDuration(dur) : "in progress"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
