import { useEffect, useMemo, useState } from "react";
import type * as maplibregl from "maplibre-gl";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Hand,
  LoaderCircle,
  MapPin,
  Plus,
  Route as RouteIcon,
  Search,
  Trash2,
  Wand2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CampusMap } from "@/components/map/CampusMap";
import { addRouteLayers, addStopLayers, updateRoutes, updateStops } from "@/components/map/mapLayers";
import { addOrUpdateSource, routeFeatures } from "@/components/map/sources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatDistance } from "@/lib/geo";
import type { LineGeometry, Stop } from "@/lib/types";
import type { RouteEntity } from "@/hooks/useRoutes";
import type { FeatureCollection } from "geojson";

interface RouteEditorProps {
  open: boolean;
  existing: RouteEntity | null;
  stops: Stop[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

function pointFeatures(points: [number, number][]) {
  return {
    type: "FeatureCollection" as const,
    features: points.map(([lng, lat], i) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [lng, lat] },
      properties: { idx: i + 1 },
    })),
  };
}

export function RouteEditor({ open, existing, stops, onClose, onSaved }: RouteEditorProps) {
  const [name, setName] = useState("");
  const [isLoop, setIsLoop] = useState(false);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const [snapped, setSnapped] = useState(false);
  const [ordered, setOrdered] = useState<Stop[]>([]);
  const [availableQuery, setAvailableQuery] = useState("");
  const [snapping, setSnapping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  // Reset state when the editor opens.
  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? "");
    setIsLoop(existing?.is_loop ?? false);
    const initial: [number, number][] = existing?.geometry?.coordinates
      ? (existing.geometry.coordinates as [number, number][])
      : [];
    setPoints(initial);
    setDistanceM(existing?.distance_m ?? null);
    setSnapped(!!existing?.geometry);
    setOrdered(
      existing
        ? [...existing.route_stops].sort((a, b) => a.position - b.position).map((rs) => rs.stops)
        : []
    );
    setAvailableQuery("");
  }, [open, existing]);

  const geometry = useMemo<LineGeometry | null>(
    () =>
      points.length >= 2
        ? { type: "LineString", coordinates: points }
        : null,
    [points]
  );

  // Set up editor layers once the map is ready.
  useEffect(() => {
    if (!map) return;
    addRouteLayers(map);
    addStopLayers(map);
    if (!map.getLayer("edit-pts")) {
      addOrUpdateSource(map, "edit-pts", { type: "FeatureCollection", features: [] });
      map.addLayer({
        id: "edit-pts",
        type: "circle",
        source: "edit-pts",
        paint: {
          "circle-radius": 9,
          "circle-color": "#E8A33D",
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 3,
        },
      });
      map.addLayer({
        id: "edit-pts-label",
        type: "symbol",
        source: "edit-pts",
        layout: {
          "text-field": ["get", "idx"],
          "text-size": 11,
          "text-font": ["Noto Sans Bold", "Open Sans Bold"],
          "text-allow-overlap": true,
        },
        paint: { "text-color": "#FFFFFF", "text-halo-color": "#B9741F", "text-halo-width": 1.4 },
      });
    }
  }, [map]);

  // Redraw line + points + ordered stops whenever they change.
  useEffect(() => {
    if (!map) return;
    updateRoutes(map, routeFeatures([{ geometry, color: "#E8A33D" }]));
    addOrUpdateSource(map, "edit-pts", pointFeatures(points));
    updateStops(map, ordered.map((s) => ({ ...s, selected: true })));
  }, [map, geometry, points, ordered]);

  const pick = (ll: { lat: number; lng: number }) => {
    setPoints((p) => [...p, [ll.lng, ll.lat]]);
    setSnapped(false);
    setDistanceM(null);
  };

  const removeLast = () => {
    setPoints((p) => p.slice(0, -1));
    setSnapped(false);
    setDistanceM(null);
  };

  const clearPoints = () => {
    setPoints([]);
    setSnapped(false);
    setDistanceM(null);
  };

  const fitToLine = () => {
    if (!map || points.length < 2) return;
    const bounds = points.reduce(
      (acc, [lng, lat]) => ({
        sw: [Math.min(acc.sw[0], lng), Math.min(acc.sw[1], lat)],
        ne: [Math.max(acc.ne[0], lng), Math.max(acc.ne[1], lat)],
      }),
      { sw: points[0], ne: points[0] }
    );
    map.fitBounds([bounds.sw as [number, number], bounds.ne as [number, number]], {
      padding: 48,
      maxZoom: 16.5,
      duration: 800,
    });
  };

  const snap = async () => {
    if (points.length < 2) {
      toast.error("Click at least two points on the map first.");
      return;
    }
    setSnapping(true);
    try {
      const res = await fetch("/api/snap-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points, is_loop: isLoop }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.statusMessage || json?.message || "Road-snap failed");
      setPoints((json.geometry?.coordinates ?? points) as [number, number][]);
      setDistanceM(json.distance_m ?? null);
      setSnapped(!!json.snapped);
      toast.success(
        json.snapped
          ? `Snapped to roads${json.distance_m ? ` · ${formatDistance(json.distance_m)}` : ""}.`
          : "No clean road match — keeping your drawn line."
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Road-snap service unavailable.");
    } finally {
      setSnapping(false);
    }
  };

  const addStop = (s: Stop) => setOrdered((o) => [...o, s]);
  const moveStop = (i: number, dir: -1 | 1) =>
    setOrdered((o) => {
      const j = i + dir;
      if (j < 0 || j >= o.length) return o;
      const next = [...o];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const removeStop = (i: number) => setOrdered((o) => o.filter((_, k) => k !== i));

  const available = useMemo(() => {
    const used = new Set(ordered.map((s) => s.id));
    return stops.filter((s) => !used.has(s.id) && s.name.toLowerCase().includes(availableQuery.toLowerCase()));
  }, [stops, ordered, availableQuery]);

  const save = async () => {
    if (!name.trim()) return toast.error("Give the route a name.");
    if (points.length < 2) return toast.error("Draw a route on the map first.");
    if (ordered.length < 1) return toast.error("Add at least one stop in order.");
    setSaving(true);
    try {
      const { data } = await supabase.auth.getSession();
      const { data: row, error } = await supabase
        .from("routes")
        .upsert(
          {
            id: existing?.id ?? undefined,
            name: name.trim(),
            is_loop: isLoop,
            geometry,
            distance_m: distanceM,
            created_by: data.session?.user?.id ?? null,
          },
          { onConflict: "id" }
        )
        .select()
        .single();
      if (error) throw error;

      if (existing) {
        await supabase.from("route_stops").delete().eq("route_id", row.id);
      }
      const { error: rsErr } = await supabase.from("route_stops").insert(
        ordered.map((s, i) => ({ route_id: row.id, stop_id: s.id, position: i }))
      );
      if (rsErr) throw rsErr;

      toast.success(existing ? "Route updated." : "Route created.");
      await onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save the route.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit route" : "Create a route"}</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <Hand className="h-3.5 w-3.5" />
            Click the map to draw the path, snap it to roads, then order its stops.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name + loop toggle */}
          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="route-name">Route name</Label>
              <Input
                id="route-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. North Loop"
              />
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5">
              <Switch checked={isLoop} onCheckedChange={setIsLoop} />
              <span className="text-sm font-semibold">Loop route</span>
            </label>
          </div>

          {/* Map + point controls */}
          <div className="relative h-[300px] overflow-hidden rounded-xl border border-border">
            <CampusMap onReady={setMap} onClick={pick} className="h-full w-full" cursor="crosshair" />
            <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1.5">
              <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={snap} disabled={snapping || points.length < 2}>
                {snapping ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                Snap to roads
              </Button>
              <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={removeLast} disabled={!points.length}>
                <Trash2 className="h-3.5 w-3.5" />
                Undo point
              </Button>
              <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={clearPoints} disabled={!points.length}>
                Clear
              </Button>
              <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={fitToLine} disabled={points.length < 2}>
                Fit
              </Button>
            </div>
            <div className="absolute bottom-2 left-2 z-10 rounded-full bg-card/90 px-3 py-1 text-[11px] font-bold shadow">
              {points.length ? `${points.length} point${points.length === 1 ? "" : "s"}` : "Tap the map to draw"}
              {snapped && distanceM != null ? ` · ${formatDistance(distanceM)}` : ""}
              {snapped && " · snapped"}
            </div>
          </div>

          {/* Stop ordering */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border/60 p-3">
                <MapPin className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold">Available stops</p>
                <Search className="ml-auto h-4 w-4 text-muted-foreground" />
                <Input
                  value={availableQuery}
                  onChange={(e) => setAvailableQuery(e.target.value)}
                  placeholder="Find…"
                  className="h-8 w-28 text-xs"
                />
              </div>
              <div className="max-h-44 overflow-y-auto p-2 space-y-1">
                {available.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground">
                    {ordered.length ? "All stops ordered." : "No stops yet — add some first."}
                  </p>
                ) : (
                  available.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => addStop(s)}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <Plus className="h-3.5 w-3.5 text-primary" />
                      <span className="truncate font-medium">{s.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border/60 p-3">
                <RouteIcon className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold">Stop order</p>
                <span className="ml-auto text-[11px] text-muted-foreground">{ordered.length} stop{ordered.length === 1 ? "" : "s"}</span>
              </div>
              <div className="max-h-44 overflow-y-auto p-2 space-y-1">
                {ordered.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground">Add stops in the order buses visit them.</p>
                ) : (
                  ordered.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2 rounded-lg bg-primary/[0.05] px-2.5 py-1.5">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-extrabold text-primary-foreground">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</span>
                      <button onClick={() => moveStop(i, -1)} className="p-0.5 text-muted-foreground hover:text-foreground">
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => moveStop(i, 1)} className="p-0.5 text-muted-foreground hover:text-foreground">
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => removeStop(i)} className="p-0.5 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving…" : existing ? "Save changes" : "Create route"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
