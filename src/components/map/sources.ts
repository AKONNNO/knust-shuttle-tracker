// Leaflet-backed layer management for the dynamic map overlays.
// Each "source" id owns a lightweight Leaflet LayerGroup that is rebuilt
// whenever new data arrives via addOrUpdateSource.
import * as L from "leaflet";
import type { FeatureCollection } from "geojson";
import { stopLabelIcon } from "./icons";

const groupStore = new WeakMap<L.Map, Map<string, L.LayerGroup>>();

/** Get (or lazily create) the LayerGroup registered for `id` on this map. */
export function groupFor(map: L.Map, id: string) {
  let store = groupStore.get(map);
  if (!store) {
    store = new Map();
    groupStore.set(map, store);
  }
  let group = store.get(id);
  if (!group) {
    group = L.layerGroup().addTo(map);
    store.set(id, group);
  }
  return group;
}

export interface PointFeatureLike {
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Record<string, unknown>;
}

/** Rebuild a dedicated overlay (marker dots / labels) from GeoJSON data. */
export function addOrUpdateSource(map: L.Map, id: string, data: FeatureCollection) {
  const group = groupFor(map, id);
  group.clearLayers();

  const points = data.features.filter(
    (f): f is PointFeatureLike => f.geometry.type === "Point"
  );

  for (const f of points) {
    const [lng, lat] = f.geometry.coordinates;
    const ll: [number, number] = [lat, lng];

    if (id === "me-dot") {
      // User's own location: blue dot with a white ring.
      L.circleMarker(ll, {
        radius: 8,
        color: "#FFFFFF",
        weight: 2.5,
        fillColor: "#2F80ED",
        fillOpacity: 1,
        interactive: false,
      }).addTo(group);
    } else if (id === "stop-pick") {
      // Admin stop picker pin.
      L.circleMarker(ll, {
        radius: 10,
        color: "#FFFFFF",
        weight: 3,
        fillColor: "#E8A33D",
        fillOpacity: 1,
        interactive: false,
      }).addTo(group);
    } else if (id === "edit-pts") {
      // Route editor draggable points: amber dot + numbered label.
      const idx = String(f.properties.idx ?? "");
      L.circleMarker(ll, {
        radius: 9,
        color: "#FFFFFF",
        weight: 3,
        fillColor: "#E8A33D",
        fillOpacity: 1,
        interactive: false,
      }).addTo(group);
      L.marker(ll, {
        icon: stopLabelIcon(idx, true),
        interactive: false,
      }).addTo(group);
    } else {
      // Generic point → small default dot.
      L.circleMarker(ll, {
        radius: 6,
        color: "#E8A33D",
        weight: 2,
        fillColor: "#E8A33D",
        fillOpacity: 0.6,
        interactive: false,
      }).addTo(group);
    }
  }
}

/** Remove every overlay group whose id starts with `prefix`. */
export function removeByPrefix(map: L.Map, prefix: string) {
  const store = groupStore.get(map);
  if (!store) return;
  for (const [id, group] of Array.from(store.entries())) {
    if (id.startsWith(prefix)) {
      group.remove();
      store.delete(id);
    }
  }
}

export function routeFeatures(
  geometries: Array<{ geometry: { coordinates: [number, number][] } | null; color?: string }>
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: geometries
      .filter((g) => g.geometry && g.geometry.coordinates.length > 1)
      .map((g) => ({
        type: "Feature",
        geometry: g.geometry as never,
        properties: { color: g.color ?? "#E8A33D" },
      })),
  };
}

export function stopFeatures(
  stops: Array<{ id: string; name: string; lat: number; lng: number; selected?: boolean }>
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: stops.map((s) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.lng, s.lat] },
      properties: { id: s.id, name: s.name, selected: s.selected ?? false },
    })),
  };
}
