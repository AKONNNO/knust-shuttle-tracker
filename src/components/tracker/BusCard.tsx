import { Bus as BusIcon, Wifi, WifiOff, ChevronRight, MessageSquare } from "lucide-react";
import type { LiveBus } from "@/lib/types";

export interface BusEtaInfo {
  nextStopName: string | null;
  etaLabel: string | null;
  remainingM: number | null;
}

interface BusCardProps {
  bus: LiveBus;
  routeColor: string;
  offline: boolean;
  eta: BusEtaInfo;
  selected: boolean;
  onSelect: () => void;
  /** Number of student remarks on this ride (0/undefined hides the chip). */
  commentCount?: number;
}

export function BusCard({ bus, routeColor, offline, eta, selected, onSelect, commentCount = 0 }: BusCardProps) {
  return (
    <button
      onClick={onSelect}
      className={
        "w-full text-left rounded-2xl border p-3.5 transition-all " +
        (selected
          ? "border-primary/60 bg-primary/[0.06] shadow-md ring-2 ring-primary/20"
          : "border-border/70 bg-card hover:border-primary/40 hover:shadow-md")
      }
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-primary-foreground shadow-sm"
          style={{ background: routeColor }}
        >
          <BusIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-extrabold text-[15px] tracking-tight truncate">{bus.name}</p>
            {commentCount > 0 && (
              <span
                title={`${commentCount} remark${commentCount === 1 ? "" : "s"}`}
                className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-bold shrink-0"
              >
                <MessageSquare className="h-3 w-3" />
                {commentCount}
              </span>
            )}
            {offline ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200 text-zinc-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                <WifiOff className="h-3 w-3" /> Offline
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                <Wifi className="h-3 w-3" /> Live
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {bus.routes?.name ?? "No route assigned"}
            {bus.drivers?.full_name ? (
              <span className="text-muted-foreground/70"> · {bus.drivers.full_name}</span>
            ) : null}
          </p>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            {eta.nextStopName ? (
              <p className="text-[13px] font-semibold text-foreground/90 truncate">
                Next: <span className="text-primary">{eta.nextStopName}</span>
                {eta.etaLabel && (
                  <span className="ml-1.5 rounded-full bg-secondary/25 text-secondary-foreground px-2 py-0.5 text-[11px] font-bold">
                    {eta.etaLabel}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-[13px] font-semibold text-muted-foreground">Awaiting location…</p>
            )}
            <ChevronRight
              className={"h-4 w-4 shrink-0 transition-transform " + (selected ? "text-primary rotate-90" : "text-muted-foreground/60")}
            />
          </div>
        </div>
      </div>
    </button>
  );
}
