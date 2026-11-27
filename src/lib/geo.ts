// Geo helpers used across the app: distance, projection onto a route
// polyline, bearings, formatting and speed smoothing.

import type { LineGeometry, Stop, TriPoint } from "./types";

const EARTH_RADIUS_M = 6371000;

/** Haversine distance in metres between two lat/lng points. */
export function haversineMeters(a: TriPoint, b: TriPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}

/** Bearing (degrees clockwise from north) from a to b. */
export function bearingDegrees(a: TriPoint, b: TriPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (d: number) => (d * 180) / Math.PI;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  let brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

/**
 * Snap a point onto a line segment defined by [a, b].
 * Returns the projected point and how far along the segment (0..1 + beyond).
 */
export function projectOnSegment(
  p: TriPoint,
  a: TriPoint,
  b: TriPoint
): { point: TriPoint; t: number } {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x = (lng: number) => EARTH_RADIUS_M * Math.cos(toRad(a.lat)) * toRad(lng);
  const y = (lat: number) => EARTH_RADIUS_M * toRad(lat);
  const ax = x(a.lng);
  const ay = y(a.lat);
  const bx = x(b.lng);
  const by = y(b.lat);
  const px = x(p.lng);
  const py = y(p.lat);
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return {
    point: { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t },
    t,
  };
}

export interface PolylineProgress {
  /** Projected point of the bus onto the polyline. */
  point: TriPoint;
  /** Distance in metres from the start of the polyline. */
  alongDistance: number;
  /** Index of the segment the projection landed on. */
  segmentIndex: number;
}

/**
 * Project a point onto a polyline and get its distance from the start.
 * Returns the minimum-distance projection.
 */
export function projectOnPolyline(p: TriPoint, line: TriPoint[]): PolylineProgress | null {
  if (!line || line.length < 2) return null;
  let best: PolylineProgress | null = null;
  let cumulative = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    const segLen = haversineMeters(a, b);
    const { point, t } = projectOnSegment(p, a, b);
    const along = cumulative + segLen * t;
    if (!best || haversineMeters(p, point) < haversineMeters(p, best.point)) {
      best = { point, alongDistance: along, segmentIndex: i };
    }
    cumulative += segLen;
  }
  return best;
}

/** Distance along the polyline at the given projected position. */
export function totalLineLength(line: TriPoint[]): number {
  let sum = 0;
  for (let i = 0; i < line.length - 1; i++) sum += haversineMeters(line[i], line[i + 1]);
  return sum;
}

/**
 * Distance along the polyline to the projection of a stop.
 * Used to figure out which stop a bus is headed to next.
 */
export function stopAlongDistance(stop: TriPoint, line: TriPoint[]): number {
  const prog = projectOnPolyline(stop, line);
  return prog?.alongDistance ?? 0;
}

export interface NextStopResult {
  /** Ordered stops of the route with their along-line distance. */
  stops: Array<{ stop: Stop; along: number }>;
  /** Index (into stops) of the next stop ahead of the bus. */
  nextIndex: number;
  /** Stay-behind if one-way and the bus is past the last stop. */
  done: boolean;
  /** Remaining metres from bus to the next stop (along the route). */
  remainingToNext: number;
  /** Remaining metres to the stop after next (cumulative toward it). */
  remainingToSecond: number;
}

/**
 * Compute next-stop logic from a bus position on a route.
 * `isLoop` handles wrap-around correctly.
 */
export function computeNextStop(
  bus: TriPoint,
  line: TriPoint[],
  stops: Stop[],
  isLoop: boolean
): NextStopResult | null {
  if (!stops.length || line.length < 2) return null;
  const busProg = projectOnPolyline(bus, line);
  if (!busProg) return null;
  const total = totalLineLength(line);

  const ordered: Array<{ stop: Stop; along: number }> = stops.map((s) => ({
    stop: s,
    along: stopAlongDistance(s, line),
  }));
  // Keep stable order but with their measured along distances.
  ordered.sort((a, b) => a.along - b.along);

  const pos = busProg.alongDistance;
  let nextIndex = ordered.findIndex((s) => s.along > pos + 5); // 5m hysteresis
  if (nextIndex === -1) {
    if (isLoop) nextIndex = 0;
    else nextIndex = ordered.length - 1; // approaching last stop
  }
  const next = ordered[nextIndex];
  const secondIndex = (nextIndex + 1) % ordered.length;
  const second =
    isLoop || nextIndex < ordered.length - 1
      ? ordered[secondIndex]
      : null;

  const remainingToNext = isLoop
    ? circularDistance(pos, next.along, total)
    : Math.max(0, next.along - pos);
  const remainingToSecond =
    second != null
      ? remainingToNext + (isLoop ? circularDistance(next.along, second.along, total) : Math.max(0, second.along - next.along))
      : null;

  return {
    stops: ordered,
    nextIndex,
    done: !isLoop && nextIndex === ordered.length - 1 && pos > next.along + 5,
    remainingToNext,
    remainingToSecond: remainingToSecond ?? 0,
  };
}

function circularDistance(from: number, to: number, total: number): number {
  const d = (to - from + total) % total;
  return d >= 0 ? d : d + total;
}

/** ETA seconds = metres / speed; falls back to a campus shuttle cruise speed. */
export function etaSeconds(metres: number, speedMps: number | null | undefined): number {
  const s = speedMps && speedMps > 1 ? speedMps : 8; // ~29 km/h fallback
  return metres > 0 ? metres / s : 0;
}

/** Smooth recent speed: simple exponential moving average. */
export function smoothedSpeed(
  current: number,
  previous: number | null,
  alpha = 0.4
): number {
  if (!previous) return current;
  return alpha * current + (1 - alpha) * previous;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} hr ${m % 60} min`;
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.max(1, Math.round(m))} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

/** Convert a GeoJSON LineString to (lat, lng) points. */
export function lineToPoints(g: LineGeometry | null): TriPoint[] {
  if (!g?.coordinates?.length) return [];
  return g.coordinates.map(([lng, lat]) => ({ lat, lng }));
}

/** Convert stops on a route to (lat, lng) points in position order. */
export function stopsToPoints(stops: Array<Stop & { route_stops: { position: number } }>): Stop[] {
  return [...stops].sort((a, b) => a.route_stops.position - b.route_stops.position);
}
