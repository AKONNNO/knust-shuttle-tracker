import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BusLocation, LiveBus } from "@/lib/types";
import { OFFLINE_THRESHOLD_MS } from "@/lib/constants";

interface LiveBusesState {
  buses: LiveBus[];
  /** Latest location per bus id, by bus id. */
  locations: Record<string, BusLocation>;
  offline: Record<string, boolean>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const BUS_SELECT =
  "*, routes(id, name, is_loop, geometry, distance_m), bus_locations(*), drivers:profiles!buses_driver_id_fkey(id, full_name)";

export function useLiveBuses(): LiveBusesState {
  const [buses, setBuses] = useState<LiveBus[]>([]);
  const [locations, setLocations] = useState<Record<string, BusLocation>>({});
  const [offline, setOffline] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const locationsRef = useRef<Record<string, BusLocation>>({});

  const computeOffline = useCallback(() => {
    const now = Date.now();
    const next: Record<string, boolean> = {};
    for (const [id, loc] of Object.entries(locationsRef.current)) {
      next[id] = now - new Date(loc.updated_at).getTime() > OFFLINE_THRESHOLD_MS;
    }
    setOffline(next);
  }, []);

  const fetchBuses = useCallback(async () => {
    const {
      data,
      error: err,
    } = await supabase
      .from("buses")
      .select(BUS_SELECT)
      .eq("is_active", true)
      .order("name");

    if (err) {
      setError(err.message);
    } else {
      setBuses((data ?? []) as LiveBus[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBuses();

    // Realtime: bus_locations upserts one row per bus.
    const chan = supabase
      .channel("bus-locations-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bus_locations" },
        (payload) => {
          const row = payload.new as BusLocation;
          if (!row?.bus_id) return;
          locationsRef.current[row.bus_id] = row;
          setLocations({ ...locationsRef.current });
        }
      )
      .subscribe();

    const offlineTimer = window.setInterval(computeOffline, 10_000);
    // Fresh buses list every 20s (new active buses appear, inactive hide).
    const refreshTimer = window.setInterval(fetchBuses, 20_000);

    return () => {
      supabase.removeChannel(chan);
      window.clearInterval(offlineTimer);
      window.clearInterval(refreshTimer);
    };
  }, [fetchBuses, computeOffline]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchBuses();
  }, [fetchBuses]);

  return { buses, locations, offline, loading, error, refresh };
}
