import { useEffect, useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  CAMPUS_BOUNDS,
  CAMPUS_CENTER,
  DEFAULT_MAX_ZOOM,
  DEFAULT_MIN_ZOOM,
  DEFAULT_ZOOM,
} from "@/lib/constants";

// Keyless raster basemaps, tried in order. If one tile host is unreachable or
// rejects requests (like CARTO, which now requires an API key), we hop to the
// next provider so the map never renders blank. Override with VITE_MAP_TILE_URL
// to force a single source.
const LIGHT_TILE_SOURCES = [
  {
    url: "https://tile.openfreemap.org/styles/liberty/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://openfreemap.org">OpenFreeMap</a>',
    maxZoom: 20,
  },
  {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar",
    maxZoom: 19,
  },
];

// Dark basemaps used whenever the user toggles the map into dark mode.
const DARK_TILE_SOURCES = [
  {
    url: "https://tile.openfreemap.org/styles/dark-matter/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://openfreemap.org">OpenFreeMap</a>',
    maxZoom: 20,
  },
  {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar",
    maxZoom: 19,
  },
];

/** Basemap display mode: light (default) or dark tiles. */
export type MapMode = "light" | "dark";

interface BasemapState {
  mode: MapMode | null;
  layer: L.TileLayer | null;
  failures: number;
  index: number;
}

const basemapState = new WeakMap<L.Map, BasemapState>();

/** Swap (or set) the basemap tileset for the given display mode. */
function setBasemap(map: L.Map, mode: MapMode) {
  let state = basemapState.get(map);
  if (!state) {
    state = { mode: null, layer: null, failures: 0, index: 0 };
    basemapState.set(map, state);
  }
  if (state.mode === mode) return;

  state.mode = mode;
  state.failures = 0;
  state.index = 0;

  const override = (import.meta.env.VITE_MAP_TILE_URL as string | undefined)?.trim();
  const sources = override
    ? [{ url: override, attribution: "Tiles", maxZoom: 20 }]
    : mode === "dark"
      ? DARK_TILE_SOURCES
      : LIGHT_TILE_SOURCES;

  const apply = () => {
    state.layer?.remove();
    const src = sources[state.index];
    const layer = L.tileLayer(src.url, { attribution: src.attribution, maxZoom: src.maxZoom });
    state.layer = layer;
    layer.on("tileerror", () => {
      state.failures += 1;
      // A whole tileset from one host usually dies together, so after a few
      // failures hop to the next provider instead of showing a blank map.
      if (state.failures >= 3 && state.index < sources.length - 1) {
        state.failures = 0;
        state.index += 1;
        apply();
      }
    });
    layer.addTo(map);
  };

  apply();
}

export type MapClickHandler = (lngLat: { lng: number; lat: number }) => void;

interface CampusMapProps {
  /** Called with the underlying Leaflet map as soon as it is created. */
  onReady: (map: L.Map) => void;
  onClick?: MapClickHandler;
  center?: { lng: number; lat: number } | null;
  className?: string;
  dragRotate?: boolean;
  cursor?: string;
  /** Basemap style: "light" (default) or "dark". Switching swaps the tiles. */
  basemap?: MapMode;
}

export function CampusMap({
  onReady,
  onClick,
  center,
  className,
  cursor = "default",
  basemap = "light",
}: CampusMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Latest prop values read through refs so parents re-defining callbacks on
  // every render never trigger a map rebuild.
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;

  // Create the map exactly once (mount-only), regardless of prop churn.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = L.map(container, {
      center: [CAMPUS_CENTER.lat, CAMPUS_CENTER.lng],
      zoom: DEFAULT_ZOOM,
      minZoom: DEFAULT_MIN_ZOOM,
      maxZoom: DEFAULT_MAX_ZOOM,
      zoomSnap: 0.5,
      zoomControl: false,
      attributionControl: true,
      maxBounds: L.latLngBounds(
        [CAMPUS_BOUNDS[0][1], CAMPUS_BOUNDS[0][0]],
        [CAMPUS_BOUNDS[1][1], CAMPUS_BOUNDS[1][0]]
      ),
      maxBoundsViscosity: 0.8,
    });
    mapRef.current = map;

    L.control.zoom({ position: "topright" }).addTo(map);

    const el = map.getContainer();
    if (el) el.style.cursor = cursorRef.current;

    map.on("click", (e) => {
      onClickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    // Notify immediately so consumers can add their layers right away (we
    // don't depend on tile fetch completing).
    onReadyRef.current(map);
    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Intentionally mount-only: prop changes (onClick, cursor…) are handled
    // via refs above and must not destroy/recreate the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the cursor style in sync without rebuilding the map.
  useEffect(() => {
    const el = mapRef.current?.getContainer();
    if (el) el.style.cursor = cursor;
  }, [cursor]);

  // Apply the requested basemap — swaps the tiles and toggles the dark
  // overlay styling class. Runs on mount once the map exists and again
  // whenever the mode prop changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setBasemap(map, basemap);
    map.getContainer().classList.toggle("map-mode-dark", basemap === "dark");
  }, [basemap]);

  const firstCenter = useRef(center);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    const isInitial = firstCenter.current === center;
    firstCenter.current = center;
    if (isInitial) {
      map.setView([center.lat, center.lng], Math.max(map.getZoom(), DEFAULT_ZOOM), {
        animate: false,
      });
    } else {
      map.flyTo([center.lat, center.lng], Math.max(map.getZoom(), 16));
    }
  }, [center]);

  return <div ref={containerRef} className={className ?? "h-full w-full"} />;
}

export default CampusMap;
