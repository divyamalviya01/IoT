import type { LucideIcon } from "lucide-react";
import { Fragment } from "react";
import { cn } from "~/lib/cn";

export type FlowTone = "brand" | "u1" | "u2" | "u3" | "copper" | "neutral";

export interface FlowNode {
  label: string;
  sub?: string;
  icon?: LucideIcon;
  tone?: FlowTone;
}

interface FlowDiagramProps {
  nodes: FlowNode[];
  /** Labels for the arrows between consecutive nodes (length nodes − 1) */
  links?: string[];
  caption?: string;
  /** Show packets moving along the arrows (hidden for reduced motion) */
  animate?: boolean;
  activeIndex?: number | null;
  onSelect?: (index: number) => void;
}

const toneText: Record<FlowTone, string> = {
  brand: "text-brand",
  u1: "text-u1",
  u2: "text-u2",
  u3: "text-u3",
  copper: "text-copper",
  neutral: "text-ink-2",
};

/*
 * Layout switches with the diagram's own width (container query), so it works
 * the same in a narrow theory column and a wide lab stage. Stacked vertically
 * when narrow, in a row when wide. Long chains need more room before they
 * switch, hence two class sets.
 */
const layout = {
  narrow: {
    row: "@lg:flex-row @lg:items-stretch",
    link: "@lg:h-auto @lg:min-w-16 @lg:w-auto @lg:flex-[0.8]",
    line: "@lg:inset-x-0 @lg:inset-y-auto @lg:top-1/2 @lg:h-0.5 @lg:w-auto @lg:-translate-y-1/2 @lg:translate-x-0 @lg:left-0",
    head: "@lg:left-auto @lg:right-0 @lg:top-1/2 @lg:bottom-auto @lg:-translate-y-1/2 @lg:translate-x-0 @lg:rotate-0",
    label: "@lg:inset-x-0.5 @lg:top-auto @lg:bottom-1/2 @lg:mb-1.5 @lg:ml-0 @lg:translate-y-0 @lg:whitespace-normal @lg:text-center @lg:text-[13px] @lg:leading-tight",
    packet: "@lg:animate-[packet-x_2.4s_linear_infinite] @lg:top-1/2 @lg:left-0 @lg:-translate-y-1/2 @lg:translate-x-0",
    node: "@lg:w-auto @lg:flex-1",
  },
  wide: {
    row: "@2xl:flex-row @2xl:items-stretch",
    link: "@2xl:h-auto @2xl:min-w-16 @2xl:w-auto @2xl:flex-[0.8]",
    line: "@2xl:inset-x-0 @2xl:inset-y-auto @2xl:top-1/2 @2xl:h-0.5 @2xl:w-auto @2xl:-translate-y-1/2 @2xl:translate-x-0 @2xl:left-0",
    head: "@2xl:left-auto @2xl:right-0 @2xl:top-1/2 @2xl:bottom-auto @2xl:-translate-y-1/2 @2xl:translate-x-0 @2xl:rotate-0",
    label: "@2xl:inset-x-0.5 @2xl:top-auto @2xl:bottom-1/2 @2xl:mb-1.5 @2xl:ml-0 @2xl:translate-y-0 @2xl:whitespace-normal @2xl:text-center @2xl:text-[13px] @2xl:leading-tight",
    packet: "@2xl:animate-[packet-x_2.4s_linear_infinite] @2xl:top-1/2 @2xl:left-0 @2xl:-translate-y-1/2 @2xl:translate-x-0",
    node: "@2xl:w-auto @2xl:flex-1",
  },
};

/** A left-to-right chain of steps, such as sensor → gateway → cloud. */
export function FlowDiagram({
  nodes,
  links = [],
  caption,
  animate = true,
  activeIndex = null,
  onSelect,
}: FlowDiagramProps) {
  const l = nodes.length > 4 ? layout.wide : layout.narrow;

  return (
    <figure className="@container print-avoid-break grid gap-3">
      <div className={cn("flex flex-col items-center", l.row)}>
        {nodes.map((node, i) => {
          const Icon = node.icon;
          const active = activeIndex === i;
          const body = (
            <>
              {Icon && (
                <Icon size={22} aria-hidden className={cn("mx-auto", toneText[node.tone ?? "neutral"])} />
              )}
              <span className="mt-1 block font-bold leading-tight">{node.label}</span>
              {node.sub && <span className="mt-0.5 block text-sm leading-snug text-ink-3">{node.sub}</span>}
            </>
          );
          const boxClass = cn(
            "w-full max-w-64 rounded-lg border bg-surface px-3 py-3 text-center",
            l.node,
            active ? "border-brand bg-brand-soft" : "border-line-strong",
          );

          return (
            <Fragment key={`${node.label}-${i}`}>
              {onSelect ? (
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(i)}
                  className={cn(boxClass, "transition-colors hover:border-brand")}
                >
                  {body}
                </button>
              ) : (
                <div className={boxClass}>{body}</div>
              )}

              {i < nodes.length - 1 && (
                <div
                  className={cn("relative h-14 w-full shrink-0", l.link)}
                  aria-hidden={!links[i]}
                >
                  <span
                    className={cn(
                      "absolute inset-y-1 left-1/2 w-0.5 -translate-x-1/2 bg-line-strong",
                      l.line,
                    )}
                  />
                  <svg
                    viewBox="0 0 10 10"
                    className={cn(
                      "absolute bottom-0 left-1/2 size-2.5 -translate-x-1/2 rotate-90 fill-line-strong",
                      l.head,
                    )}
                    aria-hidden
                  >
                    <path d="M0 0 L10 5 L0 10 Z" />
                  </svg>
                  {links[i] && (
                    <span
                      className={cn(
                        "absolute left-1/2 top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap text-sm text-ink-2",
                        l.label,
                      )}
                    >
                      {links[i]}
                    </span>
                  )}
                  {animate && (
                    <span
                      className={cn(
                        "absolute left-1/2 top-0 size-2.5 -translate-x-1/2 rounded-full bg-brand motion-reduce:hidden",
                        "animate-[packet-y_2.4s_linear_infinite]",
                        l.packet,
                      )}
                      style={{ animationDelay: `${i * 0.6}s` }}
                    />
                  )}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
      {caption && <figcaption className="text-sm text-ink-3">{caption}</figcaption>}
    </figure>
  );
}
