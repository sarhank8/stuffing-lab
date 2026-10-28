import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  hint,
  children,
  className,
}: {
  title?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card", className)}>
      {title !== undefined && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h2 className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {title}
          </h2>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function TButton({
  children,
  onClick,
  variant = "default",
  disabled,
  className,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "ghost";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors disabled:pointer-events-none disabled:opacity-40",
        variant === "default" && "border-border bg-secondary text-foreground hover:bg-muted",
        variant === "primary" &&
          "border-primary bg-primary text-primary-foreground hover:bg-primary/85",
        variant === "ghost" && "border-transparent text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Legend({ items }: { items: { swatch: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={cn("h-2.5 w-2.5 rounded-sm", item.swatch)} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
