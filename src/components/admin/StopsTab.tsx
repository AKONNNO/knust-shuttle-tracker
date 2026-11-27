import { useEffect, useState } from "react";
import type * as L from "leaflet";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Search,
  LoaderCircle,
  LocateFixed,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStops } from "@/hooks/useStops";
import { useGeolocation } from "@/hooks/useGeolocation";
import { CampusMap } from "@/components/map/CampusMap";
import { addOrUpdateSource } from "@/components/map/sources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Stop } from "@/lib/types";

function StopFormDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Stop | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [map, setMap] = useState<L.Map | null>(null);
  const { restart, position, error } = useGeolocation(open);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setLat(initial ? String(initial.lat) : "");
    setLng(initial ? String(initial.lng) : "");
  }, [open, initial]);

  // Marker dot on the picking map.
  useEffect(() => {
    if (!map) return;
    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    addOrUpdateSource(
      map,
      "stop-pick",
      Number.isFinite(numLat) && Number.isFinite(numLng)
        ? {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: { type: "Point", coordinates: [numLng, numLat] },
                properties: {},
              },
            ],
          }
        : { type: "FeatureCollection", features: [] }
    );
  }, [map, lat, lng]);

  // When geolocation resolves, pre-fill the coordinates.
  useEffect(() => {
    if (position) {
      setLat(position.lat.toFixed(6));
      setLng(position.lng.toFixed(6));
    }
  }, [position]);

  const pick = (ll: { lat: number; lng: number }) => {
    setLat(ll.lat.toFixed(6));
    setLng(ll.lng.toFixed(6));
    map?.flyTo([ll.lat, ll.lng], Math.max(map.getZoom(), 16.4), { duration: 0.5 });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    if (!name.trim()) return toast.error("Give the stop a name.");
    if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) {
      return toast.error("Pick a location on the map.");
    }
    setBusy(true);
    const payload = { name: name.trim(), lat: numLat, lng: numLng };
    const { error } = initial
      ? await supabase.from("stops").update(payload).eq("id", initial.id)
      : await supabase.from("stops").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(initial ? "Stop updated." : "Stop added.");
    await onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit stop" : "Add a stop"}</DialogTitle>
          <DialogDescription>
            Click the map to place the stop, or use your location, then name it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="stop-name">Stop name</Label>
            <Input
              id="stop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Great Hall"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Coordinates</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={restart}
                disabled={!!position}
                className="h-7 gap-1.5 text-xs"
              >
                <LocateFixed className="h-3.5 w-3.5" />
                {position ? "Located" : "Use my location"}
              </Button>
            </div>
            {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="stop-lat" className="text-xs">Latitude</Label>
                <Input id="stop-lat" value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" />
              </div>
              <div>
                <Label htmlFor="stop-lng" className="text-xs">Longitude</Label>
                <Input id="stop-lng" value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" />
              </div>
            </div>
          </div>

          <div className="relative h-44 overflow-hidden rounded-xl border border-border">
            <CampusMap onReady={setMap} onClick={pick} className="h-full w-full" cursor="crosshair" />
            <span className="absolute left-2 bottom-2 z-10 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white">
              Tap to set the pin
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : initial ? "Save" : "Add stop"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StopsTab() {
  const { stops, loading, reload } = useStops();
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Stop | null>(null);
  const [deleting, setDeleting] = useState<Stop | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const filtered = stops.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));

  const openAdd = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (s: Stop) => {
    setEditing(s);
    setEditorOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const { error } = await supabase.from("stops").delete().eq("id", deleting.id);
    setDeleteBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Removed ${deleting.name}.`);
      await reload();
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Stops</h1>
          <p className="text-sm text-muted-foreground">Pickup points around campus.</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add stop
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stops…"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <LoaderCircle className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
          <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <MapPin className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold">No stops found</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {query ? "Try a different search." : "Add your first pickup point."}
          </p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{s.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
                </p>
              </div>
              <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => openEdit(s)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                  onClick={() => setDeleting(s)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <StopFormDialog
        open={editorOpen}
        initial={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={reload}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this stop?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.name}” will be removed from every route. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={deleteBusy}
            >
              {deleteBusy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
