/**
 * Dashboard widgets for L21 and the 3.5 Cloud dashboards visual. Each widget
 * has a title and copes with having no data stream ("unbound").
 */
import {
  BellRing,
  ChartLine,
  CircleCheck,
  Clock,
  DoorClosed,
  DoorOpen,
  Gauge as GaugeIcon,
  Hash,
  Lightbulb,
  LightbulbOff,
  LoaderCircle,
  Map as MapIcon,
  Radio,
  Table2,
  ToggleRight,
  TriangleAlert,
  Unplug,
  type LucideIcon,
} from "lucide-react";
import { memo, useId, useMemo, useState, type ReactNode } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip, chartStyle, seriesColor } from "~/components/theory/ChartCard";
import { cn } from "~/lib/cn";
import { useHydrated } from "~/lib/useHydrated";
import {
  ROUTE,
  UPDATE_MODES,
  WIDGETS,
  alertValues,
  evaluateAlert,
  formatValue,
  getStream,
  shownTick,
  updateCost,
  type AlertRun,
  type Point2D,
  type StreamId,
  type Streams,
  type UpdateMode,
  type Widget,
  type WidgetKind,
} from "./engine";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

export type BulbView = "on" | "off" | "turning on" | "turning off";

export const KIND_ICON: Record<WidgetKind, LucideIcon> = {
  gauge: GaugeIcon,
  line: ChartLine,
  value: Hash,
  map: MapIcon,
  switch: ToggleRight,
  alert: BellRing,
};

/** Each stream keeps one colour wherever it is drawn. */
export const STREAM_COLOR: Record<StreamId, string> = {
  temperature: seriesColor(1),
  humidity: seriesColor(0),
  power: seriesColor(6),
  door: seriesColor(2),
  van: "var(--u3)",
  bulb: seriesColor(3),
};

/** Seconds of history a line chart shows */
export const LINE_WINDOW = 60;

const SENSOR_IDS = ["temperature", "humidity", "power", "door", "van"] as const;
type SensorId = (typeof SENSOR_IDS)[number];
const isSensor = (id: StreamId): id is SensorId => (SENSOR_IDS as readonly string[]).includes(id);

export function valueAt(streams: Streams, id: StreamId, i: number): number | boolean | Point2D | undefined {
  return isSensor(id) ? streams[id][i] : undefined;
}

export const pollEvery = (mode: UpdateMode) => UPDATE_MODES.find((m) => m.id === mode)?.every;

/**
 * The alert rule a widget runs in the cloud, over the whole stream. The door
 * is 1 while open and 0 while closed (threshold 0.5), so its rule fires while it is open
 * ("above") or closed ("below").
 */
export function alertRun(w: Widget, streams: Streams): AlertRun | null {
  if (w.kind !== "alert" || !w.stream || w.threshold === undefined) return null;
  const values = alertValues(streams, w.stream);
  if (!values.length) return null;
  return evaluateAlert(values, w.threshold, w.dir ?? "above", w.hysteresis ?? 0);
}

/** "Goes off above 34 °C, clears below 33.5 °C" */
export function ruleText(w: Widget): string {
  if (!w.stream) return "";
  const s = getStream(w.stream);
  const dir = w.dir ?? "above";
  if (s.kind === "boolean" && s.states) return `Goes off while ${(dir === "above" ? s.states[0] : s.states[1]).toLowerCase()}`;
  if (w.threshold === undefined) return "No threshold set, so it can never go off";
  const unit = s.unit ? ` ${s.unit}` : "";
  const h = w.hysteresis ?? 0;
  const clear = dir === "above" ? w.threshold - h : w.threshold + h;
  return `Goes off ${dir} ${w.threshold}${unit}${h > 0 ? `, clears ${dir === "above" ? "below" : "above"} ${+clear.toFixed(2)}${unit}` : ""}`;
}

/** Window used to work out messages per minute */
const COST_WINDOW = 600;

/**
 * Messages per minute the dashboard needs: every bound widget fetches (or is
 * sent) its own stream. The switch sends commands instead, so it is left out.
 */
export function dashboardCost(widgets: Widget[], streams: Streams, mode: UpdateMode, from: number) {
  let messages = 0;
  let age = 0;
  let counted = 0;
  for (const w of widgets) {
    if (!w.stream || !isSensor(w.stream)) continue;
    const values: unknown[] = streams[w.stream].slice(from, from + COST_WINDOW);
    const c = updateCost(values, mode);
    messages += c.messages;
    age += c.avgAgeS;
    counted++;
  }
  return { perMinute: (messages * 60) / COST_WINDOW, avgAgeS: counted ? age / counted : 0, widgets: counted };
}

