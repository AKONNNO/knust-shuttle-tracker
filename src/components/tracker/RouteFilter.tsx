import { ListFilter } from "lucide-react";
import type { Route } from "@/lib/types";

interface RouteFilterProps {
  routes: Route[];
  selected: string | null; // null = all
  colorFor: (routeId: string) => string;
  onChange: (routeId: string | null) => void;
}

export function RouteFilter({ routes, selected, colorFor, onChange }: RouteFilterProps) {
  return (
    <div className="glass rounded-2xl p-2 flex items-center gap-1 overflow-x-auto scrollbar-none">
      <span className="shrink-0 pl-2 pr-1 text-muted-foreground">
        <ListFilter className="h-4 w-4" />
      </span>
      <button
        onClick={() => onChange(null)}
        className={
          "shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors " +
          (selected === null
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground")
        }
      >
        All routes
      </button>
      {routes.map((r) => {
        const active = selected === r.id;
        return (
          <button
            key={r.id}
            onClick={() => onChange(active ? null : r.id)}
            className={
              "shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors " +
              (active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground")
            }
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: active ? "#fff" : colorFor(r.id) }}
            />
            {r.name}
          </button>
        );
      })}
    </div>
  );
}
