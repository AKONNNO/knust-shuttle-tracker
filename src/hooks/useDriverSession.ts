import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { Bus, Trip } from "@/lib/types";
import { DRIVER_LOCATION_INTERVAL_MS } from "@/lib/constants";
import { haversineMeters } from "@/lib/geo";

interface DriverSessionState {
  /** The bus assigned to this driver (first active match). */
  myBus: Bus | null;
  activeTrip: Trip | null;
  position: ReturnType<typeof useGeolocation>["position"];
  gpsError: string | null;
  cumulativeMeters: number;
  tripSeconds: number;
  wakeLockActive: boolean;
  loading: boolean;
  startTrip: () => Promise<void>;
  endTrip: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useDriverSession(): DriverSessionState {
  const { session } = useAuth();
  const user = session?.user ?? null;
  const [myBus, setMyBus] = useState<Bus | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [cumulativeMeters, setCumulativeMeters] = useState(0);
  const [tripSeconds, setTripSeconds] = useState(0);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  const { position, error: gpsError } = useGeolocation(true);

  // Refs that don't need to re-render.
  const myBusRef = useRef<Bus | null>(null);
  const tripRef = useRef<Trip | null>(null);
  const metersRef = useRef(0);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastPushRef = useRef(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const [{ data: buses }, { data: trips }] = await Promise.all([
      supabase
        .from("buses")
        .select("id, name, route_id, driver_id, is_active, created_at")
        .eq("driver_id", user.id)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("trips")
        .select("*")
        .eq("driver_id", user.id)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const bus = (buses ?? null) as Bus | null;
    const trip = (trips ?? null) as Trip | null;
    myBusRef.current = bus;
    tripRef.current = trip;
    setMyBus(bus);
    setActiveTrip(trip);
    setLoading(false);

    if (trip) {
      setCumulativeMeters(trip.distance_m ?? 0);
      metersRef.current = trip.distance_m ?? 0;
    } else {
      setCumulativeMeters(0);
      metersRef.current = 0;
      lastPosRef.current = null;
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Wake lock: hold the screen on while a trip is live.
  useEffect(() => {
    if (activeTrip) {
      let sentinel: WakeLockSentinel | null = null;
      const acquire = async () => {
        try {
          if ("wakeLock" in navigator) {
            sentinel = await (navigator as any).wakeLock.request("screen");
            wakeLockRef.current = sentinel;
            setWakeLockActive(true);
          }
        } catch {
          setWakeLockActive(false);
        }
      };
      acquire();
      const onVis = () => {
        if (document.visibilityState === "visible") acquire();
      };
      document.addEventListener("visibilitychange", onVis);
      return () => {
        document.removeEventListener("visibilitychange", onVis);
        sentinel?.release().catch(() => {});
        wakeLockRef.current = null;
        setWakeLockActive(false);
      };
    }
  }, [!!activeTrip]);

  // Trip duration ticker.
  useEffect(() => {
    if (!activeTrip) {
      setTripSeconds(0);
      return;
    }
    const started = new Date(activeTrip.started_at).getTime();
    const tick = () => setTripSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [activeTrip]);

  // Distances + throttled location reporting (~1 push / DRIVER_LOCATION_INTERVAL_MS).
  useEffect(() => {
    if (!position || !tripRef.current || !myBusRef.current) return;

    const now = Date.now();
    if (lastPosRef.current) {
      const d = haversineMeters(lastPosRef.current, position);
      // Ignore implausible jumps > 400 m (GPS noise / signal drop).
      if (d < 400) {
        metersRef.current += d;
        setCumulativeMeters(Math.round(metersRef.current));
      }
    }
    lastPosRef.current = { lat: position.lat, lng: position.lng };

    if (now - lastPushRef.current < DRIVER_LOCATION_INTERVAL_MS) return;
    lastPushRef.current = now;

    const heading =
      typeof position.heading === "number" && !isNaN(position.heading)
        ? position.heading
        : 0;
    supabase
      .from("bus_locations")
      .upsert(
        {
          bus_id: myBusRef.current.id,
          lat: position.lat,
          lng: position.lng,
          heading,
          speed: Math.round((position.speed ?? 0) * 3.6) / 3.6,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "bus_id" }
      )
      .then(({ error }) => {
        if (error) console.warn("[driver] location push failed", error.message);
      });
  }, [position]);

  const startTrip = async () => {
    if (!myBusRef.current) return;
    const { data, error } = await supabase
      .from("trips")
      .insert({
        bus_id: myBusRef.current.id,
        driver_id: user?.id ?? null,
        route_id: myBusRef.current.route_id,
        distance_m: 0,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    metersRef.current = 0;
    setCumulativeMeters(0);
    setActiveTrip((data ?? null) as Trip | null);
    tripRef.current = (data ?? null) as Trip | null;
    lastPushRef.current = 0;
  };

  const endTrip = async () => {
    if (!tripRef.current) return;
    const distance = Math.round(metersRef.current);
    const { error } = await supabase
      .from("trips")
      .update({ ended_at: new Date().toISOString(), distance_m: distance })
      .eq("id", tripRef.current.id);
    if (error) throw new Error(error.message);
    setActiveTrip(null);
    tripRef.current = null;
    lastPosRef.current = null;
  };

  return {
    myBus,
    activeTrip,
    position,
    gpsError,
    cumulativeMeters,
    tripSeconds,
    wakeLockActive,
    loading,
    startTrip,
    endTrip,
    refresh,
  };
}
