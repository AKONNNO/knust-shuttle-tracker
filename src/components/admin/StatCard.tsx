import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  accent?: string; // tailwind text color for the icon chip
}

export function StatCard({ icon: Icon, label, value, hint, accent = "text-primary bg-primary/10" }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${accent}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">{label}</p>
          <p className="text-2xl font-extrabold tabular-nums leading-tight">{value}</p>
        </div>
      </div>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
