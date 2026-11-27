import { useEffect, useMemo, useState } from "react";
import { LocateFixed, MapPin, Navigation, Footprints } from "lucide-react";
import type { Stop } from "@/lib/types";
import { useGeolocation } from "@/hooks/useGeolocation";
import { haversineMeters } from "@/lib/geo";
import { formatDistance } from "@/lib/geo";
import { Button } from "@/components/ui/button";

interface NearestStopCardProps {
  stops: Stop[];
  /** Map from stop id → route names that serve it. */
  routeNamesByStop: Record<string, string[]>;
}

export function NearestStopCard({ stops, routeNamesByStop }: NearestStopCardProps) {
  const { position, error, loading, restart } = useGeolocation(true);
  const [walkM, setWalkM] = useState<number | null>(null);

  const nearest = useMemo(() => {
    if (!position || !stops.length) return null;
    let best: Stop | null = null;
    let bestDist = Infinity;
    for (const s of stops) {
      const d = haversineMeters(position, s);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return best ? { stop: best, straightM: bestDist } : null;
  }, [position, stops]);

  useEffect(() => {
    let cancelled = false;
    if (!nearest) {
      setWalkM(null);
      return;
    }
    // Optional road-walking distance; fall back to straight-line distance silently.
    fetch("/api/walk-distance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: { lat: position!.lat, lng: position!.lng },
        to: { lat: nearest.stop.lat, lng: nearest.stop.lng },
      }),
    })
      .then((r) => r.json())
      .then((d: { distance_m: number | null }) => {
        if (!cancelled) setWalkM(d.distance_m ?? nearest.straightM);
      })
      .catch(() => {
        if (!cancelled) setWalkM(nearest.straightM);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearest]);

  const displayM = walkM ?? nearest?.straightM ?? null;
  const walkMinutes = displayM
    ? Math.max(1, Math.ceil((displayM / 80) * 1.2)) // ~1 min per 80 m slow-walk
    : null;

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <LocateFixed className="h-3.5 w-3.5" />
          Nearest stop
        </p>
        {!error && !nearest && loading && (
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        )}
      </div>

      {nearest ? (
        <div className="mt-3 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <MapPin className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-lg tracking-tight leading-tight">{nearest.stop.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {displayM ? `${formatDistance(displayM)} away` : "Location unknown"}
              {walkMinutes ? ` · ~${walkMinutes} min walk` : ""}
            </p>
            {routeNamesByStop[nearest.stop.id]?.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {routeNamesByStop[nearest.stop.id].map((rn) => (
                  <span
                    key={rn}
                    className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground/70"
                  >
                    {rn}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : error ? (
        <div className="mt-3 flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-zinc-100 text-zinc-500">
            <Navigation className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground/80">Location needed</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
          <Button size="sm" variant="outline" onClick={restart}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-3 text-muted-foreground">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-muted">
            <Footprints className="h-5 w-5" />
          </span>
          <p className="text-sm">Finding the closest pickup point…</p>
        </div>
      )}
    </div>
  );
}
