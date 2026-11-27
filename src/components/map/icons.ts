import type maplibregl from "maplibre-gl";

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

function toDataUri(svg: string) {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

export function ensureImage(map: maplibregl.Map, name: string, svg: string) {
  if (map.hasImage(name)) return;
  const img = new Image();
  img.onload = () => {
    if (!map.getStyle() || map.hasImage(name)) return;
    try {
      map.addImage(name, img);
    } catch {
      // ignore
    }
  };
  img.src = toDataUri(svg);
}
