/**
 * L21 IoT dashboard builder: simulated sensor streams, widgets that can be
 * bound to them, alert rules with hysteresis, a bulb controlled through a
 * device shadow, and a reviewer that gives dashboard-design tips.
 */
import { createRng } from "~/lib/sim/random";
import { createShadow, delta, deviceSync, setDesired, type Shadow } from "~/lib/sim/shadow";

/* ------------------------------------------------------------------ */
/* Streams                                                             */
/* ------------------------------------------------------------------ */

export type StreamId = "temperature" | "humidity" | "power" | "door" | "van" | "bulb";
export type StreamKind = "number" | "boolean" | "location" | "actuator";

export interface StreamInfo {
  id: StreamId;
  label: string;
  kind: StreamKind;
  unit?: string;
  /** Sensible gauge range */
  min?: number;
  max?: number;
  decimals?: number;
  /** Words for a boolean stream's true and false values */
  states?: [string, string];
}

export const STREAMS: StreamInfo[] = [
  { id: "temperature", label: "Room temperature", kind: "number", unit: "°C", min: 15, max: 45, decimals: 1 },
  { id: "humidity", label: "Humidity", kind: "number", unit: "%", min: 0, max: 100, decimals: 0 },
  { id: "power", label: "Power use", kind: "number", unit: "W", min: 0, max: 3000, decimals: 0 },
  { id: "door", label: "Front door", kind: "boolean", states: ["Open", "Closed"] },
  { id: "van", label: "Delivery van", kind: "location" },
  { id: "bulb", label: "Porch bulb", kind: "actuator" },
];

export const getStream = (id: StreamId) => STREAMS.find((s) => s.id === id)!;

export interface Point2D {
  x: number;
  y: number;
}

/** The van's route on a 100 × 60 city map */
export const ROUTE: Point2D[] = [
  { x: 8, y: 50 },
  { x: 30, y: 50 },
  { x: 30, y: 28 },
  { x: 62, y: 28 },
  { x: 62, y: 12 },
  { x: 92, y: 12 },
];

/** A point part-way along the route; f goes 0 → 1 (out) → 2 (back) and repeats. */
function along(route: Point2D[], f: number): Point2D {
  const segs = route.slice(1).map((p, i) => Math.hypot(p.x - route[i].x, p.y - route[i].y));
  const phase = f % 2;
  let d = (phase > 1 ? 2 - phase : phase) * segs.reduce((a, b) => a + b, 0);
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) {
      const k = segs[i] ? Math.min(1, d / segs[i]) : 0;
      return { x: route[i].x + (route[i + 1].x - route[i].x) * k, y: route[i].y + (route[i + 1].y - route[i].y) * k };
    }
    d -= segs[i];
  }
  return route[0];
}

export interface Streams {
  temperature: number[];
  humidity: number[];
  power: number[];
  door: boolean[];
  van: Point2D[];
}

/** One value per second for every sensor stream. */
export function generateStreams(ticks: number, seed = 1): Streams {
  const rng = createRng(seed);
  const s: Streams = { temperature: [], humidity: [], power: [], door: [], van: [] };
  let temp = 31;
  let doorLeft = 0;
  for (let t = 0; t < ticks; t++) {
    temp += rng.normal(0, 0.25) + (32.5 + 3 * Math.sin((2 * Math.PI * t) / 90) - temp) * 0.08;
    s.temperature.push(Math.round(temp * 10) / 10);
    s.humidity.push(Math.round(64 + 6 * Math.sin((2 * Math.PI * t) / 140) + rng.normal(0, 1)));
    const ac = Math.sin((2 * Math.PI * t) / 75) > 0.35;
    s.power.push(Math.round(380 + (ac ? 1450 : 0) + rng.normal(0, 40)));
    if (doorLeft === 0 && rng.chance(0.04)) doorLeft = rng.int(3, 6);
    s.door.push(doorLeft > 0);
    if (doorLeft > 0) doorLeft--;
    s.van.push(along(ROUTE, t / 120));
  }
  return s;
}

