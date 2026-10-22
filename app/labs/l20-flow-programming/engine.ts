/**
 * L20 Flow-based IoT programming: a tiny Node-RED. A flow is a set of nodes
 * joined by wires. A sensor node emits a message ({ payload, topic, unit })
 * every few seconds, and each message travels along the wires through
 * function nodes to output nodes (MQTT, dashboard, alert, debug).
 *
 * Pure TypeScript: `simulate` runs the whole flow up front and returns what
 * happened on every tick, so the UI can replay it and the tests can check it.
 */
import { createRng } from "~/lib/sim/random";

/* ------------------------------------------------------------------ */
/* Node types                                                          */
/* ------------------------------------------------------------------ */

export type NodeKind = "sensor" | "convert" | "threshold" | "filter" | "template" | "mqtt" | "dashboard" | "alert" | "debug";
export type NodeGroup = "input" | "function" | "output";

export interface NodeConfig {
  /** sensor: seconds between readings */
  interval?: 1 | 2 | 5;
  /** threshold */
  op?: ">" | "<";
  value?: number;
  /** filter: smallest change that is passed on */
  minChange?: number;
  /** template: text with {{payload}} in it */
  format?: string;
  /** mqtt */
  topic?: string;
  /** alert */
  channel?: "SMS" | "Email";
}

export interface KindInfo {
  label: string;
  group: NodeGroup;
  inputs: 0 | 1;
  /** Output ports; threshold has two (condition true, otherwise) */
  outputs: number;
  outputLabels?: string[];
  help: string;
  defaults: NodeConfig;
}

export const KINDS: Record<NodeKind, KindInfo> = {
  sensor: { label: "Temperature sensor", group: "input", inputs: 0, outputs: 1, help: "Sends a reading in °C every few seconds.", defaults: { interval: 1 } },
  convert: { label: "°C → °F", group: "function", inputs: 1, outputs: 1, help: "Converts the payload from Celsius to Fahrenheit: F = C × 9/5 + 32.", defaults: {} },
  threshold: {
    label: "Threshold",
    group: "function",
    inputs: 1,
    outputs: 2,
    outputLabels: ["Yes", "No"],
    help: "Sends the message out of the Yes port if the rule is true, otherwise out of the No port. It compares whatever number arrives, so put it before a °C → °F node to compare in °C.",
    defaults: { op: ">", value: 35 },
  },
  filter: { label: "Report by exception", group: "function", inputs: 1, outputs: 1, help: "Passes a message only if it differs from the last one passed by at least the set amount.", defaults: { minChange: 0.5 } },
  template: { label: "Template", group: "function", inputs: 1, outputs: 1, help: "Builds a text payload. {{payload}} is replaced by the value.", defaults: { format: '{"temp": {{payload}}}' } },
  mqtt: { label: "MQTT out", group: "output", inputs: 1, outputs: 0, help: "Publishes the payload to the broker on the given topic.", defaults: { topic: "home/temp" } },
  dashboard: { label: "Dashboard gauge", group: "output", inputs: 1, outputs: 0, help: "Shows the latest number on a gauge.", defaults: {} },
  alert: { label: "Alert", group: "output", inputs: 1, outputs: 0, help: "Sends a text message or e-mail for every message it receives.", defaults: { channel: "SMS" } },
  debug: { label: "Debug", group: "output", inputs: 1, outputs: 0, help: "Prints every message it receives in the debug panel.", defaults: {} },
};

export const PALETTE: NodeKind[] = ["sensor", "convert", "threshold", "filter", "template", "mqtt", "dashboard", "alert", "debug"];

export interface FlowNode {
  id: string;
  kind: NodeKind;
  config: NodeConfig;
  /** Canvas position, used by the editor only */
  x?: number;
  y?: number;
}

export interface Wire {
  id: string;
  from: string;
  /** Output port of the source node */
  port: number;
  to: string;
}

export interface Flow {
  nodes: FlowNode[];
  wires: Wire[];
}