/* ------------------------------------------------------------------ */
/* Frame and unbound state                                             */
/* ------------------------------------------------------------------ */

export function WidgetFrame({
  kind,
  title,
  children,
  footer,
  actions,
  badges,
  className,
}: {
  kind: WidgetKind;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** A small button in the header, e.g. Edit */
  actions?: ReactNode;
  /** Labels shown on their own row under the title, e.g. "Tip 2" */
  badges?: ReactNode;
  className?: string;
}) {
  const Icon = KIND_ICON[kind];
  const name = title.trim();
  return (
    <section
      aria-label={`${WIDGETS[kind].label}: ${name || "no title"}`}
      className={cn("flex h-full min-w-0 flex-col gap-2 rounded-lg border border-line bg-surface p-3", className)}
    >
      <header className="relative grid min-w-0 gap-1">
        <div className={cn("flex min-w-0 items-start gap-1.5", actions ? "pr-7" : undefined)}>
          <Icon size={16} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
          <h4 className={cn("min-w-0 flex-1 text-sm font-semibold leading-snug break-words hyphens-auto", name ? "text-ink" : "italic text-ink-3")}>
            {name || "No title"}
          </h4>
        </div>
        {actions && <div className="absolute -right-1.5 -top-1.5">{actions}</div>}
        {badges && <div className="flex flex-wrap gap-1">{badges}</div>}
      </header>
      <div className="grid min-w-0 flex-1 content-center">{children}</div>
      {footer && <footer className="text-xs text-ink-3">{footer}</footer>}
    </section>
  );
}

export function Unbound({ text = "Not connected to any data" }: { text?: string }) {
  return (
    <div className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-line-strong px-2 py-3 text-center text-sm text-ink-3">
      <Unplug size={18} aria-hidden />
      {text}
    </div>
  );
}

