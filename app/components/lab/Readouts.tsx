import type { ReactNode } from "react";
import { cn } from "~/lib/cn";

export interface Readout {
  label: string;
  value: ReactNode;
  unit?: string;
  tone?: "default" | "ok" | "warn" | "bad";
  hint?: string;
}

const toneClass = {
  default: "text-ink",
  ok: "text-ok",
  warn: "text-warn",
  bad: "text-bad",
};

/** Live measurements from a simulation, laid out like instrument readouts. */
export function Readouts({
  items,
  className,
  columns = 4,
}: {
  items: Readout[];
  className?: string;
  /** Columns on wider screens; phones always use two */
  columns?: 2 | 4;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line",
        columns === 4 && "sm:grid-cols-4",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="bg-surface px-3 py-2.5" title={item.hint}>
          <dt className="text-sm text-ink-3">{item.label}</dt>
          <dd className={cn("mt-0.5 font-mono text-xl tabular-nums", toneClass[item.tone ?? "default"])}>
            {item.value}
            {item.unit && <span className="ml-1 text-sm text-ink-3">{item.unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