export function formatValue(id: StreamId, v: number | boolean | Point2D | undefined): string {
  const info = getStream(id);
  if (v === undefined) return "–";
  if (typeof v === "boolean") return info.states ? info.states[v ? 0 : 1] : String(v);
  if (typeof v === "number") return `${v.toFixed(info.decimals ?? 0)}${info.unit ? ` ${info.unit}` : ""}`;
  return `${v.x.toFixed(0)}, ${v.y.toFixed(0)}`;
}

/* ------------------------------------------------------------------ */
/* Widgets                                                             */
/* ------------------------------------------------------------------ */

export type WidgetKind = "gauge" | "line" | "value" | "map" | "switch" | "alert";

export interface WidgetInfo {
  label: string;
  accepts: StreamKind[];
  /** When to use this widget */
  useFor: string;
}

export const WIDGETS: Record<WidgetKind, WidgetInfo> = {
  gauge: { label: "Gauge", accepts: ["number"], useFor: "One number with a known range, read at a glance (temperature, tank level)." },
  line: { label: "Line chart", accepts: ["number"], useFor: "How a number changes over time, to spot trends and patterns." },
  value: { label: "Value card", accepts: ["number", "boolean"], useFor: "The latest value or state, shown big (door open, power now)." },
  map: { label: "Map", accepts: ["location"], useFor: "Where moving or spread-out things are (vehicles, field sensors)." },
  switch: { label: "Switch", accepts: ["actuator"], useFor: "Sending a command to a device (turn a light or pump on or off)." },
  alert: { label: "Alert", accepts: ["number", "boolean"], useFor: "Warning when a value crosses a limit, even if nobody is watching the chart." },
};

export const WIDGET_KINDS = Object.keys(WIDGETS) as WidgetKind[];

export interface Widget {
  id: string;
  kind: WidgetKind;
  stream?: StreamId;
  title: string;
  /** 1 = one grid cell, 2 = two cells wide */
  size: 1 | 2;
  min?: number;
  max?: number;
  threshold?: number;
  dir?: "above" | "below";
  hysteresis?: number;
}

export function canBind(kind: WidgetKind, stream: StreamId): { ok: boolean; reason?: string } {
  const s = getStream(stream);
  if (WIDGETS[kind].accepts.includes(s.kind)) return { ok: true };
  const what: Record<StreamKind, string> = { number: "a number", boolean: "an on/off state", location: "a location", actuator: "a device you control" };
  return { ok: false, reason: `${/^[aeiou]/i.test(WIDGETS[kind].label) ? "An" : "A"} ${WIDGETS[kind].label.toLowerCase()} cannot show ${what[s.kind]}. Use: ${WIDGET_KINDS.filter((k) => WIDGETS[k].accepts.includes(s.kind)).map((k) => WIDGETS[k].label).join(", ")}.` };
}

/** A new widget with sensible settings for its stream. */
export function makeWidget(id: string, kind: WidgetKind, stream?: StreamId): Widget {
  const s = stream ? getStream(stream) : undefined;
  const w: Widget = { id, kind, stream, title: s ? `${s.label}` : WIDGETS[kind].label, size: kind === "line" || kind === "map" ? 2 : 1 };
  if (kind === "gauge" && s) Object.assign(w, { min: s.min, max: s.max });
  if (kind === "alert" && s?.kind === "number") Object.assign(w, { threshold: s.id === "temperature" ? 34 : s.id === "power" ? 1500 : 70, dir: "above", hysteresis: s.id === "temperature" ? 0.5 : 0 });
  if (kind === "alert" && s?.kind === "boolean") Object.assign(w, { threshold: 0.5, dir: "above", hysteresis: 0 });
  return w;
}

/* ------------------------------------------------------------------ */
/* Alerts                                                              */
/* ------------------------------------------------------------------ */

export interface AlertRun {
  /** Whether the alert is showing at each tick */
  states: boolean[];
  /** How many times the alert went off */
  raised: number;
}

