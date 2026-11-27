/** Stable palette for route lines + badges (indexed by route order). */
export const ROUTE_COLORS = [
  "#107C41",
  "#E8A33D",
  "#2E6F9E",
  "#A65ABF",
  "#D64545",
  "#2E9E8F",
  "#B7791F",
  "#5A67D8",
];

export function routeColor(index: number): string {
  return ROUTE_COLORS[index % ROUTE_COLORS.length];
}
