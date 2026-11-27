// Imperative MapLibre layers for routes (casing + fill + direction arrows)
// and stops (marker + label). Bus layers + animation live in BusLayer.tsx.
import type * as maplibregl from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { ARROW_ICON_SVG, ensureImage } from "./icons";
import { addOrUpdateSource, routeFeatures, stopFeatures } from "./sources";
import type { Stop } from "@/lib/types";

export { routeFeatures, stopFeatures };

/** Add route display layers (drawn once; fed via updateRoutes below). */
export function addRouteLayers(map: maplibregl.Map) {
  if (map.getLayer("route-fill")) return;
  const empty: FeatureCollection = { type: "FeatureCollection", features: [] };
  addOrUpdateSource(map, "routes", empty);
  ensureImage(map, "route-arrow", ARROW_ICON_SVG);

  map.addLayer({
    id: "route-case",
    type: "line",
    source: "routes",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#FFFFFF",
      "line-width": ["interpolate", ["linear"], ["zoom"], 14, 5, 16, 11],
      "line-opacity": 0.95,
    },
  });
  map.addLayer({
    id: "route-fill",
    type: "line",
    source: "routes",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ["coalesce", ["get", "color"], "#E8A33D"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 14, 3, 16, 7.5],
      "line-opacity": 0.85,
    },
  });
  map.addLayer({
    id: "route-arrows",
    type: "symbol",
    source: "routes",
    layout: {
      "symbol-placement": "line",
      "symbol-spacing": 150,
      "icon-image": "route-arrow",
      "icon-size": 0.55,
      "icon-allow-overlap": false,
      "icon-rotation-alignment": "map",
    },
    paint: { "icon-opacity": 0.95 },
  });
}

export function updateRoutes(map: maplibregl.Map, featureCollection: FeatureCollection) {
  addOrUpdateSource(map, "routes", featureCollection);
}

/** Add stop markers + labels. Stop clicks are handled on layer "stops-dot". */
export function addStopLayers(map: maplibregl.Map) {
  if (map.getLayer("stops-dot")) return;
  const empty: FeatureCollection = { type: "FeatureCollection", features: [] };
  addOrUpdateSource(map, "stops", empty);

  map.addLayer({
    id: "stops-dot",
    type: "circle",
    source: "stops",
    minzoom: 13.5,
    paint: {
      "circle-radius": 7,
      "circle-color": "#FFFFFF",
      "circle-stroke-color": ["case", ["get", "selected"], "#E8A33D", "#2E7D4F"],
      "circle-stroke-width": ["case", ["get", "selected"], 5, 3],
    },
  });
  map.addLayer({
    id: "stops-label",
    type: "symbol",
    source: "stops",
    minzoom: 14,
    layout: {
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Bold", "Open Sans Bold", "Noto Sans Regular"],
      "text-size": ["case", ["get", "selected"], 14, 12],
      "text-offset": [0, 1.4],
      "text-anchor": "top",
      "text-letter-spacing": 0.02,
    },
    paint: {
      "text-color": ["case", ["get", "selected"], "#9A5710", "#2E6B3B"],
      "text-halo-color": "#F7F1E5",
      "text-halo-width": 1.6,
    },
  });
}

export function updateStops(
  map: maplibregl.Map,
  stops: Array<Stop & { selected?: boolean }>
) {
  addOrUpdateSource(map, "stops", stopFeatures(stops));
}

/** Remove layers + source for a given prefix id. */
export function removeByPrefix(map: maplibregl.Map, prefix: string) {
  if (!map.getStyle()) return;
  const ids = map.getStyle().layers.map((l) => l.id);
  for (const id of ids) {
    if (id.startsWith(prefix)) {
      try {
        map.removeLayer(id);
      } catch {
        // ignore
      }
    }
  }
  try {
    map.removeSource(prefix);
  } catch {
    // ignore
  }
}