/**
 * The alert goes off when the value crosses the threshold and only clears
 * once it is back past the threshold by the hysteresis margin, so a value
 * wobbling around the limit does not make it flash on and off.
 */
export function evaluateAlert(values: number[], threshold: number, dir: "above" | "below" = "above", hysteresis = 0): AlertRun {
  let on = false;
  let raised = 0;
  const states = values.map((v) => {
    const over = dir === "above" ? v > threshold : v < threshold;
    const clear = dir === "above" ? v < threshold - hysteresis : v > threshold + hysteresis;
    if (!on && over) {
      on = true;
      raised++;
    } else if (on && clear) on = false;
    return on;
  });
  return { states, raised };
}

export function alertValues(streams: Streams, id: StreamId): number[] {
  if (id === "door") return streams.door.map((d) => (d ? 1 : 0));
  if (id === "temperature" || id === "humidity" || id === "power") return streams[id];
  return [];
}

/* ------------------------------------------------------------------ */
/* Real-time updates: polling vs push                                  */
/* ------------------------------------------------------------------ */

export type UpdateMode = "push" | "poll1" | "poll5" | "poll30";

export const UPDATE_MODES: { id: UpdateMode; label: string; every?: number }[] = [
  { id: "push", label: "Push (MQTT over WebSocket)" },
  { id: "poll1", label: "Poll every 1 s", every: 1 },
  { id: "poll5", label: "Poll every 5 s", every: 5 },
  { id: "poll30", label: "Poll every 30 s", every: 30 },
];

/** Which tick's value the dashboard is showing at tick t. */
export function shownTick(mode: UpdateMode, t: number): number {
  const every = UPDATE_MODES.find((m) => m.id === mode)?.every;
  return every ? Math.floor(t / every) * every : t;
}

/**
 * Messages one widget needs over the run, and how old its value is on
 * average. Push sends only when the value changes; polling asks every
 * interval whether anything changed or not.
 */
export function updateCost<T>(values: T[], mode: UpdateMode): { messages: number; avgAgeS: number } {
  const every = UPDATE_MODES.find((m) => m.id === mode)?.every;
  if (!every) return { messages: values.filter((v, i) => i === 0 || JSON.stringify(v) !== JSON.stringify(values[i - 1])).length, avgAgeS: 0 };
  const messages = Math.ceil(values.length / every);
  const avgAgeS = values.reduce((a, _, t) => a + (t - shownTick(mode, t)), 0) / Math.max(values.length, 1);
  return { messages, avgAgeS };
}

/* ------------------------------------------------------------------ */
/* The bulb, through a device shadow                                   */
/* ------------------------------------------------------------------ */

export interface Bulb {
  shadow: Shadow;
  /** Tick the last unconfirmed command was sent */
  sentAt?: number;
  commands: number;
  /** Seconds each command took to be confirmed by the device */
  confirmTimes: number[];
}

export const createBulb = (): Bulb => ({ shadow: createShadow({ power: "off" }), commands: 0, confirmTimes: [] });

export function sendCommand(b: Bulb, power: "on" | "off", t: number): Bulb {
  const shadow = setDesired(b.shadow, { power });
  return { ...b, shadow, commands: b.commands + 1, sentAt: Object.keys(delta(shadow)).length ? (b.sentAt ?? t) : undefined };
}

/** The device checks in each tick; it applies the command once online and the network delay has passed. */
export function tickBulb(b: Bulb, t: number, { online, latency }: { online: boolean; latency: number }): Bulb {
  if (b.sentAt === undefined || t - b.sentAt < latency) return b;
  const { shadow, applied } = deviceSync(b.shadow, online);
  if (!Object.keys(applied).length) return b;
  return { ...b, shadow, sentAt: undefined, confirmTimes: [...b.confirmTimes, t - b.sentAt] };
}

