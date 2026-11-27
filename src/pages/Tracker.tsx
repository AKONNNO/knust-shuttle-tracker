import { useEffect, useMemo, useRef, useState } from "react";
import * as L from "leaflet";
import { Compass, Crosshair, Bus as BusIcon, Route, LoaderCircle } from "lucide-react";
import { useLiveBuses } from "@/hooks/useLiveBuses";
import { useRoutes } from "@/hooks/useRoutes";
import { useStops } from "@/hooks/useStops";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useCommentCounts } from "@/hooks/useCommentCounts";
import { CampusMap } from "@/components/map/CampusMap";
import { BusLayer } from "@/components/map/BusLayer";
import { addRouteLayers, addStopLayers, updateRoutes, updateStops } from "@/components/map/mapLayers";
import { addOrUpdateSource, routeFeatures } from "@/components/map/sources";
import { RouteFilter } from "@/components/tracker/RouteFilter";
import { BusCard, type BusEtaInfo } from "@/components/tracker/BusCard";
import { NearestStopCard } from "@/components/tracker/NearestStopCard";
import { StopArrivals } from "@/components/tracker/StopArrivals";
import { RideCommentsCard } from "@/components/tracker/RideCommentsCard";
import { routeColor } from "@/lib/routeColors";
import type { LiveBusWithStops, Stop } from "@/lib/types";
import {
  computeNextStop,
  etaSeconds,
  formatDuration,
  haversineMeters,
  lineToPoints,
  routeNetworkBounds,
} from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { CAMPUS_CENTER } from "@/lib/constants";

interface UpcomingStop {
  name: string;
  distanceM: number;
  etaSec: number;
  isNext: boolean;
}

function computeUpcoming(bus: LiveBusWithStops): UpcomingStop[] | null {
  if (!bus.bus_locations || !bus.routes?.geometry) return null;
  const line = lineToPoints(bus.routes.geometry);
  const stops = bus.routesStopsSorted;
  if (!stops.length || line.length < 2) return null;
  const res = computeNextStop(
    { lat: bus.bus_locations.lat, lng: bus.bus_locations.lng },
    line,
    stops,
    bus.routes.is_loop
  );
  if (!res) return null;
  const speed = bus.bus_locations.speed;
  const count = res.stops.length - res.nextIndex;
  let acc = res.remainingToNext;
  const list: UpcomingStop[] = [];
  for (let k = 0; k < count; k++) {
    const idx = res.nextIndex + k;
    const entry = res.stops[idx];
    list.push({
      name: entry.stop.name,
      distanceM: Math.round(acc),
      etaSec: etaSeconds(acc, speed),
      isNext: k === 0,
    });
    if (k < count - 1) {
      const next = res.stops[idx + 1];
      acc += Math.max(0, next.along - entry.along);
    }
  }
  return list;
}

