import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Route, RouteStop, Stop } from "@/lib/types";

export interface RouteEntity extends Route {
  route_stops: Array<RouteStop & { stops: Stop }>;
}

/** Load all routes with their ordered stops, for admin + route filters. */
export function useRoutes() {
  const [routes, setRoutes] = useState<RouteEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const { data, error: err } = await supabase
      .from("routes")
      .select("*, route_stops(*, stops(*))")
      .order("name");
    if (err) {
      setError(err.message);
    } else {
      setRoutes((data ?? []) as RouteEntity[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  /** Ordered stops for a route (by position). */
  const orderedStopsFor = (routeId: string): Stop[] => {
    const r = routes.find((x) => x.id === routeId);
    if (!r) return [];
    return r.route_stops
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((rs) => rs.stops);
  };

  return { routes, orderedStopsFor, loading, error, reload: load };
}
