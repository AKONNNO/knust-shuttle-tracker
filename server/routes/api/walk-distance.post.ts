// Walking-distance proxy over OSRM (public demo instance, keyless).
// Returns road walking distance + duration between two points.
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";

interface WalkBody {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}

const OSRM_TABLE = "https://router.project-osrm.org/table/v1/foot";

export default defineHandler(async (event) => {
  const body = await readBody<WalkBody>(event);
  if (
    !body ||
    !body.from ||
    !body.to ||
    typeof body.from.lat !== "number" ||
    typeof body.from.lng !== "number" ||
    typeof body.to.lat !== "number" ||
    typeof body.to.lng !== "number"
  ) {
    throw createError({ statusCode: 400, statusMessage: "from and to coordinates are required" });
  }

  const coords = `${body.from.lng},${body.from.lat};${body.to.lng},${body.to.lat}`;
  try {
    const res = await fetch(
      `${OSRM_TABLE}/${coords}?annotations=distance,duration&sources=0&destinations=1`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) {
      throw new Error(`OSRM responded ${res.status}`);
    }
    const json = (await res.json()) as {
      code?: string;
      distances?: number[][];
      durations?: number[][];
    };
    if (json.code !== "Ok" || !json.distances?.[0]?.[0]) {
      return { distance_m: null, duration_s: null };
    }
    const distanceM = Math.round(json.distances[0][0]);
    const durationS = json.durations?.[0]?.[0] ? Math.round(json.durations[0][0]) : null;
    return { distance_m: distanceM, duration_s: durationS };
  } catch {
    // Fall back to null so the client can use a haversine estimate.
    return { distance_m: null, duration_s: null };
  }
});
