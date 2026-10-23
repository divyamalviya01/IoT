import { motion, useReducedMotion } from "motion/react";
import { useId, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "~/lib/cn";
import { BOUNDARIES, ELEMENTS, getElement, type Element, type ElementKind, type Zone } from "./engine";

/*
 * The smart-door-lock data-flow diagram, shared by lab L28 and the 3.13
 * visual. Standard DFD shapes: rectangle = external entity, circle = process,
 * two parallel lines = data store, arrow = data flow, dashed box = trust zone.
 * Wide containers get a left-to-right layout; narrow ones (phones) get the
 * same diagram turned top-to-bottom so the labels stay readable.
 */

export const KIND_LABEL: Record<ElementKind, string> = {
  external: "External entity",
  process: "Process",
  store: "Data store",
  flow: "Data flow",
};

/** Short names for tight places: observation rows, top-risk lists. */
export const SHORT_NAME: Record<string, string> = {
  resident: "Resident",
  app: "App",
  cloud: "Cloud API",
  registry: "Registry",
  log: "Access log",
  hub: "Hub",
  lock: "Lock",
  "f-app-cloud": "App→Cloud",
  "f-cloud-hub": "Cloud→Hub",
  "f-hub-lock": "Hub→Lock",
};

const LINES: Record<string, string[]> = {
  resident: ["Resident"],
  app: ["Mobile", "app"],
  cloud: ["Cloud", "API"],
  registry: ["Device", "registry"],
  log: ["Access", "log"],
  hub: ["Home", "hub"],
  lock: ["Smart", "lock"],
};

const PROTOCOL: Record<string, string> = { "f-app-cloud": "HTTPS", "f-cloud-hub": "MQTT/TLS", "f-hub-lock": "BLE" };

const ZONE_NAME = Object.fromEntries(BOUNDARIES.map((b) => [b.zone, b.name])) as Record<Zone, string>;
export const zoneName = (z: Zone) => ZONE_NAME[z];

/** The trust boundary a data flow crosses, or null if it stays in one zone. */
export function crossingOf(flow: Element): { from: string; to: string } | null {
  if (flow.kind !== "flow" || !flow.from || !flow.to) return null;
  const a = getElement(flow.from).zone;
  const b = getElement(flow.to).zone;
  return a === b ? null : { from: zoneName(a), to: zoneName(b) };
}

/** The flow itself, or the flows that start or end at an element. */
export function flowsAt(id: string): Element[] {
  const e = getElement(id);
  if (e.kind === "flow") return [e];
  return ELEMENTS.filter((f) => f.kind === "flow" && (f.from === id || f.to === id));
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/** Trust zones along the main axis, in diagram units × 10. */
const BANDS: Record<Zone, [number, number]> = { phone: [6, 316], internet: [330, 662], home: [674, 810], radio: [822, 994] };
const ZONES: Zone[] = ["phone", "internet", "home", "radio"];
const ZONE_LINES_WIDE: Record<Zone, string[]> = { phone: ["Phone"], internet: ["Internet and cloud"], home: ["Home", "network"], radio: ["Bluetooth", "range"] };

const R = 54; // process circle
const EXT = { hw: 64, hh: 42 };
const STORE = { hw: 70, hh: 34 };
const FONT = 26;

interface Geo {
  vertical: boolean;
  w: number;
  h: number;
  /** Diagram units (0–100 along, 0–60 across) to SVG units */
  pt: (x: number, y: number) => { x: number; y: number };
}

const WIDE: Geo = { vertical: false, w: 1000, h: 620, pt: (x, y) => ({ x: x * 10, y: y * 10 }) };
const TALL: Geo = { vertical: true, w: 640, h: 1000, pt: (x, y) => ({ x: y * 10 + 10, y: x * 10 }) };

const at = (g: Geo, e: Element) => g.pt(e.x ?? 0, e.y ?? 0);

/** Distance from a shape's centre to its edge in the unit direction (dx, dy). */
function edge(e: Element, dx: number, dy: number) {
  if (e.kind === "process") return R;
  const { hw, hh } = e.kind === "store" ? STORE : EXT;
  return Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
}

function segment(g: Geo, a: Element, b: Element, gap = 6) {
  const A = at(g, a);
  const B = at(g, b);
  const len = Math.hypot(B.x - A.x, B.y - A.y);
  const ux = (B.x - A.x) / len;
  const uy = (B.y - A.y) / len;
  const s = edge(a, ux, uy) + gap;
  const t = edge(b, ux, uy) + gap;
  return { x1: A.x + ux * s, y1: A.y + uy * s, x2: B.x - ux * t, y2: B.y - uy * t };
}

/** Where a flow crosses the dashed line between two zones. */
function crossingPoint(g: Geo, f: Element) {
  const a = getElement(f.from!);
  const b = getElement(f.to!);
  const [, endA] = BANDS[a.zone];
  const [startB] = BANDS[b.zone];
  const along = (endA + startB) / 2 / 10;
  const A = { x: a.x ?? 0, y: a.y ?? 0 };
  const B = { x: b.x ?? 0, y: b.y ?? 0 };
  const t = (along - A.x) / (B.x - A.x);
  return g.pt(along, A.y + (B.y - A.y) * t);
}

/** Thin grey arrows: flows inside one zone, drawn for context but not rated in the lab. */
const CONTEXT_LINKS: { from: string; to: string; both?: boolean }[] = [
  { from: "resident", to: "app" },
  { from: "cloud", to: "registry", both: true },
  { from: "cloud", to: "log" },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export interface DfdProps {
  /** Elements drawn as chosen (in the model, or the one being studied) */
  selected: ReadonlySet<string>;
  /** Makes every element a button */
  onToggle?: (id: string) => void;
  /** Small number badge on chosen elements, e.g. their threat count */
  counts?: Readonly<Record<string, number>>;
  /** Flows whose trust-boundary crossing is highlighted; when given, every crossing is marked */
  crossings?: ReadonlySet<string>;
  /** Accessible name of the whole diagram */
  label: string;
  /** Accessible name of one element's button */
  describe?: (e: Element, selected: boolean) => string;
  className?: string;
}

export function Dfd(props: DfdProps) {
  return (
    <div className={cn("@container min-w-0", props.className)}>
      <DfdSvg {...props} geo={WIDE} className="mx-auto hidden w-full max-w-[56rem] @xl:block" />
      <DfdSvg {...props} geo={TALL} className="mx-auto block w-full max-w-[26rem] @xl:hidden" />
    </div>
  );
}

const defaultDescribe = (e: Element, selected: boolean) => `${e.name}, ${KIND_LABEL[e.kind].toLowerCase()}${selected ? ", selected" : ""}`;

function DfdSvg({ selected, onToggle, counts, crossings, label, describe = defaultDescribe, geo: g, className }: DfdProps & { geo: Geo; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const reduced = useReducedMotion() ?? false;
  const arrow = (tone: string) => `url(#${uid}-${tone})`;

  const interactive = (e: Element, children: ReactNode) => {
    const on = selected.has(e.id);
    if (!onToggle) return <g key={e.id}>{children}</g>;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        onToggle(e.id);
      }
    };
    return (
      <g
        key={e.id}
        role="button"
        tabIndex={0}
        aria-pressed={on}
        aria-label={describe(e, on)}
        onClick={() => onToggle(e.id)}
        onKeyDown={onKey}
        className="group cursor-pointer outline-none [&:focus-visible_.dfd-ring]:opacity-100"
      >
        {children}
      </g>
    );
  };

  const badge = (e: Element, x: number, y: number) => {
    const n = counts?.[e.id];
    if (n === undefined || !selected.has(e.id)) return null;
    return (
      <g aria-hidden className="pointer-events-none">
        <circle cx={x} cy={y} r={18} fill="var(--u3)" stroke="var(--surface)" strokeWidth={3} />
        <text x={x} y={y} textAnchor="middle" dominantBaseline="central" className="fill-surface font-mono text-[20px] font-bold">
          {n}
        </text>
      </g>
    );
  };

  const nameText = (e: Element, x: number, y: number, on: boolean) => {
    const lines = LINES[e.id] ?? [e.name];
    const lh = FONT + 2;
    return (
      <text textAnchor="middle" className={cn("pointer-events-none font-semibold", on ? "fill-ink" : "fill-ink-2")} style={{ fontSize: FONT }}>
        {lines.map((l, i) => (
          <tspan key={l} x={x} y={y + (i - (lines.length - 1) / 2) * lh} dominantBaseline="central">
            {l}
          </tspan>
        ))}
      </text>
    );
  };

  const shapeStroke = (on: boolean) => (on ? "var(--u3)" : "var(--ink-3)");
  const shapeFill = (on: boolean) => (on ? "var(--u3-soft)" : "var(--surface)");

  const node = (e: Element) => {
    const on = selected.has(e.id);
    const { x, y } = at(g, e);
    const sw = on ? 4 : 2.5;
    if (e.kind === "process") {
      return interactive(
        e,
        <>
          <circle cx={x} cy={y} r={R + 7} fill="none" stroke="var(--focus)" strokeWidth={4} opacity={0} className="dfd-ring" />
          <circle cx={x} cy={y} r={R} fill={shapeFill(on)} stroke={shapeStroke(on)} strokeWidth={sw} className="transition-colors group-hover:stroke-[var(--u3)]" />
          {nameText(e, x, y, on)}
          {badge(e, x + R * 0.74, y - R * 0.74)}
        </>,
      );
    }
    if (e.kind === "external") {
      const { hw, hh } = EXT;
      return interactive(
        e,
        <>
          <rect x={x - hw - 7} y={y - hh - 7} width={(hw + 7) * 2} height={(hh + 7) * 2} rx={6} fill="none" stroke="var(--focus)" strokeWidth={4} opacity={0} className="dfd-ring" />
          <rect x={x - hw} y={y - hh} width={hw * 2} height={hh * 2} fill={shapeFill(on)} stroke={shapeStroke(on)} strokeWidth={sw} className="transition-colors group-hover:stroke-[var(--u3)]" />
          {nameText(e, x, y, on)}
          {badge(e, x + hw - 4, y - hh + 2)}
        </>,
      );
    }
    // Data store: open at both ends, two parallel lines.
    const { hw, hh } = STORE;
    return interactive(
      e,
      <>
        <rect x={x - hw - 7} y={y - hh - 7} width={(hw + 7) * 2} height={(hh + 7) * 2} rx={6} fill="none" stroke="var(--focus)" strokeWidth={4} opacity={0} className="dfd-ring" />
        <rect x={x - hw} y={y - hh} width={hw * 2} height={hh * 2} fill={shapeFill(on)} />
        <line x1={x - hw} y1={y - hh} x2={x + hw} y2={y - hh} stroke={shapeStroke(on)} strokeWidth={sw} className="transition-colors group-hover:stroke-[var(--u3)]" />
        <line x1={x - hw} y1={y + hh} x2={x + hw} y2={y + hh} stroke={shapeStroke(on)} strokeWidth={sw} className="transition-colors group-hover:stroke-[var(--u3)]" />
        {nameText(e, x, y, on)}
        {badge(e, x + hw - 4, y - hh)}
      </>,
    );
  };

  const flow = (f: Element) => {
    const on = selected.has(f.id);
    const a = getElement(f.from!);
    const b = getElement(f.to!);
    const s = segment(g, a, b);
    // Put the label and badge on the longer stretch of arrow, clear of the dashed boundary lines.
    const m1 = g.vertical ? s.y1 : s.x1;
    const m2 = g.vertical ? s.y2 : s.x2;
    const endA = BANDS[a.zone][1];
    const startB = BANDS[b.zone][0];
    const c = endA - m1 >= m2 - startB ? (m1 + endA) / 2 : (startB + m2) / 2;
    const t = (c - m1) / (m2 - m1);
    const mx = s.x1 + (s.x2 - s.x1) * t;
    const my = s.y1 + (s.y2 - s.y1) * t;
    const labelPos = g.vertical ? { x: mx + 20, y: my, anchor: "start" as const } : { x: mx, y: my - 30, anchor: "middle" as const };
    const badgePos = g.vertical ? { x: mx - 34, y: my } : { x: mx, y: my + 34 };
    return interactive(
      f,
      <>
        <line {...s} stroke="var(--focus)" strokeWidth={22} strokeLinecap="round" opacity={0} className="dfd-ring" />
        <line {...s} stroke="transparent" strokeWidth={48} />
        <line {...s} stroke={on ? "var(--u3)" : "var(--ink-2)"} strokeWidth={on ? 6 : 3.5} markerEnd={arrow(on ? "on" : "off")} className="transition-colors" />
        <text x={labelPos.x} y={labelPos.y} textAnchor={labelPos.anchor} dominantBaseline="central" className={cn("pointer-events-none font-mono text-[20px] font-bold", on ? "fill-u3" : "fill-ink-2")}>
          {PROTOCOL[f.id]}
        </text>
        {badge(f, badgePos.x, badgePos.y)}
      </>,
    );
  };

  const zoneRect = (z: Zone) => {
    const [a, b] = BANDS[z];
    return g.vertical ? { x: 8, y: a, width: g.w - 16, height: b - a } : { x: a, y: 8, width: b - a, height: g.h - 16 };
  };

  const zoneLabel = (z: Zone) => {
    const [a] = BANDS[z];
    if (g.vertical) {
      return (
        <text x={g.w - 18} y={a + 28} textAnchor="end" className="fill-ink-3 text-[21px] font-semibold">
          {zoneName(z)}
        </text>
      );
    }
    const lines = ZONE_LINES_WIDE[z];
    return (
      <text className="fill-ink-3 text-[21px] font-semibold">
        {lines.map((l, i) => (
          <tspan key={l} x={a + 10} y={g.h - 22 - (lines.length - 1 - i) * 24}>
            {l}
          </tspan>
        ))}
      </text>
    );
  };

  const flows = ELEMENTS.filter((e) => e.kind === "flow");

  return (
    <svg viewBox={`0 0 ${g.w} ${g.h}`} className={className} role="group" aria-label={label}>
      <defs>
        {[
          ["on", "var(--u3)"],
          ["off", "var(--ink-2)"],
          ["ctx", "var(--ink-3)"],
        ].map(([id, color]) => (
          <marker key={id} id={`${uid}-${id}`} viewBox="0 0 20 20" refX={18} refY={10} markerWidth={id === "ctx" ? 15 : 20} markerHeight={id === "ctx" ? 15 : 20} markerUnits="userSpaceOnUse" orient="auto-start-reverse">
            <path d="M0,0 L20,10 L0,20 z" fill={color} />
          </marker>
        ))}
      </defs>

      {/* Trust zones: dashed boxes. Data that moves between them crosses a trust boundary. */}
      {ZONES.map((z) => (
        <g key={z} aria-hidden>
          <rect {...zoneRect(z)} rx={14} fill="var(--surface-2)" fillOpacity={0.6} stroke="var(--ink-3)" strokeWidth={2} strokeDasharray="10 8" />
          {zoneLabel(z)}
        </g>
      ))}

      {CONTEXT_LINKS.map((l) => {
        const s = segment(g, getElement(l.from), getElement(l.to), 5);
        return <line key={`${l.from}-${l.to}`} {...s} stroke="var(--ink-3)" strokeWidth={2} markerEnd={arrow("ctx")} markerStart={l.both ? arrow("ctx") : undefined} aria-hidden />;
      })}

      {ELEMENTS.filter((e) => e.kind !== "flow").map(node)}
      {flows.map(flow)}

      {crossings &&
        flows.map((f) => {
          const p = crossingPoint(g, f);
          const hot = crossings.has(f.id);
          return (
            <g key={`x-${f.id}`} aria-hidden className="pointer-events-none">
              {hot && !reduced && (
                <motion.circle cx={p.x} cy={p.y} fill="none" stroke="var(--warn)" strokeWidth={3} initial={{ r: 14, opacity: 0.8 }} animate={{ r: 34, opacity: 0 }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }} />
              )}
              <rect
                x={p.x - (hot ? 13 : 8)}
                y={p.y - (hot ? 13 : 8)}
                width={hot ? 26 : 16}
                height={hot ? 26 : 16}
                transform={`rotate(45 ${p.x} ${p.y})`}
                fill={hot ? "var(--warn)" : "var(--surface)"}
                stroke={hot ? "var(--surface)" : "var(--ink-3)"}
                strokeWidth={hot ? 3 : 2.5}
              />
            </g>
          );
        })}
    </svg>
  );
}

/** Key to the diagram's shapes. */
export function DfdLegend({ crossing = false, context = true }: { crossing?: boolean; context?: boolean }) {
  const icon = (children: ReactNode) => (
    <svg width="30" height="20" viewBox="0 0 30 20" aria-hidden className="shrink-0">
      {children}
    </svg>
  );
  const items: { key: string; icon: ReactNode; text: string }[] = [
    { key: "ext", icon: icon(<rect x="3" y="3" width="24" height="14" fill="var(--surface)" stroke="var(--ink-3)" strokeWidth="1.5" />), text: "External entity (a person)" },
    { key: "proc", icon: icon(<circle cx="15" cy="10" r="8" fill="var(--surface)" stroke="var(--ink-3)" strokeWidth="1.5" />), text: "Process" },
    {
      key: "store",
      icon: icon(
        <>
          <line x1="3" y1="4" x2="27" y2="4" stroke="var(--ink-3)" strokeWidth="1.5" />
          <line x1="3" y1="16" x2="27" y2="16" stroke="var(--ink-3)" strokeWidth="1.5" />
        </>,
      ),
      text: "Data store",
    },
    {
      key: "flow",
      icon: icon(
        <>
          <line x1="2" y1="10" x2="22" y2="10" stroke="var(--ink-2)" strokeWidth="2" />
          <path d="M20,5 L28,10 L20,15 z" fill="var(--ink-2)" />
        </>,
      ),
      text: "Data flow",
    },
    { key: "zone", icon: icon(<rect x="2" y="2" width="26" height="16" rx="3" fill="none" stroke="var(--ink-3)" strokeWidth="1.5" strokeDasharray="4 3" />), text: "Trust zone (dashed edge = trust boundary)" },
  ];
  if (crossing) {
    items.push({ key: "cross", icon: icon(<rect x="9" y="4" width="12" height="12" transform="rotate(45 15 10)" fill="var(--warn)" />), text: "Data crosses a trust boundary" });
  }
  if (context) {
    items.push({
      key: "ctx",
      icon: icon(
        <>
          <line x1="2" y1="10" x2="23" y2="10" stroke="var(--ink-3)" strokeWidth="1" />
          <path d="M21,6 L28,10 L21,14 z" fill="var(--ink-3)" />
        </>,
      ),
      text: "Thin arrow: flow inside one zone (not rated here)",
    });
  }
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-2">
      {items.map((i) => (
        <li key={i.key} className="flex items-center gap-1.5">
          {i.icon}
          {i.text}
        </li>
      ))}
    </ul>
  );
}
