// Build GeoJSON FeatureCollections + upsert sources for the map layers.
import type maplibregl from "maplibre-gl";
import type { FeatureCollection, LineString, Point } from "geojson";

export function addOrUpdateSource(map: maplibregl.Map, id: string, data: FeatureCollection) {
  if (map.getSource(id)) {
    (map.getSource(id) as maplibregl.GeoJSONSource).setData(data);
  } else {
    map.addSource(id, { type: "geojson", data });
  }
}

export function routeFeatures(
  geometries: Array<{ geometry: LineString | null; color?: string }>
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: geometries
      .filter((g) => g.geometry && g.geometry.coordinates.length > 1)
      .map((g) => ({
        type: "Feature",
        geometry: g.geometry as LineString,
        properties: { color: g.color ?? "#E8A33D" },
      })),
  };
}

export function stopFeatures(
  stops: Array<{ id: string; name: string; lat: number; lng: number; selected?: boolean }>
): FeatureCollection {
  const features: Feature[] = stops.map((s) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [s.lng, s.lat] } as Point,
    properties: { id: s.id, name: s.name, selected: s.selected ?? false },
  }));
  return { type: "FeatureCollection", features };
}

type Feature = {
  type: "Feature";
  geometry: Point | LineString;
  properties: Record<string, unknown>;
};

export function busFeatures(
  positions: Array<{ id: string; lat: number; lng: number; heading: number; offline: boolean }>
): FeatureCollection {
  const features: Feature[] = positions.map((b) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [b.lng, b.lat] } as Point,
    properties: { id: b.id, heading: b.heading, offline: b.offline },
  }));
  return { type: "FeatureCollection", features };
}
