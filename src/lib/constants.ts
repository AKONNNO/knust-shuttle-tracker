// Campus + app-wide configuration.

export interface LngLat {
  lat: number;
  lng: number;
}

/** KNUST campus, Kumasi, Ghana. */
export const CAMPUS_CENTER: LngLat = { lat: 6.6745, lng: -1.5716 };

/** Sensible campus panning box: [[minLng, minLat], [maxLng, maxLat]]. */
export const CAMPUS_BOUNDS: [[number, number], [number, number]] = [
  [-1.605, 6.648],
  [-1.535, 6.705],
];

export const DEFAULT_ZOOM = 15.3;
export const DEFAULT_MIN_ZOOM = 14;
export const DEFAULT_MAX_ZOOM = 18.5;
export const DEFAULT_PITCH = 56;
export const DEFAULT_BEARING = -12;

/** A bus with no update within this window is considered offline. */
export const OFFLINE_THRESHOLD_MS = 45_000;

/** Driver pushes a fresh location every ~4s. */
export const DRIVER_LOCATION_INTERVAL_MS = 4_000;

/** Default campus shuttle cruise speed used for ETA fallback (m/s). */
export const FALLBACK_SPEED_MPS = 8;

/** Stable auth redirect targets (built at runtime from the origin). */
export const authUrls = (origin: string) => ({
  callback: new URL("/auth/callback", origin).href,
  reset: new URL("/reset-password", origin).href,
});
