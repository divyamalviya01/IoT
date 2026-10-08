import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "~/lib/cn";
import { formatSimTime } from "./useSimClock";

export type EventTone = "info" | "ok" | "warn" | "bad";

export interface SimEvent {
  id: number;
  /** Simulated time in ms */
  t: number;
  text: string;
  tone?: EventTone;
  /** Category used by the filter, e.g. "sent", "delivered" */
  kind?: string;
}

const dot: Record<EventTone, string> = {
  info: "bg-ink-3",
  ok: "bg-ok",
  warn: "bg-warn",
  bad: "bg-bad",
};

interface EventLogProps {
  events: SimEvent[];
  title?: string;
  /** Filter chips, e.g. [{ kind: "lost", label: "Lost" }] */
  filters?: { kind: string; label: string }[];
  height?: number;
  emptyText?: string;
  className?: string;
}

/** A scrolling, timestamped log of what the simulation did. */
export function EventLog({
  events,
  title = "Event log",
  filters,
  height = 220,
  emptyText = "Nothing has happened yet. Press Play to start the simulation.",
  className,
}: EventLogProps) {
  const [active, setActive] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  const shown = useMemo(
    () => (active ? events.filter((e) => e.kind === active) : events),
    [events, active],
  );

  // Follow new events unless the reader has scrolled up to look at older ones.
  useEffect(() => {
    const el = scroller.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [shown.length]);

  return (
    <section className={cn("rounded-lg border border-line bg-surface", className)}>
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <h3 className="font-bold">{title}</h3>
        <span className="text-sm text-ink-3">{events.length} events</span>
        {filters && filters.length > 0 && (
          <div className="ml-auto flex flex-wrap gap-1" role="group" aria-label="Filter events">
            <FilterChip label="All" pressed={active === null} onClick={() => setActive(null)} />
            {filters.map((f) => (
              <FilterChip
                key={f.kind}
                label={f.label}
                pressed={active === f.kind}
                onClick={() => setActive(active === f.kind ? null : f.kind)}
              />
            ))}
          </div>
        )}
      </header>
      <div
        ref={scroller}
        role="log"
        aria-live="off"
        aria-label={title}
        tabIndex={0}
        onScroll={(e) => {
          const el = e.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
        style={{ height }}
        className="overflow-y-auto px-3 py-2 text-sm"
      >
        {shown.length === 0 ? (
          <p className="py-6 text-center text-ink-3">{emptyText}</p>
        ) : (
          <ol className="grid gap-1">
            {shown.map((e) => (
              <li key={e.id} className="flex items-baseline gap-2.5">
                <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums text-ink-3">
                  {formatSimTime(e.t)}
                </span>
                <span
                  className={cn("size-2 shrink-0 translate-y-[-1px] rounded-full", dot[e.tone ?? "info"])}
                  aria-hidden
                />
                <span className="text-ink-2">{e.text}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function FilterChip({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "rounded-md px-2 py-0.5 text-sm font-semibold",
        pressed ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2",
      )}
    >
      {label}
    </button>
  );
}
