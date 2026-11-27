// Live bus layer: smooth interpolated marker movement + heading rotation,
// rendered with Leaflet markers + glow dots.
import { useEffect, useRef } from "react";
import * as L from "leaflet";
import type { BusLocation } from "@/lib/types";
import { busIcon } from "./icons";

interface AnimatedPos {
  lat: number;
  lng: number;
  heading: number;
  offline: boolean;
  lastSeen: number;
}

interface BusMarkerSet {
  marker: L.Marker;
  glow: L.CircleMarker;
  rotEl: HTMLElement | null;
  markerEl: HTMLElement | null;
}

interface BusLayerProps {
  map: L.Map;
  locations: Record<string, BusLocation>;
  offline: Record<string, boolean>;
}

function lerpAngle(from: number, to: number, t: number) {
  let diff = ((to - from + 540) % 360) - 180;
  return from + diff * t;
}

export function BusLayer({ map, locations, offline }: BusLayerProps) {
  const positionsRef = useRef<Record<string, AnimatedPos>>({});
  const markersRef = useRef<Record<string, BusMarkerSet>>({});
  const targetsRef = useRef(locations);
  const offlineRef = useRef(offline);

  useEffect(() => {
    targetsRef.current = locations;
    offlineRef.current = offline;
  }, [locations, offline]);

  useEffect(() => {
    const group = L.layerGroup().addTo(map);
    let cancelled = false;
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      if (cancelled) return;
      const dt = Math.min((now - last) / 1000, 0.5);
      last = now;
      const positions = positionsRef.current;
      const markers = markersRef.current;
      const targets = targetsRef.current;
      const off = offlineRef.current;

      // Interpolate positions toward their targets.
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

      // Spawn new positions + markers, prune vanished ones.
      for (const [id, loc] of Object.entries(targets)) {
        if (!loc) continue;
        if (!positions[id]) {
          positions[id] = {
            lat: loc.lat,
            lng: loc.lng,
            heading: loc.heading ?? 0,
            offline: off[id] ?? false,
            lastSeen: now,
          };
        }
        if (!markers[id]) {
          const glow = L.circleMarker([loc.lat, loc.lng], {
            radius: 18,
            color: "#107C41",
            weight: 0,
            fillColor: "#107C41",
            fillOpacity: 0.18,
            interactive: false,
            className: "sd-bus-glow",
          }).addTo(group);
          const marker = L.marker([loc.lat, loc.lng], {
            icon: busIcon(off[id] ?? false),
            interactive: false,
            keyboard: false,
            title: "",
          }).addTo(group);
          markers[id] = {
            marker,
            glow,
            markerEl: marker.getElement() ?? null,
            rotEl: marker.getElement()?.querySelector<HTMLElement>("[data-bus-rotate]") ?? null,
          };
        }
      }
      for (const [id, m] of Object.entries(markers)) {
        const pos = positions[id];
        if (!pos) {
          m.marker.remove();
          m.glow.remove();
          delete markers[id];
          continue;
        }
        m.marker.setLatLng([pos.lat, pos.lng]);
        m.glow.setLatLng([pos.lat, pos.lng]);
        if (m.rotEl) m.rotEl.style.transform = `rotate(${pos.heading}deg)`;
        if (m.markerEl) m.markerEl.style.opacity = pos.offline ? "0.45" : "1";
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      group.clearLayers();
      map.removeLayer(group);
      markersRef.current = {};
      positionsRef.current = {};
    };
  }, [map]);

  return null;
}
