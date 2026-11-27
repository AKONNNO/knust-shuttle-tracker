import { useEffect, useRef, useState } from "react";

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

interface GeolocationState {
  position: GeoPosition | null;
  error: string | null;
  loading: boolean;
  /** Restart the watch (e.g. after an error). */
  restart: () => void;
}

/**
 * Wraps navigator.geolocation.watchPosition. `throttleMs` dedupes updates.
 * Options may be passed through (enableHighAccuracy etc.).
 */
export function useGeolocation(
  enabled = true,
  options: PositionOptions = { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
  throttleMs = 1000
): GeolocationState {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const lastUpdateRef = useRef(0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.geolocation) {
      setLoading(false);
      setError(enabled ? "Geolocation is not supported on this device." : null);
      return;
    }

    setLoading(true);
    setError(null);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastUpdateRef.current < throttleMs) return;
        lastUpdateRef.current = now;
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          heading: pos.coords.heading ?? null,
          speed: pos.coords.speed ?? null,
          timestamp: pos.timestamp,
        });
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Allow access to use nearby features."
            : "Unable to get your location right now."
        );
      },
      options
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled, nonce, throttleMs, options]);

  const restart = () => {
    lastUpdateRef.current = 0;
    setNonce((n) => n + 1);
  };

  return { position, error, loading, restart };
}
