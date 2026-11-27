import { useCallback, useEffect, useState } from "react";
import {
  Bus,
  Plus,
  Pencil,
  Trash2,
  LoaderCircle,
  Power,
  UserRound,
  Route,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BusEntity {
  id: string;
  name: string;
  route_id: string | null;
  driver_id: string | null;
  is_active: boolean;
  routes: { id: string; name: string } | null;
  drivers: { id: string; full_name: string | null } | null;
}

interface FormState {
  id: string | null;
  name: string;
  route_id: string;
  driver_id: string;
  is_active: boolean;
}

function BusFormDialog({
  open,
  initial,
  routes,
  drivers,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: BusEntity | null;
  routes: { id: string; name: string }[];
  drivers: { id: string; full_name: string | null }[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [routeId, setRouteId] = useState<string>("none");
  const [driverId, setDriverId] = useState<string>("none");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setRouteId(initial?.route_id ?? "none");
    setDriverId(initial?.driver_id ?? "none");
    setActive(initial?.is_active ?? true);
  }, [open, initial]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Give the shuttle a name.");
    setBusy(true);
    const payload = {
      name: name.trim(),
      route_id: routeId === "none" ? null : routeId,
      driver_id: driverId === "none" ? null : driverId,
      is_active: active,
    };
    const { error } = initial
      ? await supabase.from("buses").update(payload).eq("id", initial.id)
      : await supabase.from("buses").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(initial ? "Shuttle updated." : "Shuttle added.");
    await onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit shuttle" : "Add a shuttle"}</DialogTitle>
          <DialogDescription>Assign a route and an optional driver to the bus.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bus-name">Shuttle name</Label>
            <Input id="bus-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bus 12" />
          </div>

          <div className="space-y-1.5">
            <Label>Route</Label>
            <Select value={routeId} onValueChange={setRouteId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No route</SelectItem>
                {routes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Driver</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.full_name || "Driver"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-border bg-card px-3.5 py-3">
            <div>
              <p className="text-sm font-semibold">Active on tracker</p>
              <p className="text-xs text-muted-foreground">Only active shuttles show to students.</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : initial ? "Save" : "Add shuttle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BusesTab() {
  const [buses, setBuses] = useState<BusEntity[]>([]);
  const [routes, setRoutes] = useState<{ id: string; name: string }[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; full_name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<BusEntity | null>(null);
  const [deleting, setDeleting] = useState<BusEntity | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: b }, { data: r }, { data: d }] = await Promise.all([
      supabase
        .from("buses")
        .select("*, routes(id, name), drivers:profiles!buses_driver_id_fkey(id, full_name)")
        .order("name"),
      supabase.from("routes").select("id, name").order("name"),
      supabase.from("profiles").select("id, full_name").eq("role", "driver").order("full_name"),
    ]);
    setBuses((b ?? []) as BusEntity[]);
    setRoutes((r ?? []) as { id: string; name: string }[]);
    setDrivers((d ?? []) as { id: string; full_name: string | null }[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (bus: BusEntity) => {
    const { error } = await supabase
      .from("buses")
      .update({ is_active: !bus.is_active })
      .eq("id", bus.id);
    if (error) return toast.error(error.message);
    toast.success(`${bus.name} is now ${bus.is_active ? "hidden" : "live"}.`);
    await load();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const { error } = await supabase.from("buses").delete().eq("id", deleting.id);
    setDeleteBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Removed ${deleting.name}.`);
      await load();
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Shuttles</h1>
          <p className="text-sm text-muted-foreground">Buses, their routes and assigned drivers.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add shuttle
        </Button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <LoaderCircle className="h-6 w-6 animate-spin" />
        </div>
      ) : buses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
          <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Bus className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold">No shuttles yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">Add a bus and assign it a route.</p>
        </div>
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {buses.map((bus) => (
            <div key={bus.id} className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
              <span
                className={
                  "grid h-10 w-10 shrink-0 place-items-center rounded-xl " +
                  (bus.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")
                }
              >
                <Bus className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-extrabold">{bus.name}</p>
                  <button onClick={() => toggleActive(bus)} title={bus.is_active ? "Go offline" : "Go live"}>
                    <Power
                      className={
                        "h-3.5 w-3.5 " + (bus.is_active ? "text-emerald-600" : "text-muted-foreground/60")
                      }
                    />
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Route className="h-3 w-3" />
                    {bus.routes?.name ?? "No route"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <UserRound className="h-3 w-3" />
                    {bus.drivers?.full_name ?? "Unassigned"}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => {
                    setEditing(bus);
                    setEditorOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                  onClick={() => setDeleting(bus)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <BusFormDialog
        open={editorOpen}
        initial={editing}
        routes={routes}
        drivers={drivers}
        onClose={() => setEditorOpen(false)}
        onSaved={load}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this shuttle?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.name}” and its location + trip history will be permanently deleted. The driver stays active.
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
