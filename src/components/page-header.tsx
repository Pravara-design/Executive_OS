import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-12", className)}>
      {eyebrow && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[10px] uppercase tracking-[0.32em] text-secondary">{eyebrow}</span>
          <span className="h-px flex-1 max-w-[110px] bg-border" />
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          <h1 className="font-display text-5xl lg:text-6xl tracking-tight gradient-text leading-[1.02]">{title}</h1>
          {description && (
            <p className="text-[15px] text-muted-foreground mt-4 max-w-2xl leading-relaxed">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2.5">{actions}</div>}
      </div>
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="executive-card rounded-3xl p-16 text-center">
      <h3 className="font-display text-3xl mb-3">{title}</h3>
      <p className="text-[15px] text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">{description}</p>
      {action}
    </div>
  );
}