function Freshness({ mode, age }: { mode: UpdateMode; age: number }) {
  const every = pollEvery(mode);
  if (!every)
    return (
      <span className="inline-flex items-center gap-1">
        <Radio size={12} aria-hidden /> Live: pushed when it changes
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1">
      <Clock size={12} aria-hidden /> {age === 0 ? "Updated just now" : `Updated ${age} s ago`} · polls every {every} s
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Gauge                                                               */
/* ------------------------------------------------------------------ */

const GC = { x: 60, y: 58, r: 48 };
const gp = (a: number) => ({ x: GC.x + GC.r * Math.cos((a * Math.PI) / 180), y: GC.y - GC.r * Math.sin((a * Math.PI) / 180) });

export function Gauge({
  value,
  min,
  max,
  unit,
  decimals = 0,
  color = "var(--u3)",
}: {
  value?: number;
  min?: number;
  max?: number;
  unit?: string;
  decimals?: number;
  color?: string;
}) {
  const ranged = min !== undefined && max !== undefined && min < max;
  const f = ranged && value !== undefined ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const start = gp(180);
  const end = gp(0);
  const tip = gp(180 - 180 * f);
  const text = value === undefined ? "–" : value.toFixed(decimals);
  return (
    <div className="grid w-full max-w-[13rem] justify-self-center">
      <div className="relative">
        <svg
          viewBox="0 0 120 64"
          className="block w-full"
          role="img"
          aria-label={
            ranged ? `Gauge reading ${text} ${unit ?? ""} on a scale from ${min} to ${max}` : `Gauge reading ${text} ${unit ?? ""}, no range set`
          }
        >
          <path
            d={`M ${start.x} ${start.y} A ${GC.r} ${GC.r} 0 0 1 ${end.x} ${end.y}`}
            fill="none"
            stroke="var(--line)"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={ranged ? undefined : "4 5"}
          />
          {f > 0 && (
            <path d={`M ${start.x} ${start.y} A ${GC.r} ${GC.r} 0 0 1 ${tip.x} ${tip.y}`} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" />
          )}
        </svg>
        <p className="absolute inset-x-0 bottom-0 text-center leading-none">
          <span className="font-mono text-2xl font-semibold tabular-nums text-ink">{text}</span>
          {unit && <span className="ml-1 text-sm text-ink-3">{unit}</span>}
        </p>
      </div>
      {ranged ? (
        <p className="mt-1 flex justify-between px-0.5 font-mono text-xs tabular-nums text-ink-3" aria-hidden>
          <span>{min}</span>
          <span>{max}</span>
        </p>
      ) : (
        <p className="mt-1.5 flex items-center justify-center gap-1 text-xs font-semibold text-warn">
          <TriangleAlert size={13} aria-hidden /> No range set
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Line chart                                                          */
/* ------------------------------------------------------------------ */

export interface LinePoint {
  /** Seconds relative to now (0 = now, negative = in the past) */
  x: number;
  v: number;
}

const agoText = (x: number) => (x === 0 ? "now" : `${-x} s ago`);

export function MiniLine({
  data,
  name,
  unit,
  color,
  decimals = 0,
  height = 128,
}: {
  data: LinePoint[];
  name: string;
  unit?: string;
  color: string;
  decimals?: number;
  height?: number;
}) {
  const hydrated = useHydrated();
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();
  const latest = data.at(-1);
  const u = unit ? ` ${unit}` : "";
  // A no-break space keeps "2000 W" on one tick line; the axis is as wide as its longest label.
  const tickUnit = unit ? ` ${unit}` : "";
  const longest = Math.max(0, ...data.map((p) => `${Math.abs(p.v).toFixed(decimals)}${tickUnit}`.length));
  const axisWidth = Math.max(40, Math.ceil(longest * 7) + 14);
  return (
    <div className="grid min-w-0 gap-1.5">
      <p className="text-sm text-ink-3">
        Latest{" "}
        <span className="font-mono text-base font-semibold tabular-nums text-ink">{latest ? `${latest.v.toFixed(decimals)}${u}` : "–"}</span>
        {latest && latest.x < 0 && <span> ({agoText(latest.x)})</span>}
      </p>
      <div style={{ height }} aria-hidden={showTable}>
        {hydrated && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid {...chartStyle.grid} />
              <XAxis
                dataKey="x"
                type="number"
                domain={[-LINE_WINDOW, 0]}
                ticks={[-LINE_WINDOW, -LINE_WINDOW / 2, 0]}
                tickFormatter={(v: number) => (v === 0 ? "now" : `${v} s`)}
                {...chartStyle.axis}
                tick={{ ...chartStyle.axis.tick, fontSize: 11 }}
              />
              <YAxis
                domain={["auto", "auto"]}
                width={axisWidth}
                unit={tickUnit}
                tickFormatter={(v: number) => v.toFixed(decimals)}
                {...chartStyle.axis}
                tick={{ ...chartStyle.axis.tick, fontSize: 11 }}
              />
              <Tooltip
                cursor={chartStyle.cursor}
                content={(p) => <ChartTooltip active={p.active} payload={p.payload as never} label={agoText(Number(p.label))} units={{ v: unit ?? "" }} />}
              />
              <Line dataKey="v" name={name} stroke={color} {...chartStyle.line} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full rounded-md bg-surface-2" />
        )}
      </div>
      <button
        type="button"
        aria-expanded={showTable}
        aria-controls={tableId}
        onClick={() => setShowTable((s) => !s)}
        className="inline-flex items-center gap-1 justify-self-start rounded-md px-1 text-xs font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink"
      >
        <Table2 size={14} aria-hidden />
        {showTable ? "Hide data table" : "Show data table"}
      </button>
      <div id={tableId} hidden={!showTable} className="relative overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="border-b border-line-strong px-2 py-1 text-left font-bold">
                Time
              </th>
              <th scope="col" className="border-b border-line-strong px-2 py-1 text-right font-bold">
                {name}
                {unit && <span className="font-normal text-ink-3"> ({unit})</span>}
              </th>
            </tr>
          </thead>
          <tbody>
            {data
              .slice(-10)
              .reverse()
              .map((p) => (
                <tr key={p.x} className="border-b border-line last:border-0">
                  <th scope="row" className="px-2 py-1 text-left font-normal">
                    {agoText(p.x)}
                  </th>
                  <td className="px-2 py-1 text-right tabular-nums">{p.v.toFixed(decimals)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Value card                                                          */
/* ------------------------------------------------------------------ */

export function ValueCard({ id, value }: { id: StreamId; value: number | boolean | undefined }) {
  const info = getStream(id);
  if (typeof value === "boolean" && info.states) {
    const Icon = value ? DoorOpen : DoorClosed;
    return (
      <p className="flex items-center justify-center gap-2 py-2 text-2xl font-bold text-ink">
        <Icon size={30} className={value ? "text-warn" : "text-ink-3"} aria-hidden />
        {info.states[value ? 0 : 1]}
      </p>
    );
  }
  return (
    <p className="py-2 text-center leading-none">
      <span className="font-mono text-3xl font-semibold tabular-nums text-ink">{typeof value === "number" ? value.toFixed(info.decimals ?? 0) : "–"}</span>
      {info.unit && <span className="ml-1.5 text-base text-ink-3">{info.unit}</span>}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Map                                                                 */
/* ------------------------------------------------------------------ */

const BLOCK_X: [number, number][] = [
  [2, 27],
  [33, 59],
  [65, 98],
];
const BLOCK_Y: [number, number][] = [
  [2, 9],
  [15, 25],
  [31, 47],
  [53, 58],
];

export function CityMap({ pos, smooth = false, dim = false }: { pos?: Point2D; smooth?: boolean; dim?: boolean }) {
  const start = ROUTE[0];
  const end = ROUTE[ROUTE.length - 1];
  const route = ROUTE.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <svg
      viewBox="0 0 100 60"
      className={cn("block h-auto max-h-60 w-full", dim && "opacity-50")}
      role="img"
      aria-label={pos ? `City map. The delivery van is at ${pos.x.toFixed(0)}, ${pos.y.toFixed(0)} on its route from the depot to the shop.` : "City map with the van's route. No location data."}
    >
      <rect x={0} y={0} width={100} height={60} rx={2} fill="var(--surface-2)" />
      {BLOCK_Y.map(([y0, y1], r) =>
        BLOCK_X.map(([x0, x1], c) => {
          const park = r === 1 && c === 0;
          const lake = r === 2 && c === 2;
          return (
            <rect
              key={`${r}-${c}`}
              x={x0}
              y={y0}
              width={x1 - x0}
              height={y1 - y0}
              rx={1.2}
              fill={park ? "var(--ok-soft)" : lake ? "var(--u2-soft)" : "var(--line)"}
              stroke={park ? "var(--ok)" : lake ? "var(--u2)" : "none"}
              strokeOpacity={0.5}
              strokeWidth={0.4}
            />
          );
        }),
      )}
      <text x={14.5} y={21.3} textAnchor="middle" className="fill-ink-3 text-[3.4px]">
        Park
      </text>
      <text x={81.5} y={40.3} textAnchor="middle" className="fill-ink-3 text-[3.4px]">
        Lake
      </text>
      <polyline points={route} fill="none" stroke="var(--u3)" strokeOpacity={0.75} strokeWidth={1.4} strokeDasharray="2.5 1.8" strokeLinejoin="round" />
      {/* Depot and shop */}
      <rect x={start.x - 2.2} y={start.y - 2.2} width={4.4} height={4.4} rx={0.8} fill="var(--surface)" stroke="var(--ink-2)" strokeWidth={0.8} />
      <text x={start.x - 4} y={start.y + 6.6} className="fill-ink-2 text-[3.8px] font-semibold" paintOrder="stroke" stroke="var(--surface-2)" strokeWidth={1}>
        Depot
      </text>
      <circle cx={end.x} cy={end.y} r={2.2} fill="var(--surface)" stroke="var(--ink-2)" strokeWidth={0.8} />
      <text x={end.x + 2} y={end.y - 4} textAnchor="end" className="fill-ink-2 text-[3.8px] font-semibold" paintOrder="stroke" stroke="var(--surface-2)" strokeWidth={1}>
        Shop
      </text>
      {pos && (
        <g
          style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
          className={smooth ? "transition-transform duration-1000 ease-linear" : undefined}
          aria-hidden
        >
          <circle r={4.6} fill="var(--u3)" fillOpacity={0.18} />
          <circle r={2.8} fill="var(--u3)" stroke="var(--surface)" strokeWidth={0.9} />
        </g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Switch and bulb                                                     */
/* ------------------------------------------------------------------ */

const BULB_TEXT: Record<BulbView, string> = { on: "On", off: "Off", "turning on": "Turning on…", "turning off": "Turning off…" };

function BulbStatusIcon({ status, size = 16 }: { status: BulbView; size?: number }) {
  if (status === "on") return <Lightbulb size={size} className="text-warn" aria-hidden />;
  if (status === "off") return <LightbulbOff size={size} className="text-ink-3" aria-hidden />;
  return <LoaderCircle size={size} className="text-ink-2 motion-safe:animate-spin" aria-hidden />;
}

export function SwitchControl({ status, label, onToggle }: { status: BulbView; label: string; onToggle?: (on: boolean) => void }) {
  const desiredOn = status === "on" || status === "turning on";
  const pending = status === "turning on" || status === "turning off";
  return (
    <div className="grid justify-items-center gap-2 py-1">
      <button
        type="button"
        role="switch"
        aria-checked={desiredOn}
        aria-label={label}
        disabled={!onToggle}
        onClick={() => onToggle?.(!desiredOn)}
        className={cn(
          "relative h-9 w-16 shrink-0 rounded-full border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          desiredOn ? "border-brand bg-brand" : "border-line-strong bg-surface-2",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute left-0.5 top-0.5 size-7 rounded-full bg-surface shadow-sm transition-transform",
            desiredOn && "translate-x-7",
            pending && "border-2 border-dashed border-ink-3",
          )}
        />
      </button>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-ink" aria-live="polite">
        <BulbStatusIcon status={status} />
        {BULB_TEXT[status]}
      </p>
      {pending && <p className="text-center text-xs text-ink-3">Waiting for the device to confirm</p>}
    </div>
  );
}

const GLASS = "M50 10 C27 10 14 28 14 45 C14 60 24 68 31 79 L33 88 L67 88 L69 79 C76 68 86 60 86 45 C86 28 73 10 50 10 Z";

/** A 2D porch bulb: glows when on, dashed while it waits for the device. */
export function Bulb({ status, width = 96, caption = true }: { status: BulbView; width?: number; caption?: boolean }) {
  const gid = `bulb-glow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const on = status === "on";
  const pending = status === "turning on" || status === "turning off";
  return (
    <figure className="grid justify-items-center gap-1">
      <svg viewBox="0 0 100 132" width={width} height={(width * 132) / 100} role="img" aria-label={`Porch bulb: ${BULB_TEXT[status]}${pending ? " Waiting for the device." : ""}`}>
        <defs>
          <radialGradient id={gid}>
            <stop offset="0%" stopColor="#ffd84d" stopOpacity={0.85} />
            <stop offset="55%" stopColor="#ffd84d" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#ffd84d" stopOpacity={0} />
          </radialGradient>
        </defs>
        <circle cx={50} cy={46} r={50} fill={`url(#${gid})`} className="transition-opacity duration-500" opacity={on ? 1 : 0} />
        {on &&
          [-60, -30, 0, 30, 60].map((a) => {
            const r = (a * Math.PI) / 180;
            return (
              <line
                key={a}
                x1={50 + 42 * Math.sin(r)}
                y1={46 - 42 * Math.cos(r)}
                x2={50 + 49 * Math.sin(r)}
                y2={46 - 49 * Math.cos(r)}
                stroke="#e0a100"
                strokeWidth={3}
                strokeLinecap="round"
              />
            );
          })}
        <path
          d={GLASS}
          fill={on ? "#ffe680" : "var(--surface-2)"}
          stroke={on ? "#b7791f" : pending ? "var(--ink-2)" : "var(--ink-3)"}
          strokeWidth={2.5}
          strokeDasharray={pending ? "5 4" : undefined}
        />
        <path d="M40 72 L43 56 L47 66 L50 56 L53 66 L57 56 L60 72" fill="none" stroke={on ? "#c2410c" : "var(--ink-3)"} strokeWidth={2} strokeLinejoin="round" />
        <rect x={34} y={88} width={32} height={22} rx={3} fill="var(--line-strong)" stroke="var(--ink-3)" strokeWidth={1.5} />
        {[94, 100, 106].map((y) => (
          <line key={y} x1={35} x2={65} y1={y} y2={y} stroke="var(--ink-3)" strokeWidth={1.2} />
        ))}
        <path d="M42 110 L58 110 L54 120 L46 120 Z" fill="var(--ink-3)" />
      </svg>
      {caption && (
        <figcaption className="grid justify-items-center text-center text-sm">
          <span className="flex items-center gap-1.5 font-semibold text-ink">
            <BulbStatusIcon status={status} />
            {BULB_TEXT[status]}
          </span>
          {pending && <span className="text-ink-3">Waiting for device</span>}
        </figcaption>
      )}
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Alert                                                               */
/* ------------------------------------------------------------------ */

export function AlertDisplay({ active, rule, now }: { active: boolean; rule: string; now?: string }) {
  return (
    <div className={cn("grid gap-1 rounded-md px-3 py-2.5", active ? "bg-bad-soft" : "bg-ok-soft")}>
      <p className={cn("flex items-center gap-2 text-xl font-bold", active ? "text-bad" : "text-ok")}>
        {active ? <TriangleAlert size={22} aria-hidden /> : <CircleCheck size={22} aria-hidden />}
        {active ? "ALERT" : "OK"}
      </p>
      <p className="text-sm text-ink-2">{rule}</p>
      {now && (
        <p className="text-sm text-ink-3">
          Now <span className="font-mono font-semibold text-ink">{now}</span>
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A widget bound to the live streams                                  */
/* ------------------------------------------------------------------ */

export interface LiveWidgetProps {
  widget: Widget;
  streams: Streams;
  /** Current tick (one per second) */
  tick: number;
  mode: UpdateMode;
  /** Status of the bulb, for a switch */
  bulb?: BulbView;
  onSwitch?: (on: boolean) => void;
  actions?: ReactNode;
  badges?: ReactNode;
  className?: string;
}

/** Any widget kind, showing the value its update mode lets it see at this tick. */
export const LiveWidget = memo(function LiveWidget({ widget: w, streams, tick, mode, bulb = "off", onSwitch, actions, badges, className }: LiveWidgetProps) {
  const shown = Math.min(shownTick(mode, tick), tick);
  const age = tick - shown;
  const info = w.stream ? getStream(w.stream) : undefined;
  const run = useMemo(() => alertRun(w, streams), [w.kind, w.stream, w.threshold, w.dir, w.hysteresis, streams]);

  const lineData = useMemo<LinePoint[]>(() => {
    if (w.kind !== "line" || !w.stream || getStream(w.stream).kind !== "number") return [];
    const values = streams[w.stream as "temperature" | "humidity" | "power"];
    const out: LinePoint[] = [];
    for (let i = Math.max(0, tick - LINE_WINDOW); i <= shown; i++) out.push({ x: i - tick, v: values[i] });
    return out;
  }, [w.kind, w.stream, streams, tick, shown]);

  let body: ReactNode;
  let footer: ReactNode = info && w.kind !== "switch" ? <Freshness mode={mode} age={age} /> : undefined;

  if (!info) {
    body = <Unbound text={w.kind === "switch" ? "Not connected to a device" : undefined} />;
  } else if (w.kind === "gauge") {
    body = <Gauge value={valueAt(streams, info.id, shown) as number} min={w.min} max={w.max} unit={info.unit} decimals={info.decimals} color={STREAM_COLOR[info.id]} />;
  } else if (w.kind === "line") {
    body = <MiniLine data={lineData} name={info.label} unit={info.unit} color={STREAM_COLOR[info.id]} decimals={info.decimals} />;
  } else if (w.kind === "value") {
    body = <ValueCard id={info.id} value={valueAt(streams, info.id, shown) as number | boolean} />;
  } else if (w.kind === "map") {
    const pos = valueAt(streams, info.id, shown) as Point2D;
    body = (
      <div className="grid gap-1">
        <CityMap pos={pos} smooth={!pollEvery(mode)} />
        <p className="text-xs text-ink-3">Van at {formatValue(info.id, pos)} (map units)</p>
      </div>
    );
  } else if (w.kind === "switch") {
    body = <SwitchControl status={bulb} label={`${w.title.trim() || "Switch"}: porch bulb`} onToggle={onSwitch} />;
    footer = "Commands go through the device shadow";
  } else {
    const v = valueAt(streams, info.id, shown) as number | boolean;
    body = run ? (
      <AlertDisplay active={run.states[shown] ?? false} rule={ruleText(w)} now={formatValue(info.id, v)} />
    ) : (
      <p className="flex items-center gap-1.5 rounded-md bg-warn-soft px-3 py-2.5 text-sm text-ink">
        <TriangleAlert size={16} className="shrink-0 text-warn" aria-hidden /> No threshold set, so it can never go off.
      </p>
    );
  }

  return (
    <WidgetFrame kind={w.kind} title={w.title} footer={footer} actions={actions} badges={badges} className={className}>
      {body}
    </WidgetFrame>
  );
});
