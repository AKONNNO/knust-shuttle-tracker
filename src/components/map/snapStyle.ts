// Bundled Snap-Map style (MapLibre GL JS): warm cream/beige base, pastel
// beige-pink 3D buildings, green parks, light grey roads. Tiles/glyphs come
// from OpenFreeMap (keyless OpenMapTiles-schema vectors with 3D-building
// data). Override the whole style via VITE_MAP_STYLE_URL if preferred.
import type { StyleSpecification } from "maplibre-gl";

const TILES = ["https://tiles.openfreemap.org/tiles/{z}/{x}/{y}"];
const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}";

export const snapStyle: StyleSpecification = {
  version: 8,
  name: "KNUST Snap Map",
  glyphs: GLYPHS,
  sources: {
    openmaptiles: { type: "vector", tiles: TILES, maxzoom: 14 },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#F7F1E5" } },
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      paint: { "fill-color": "#CFE6E2" },
    },
    {
      id: "landcover-grass",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      filter: ["in", ["get", "class"], ["literal", ["grass", "wood", "scrub", "forest"]]],
      paint: { "fill-color": "#E4F0D8" },
    },
    {
      id: "landuse-park",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "park",
      minzoom: 12,
      paint: { "fill-color": "#D5EAC3" },
    },
    {
      id: "park-3d",
      type: "fill-extrusion",
      source: "openmaptiles",
      "source-layer": "park",
      minzoom: 14.2,
      paint: {
        "fill-extrusion-color": "#CBE7B8",
        "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 14.2, 0, 15.2, 2.6],
        "fill-extrusion-base": ["interpolate", ["linear"], ["zoom"], 14.2, 0, 15.2, 0],
        "fill-extrusion-opacity": 0.95,
      },
    },
    {
      id: "landuse-residential",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landuse",
      filter: ["in", ["get", "class"], ["literal", ["residential", "institutional", "commercial"]]],
      minzoom: 13,
      paint: { "fill-color": "#F0E8D9" },
    },
    {
      id: "road-case",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["all", ["==", ["geometry-type"], "LineString"], ["!", ["==", ["get", "class"], "minor"]]],
      paint: {
        "line-color": "#FFFFFF",
        "line-width": ["interpolate", ["linear"], ["zoom"], 13, 1.2, 15, 6, 16.5, 11],
      },
    },
    {
      id: "road-minor",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["all", ["==", ["geometry-type"], "LineString"], ["==", ["get", "class"], "minor"]],
      paint: {
        "line-color": "#EFEADE",
        "line-width": ["interpolate", ["linear"], ["zoom"], 13, 0.8, 15, 3.5, 16.5, 7.5],
      },
    },
    {
      id: "road-secondary",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["all", ["==", ["geometry-type"], "LineString"], ["in", ["get", "class"], ["literal", ["secondary", "tertiary"]]]],
      paint: {
        "line-color": "#E7DFCF",
        "line-width": ["interpolate", ["linear"], ["zoom"], 13, 1.6, 15, 6.5, 16.5, 12],
      },
    },
    {
      id: "road-primary",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["all", ["==", ["geometry-type"], "LineString"], ["in", ["get", "class"], ["literal", ["primary", "trunk", "motorway"]]]],
      paint: {
        "line-color": "#DAD1BE",
        "line-width": ["interpolate", ["linear"], ["zoom"], 13, 2, 15, 7.5, 16.5, 14],
      },
    },
    {
      id: "building-3d",
      type: "fill-extrusion",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 14,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-extrusion-color": [
          "interpolate",
          ["linear"],
          ["get", "height"],
          0, "#F3E3D4",
          10, "#EDD3C2",
          25, "#E9CCBF",
          45, "#E5C4CA",
          80, "#E0BCD0",
        ],
        "fill-extrusion-opacity": 0.82,
        "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 14, 0, 15, ["coalesce", ["get", "height"], 6]],
        "fill-extrusion-base": ["interpolate", ["linear"], ["zoom"], 14, 0, 15, ["coalesce", ["get", "min_height"], 0]],
      },
    },
    {
      id: "water-label",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "water_name",
      filter: ["has", "name"],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular", "Open Sans Regular"],
        "text-size": 11,
        "text-letter-spacing": 0.04,
      },
      paint: { "text-color": "#6FA79F", "text-halo-color": "#F7F1E5", "text-halo-width": 1.4 },
    },
    {
      id: "road-label",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "transportation_name",
      filter: ["has", "name"],
      minzoom: 14.5,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular", "Open Sans Regular"],
        "text-size": 10.5,
        "symbol-placement": "line",
        "text-transform": "uppercase",
        "text-letter-spacing": 0.08,
      },
      paint: { "text-color": "#A79B85", "text-halo-color": "#F7F1E5", "text-halo-width": 1.2 },
    },
    {
      id: "place-label",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      filter: ["all", ["has", "name"], ["in", ["get", "class"], ["literal", ["suburb", "neighbourhood", "village", "city", "town"]]]],
      minzoom: 14,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Bold", "Open Sans Bold", "Noto Sans Regular"],
        "text-size": 12,
        "text-letter-spacing": 0.02,
      },
      paint: { "text-color": "#7E735F", "text-halo-color": "#F7F1E5", "text-halo-width": 1.6 },
    },
  ],
};
