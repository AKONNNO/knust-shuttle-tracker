import { useMemo } from "react";
import { Bus as BusIcon, Clock, Hourglass, MapPin } from "lucide-react";
import type { LiveBusWithStops, Stop } from "@/lib/types";
import {
  etaSeconds,
  formatDuration,
  lineToPoints,
  routeTravelDistance,
} from "@/lib/geo";
import { routeColor } from "@/lib/routeColors";

interface ArrivalRow {
  bus: LiveBusWithStops;
  remainingM: number;
  etaSec: number;
  passed: boolean;
}

interface StopArrivalsProps {
  stop: Stop | null;
  buses: LiveBusWithStops[];
  colorFor: Record<string, string>;
  offline: Record<string, boolean>;
}

/**
 * Live arrival ETAs for a stop: every running shuttle on a route serving the
 * stop, with the estimated wait until it reaches the stop.
 */
export function StopArrivals({ stop, buses, colorFor, offline }: StopArrivalsProps) {
  const arrivals = useMemo<ArrivalRow[]>(() => {
    if (!stop) return [];
    const rows: ArrivalRow[] = [];
    for (const b of buses) {
      if (!b.bus_locations || !b.routes?.geometry) continue;
      // Only shuttles whose route actually stops here.
      if (!b.routesStopsSorted.some((s) => s.id === stop.id)) continue;
      const line = lineToPoints(b.routes.geometry);
      if (line.length < 2) continue;
      const travel = routeTravelDistance(
        { lat: b.bus_locations.lat, lng: b.bus_locations.lng },
        stop,
        line,
        b.routes.is_loop
      );
      if (!travel) continue;
      rows.push({
        bus: b,
        remainingM: travel.remainingM,
        etaSec: etaSeconds(travel.remainingM, b.bus_locations.speed),
        passed: travel.passed,
      });
    }
    // Nearest arrivals first; a shuttle that already left the stop sinks.
    return rows.sort((a, b) => (a.passed ? 1 : 0) - (b.passed ? 1 : 0) || a.etaSec - b.etaSec);
  }, [stop, buses]);

  if (!stop) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-5 text-center">
        <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
          <Hourglass className="h-5 w-5" />
        </span>
        <p className="text-sm font-semibold">See arrivals for a stop</p>
        <p className="mx-auto mt-0.5 max-w-[220px] text-xs text-muted-foreground">
          Tap any stop on the map to see how soon each shuttle reaches it.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Arrivals
        </p>
        <p className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
          <MapPin className="h-3 w-3" />
          {stop.name}
        </p>
      </div>

      {arrivals.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No shuttles are approaching this stop right now.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {arrivals.map(({ bus, remainingM, etaSec, passed }) => {
            const color = colorFor[bus.routes?.id ?? ""] ?? routeColor(0);
            const isOff = offline[bus.id] ?? false;
            return (
              <li
                key={bus.id}
                className={
                  "flex items-center gap-3 rounded-xl border px-3 py-2 " +
                  (passed ? "border-border/60 opacity-55" : "border-border/70 bg-background/40")
                }
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white shadow-sm"
                  style={{ background: color }}
                >
                  <BusIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-tight truncate">{bus.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {bus.routes?.name ?? "No route"}
                    {Math.round(remainingM) > 0 ? ` · ${Math.round(remainingM)} m` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {isOff ? (
                    <span className="text-[11px] font-bold text-muted-foreground">Offline</span>
                  ) : passed ? (
                    <span className="text-[11px] font-bold text-muted-foreground">Left stop</span>
                  ) : (
                    <span className="rounded-full bg-secondary/20 px-2.5 py-1 text-xs font-extrabold text-foreground">
                      {formatDuration(etaSec)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
