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
  const readyFired = useRef(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: overrideStyle || snapStyle,
      center: [CAMPUS_CENTER.lng, CAMPUS_CENTER.lat],
      zoom: DEFAULT_ZOOM,
      pitch: DEFAULT_PITCH,
      bearing: DEFAULT_BEARING,
      minZoom: DEFAULT_MIN_ZOOM,
      maxZoom: DEFAULT_MAX_ZOOM,
      maxBounds: CAMPUS_BOUNDS,
      dragRotate,
      pitchWithRotate: dragRotate,
      attributionControl: false,
      canvasContextAttributes: { antialias: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", () => {
      if (!readyFired.current) {
        readyFired.current = true;
        onReadyRef.current(map);
      }
    });
    if (onClick) {
      map.on("click", (e) => {
        if (!e?.lngLat) return;
        onClickRef.current?.({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      });
    }
    const styleTouched = () => {
      if (cursor && map.getCanvas()) map.getCanvas().style.cursor = cursor;
    };
    map.on("mouseenter", styleTouched);
    map.easeTo({ bearing: DEFAULT_BEARING });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onClick, dragRotate, cursor]);

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