export interface Message {
  payload: number | string;
  topic: string;
  unit: "°C" | "°F";
  /** Seconds since deploy */
  t: number;
}

export function makeNode(id: string, kind: NodeKind, config: NodeConfig = {}, x?: number, y?: number): FlowNode {
  return { id, kind, config: { ...KINDS[kind].defaults, ...config }, x, y };
}

export const wire = (from: string, to: string, port = 0): Wire => ({ id: `${from}:${port}-${to}`, from, port, to });

export const describeNode = (n: FlowNode): string => {
  const c = n.config;
  switch (n.kind) {
    case "sensor":
      return `every ${c.interval} s`;
    case "threshold":
      return `${c.op} ${Number.isFinite(c.value) ? c.value : "?"}`;
    case "filter":
      return `change ≥ ${c.minChange}`;
    case "template":
      return c.format ?? "";
    case "mqtt":
      return c.topic ?? "";
    case "alert":
      return c.channel ?? "";
    default:
      return "";
  }
};

/* ------------------------------------------------------------------ */
/* Checking a flow before deploy                                       */
/* ------------------------------------------------------------------ */

export interface Problem {
  level: "error" | "warning";
  node?: string;
  text: string;
}

function hasCycle(flow: Flow): boolean {
  const next = new Map<string, string[]>();
  for (const w of flow.wires) next.set(w.from, [...(next.get(w.from) ?? []), w.to]);
  const state = new Map<string, 1 | 2>(); // 1 = on the current path, 2 = done
  const visit = (id: string): boolean => {
    if (state.get(id) === 1) return true;
    if (state.get(id) === 2) return false;
    state.set(id, 1);
    const found = (next.get(id) ?? []).some(visit);
    state.set(id, 2);
    return found;
  };
  return flow.nodes.some((n) => visit(n.id));
}

