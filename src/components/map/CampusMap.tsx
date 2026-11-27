import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  CAMPUS_BOUNDS,
  CAMPUS_CENTER,
  DEFAULT_BEARING,
  DEFAULT_MAX_ZOOM,
  DEFAULT_MIN_ZOOM,
  DEFAULT_PITCH,
  DEFAULT_ZOOM,
} from "@/lib/constants";
import { snapStyle } from "./snapStyle";

const overrideStyle = (import.meta.env.VITE_MAP_STYLE_URL as string | undefined)?.trim();

export type MapClickHandler = (lngLat: { lng: number; lat: number }) => void;

interface CampusMapProps {
  onReady: (map: maplibregl.Map) => void;
  onClick?: MapClickHandler;
  center?: { lng: number; lat: number } | null;
  className?: string;
  dragRotate?: boolean;
  cursor?: string;
}

export function CampusMap({ onReady, onClick, center, className, dragRotate = true, cursor = "default" }: CampusMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Latest prop values are read through refs so callbacks (which parents
  // redefine on every render) never trigger a map rebuild.
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;
  // Construction-only option; captured once at mount.
  const dragRotateRef = useRef(dragRotate);

  // Create the map exactly once (mount-only), regardless of prop churn.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new maplibregl.Map({
      container,
      style: overrideStyle || snapStyle,
      center: [CAMPUS_CENTER.lng, CAMPUS_CENTER.lat],
      zoom: DEFAULT_ZOOM,
      pitch: DEFAULT_PITCH,
      bearing: DEFAULT_BEARING,
      minZoom: DEFAULT_MIN_ZOOM,
      maxZoom: DEFAULT_MAX_ZOOM,
      maxBounds: CAMPUS_BOUNDS,
      dragRotate: dragRotateRef.current,
      pitchWithRotate: dragRotateRef.current,
      attributionControl: false,
      canvasContextAttributes: { antialias: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", () => {
      const canvas = map.getCanvas();
      if (canvas) canvas.style.cursor = cursorRef.current;
      onReadyRef.current(map);
    });
    map.on("click", (e) => {
      if (!e?.lngLat) return;
      onClickRef.current?.({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    });
    map.easeTo({ bearing: DEFAULT_BEARING });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Intentionally mount-only: prop changes (onClick, cursor….) are handled
    // via refs above and must not destroy/recreate the WebGL canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the cursor style in sync without rebuilding the map.
  useEffect(() => {
    const canvas = mapRef.current?.getCanvas();
    if (canvas) canvas.style.cursor = cursor;
  }, [cursor]);

  const firstCenter = useRef(center);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    const isInitial = firstCenter.current === center;
    firstCenter.current = center;
    map.flyTo({
      center: [center.lng, center.lat],
      zoom: Math.max(map.getZoom(), 16),
      pitch: map.getPitch(),
      bearing: map.getBearing(),
      essential: true,
      duration: isInitial ? 0 : 1400,
    });
  }, [center]);

  return <div ref={containerRef} className={className ?? "h-full w-full"} />;
}

export default CampusMap;
