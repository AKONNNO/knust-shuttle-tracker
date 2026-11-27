import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  LoaderCircle,
  Route as RouteIcon,
  MapPin,
  Repeat,
  Bus,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRoutes, type RouteEntity } from "@/hooks/useRoutes";
import { useStops } from "@/hooks/useStops";
import { RouteEditor } from "./RouteEditor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatDistance, haversineMeters, lineToPoints } from "@/lib/geo";

export function RoutesTab() {
  const { routes, loading, reload } = useRoutes();
  const { stops } = useStops();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<RouteEntity | null>(null);
  const [deleting, setDeleting] = useState<RouteEntity | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [assigned, setAssigned] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.from("buses").select("id, route_id").then(({ data }) => {
      const counts: Record<string, number> = {};
      for (const b of data ?? []) {
        if (b.route_id) counts[b.route_id] = (counts[b.route_id] ?? 0) + 1;
      }
      setAssigned(counts);
    });
  }, []);

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (r: RouteEntity) => {
    setEditing(r);
    setEditorOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const { error } = await supabase.from("routes").delete().eq("id", deleting.id);
    setDeleteBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Deleted ${deleting.name}.`);
      await reload();
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Routes</h1>
          <p className="text-sm text-muted-foreground">Draw shuttle routes and snap them to roads.</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          New route
        </Button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <LoaderCircle className="h-6 w-6 animate-spin" />
        </div>
      ) : routes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
          <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <RouteIcon className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold">No routes yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">Create your first shuttle route to get students moving.</p>
        </div>
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {routes.map((r) => {
            const ordered = [...r.route_stops].sort((a, b) => a.position - b.position);
            const length = lineToPoints(r.geometry).length;
            return (
              <div key={r.id} className="group rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <RouteIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-extrabold truncate">{r.name}</p>
                      {r.is_loop && (
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <Repeat className="h-3 w-3" />
                          Loop
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {ordered.length} stop{ordered.length === 1 ? "" : "s"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Bus className="h-3 w-3" /> {assigned[r.id] ?? 0} bus{assigned[r.id] ? "" : "es"}
                      </span>
                      {length > 1 && (
                        <span className="inline-flex items-center gap-1">
                          {formatDistance(lineToPoints(r.geometry).reduce((acc, p, i, arr) => acc + (i ? haversineMeters(arr[i - 1], p) : 0), 0))}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => openEdit(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                      onClick={() => setDeleting(r)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RouteEditor
        open={editorOpen}
        existing={editing}
        stops={stops}
        onClose={() => setEditorOpen(false)}
        onSaved={reload}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this route?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.name}” and its stop ordering will be removed. Buses assigned to it will keep running but with no route.
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
