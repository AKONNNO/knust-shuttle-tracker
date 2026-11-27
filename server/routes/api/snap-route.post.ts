// Snap a hand-drawn route polyline onto real roads via OSRM `match`.
// Returns a cleaned GeoJSON LineString + total distance.
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";

interface SnapBody {
  /** [lng, lat] pairs, in drawing order. */
  points: Array<[number, number]>;
  is_loop?: boolean;
}

const OSRM_MATCH = "https://router.project-osrm.org/match/v1/driving";

export default defineHandler(async (event) => {
  const body = await readBody<SnapBody>(event);
  if (
    !body ||
    !Array.isArray(body.points) ||
    body.points.length < 2 ||
    !body.points.every((p) => Array.isArray(p) && p.length === 2)
  ) {
    throw createError({ statusCode: 400, statusMessage: "points ([[lng,lat]]) are required" });
  }

  const coords = body.points.map((p) => `${p[0]},${p[1]}`).join(";");
  try {
    const res = await fetch(
      `${OSRM_MATCH}/${coords}?geometries=geojson&steps=false&overview=full&radiuses=${body.points
        .map(() => "100")
        .join(";")}`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) throw new Error(`OSRM responded ${res.status}`);

    const json = (await res.json()) as {
      code?: string;
      matchings?: Array<{ geometry: { coordinates: [number, number][] }; distance: number }>;
    };
    const matching = json.matchings?.[0];
    if (json.code !== "Ok" || !matching?.geometry?.coordinates?.length) {
      // No continuous match — return the raw line so admins aren't blocked.
      return {
        geometry: { type: "LineString", coordinates: body.points },
        distance_m: null,
        snapped: false,
        source: "match" as const,
      };
    }

    let coordinates = matching.geometry.coordinates;
    if (body.is_loop && coordinates.length) {
      const first = coordinates[0];
      // Close an explicit loop visually (OSRM match is one-way in the drawn order).
      coordinates = [...coordinates, first];
    }

    const distanceM = Math.round(matching.distance);

    return {
      geometry: { type: "LineString", coordinates },
      distance_m: distanceM,
      snapped: true,
      source: "match" as const,
    };
  } catch {
    throw createError({ statusCode: 502, statusMessage: "Road-snap service unavailable" });
  }
});
