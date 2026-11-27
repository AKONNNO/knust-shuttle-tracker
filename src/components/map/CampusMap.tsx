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

// Warm, keyless raster base (CARTO Voyager). Override with VITE_MAP_TILE_URL.
const DEFAULT_TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const tileUrl = (import.meta.env.VITE_MAP_TILE_URL as string | undefined)?.trim() || DEFAULT_TILE_URL;

export type MapClickHandler = (lngLat: { lng: number; lat: number }) => void;

interface CampusMapProps {
  /** Called with the underlying Leaflet map as soon as it is created. */
  onReady: (map: L.Map) => void;
  onClick?: MapClickHandler;
  center?: { lng: number; lat: number } | null;
  className?: string;
  dragRotate?: boolean;
  cursor?: string;
}

export function CampusMap({ onReady, onClick, center, className, cursor = "default" }: CampusMapProps) {
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

    L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

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
