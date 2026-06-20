import { cn } from "@/lib/utils";
import type { KpiMetric } from "@/lib/api/types";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

const fmt = (m: KpiMetric) => {
  if (m.format === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: m.value >= 1000 ? 0 : 2,
      notation: m.value >= 100000 ? "compact" : "standard",
    }).format(m.value);
  }
  if (m.format === "percent") return `${m.value.toFixed(1)}%`;
  return new Intl.NumberFormat("en-US", { notation: m.value >= 100000 ? "compact" : "standard" }).format(m.value);
};

export function KpiCard({ metric, className }: { metric: KpiMetric; className?: string }) {
  const up = (metric.delta ?? 0) >= 0;
  const sparkData = (metric.trend ?? []).map((v, i) => ({ i, v }));
  return (
    <div className={cn("executive-card rounded-2xl p-6 relative overflow-hidden", className)}>
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{metric.label}</p>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="font-display text-4xl tracking-tight tabular">{fmt(metric)}</span>
        {metric.delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-md",
              up ? "text-success bg-success/12" : "text-destructive bg-destructive/12",
            )}
          >
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(metric.delta).toFixed(1)}%
          </span>
        )}
      </div>
      {sparkData.length > 1 && (
        <div className="absolute right-0 bottom-0 h-14 w-32 opacity-70">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id={`spark-${metric.key}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="var(--color-chart-1)" strokeWidth={1.5} fill={`url(#spark-${metric.key})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
