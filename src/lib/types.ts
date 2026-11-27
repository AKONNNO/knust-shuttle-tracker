// Shared domain types for KNUST Shuttle Tracker.
// These mirror the Supabase schema (public schema).

export type Role = "student" | "driver" | "admin";

export interface Profile {
  id: string;
  full_name: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  created_by: string | null;
  created_at: string;
}

/** GeoJSON-compatible line (coordinates are [lng, lat]). */
export type LineGeometry = { type: "LineString"; coordinates: [number, number][] };

export interface Route {
  id: string;
  name: string;
  is_loop: boolean;
  geometry: LineGeometry | null;
  distance_m: number | null;
  created_by: string | null;
  created_at: string;
}

export interface RouteStop {
  id: string;
  route_id: string;
  stop_id: string;
  position: number;
}

export interface Bus {
  id: string;
  name: string;
  route_id: string | null;
  driver_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Trip {
  id: string;
  bus_id: string;
  driver_id: string | null;
  route_id: string | null;
  started_at: string;
  ended_at: string | null;
  distance_m: number;
  created_at: string;
}

export interface BusLocation {
  bus_id: string;
  lat: number;
  lng: number;
  heading: number; // degrees clockwise from north
  speed: number; // metres per second
  updated_at: string;
}

/** A bus joined with its route + latest location (for the live map). */
export interface LiveBus extends Bus {
  routes: Pick<Route, "id" | "name" | "is_loop" | "geometry" | "distance_m"> | null;
  bus_locations: BusLocation | null;
  drivers: Pick<Profile, "id" | "full_name"> | null;
}

/** A live bus with its route's stops attached in position order (for ETA math). */
export type LiveBusWithStops = LiveBus & { routesStopsSorted: Stop[] };

/** A student remark / comment on a specific ride (bus). */
export interface RideComment {
  id: string;
  bus_id: string;
  user_id: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

export interface RouteWithStops extends Route {
  stops: Array<Stop & { route_stops: { position: number } }>;
}

export interface TriPoint {
  lat: number;
  lng: number;
}
