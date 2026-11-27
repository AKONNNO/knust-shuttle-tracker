import { useEffect, useMemo, useState } from "react";
import type maplibregl from "maplibre-gl";
import { Compass, Crosshair, Bus as BusIcon, Route, LoaderCircle } from "lucide-react";
import { useLiveBuses } from "@/hooks/useLiveBuses";
import { useRoutes } from "@/hooks/useRoutes";
import { useStops } from "@/hooks/useStops";
import { useGeolocation } from "@/hooks/useGeolocation";
import { CampusMap } from "@/components/map/CampusMap";
import { addRouteLayers, addStopLayers, updateRoutes, updateStops } from "@/components/map/mapLayers";
import { addOrUpdateSource, routeFeatures } from "@/components/map/sources";
import { RouteFilter } from "@/components/tracker/RouteFilter";
import { BusCard, type BusEtaInfo } from "@/components/tracker/BusCard";
import { NearestStopCard } from "@/components/tracker/NearestStopCard";
import { routeColor } from "@/lib/routeColors";
import type { LiveBus, Stop } from "@/lib/types";
import { computeNextStop, etaSeconds, formatDuration, lineToPoints } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { CAMPUS_CENTER } from "@/lib/constants";

type LiveBusWithStops = LiveBus & { routesStopsSorted: Stop[] };

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
  const { position: me } = useGeolocation(false);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [selectedBus, setSelectedBus] = useState<string | null>(null);
  const [fitRequested, setFitRequested] = useState(0);

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
      stopList.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }))
    );
  }, [map, routes, stops, selectedRoute, colorFor, orderedStopsFor]);

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
    if (!map.getLayer("me-dot")) {
      map.addLayer({
        id: "me-dot",
        type: "circle",
        source: "me-dot",
        paint: {
          "circle-radius": 8,
          "circle-color": "#2F80ED",
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 2.5,
        },
      });
    }
  }, [map, me]);

  // Fly to the selected bus when the user picks it (or on fit-request).
  useEffect(() => {
    if (!map || !selectedBus) return;
    const loc = locations[selectedBus];
    if (loc) {
      map.flyTo({
        center: [loc.lng, loc.lat],
        zoom: Math.max(map.getZoom(), 16.4),
        speed: 1.2,
        curve: 1.6,
        essential: false,
      });
    }
  }, [map, selectedBus, locations, fitRequested]);

  function fitAll() {
    if (!map) return;
    const coords = busesWithStops
      .map((b) => locations[b.id])
      .filter(Boolean)
      .map((l) => [l!.lng, l!.lat] as [number, number]);
    if (coords.length) {
      const bounds = coords.reduce(
        (acc, c) => ({
          sw: [Math.min(acc.sw[0], c[0]), Math.min(acc.sw[1], c[1])] as [number, number],
          ne: [Math.max(acc.ne[0], c[0]), Math.max(acc.ne[1], c[1])] as [number, number],
        }),
        { sw: coords[0], ne: coords[0] }
      );
      map.fitBounds([bounds.sw, bounds.ne], { padding: 64, maxZoom: 16.4, duration: 1200 });
      return;
    }
    map.flyTo({ center: [CAMPUS_CENTER.lng, CAMPUS_CENTER.lat], zoom: 15.2, duration: 1200 });
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
    <div className="lg:grid lg:grid-cols-[1fr_384px] lg:gap-4 items-start">
      {/* Map */}
      <div className="relative h-[56dvh] lg:h-[calc(100dvh-7rem)] lg:sticky lg:top-20 rounded-[1.5rem] overflow-hidden border border-border/60 shadow-[0_10px_45px_-18px_rgba(20,60,40,0.4)] bg-card">
        <CampusMap onReady={setMap} className="h-full w-full" dragRotate />

        {/* Route filter */}
        <div className="absolute left-2.5 right-2.5 top-2.5 z-10 sm:right-auto sm:max-w-md">
          <RouteFilter routes={routes} selected={selectedRoute} colorFor={colorFor} onChange={setSelectedRoute} />
        </div>

        {/* Live status pill */}
        <div className="absolute bottom-2.5 left-2.5 z-10 glass rounded-full px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          {liveCount} bus{liveCount === 1 ? "" : "es"} live
        </div>

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
              onClick={() => map?.flyTo({ center: [CAMPUS_CENTER.lng, CAMPUS_CENTER.lat], zoom: 15.2 })}
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
  );
}
