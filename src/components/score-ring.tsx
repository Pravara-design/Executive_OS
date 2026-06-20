import { cn } from "@/lib/utils";

export function ScoreRing({
  value,
  label,
  size = 120,
  tone = "primary",
}: {
  value: number; // 0-100
  label: string;
  size?: number;
  tone?: "primary" | "success" | "warning" | "destructive";
}) {
  const v = Math.max(0, Math.min(100, value));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;
  const colorVar =
    tone === "success"
      ? "var(--color-success)"
      : tone === "warning"
      ? "var(--color-warning)"
      : tone === "destructive"
      ? "var(--color-destructive)"
      : "var(--color-chart-1)";
  return (
    <div className={cn("flex flex-col items-center")} style={{ width: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-border)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colorVar}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="-mt-[calc(50%+8px)] font-display text-3xl">{Math.round(v)}</div>
      <p className="mt-[calc(50%-12px)] text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    </div>
  );
}
