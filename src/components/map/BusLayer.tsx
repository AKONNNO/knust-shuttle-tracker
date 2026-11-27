// Live bus layer: smooth interpolated marker movement + heading rotation.
import { useEffect, useRef } from "react";
import type maplibregl from "maplibre-gl";
import type { BusLocation } from "@/lib/types";
import { BUS_ICON_SVG, ensureImage } from "./icons";
import { addOrUpdateSource, busFeatures } from "./sources";

interface AnimatedPos {
  lat: number;
  lng: number;
  heading: number;
  offline: boolean;
  lastSeen: number;
}

interface BusLayerProps {
  map: maplibregl.Map;
  locations: Record<string, BusLocation>;
  offline: Record<string, boolean>;
}

function lerpAngle(from: number, to: number, t: number) {
  let diff = ((to - from + 540) % 360) - 180;
  return from + diff * t;
}

export function BusLayer({ map, locations, offline }: BusLayerProps) {
  const positionsRef = useRef<Record<string, AnimatedPos>>({});
  const targetsRef = useRef(locations);
  const offlineRef = useRef(offline);

  useEffect(() => {
    targetsRef.current = locations;
    offlineRef.current = offline;
  }, [locations, offline]);

  useEffect(() => {
    ensureImage(map, "bus-icon", BUS_ICON_SVG);
    addOrUpdateSource(map, "buses", { type: "FeatureCollection", features: [] });
    if (!map.getLayer("buses-glow")) {
      map.addLayer({
        id: "buses-glow",
        type: "circle",
        source: "buses",
        paint: {
          "circle-radius": 16,
          "circle-color": "#107C41",
          "circle-opacity": ["case", ["get", "offline"], 0.12, 0.28],
          "circle-blur": 1,
        },
      });
    }
    if (!map.getLayer("buses-symbol")) {
      map.addLayer({
        id: "buses-symbol",
        type: "symbol",
        source: "buses",
        layout: {
          "icon-image": "bus-icon",
          "icon-size": 0.85,
          "icon-rotate": ["get", "heading"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
        },
        paint: { "icon-opacity": ["case", ["get", "offline"], 0.35, 1] },
      });
    }

    let cancelled = false;
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      if (cancelled) return;
      const dt = Math.min((now - last) / 1000, 0.5);
      last = now;
      const positions = positionsRef.current;
      const targets = targetsRef.current;
      const off = offlineRef.current;

      for (const [id, pos] of Object.entries(positions)) {
        const target = targets[id];
        if (!target) {
          if (now - pos.lastSeen > 120_000) delete positions[id];
          continue;
        }
        const t = Math.min(dt / 1.1, 1);
        pos.lat += (target.lat - pos.lat) * t;
        pos.lng += (target.lng - pos.lng) * t;
        pos.heading = lerpAngle(pos.heading, target.heading ?? 0, t);
        pos.offline = off[id] ?? false;
        pos.lastSeen = now;
      }

      for (const [id, loc] of Object.entries(targets)) {
        if (!loc || !positions[id]) {
          if (loc) {
            positions[id] = {
              lat: loc.lat,
              lng: loc.lng,
              heading: loc.heading ?? 0,
              offline: off[id] ?? false,
              lastSeen: now,
            };
          }
        }
      }

      const features = Object.entries(positions).map(([id, p]) => ({
        id,
        lat: p.lat,
        lng: p.lng,
        heading: p.heading,
        offline: p.offline,
      }));
      if (features.length) addOrUpdateSource(map, "buses", busFeatures(features));
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      for (const id of ["buses-symbol", "buses-glow"]) {
        try {
          if (map.getLayer(id)) map.removeLayer(id);
        } catch {
          // ignore
        }
      }
      try {
        if (map.getSource("buses")) map.removeSource("buses");
      } catch {
        // ignore
      }
    };
  }, [map]);

  return null;
}
