// Leaflet divIcons for bus markers, route direction arrows and stop labels.
// Inline SVG + CSS rotation keeps everything crisp at any zoom with no
// external image assets.
import * as L from "leaflet";

export const BUS_ICON_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">',
  '<circle cx="36" cy="36" r="30" fill="#107C41" opacity="0.16"/>',
  '<rect x="16" y="16" width="42" height="40" rx="12" fill="#F5A623" stroke="#E08F0C" stroke-width="2"/>',
  '<path d="M20 25 h18 a7 7 0 0 1 7 7 v8 h-21 a4 4 0 0 1 -4 -4 z" fill="#265C3A"/>',
  '<rect x="22" y="40" width="20" height="8" rx="3" fill="#BFBFD4" opacity="0.9"/>',
  '<rect x="47" y="30" width="6" height="14" rx="3" fill="#FFFFFF" opacity="0.9"/>',
  '<rect x="52" y="30" width="6" height="14" rx="3" fill="#FFFFFF" opacity="0.9"/>',
  '<circle cx="28" cy="54" r="5" fill="#37474F"/>',
  '<circle cx="50" cy="54" r="5" fill="#37474F"/>',
  "</svg>",
].join("");

export const ARROW_ICON_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">',
  '<path d="M12 4 L20 18 H4 Z" fill="#A96A12" opacity="0.9"/>',
  "</svg>",
].join("");

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

/** Rotating bus marker. The inner span (data-bus-rotate) is rotated live. */
export function busIcon(offline = false) {
  return L.divIcon({
    className: "sdbus-marker",
    html:
      '<span data-bus-rotate style="display:block;width:100%;height:100%;transform-origin:center;opacity:' +
      (offline ? 0.45 : 1) +
      '">' +
      BUS_ICON_SVG +
      "</span>",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

/** Small direction arrow placed along a route polyline. */
export function arrowIcon(angleDeg: number) {
  return L.divIcon({
    className: "sdroute-arrow",
    html:
      '<span style="display:block;width:100%;height:100%;transform:rotate(' +
      angleDeg +
      'deg)">' +
      ARROW_ICON_SVG +
      "</span>",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

/** Stop name label above a stop dot. */
export function stopLabelIcon(name: string, selected: boolean) {
  return L.divIcon({
    className: "sdstop-label",
    html:
      '<span class="' +
      (selected ? "is-selected" : "") +
      '">' +
      esc(name) +
      "</span>",
    iconSize: null as unknown as [number, number],
    iconAnchor: [0, 0],
  });
}
