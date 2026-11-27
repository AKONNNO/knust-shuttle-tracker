// Leaflet layers for routes (casing + fill + direction arrows) and stops
// (dot + label). Live bus markers + animation live in BusLayer.tsx.
import * as L from "leaflet";
import type { FeatureCollection } from "geojson";
import type { Stop } from "@/lib/types";
import { groupFor, removeByPrefix } from "./sources";
import { arrowIcon, stopLabelIcon } from "./icons";

export { routeFeatures, stopFeatures } from "./sources";

// Route geometry is kept here so the line widths can be refreshed when the
// user zooms (Leaflet polylines have a fixed pixel weight per zoom level).
const routeData = new WeakMap<L.Map, L.LatLng[][] & { colors: string[] }>();
// Tracks maps that already have a zoomend listener bound, so re-calling
// addRouteLayers (e.g. on route data changes) never stacks listeners.
const zoomBound = new WeakSet<L.Map>();

const ARROW_SPACING_M = 220;

/** Add route display layers (feeds via updateRoutes below). */
export function addRouteLayers(map: L.Map) {
  groupFor(map, "routes");
  // Re-apply widths on zoom so routes stay readable like the old styling.
  if (!zoomBound.has(map)) {
    zoomBound.add(map);
    map.on("zoomend", () => rebuildRoutes(map));
  }
}

/** Internal: rebuild the route layer group from stored geometry. */
function rebuildRoutes(map: L.Map) {
  const group = groupFor(map, "routes");
  group.clearLayers();
  const stored = routeData.get(map);
  if (!stored) return;

  const zoom = map.getZoom();
  const scale = zoom < 15 ? 0.75 : zoom > 17 ? 1.7 : 0.75 + (zoom - 15) * 0.475;

  stored.forEach((line, i) => {
    if (line.length < 2) return;
    const color = stored.colors[i] ?? "#E8A33D";
    const fillWeight = 3.6 * scale;
    const caseWeight = fillWeight + 3.8;

    L.polyline(line, {
      color: "#FFFFFF",
      weight: caseWeight,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round",
      interactive: false,
      className: "sd-route-case",
    }).addTo(group);

    L.polyline(line, {
      color,
      weight: fillWeight,
      opacity: 0.9,
      lineCap: "round",
      lineJoin: "round",
      interactive: false,
      className: "sd-route-fill",
    }).addTo(group);

    addRouteArrows(group, line);
  });
}

/** Scatter small rotated arrows along the route to show travel direction. */
function addRouteArrows(group: L.LayerGroup, line: L.LatLng[]) {
  let travelled = 0;
  let acc = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    const segLen = a.distanceTo(b);
    if (segLen === 0) continue;
    const angle = Math.atan2(b.lng - a.lng, b.lat - a.lat) * (180 / Math.PI);
    while (acc <= travelled + segLen) {
      const t = Math.max(0, (acc - travelled) / segLen);
      const pt: [number, number] = [
        a.lat + (b.lat - a.lat) * t,
        a.lng + (b.lng - a.lng) * t,
      ];
      L.marker(pt, {
        icon: arrowIcon(angle),
        interactive: false,
        pane: "overlayPane",
      }).addTo(group);
      acc += ARROW_SPACING_M;
    }
    travelled += segLen;
  }
}

export function updateRoutes(map: L.Map, featureCollection: FeatureCollection) {
  const lines = featureCollection.features.flatMap((f) => {
    if (f.geometry.type !== "LineString") return [];
    return [
      {
        latlngs: (f.geometry.coordinates as [number, number][]).map(
          ([lng, lat]) => L.latLng(lat, lng) as L.LatLng
        ),
        color: (f.properties?.color as string | undefined) ?? "#E8A33D",
      },
    ];
  });

  const stored = lines.map((l) => l.latlngs) as L.LatLng[][] & { colors: string[] };
  stored.colors = lines.map((l) => l.color);
  routeData.set(map, stored);
  rebuildRoutes(map);
}

/** Add stop marker + label layers. */
export function addStopLayers(map: L.Map) {
  groupFor(map, "stops");
  groupFor(map, "stops-labels");
}

export function updateStops(
  map: L.Map,
  stops: Array<Stop & { selected?: boolean }>
) {
  const dotGroup = groupFor(map, "stops");
  const labelGroup = groupFor(map, "stops-labels");
  dotGroup.clearLayers();
  labelGroup.clearLayers();

  for (const s of stops) {
    const ll: [number, number] = [s.lat, s.lng];
    L.circleMarker(ll, {
      radius: 7,
      color: s.selected ? "#E8A33D" : "#2E7D4F",
      weight: s.selected ? 5 : 3,
      fillColor: "#FFFFFF",
      fillOpacity: 1,
      interactive: false,
      className: "sd-stop-dot",
    }).addTo(dotGroup);
    L.marker(ll, {
      icon: stopLabelIcon(s.name, !!s.selected),
      interactive: false,
    }).addTo(labelGroup);
  }
}

export { removeByPrefix };