export default function Tracker() {
  const { buses, locations, offline, loading } = useLiveBuses();
  const { routes, orderedStopsFor } = useRoutes();
  const { stops } = useStops();
  const { position: me } = useGeolocation(true);
  const [map, setMap] = useState<L.Map | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [selectedBus, setSelectedBus] = useState<string | null>(null);
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [fitRequested, setFitRequested] = useState(0);
  const boundsAppliedRef = useRef(false);

  const colorFor = useMemo(() => {
    const m: Record<string, string> = {};
    routes.forEach((r, i) => (m[r.id] = routeColor(i)));
    return m;
  }, [routes]);

  const routesByStop = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const r of routes) {
      for (const rs of r.route_stops) {
        (m[rs.stop_id] ??= []).push(r.name);
      }
    }
    return m;
  }, [routes]);

  // Attach sorted stops per route onto the live-bus objects for ETA math.
  const busesWithStops: LiveBusWithStops[] = useMemo(
    () =>
      buses.map((b) => ({
        ...b,
        routesStopsSorted: b.routes ? orderedStopsFor(b.routes.id) : [],
      })),
    [buses, orderedStopsFor]
  );

  // Nearest stop from the user's location (falls back to a map-tapped stop).
  const nearestStop = useMemo<Stop | null>(() => {
    if (!me) return null;
    let best: Stop | null = null;
    let bestD = Infinity;
    for (const s of stops) {
      const d = haversineMeters({ lat: me.lat, lng: me.lng }, s);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }, [me, stops]);

  const arrivalsStop: Stop | null = useMemo(() => {
    if (selectedStop) return stops.find((s) => s.id === selectedStop) ?? null;
    return nearestStop;
  }, [selectedStop, stops, nearestStop]);

  // Map layers for routes + stops (respect current route filter).
  useEffect(() => {
    if (!map) return;
    addRouteLayers(map);
    addStopLayers(map);

    const filtered =
      selectedRoute === null
        ? routes
        : routes.filter((r) => r.id === selectedRoute);
    updateRoutes(
      map,
      routeFeatures(filtered.map((r) => ({ geometry: r.geometry, color: colorFor[r.id] })))
    );

    const stopList = selectedRoute === null ? stops : orderedStopsFor(selectedRoute);
    updateStops(
      map,
      stopList.map((s) => ({ ...s, selected: s.id === selectedStop })),
      {
        onStopClick: (s) => {
          setSelectedStop((cur) => (cur === s.id ? null : s.id));
          map.flyTo([s.lat, s.lng], Math.max(map.getZoom(), 16), { duration: 0.8 });
        },
      }
    );
  }, [map, routes, stops, selectedRoute, selectedStop, colorFor, orderedStopsFor]);

  // Keep the view pinned to the designated route network (never anywhere else).
  useEffect(() => {
    if (!map || routes.length === 0) return;
    const box = routeNetworkBounds(routes.map((r) => r.geometry), stops);
    if (!box) return;
    const bounds = L.latLngBounds(box.sw, box.ne).pad(0.14);
    map.setMaxBounds(bounds);
    if (!boundsAppliedRef.current) {
      boundsAppliedRef.current = true;
      map.fitBounds(bounds.pad(0.1), { animate: false, maxZoom: 15.4 });
    }
  }, [map, routes, stops]);

  // Own-location blue dot.
  useEffect(() => {
    if (!map) return;
    addOrUpdateSource(
      map,
      "me-dot",
      me
        ? {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: { type: "Point", coordinates: [me.lng, me.lat] },
                properties: {},
              },
            ],
          }
        : { type: "FeatureCollection", features: [] }
    );
  }, [map, me]);

  // Fly to the selected bus when the user picks it (or on fit-request).
  useEffect(() => {
    if (!map || !selectedBus) return;
    const loc = locations[selectedBus];
    if (loc) {
      map.flyTo([loc.lat, loc.lng], Math.max(map.getZoom(), 16.4), { duration: 1.2 });
    }
  }, [map, selectedBus, locations, fitRequested]);

  function fitAll() {
    if (!map) return;
    const points = busesWithStops
      .map((b) => locations[b.id])
      .filter(Boolean)
      .map((l) => [l!.lat, l!.lng] as [number, number]);
    if (points.length) {
      // Leaflet's fitBounds accepts arbitrary point lists at runtime; the
      // narrow tuple type needs a cast for TS.
      map.fitBounds(points as unknown as L.LatLngBoundsLiteral, { padding: [64, 64], maxZoom: 16.4 });
      return;
    }
    map.flyTo([CAMPUS_CENTER.lat, CAMPUS_CENTER.lng], 15.2);
  }

  const filteredBuses = useMemo(
    () =>
      selectedRoute === null
        ? busesWithStops
        : busesWithStops.filter((b) => b.route_id === selectedRoute),
    [busesWithStops, selectedRoute]
  );

  const selectedBusObj = busesWithStops.find((b) => b.id === selectedBus) ?? null;
  const selectedUpcoming = selectedBusObj ? computeUpcoming(selectedBusObj) : null;

  // Live remark counts per shuttle, shown as chips on the bus cards.
  const notedBusIds = useMemo(() => filteredBuses.map((b) => b.id), [filteredBuses]);
  const commentCounts = useCommentCounts(notedBusIds);

  // Refresh "live" selection if the bus disappears.
  useEffect(() => {
    if (selectedBus && !buses.some((b) => b.id === selectedBus)) {
      setSelectedBus(null);
    }
  }, [buses, selectedBus]);

  const etaFor = (bus: LiveBusWithStops): BusEtaInfo => {
    if (!bus.bus_locations || !bus.routes?.geometry) {
      return { nextStopName: null, etaLabel: null, remainingM: null };
    }
    const line = lineToPoints(bus.routes.geometry);
    if (!bus.routesStopsSorted.length || line.length < 2) {
      return { nextStopName: null, etaLabel: null, remainingM: null };
    }
    const res = computeNextStop(
      { lat: bus.bus_locations.lat, lng: bus.bus_locations.lng },
      line,
      bus.routesStopsSorted,
      bus.routes.is_loop
    );
    if (!res) return { nextStopName: null, etaLabel: null, remainingM: null };
    const next = res.stops[res.nextIndex];
    return {
      nextStopName: next.stop.name,
      etaLabel: formatDuration(etaSeconds(res.remainingToNext, bus.bus_locations.speed)),
      remainingM: Math.round(res.remainingToNext),
    };
  };

  const liveCount = busesWithStops.filter((b) => !offline[b.id]).length;

  return (
    <div className="space-y-4">
      {/* Page header: title + route selector (always visible above the map) */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Live Tracker</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Follow every KNUST shuttle on campus and check real-time arrivals at your stop.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            {liveCount} bus{liveCount === 1 ? "" : "es"} live
          </div>
        </div>
        <div className="mt-3">
          <RouteFilter routes={routes} selected={selectedRoute} colorFor={colorFor} onChange={setSelectedRoute} />
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_384px] lg:gap-4 items-start">
        {/* Map */}
        <div className="relative h-[56dvh] lg:h-[calc(100dvh-15rem)] lg:sticky lg:top-20 rounded-[1.5rem] overflow-hidden border border-border/60 shadow-[0_10px_45px_-18px_rgba(20,60,40,0.4)] bg-card">
          <CampusMap onReady={setMap} className="h-full w-full" dragRotate />

          {/* Live bus markers (interpolated + heading-aware) */}
          {map && <BusLayer map={map} locations={locations} offline={offline} />}

          {/* Controls */}
        <div className="absolute bottom-2.5 right-2.5 z-10 flex flex-col gap-1.5">
          <div className="glass rounded-2xl p-1.5 flex flex-col gap-1.5">
            <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl" title="Fit all buses"
              onClick={fitAll}>
              <Crosshair className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-xl"
              title="Reset view"
              onClick={() => map?.flyTo([CAMPUS_CENTER.lat, CAMPUS_CENTER.lng], 15.2)}
            >
              <Compass className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Selected bus tracking tag */}
        {selectedBusObj && selectedBusObj.bus_locations && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-10 glass rounded-full pl-2 pr-3 py-1.5 flex items-center gap-2 text-xs font-bold">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: colorFor[selectedBusObj.routes?.id ?? ""] ?? "#0f7c41" }}
            />
            Tracking {selectedBusObj.name}
            {selectedUpcoming?.[0] && (
              <span className="text-muted-foreground font-semibold">
                → {selectedUpcoming[0].name} · {formatDuration(selectedUpcoming[0].etaSec)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="mt-4 lg:mt-0 space-y-4 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pr-1 scrollbar-none">
        <NearestStopCard stops={stops} routeNamesByStop={routesByStop} />

        <StopArrivals stop={arrivalsStop} buses={busesWithStops} colorFor={colorFor} offline={offline} />

        {selectedBusObj && selectedBusObj.bus_locations && (
          <div className="rounded-2xl border border-primary/25 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <Route className="h-3.5 w-3.5" />
                {selectedBusObj.name} · next stops
              </p>
              <button
                onClick={() => setSelectedBus(null)}
                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
            <div className="mt-3 space-y-1">
              {selectedUpcoming?.map((s, i) => (
                <div
                  key={s.name + i}
                  className={
                    "flex items-center gap-3 rounded-xl px-3 py-2 " +
                    (s.isNext ? "bg-primary/[0.07] ring-1 ring-primary/20" : "")
                  }
                >
                  <span
                    className={
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-extrabold " +
                      (s.isNext ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")
                    }
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold leading-tight">{s.name}</span>
                  <span className="ml-auto text-xs font-bold text-muted-foreground">
                    {formatDuration(s.etaSec)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedBusObj && (
          <RideCommentsCard bus={selectedBusObj} onClose={() => setSelectedBus(null)} />
        )}

        {/* Buses */}
        <div>
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <BusIcon className="h-3.5 w-3.5" />
            Shuttles on campus
          </p>
          {loading ? (
            <div className="grid place-items-center py-10 text-muted-foreground">
              <LoaderCircle className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredBuses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center">
              <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                <BusIcon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold">No shuttles running</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedRoute ? "Try another route or All routes." : "Check back soon — service may have ended."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredBuses.map((b) => (
                <BusCard
                  key={b.id}
                  bus={b}
                  routeColor={colorFor[b.routes?.id ?? ""] ?? routeColor(0)}
                  offline={offline[b.id] ?? false}
                  eta={etaFor(b)}
                  selected={selectedBus === b.id}
                  commentCount={commentCounts[b.id] ?? 0}
                  onSelect={() => {
                    setSelectedBus((cur) => (cur === b.id ? null : b.id));
                    setFitRequested((n) => n + 1);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