export function bulbStatus(b: Bulb): "on" | "off" | "turning on" | "turning off" {
  const want = b.shadow.desired.power;
  const is = b.shadow.reported.power;
  if (want === is) return is === "on" ? "on" : "off";
  return want === "on" ? "turning on" : "turning off";
}

/* ------------------------------------------------------------------ */
/* Design review                                                       */
/* ------------------------------------------------------------------ */

export interface Tip {
  id: string;
  widget?: string;
  text: string;
}

export const MAX_WIDGETS = 8;

export function reviewDashboard(widgets: Widget[]): Tip[] {
  const tips: Tip[] = [];
  if (!widgets.length) return [{ id: "empty", text: "Add a widget to start." }];
  if (widgets.length > MAX_WIDGETS) tips.push({ id: "clutter", text: `${widgets.length} widgets is too many: keep to ${MAX_WIDGETS} or fewer so the important ones stand out.` });
  for (const w of widgets) {
    const name = w.title.trim() || WIDGETS[w.kind].label;
    if (!w.stream) tips.push({ id: `unbound-${w.id}`, widget: w.id, text: w.kind === "switch" ? `The switch "${name}" is not connected to a device.` : `"${name}" is not connected to any data.` });
    if (!w.title.trim()) tips.push({ id: `title-${w.id}`, widget: w.id, text: `Give the ${WIDGETS[w.kind].label.toLowerCase()} a title, so people know what it shows.` });
    if (w.kind === "gauge" && !(w.min !== undefined && w.max !== undefined && w.min < w.max)) tips.push({ id: `range-${w.id}`, widget: w.id, text: `The gauge "${name}" needs a range (a minimum below its maximum).` });
    if (w.kind === "alert" && w.stream && w.threshold === undefined) tips.push({ id: `threshold-${w.id}`, widget: w.id, text: `The alert "${name}" has no threshold, so it can never go off.` });
  }
  const seen = new Map<string, Widget>();
  for (const w of widgets) {
    if (!w.stream || w.kind === "alert") continue;
    const key = `${w.kind}:${w.stream}`;
    const first = seen.get(key);
    if (first) tips.push({ id: `dup-${w.id}`, widget: w.id, text: `Two ${WIDGETS[w.kind].label.toLowerCase()}s show ${getStream(w.stream).label.toLowerCase()}. Remove one.` });
    else seen.set(key, w);
  }
  const alertAt = widgets.findIndex((w) => w.kind === "alert");
  if (alertAt === -1 && widgets.some((w) => w.stream && getStream(w.stream).kind === "number")) {
    tips.push({ id: "no-alert", text: "Add an alert, so a problem is noticed even when nobody is looking at the charts." });
  } else if (alertAt >= 2) {
    tips.push({ id: "alert-top", widget: widgets[alertAt].id, text: "Move the alert to the top left, where people look first." });
  }
  return tips;
}

/* ------------------------------------------------------------------ */
/* Ready-made dashboards                                               */
/* ------------------------------------------------------------------ */

export function preset(name: "clean" | "cluttered"): Widget[] {
  if (name === "clean") {
    return [
      makeWidget("w1", "alert", "temperature"),
      makeWidget("w2", "gauge", "temperature"),
      makeWidget("w3", "line", "power"),
      makeWidget("w4", "value", "door"),
      makeWidget("w5", "switch", "bulb"),
      makeWidget("w6", "map", "van"),
    ];
  }
  const ws = [
    makeWidget("w1", "line", "temperature"),
    makeWidget("w2", "gauge", "temperature"),
    makeWidget("w3", "line", "temperature"),
    makeWidget("w4", "gauge", "humidity"),
    makeWidget("w5", "value", "power"),
    makeWidget("w6", "line", "power"),
    makeWidget("w7", "value", "humidity"),
    makeWidget("w8", "gauge", "power"),
    makeWidget("w9", "value", "door"),
    makeWidget("w10", "alert", "temperature"),
  ];
  ws[3] = { ...ws[3], min: undefined, max: undefined };
  ws[6] = { ...ws[6], title: "" };
  return ws;
}