export function validateFlow(flow: Flow): Problem[] {
  const problems: Problem[] = [];
  const name = (n: FlowNode) => `${KINDS[n.kind].label} (${n.id})`;
  if (!flow.nodes.some((n) => n.kind === "sensor")) problems.push({ level: "error", text: "Add a sensor node: nothing will start the flow." });

  for (const n of flow.nodes) {
    const info = KINDS[n.kind];
    const incoming = flow.wires.filter((w) => w.to === n.id);
    if (info.inputs === 0 && incoming.length) problems.push({ level: "error", node: n.id, text: `${name(n)} has no input, so nothing can be wired into it.` });
    if (info.inputs === 1 && !incoming.length) problems.push({ level: "error", node: n.id, text: `${name(n)} has nothing wired into it.` });
    for (let port = 0; port < info.outputs; port++) {
      if (!flow.wires.some((w) => w.from === n.id && w.port === port)) {
        const which = info.outputLabels ? ` "${info.outputLabels[port]}" output` : " output";
        problems.push({ level: "warning", node: n.id, text: `Messages from the${which} of ${name(n)} go nowhere.` });
      }
    }
    if (n.kind === "threshold" && !Number.isFinite(n.config.value)) problems.push({ level: "error", node: n.id, text: `${name(n)} needs a number to compare with.` });
    if (n.kind === "filter" && !(Number.isFinite(n.config.minChange) && (n.config.minChange ?? -1) >= 0)) {
      problems.push({ level: "error", node: n.id, text: `${name(n)} needs a change of 0 or more.` });
    }
    if (n.kind === "mqtt") {
      const topic = n.config.topic?.trim() ?? "";
      if (!topic) problems.push({ level: "error", node: n.id, text: `${name(n)} needs a topic.` });
      else if (/[+#]/.test(topic)) problems.push({ level: "error", node: n.id, text: `${name(n)}: you cannot publish to a wildcard topic (+ or #). Wildcards are only for subscribing.` });
    }
    if (n.kind === "template" && !n.config.format?.includes("{{payload}}")) {
      problems.push({ level: "warning", node: n.id, text: `${name(n)} has no {{payload}}, so the reading will be lost.` });
    }
  }
  if (hasCycle(flow)) problems.push({ level: "error", text: "The wires form a loop, so a message would go round for ever." });
  return problems;
}

export const canDeploy = (flow: Flow) => !validateFlow(flow).some((p) => p.level === "error");

/* ------------------------------------------------------------------ */
/* Running a flow                                                      */
/* ------------------------------------------------------------------ */

export const DEFAULT_TICKS = 60;

/** The room temperature, one value per second: about 31–37 °C. */
export function sensorSeries(ticks: number, seed = 1): number[] {
  const rng = createRng(seed);
  return Array.from({ length: ticks }, (_, t) => Math.round((34 + 2.5 * Math.sin((2 * Math.PI * t) / 60) + rng.normal(0, 0.4)) * 10) / 10);
}

export const toF = (c: number) => Math.round((c * 9) / 5 * 10 + 320) / 10;

const fmt = (v: number | string) => (typeof v === "number" ? v.toFixed(1) : v);

export interface Hop {
  wire: string;
  msg: Message;
}

export interface Tick {
  t: number;
  /** Every wire a message crossed during this tick, in order */
  hops: Hop[];
}

export interface RunResult {
  ticks: Tick[];
  readings: { t: number; value: number }[];
  wireCounts: Record<string, number>;
  nodeCounts: Record<string, number>;
  mqtt: { t: number; topic: string; payload: string }[];
  alerts: { t: number; channel: string; text: string }[];
  dashboard: { t: number; value: number | string; unit: Message["unit"] }[];
  debug: { t: number; node: string; text: string }[];
}

export function simulate(flow: Flow, ticks = DEFAULT_TICKS, seed = 1): RunResult {
  const series = sensorSeries(ticks, seed);
  const byId = new Map(flow.nodes.map((n) => [n.id, n]));
  const lastPassed = new Map<string, number>();
  const r: RunResult = { ticks: [], readings: [], wireCounts: {}, nodeCounts: {}, mqtt: [], alerts: [], dashboard: [], debug: [] };
  for (const w of flow.wires) r.wireCounts[w.id] = 0;
  for (const n of flow.nodes) r.nodeCounts[n.id] = 0;

  const send = (from: FlowNode, port: number, msg: Message, hops: Hop[], depth: number) => {
    if (depth > flow.nodes.length) return; // a loop: stop instead of running for ever
    for (const w of flow.wires.filter((w) => w.from === from.id && w.port === port)) {
      const to = byId.get(w.to);
      if (!to) continue;
      r.wireCounts[w.id]++;
      hops.push({ wire: w.id, msg });
      receive(to, msg, hops, depth + 1);
    }
  };

  const receive = (n: FlowNode, msg: Message, hops: Hop[], depth: number) => {
    r.nodeCounts[n.id]++;
    const c = n.config;
    const num = typeof msg.payload === "number" ? msg.payload : Number.NaN;
    const out = (port: number, m: Message) => send(n, port, m, hops, depth);
    switch (n.kind) {
      case "convert":
        if (Number.isNaN(num)) r.debug.push({ t: msg.t, node: n.id, text: `°C → °F got text, not a number: ${fmt(msg.payload)}` });
        else out(0, { ...msg, payload: msg.unit === "°F" ? num : toF(num), unit: "°F" });
        return;
      case "threshold": {
        const yes = !Number.isNaN(num) && (c.op === "<" ? num < (c.value ?? 0) : num > (c.value ?? 0));
        out(yes ? 0 : 1, msg);
        return;
      }
      case "filter": {
        if (Number.isNaN(num)) return;
        const last = lastPassed.get(n.id);
        if (last === undefined || Math.abs(num - last) >= (c.minChange ?? 0) - 1e-9) {
          lastPassed.set(n.id, num);
          out(0, msg);
        }
        return;
      }
      case "template":
        out(0, { ...msg, payload: (c.format ?? "").replaceAll("{{payload}}", fmt(msg.payload)) });
        return;
      case "mqtt":
        r.mqtt.push({ t: msg.t, topic: c.topic ?? "", payload: String(fmt(msg.payload)) });
        return;
      case "dashboard":
        r.dashboard.push({ t: msg.t, value: msg.payload, unit: msg.unit });
        return;
      case "alert":
        r.alerts.push({ t: msg.t, channel: c.channel ?? "SMS", text: typeof msg.payload === "number" ? `Temperature ${fmt(msg.payload)} ${msg.unit}` : msg.payload });
        return;
      case "debug":
        r.debug.push({ t: msg.t, node: n.id, text: `${fmt(msg.payload)}${typeof msg.payload === "number" ? ` ${msg.unit}` : ""}` });
        return;
      case "sensor":
        return;
    }
  };

  const sensors = flow.nodes.filter((n) => n.kind === "sensor");
  for (let t = 0; t < ticks; t++) {
    const tick: Tick = { t, hops: [] };
    for (const s of sensors) {
      if (t % (s.config.interval ?? 1) !== 0) continue;
      r.nodeCounts[s.id]++;
      if (s === sensors[0]) r.readings.push({ t, value: series[t] });
      send(s, 0, { payload: series[t], topic: "sensor/temperature", unit: "°C", t }, tick.hops, 0);
    }
    r.ticks.push(tick);
  }
  return r;
}

/* ------------------------------------------------------------------ */
/* Challenges                                                          */
/* ------------------------------------------------------------------ */

export interface Verdict {
  pass: boolean;
  text: string;
}

export interface Challenge {
  id: string;
  title: string;
  goal: string;
  hint: string;
  /** A correct flow, used by "Load example" */
  example: () => Flow;
  check: (r: RunResult) => Verdict;
}

const close = (a: number, b: number) => Math.abs(a - b) < 0.051;

export const CHALLENGES: Challenge[] = [
  {
    id: "gauge",
    title: "Live gauge",
    goal: "Show every temperature reading, in °C, on the dashboard gauge.",
    hint: "Wire the sensor straight into the dashboard gauge.",
    example: () => ({ nodes: [makeNode("n1", "sensor", {}, 40, 120), makeNode("n2", "dashboard", {}, 360, 120)], wires: [wire("n1", "n2")] }),
    check: (r) => {
      if (!r.dashboard.length) return { pass: false, text: "The gauge received nothing." };
      if (r.dashboard.length !== r.readings.length) return { pass: false, text: `The gauge received ${r.dashboard.length} of ${r.readings.length} readings.` };
      const wrong = r.dashboard.filter((d, i) => typeof d.value !== "number" || !close(d.value, r.readings[i].value)).length;
      if (wrong) return { pass: false, text: `${wrong} gauge values do not match the sensor's °C readings.` };
      return { pass: true, text: `The gauge showed all ${r.readings.length} readings.` };
    },
  },
  {
    id: "alert",
    title: "Heat alert",
    goal: "Send an SMS alert only when the temperature is above 35 °C.",
    hint: "Put a Threshold (> 35) between the sensor and the alert, and use its Yes output.",
    example: () => ({
      nodes: [makeNode("n1", "sensor", {}, 40, 120), makeNode("n2", "threshold", { op: ">", value: 35 }, 260, 120), makeNode("n3", "alert", {}, 500, 60), makeNode("n4", "debug", {}, 500, 190)],
      wires: [wire("n1", "n2"), wire("n2", "n3", 0), wire("n2", "n4", 1)],
    }),
    check: (r) => {
      const hot = r.readings.filter((x) => x.value > 35).length;
      if (!r.alerts.length) return { pass: false, text: `No alerts were sent, but ${hot} readings were above 35 °C.` };
      const cool = r.alerts.filter((a) => {
        const v = Number.parseFloat(a.text.replace(/[^\d.-]+/g, " ").trim());
        return !(a.text.includes("°C") && v > 35);
      }).length;
      if (cool) return { pass: false, text: `${cool} alerts were sent for readings that were not above 35 °C.` };
      if (r.alerts.length !== hot) return { pass: false, text: `${r.alerts.length} alerts were sent, but ${hot} readings were above 35 °C.` };
      return { pass: true, text: `${hot} alerts for ${hot} hot readings, and none for the other ${r.readings.length - hot}.` };
    },
  },
  {
    id: "fahrenheit",
    title: "Fahrenheit to MQTT",
    goal: 'Publish every reading in °F as JSON, like {"temp": 95.2}, on the topic home/temp/f.',
    hint: "Sensor → °C → °F → Template → MQTT out with the topic home/temp/f.",
    example: () => ({
      nodes: [makeNode("n1", "sensor", {}, 40, 120), makeNode("n2", "convert", {}, 230, 120), makeNode("n3", "template", {}, 420, 120), makeNode("n4", "mqtt", { topic: "home/temp/f" }, 620, 120)],
      wires: [wire("n1", "n2"), wire("n2", "n3"), wire("n3", "n4")],
    }),
    check: (r) => {
      if (!r.mqtt.length) return { pass: false, text: "Nothing was published." };
      const wrongTopic = r.mqtt.filter((m) => m.topic !== "home/temp/f").length;
      if (wrongTopic) return { pass: false, text: `${wrongTopic} messages went to the wrong topic (${r.mqtt.find((m) => m.topic !== "home/temp/f")!.topic}).` };
      if (r.mqtt.length !== r.readings.length) return { pass: false, text: `${r.mqtt.length} of ${r.readings.length} readings were published.` };
      let notJson = 0;
      let notF = 0;
      r.mqtt.forEach((m, i) => {
        try {
          const temp = (JSON.parse(m.payload) as { temp?: unknown }).temp;
          if (typeof temp !== "number" || !close(temp, toF(r.readings[i].value))) notF++;
        } catch {
          notJson++;
        }
      });
      if (notJson) return { pass: false, text: `${notJson} payloads are not JSON. Use a Template node.` };
      if (notF) return { pass: false, text: `${notF} payloads are not the reading in °F.` };
      return { pass: true, text: `All ${r.mqtt.length} readings were published in °F as JSON on home/temp/f.` };
    },
  },
  {
    id: "save",
    title: "Save data",
    goal: "Publish a reading to home/temp only when it has changed by at least 0.5 °C since the last one sent.",
    hint: "Sensor → Report by exception (0.5) → MQTT out.",
    example: () => ({
      nodes: [makeNode("n1", "sensor", {}, 40, 120), makeNode("n2", "filter", { minChange: 0.5 }, 260, 120), makeNode("n3", "mqtt", { topic: "home/temp" }, 500, 120)],
      wires: [wire("n1", "n2"), wire("n2", "n3")],
    }),
    check: (r) => {
      const want: number[] = [];
      for (const { value } of r.readings) if (!want.length || Math.abs(value - want[want.length - 1]) >= 0.5 - 1e-9) want.push(value);
      const sent = r.mqtt.filter((m) => m.topic === "home/temp").map((m) => Number(m.payload));
      if (!sent.length) return { pass: false, text: "Nothing was published to home/temp." };
      if (sent.length >= r.readings.length) return { pass: false, text: "Every reading was published, so no data was saved." };
      if (sent.length !== want.length || sent.some((v, i) => !close(v, want[i]))) {
        return { pass: false, text: `${sent.length} readings were published, but a 0.5 °C rule sends ${want.length}.` };
      }
      return { pass: true, text: `${sent.length} of ${r.readings.length} readings were published: ${Math.round((1 - sent.length / r.readings.length) * 100)} % less data.` };
    },
  },
];

export const getChallenge = (id: string) => CHALLENGES.find((c) => c.id === id) ?? CHALLENGES[0];
