/**
 * Helpers for the L20 editor that do not need React: replaying a run tick by
 * tick, placing new nodes, and turning a run into a short observation row.
 */
import type { ObservationRow } from "~/content/types";
import { CHALLENGES, KINDS, type Flow, type FlowNode, type Message, type NodeKind, type RunResult, type Verdict } from "./engine";

/** One engine tick is one second of simulated time. */
export const TICK_MS = 1000;

/* ------------------------------------------------------------------ */
/* Replay                                                              */
/* ------------------------------------------------------------------ */

export interface ReplayHop {
  wire: string;
  from: string;
  to: string;
  /** 0 for a wire leaving a sensor, 1 for the next wire, and so on */
  depth: number;
  msg: Message;
}

export interface ReplayTick {
  hops: ReplayHop[];
  /** Number of wire levels the messages of this tick pass through (at least 1) */
  levels: number;
  /** Sensors that took a reading in this tick */
  emits: string[];
}

export interface Replay {
  ticks: ReplayTick[];
  /** Messages on each wire before tick t; index 0 to ticks.length */
  wireBefore: Record<string, number>[];
  /** Messages handled by each node before tick t */
  nodeBefore: Record<string, number>[];
}

export function buildReplay(flow: Flow, result: RunResult): Replay {
  const wires = new Map(flow.wires.map((w) => [w.id, w]));
  const sensors = flow.nodes.filter((n) => n.kind === "sensor");
  const ticks: ReplayTick[] = result.ticks.map((tick) => {
    // Hops come in depth-first order, so a node's latest arrival is the one it passes on.
    const arrival = new Map<string, number>();
    const hops: ReplayHop[] = [];
    for (const h of tick.hops) {
      const w = wires.get(h.wire);
      if (!w) continue;
      const depth = arrival.get(w.from) ?? 0;
      arrival.set(w.to, depth + 1);
      hops.push({ wire: w.id, from: w.from, to: w.to, depth, msg: h.msg });
    }
    const levels = Math.max(1, ...hops.map((h) => h.depth + 1));
    const emits = sensors.filter((s) => tick.t % (s.config.interval ?? 1) === 0).map((s) => s.id);
    return { hops, levels, emits };
  });

  const wire0: Record<string, number> = Object.fromEntries(flow.wires.map((w) => [w.id, 0]));
  const node0: Record<string, number> = Object.fromEntries(flow.nodes.map((n) => [n.id, 0]));
  const wireBefore = [wire0];
  const nodeBefore = [node0];
  for (const tick of ticks) {
    const w = { ...wireBefore[wireBefore.length - 1] };
    const n = { ...nodeBefore[nodeBefore.length - 1] };
    for (const id of tick.emits) n[id] = (n[id] ?? 0) + 1;
    for (const h of tick.hops) {
      w[h.wire] = (w[h.wire] ?? 0) + 1;
      n[h.to] = (n[h.to] ?? 0) + 1;
    }
    wireBefore.push(w);
    nodeBefore.push(n);
  }
  return { ticks, wireBefore, nodeBefore };
}

/** How far (0 to 1) a hop's dot has travelled along its wire at this point of the tick. */
export const hopProgress = (depth: number, levels: number, frac: number) => frac * levels - depth;

/**
 * Running counts part-way through tick `done` (frac 0 to 1): a wire's count
 * goes up when its dot arrives, and a sensor's when it takes the reading.
 */
export function countsAt(replay: Replay, done: number, frac: number) {
  const last = replay.ticks.length;
  const at = Math.max(0, Math.min(done, last));
  const wires = { ...replay.wireBefore[at] };
  const nodes = { ...replay.nodeBefore[at] };
  const tick = replay.ticks[at];
  if (tick && frac > 0) {
    for (const id of tick.emits) nodes[id] = (nodes[id] ?? 0) + 1;
    for (const h of tick.hops) {
      if (hopProgress(h.depth, tick.levels, frac) >= 1) {
        wires[h.wire] = (wires[h.wire] ?? 0) + 1;
        nodes[h.to] = (nodes[h.to] ?? 0) + 1;
      }
    }
  }
  return { wires, nodes };
}

/* ------------------------------------------------------------------ */
/* Canvas positions                                                    */
/* ------------------------------------------------------------------ */

/**
 * Flow positions are stored for a left-to-right layout. On a narrow canvas the
 * editor turns the flow so it runs top to bottom, which fits a phone.
 */
export const toView = (x: number, y: number, vertical: boolean) => (vertical ? { x: Math.round(y * 1.5), y: Math.round(x * 0.55) } : { x: Math.round(x * 1.2), y });
export const fromView = (p: { x: number; y: number }, vertical: boolean) =>
  vertical ? { x: Math.round(p.y / 0.55), y: Math.round(p.x / 1.5) } : { x: Math.round(p.x / 1.2), y: Math.round(p.y) };

const COLS = [40, 260, 480, 700, 920];
const ROWS = [120, 0, 240, 360, 480];
const COL_ORDER: Record<string, number[]> = { input: [0, 1, 2, 3, 4], function: [1, 2, 3, 0, 4], output: [2, 3, 4, 1, 0] };

/** The first free spot for a new node: sensors on the left, outputs to the right. */
export function nextSpot(flow: Flow, kind: NodeKind): { x: number; y: number } {
  const free = (x: number, y: number) => flow.nodes.every((n) => Math.abs((n.x ?? 0) - x) >= 190 || Math.abs((n.y ?? 0) - y) >= 115);
  for (const y of ROWS) {
    for (const c of COL_ORDER[KINDS[kind].group]) {
      if (free(COLS[c], y)) return { x: COLS[c], y };
    }
  }
  return { x: 40 + 30 * (flow.nodes.length % 10), y: 600 };
}

export function nextId(nodes: FlowNode[]): string {
  const max = Math.max(0, ...nodes.map((n) => Number(n.id.replace(/\D/g, "")) || 0));
  return `n${max + 1}`;
}

/* ------------------------------------------------------------------ */
/* Observations                                                        */
/* ------------------------------------------------------------------ */

export const hotCount = (r: RunResult) => r.readings.filter((x) => x.value > 35).length;

/** "Pass" or "Fail" with a reason short enough for a printed table. */
export function shortResult(id: string, r: RunResult, v: Verdict): string {
  const n = r.readings.length;
  const verdict = v.pass ? "Pass" : "Fail";
  switch (id) {
    case "gauge": {
      const d = r.dashboard.length;
      if (v.pass || (d && d !== n)) return `${verdict}: ${d}/${n} shown`;
      return d ? "Fail: not °C values" : "Fail: gauge got nothing";
    }
    case "alert": {
      const hot = hotCount(r);
      const sent = r.alerts.length;
      if (!v.pass && sent === hot && sent > 0) return "Fail: wrong readings";
      return `${verdict}: ${sent} alerts, ${hot} hot`;
    }
    case "fahrenheit": {
      const m = r.mqtt.length;
      if (v.pass) return `Pass: ${m}/${n} in °F`;
      if (!m) return "Fail: nothing sent";
      if (r.mqtt.some((x) => x.topic !== "home/temp/f")) return "Fail: wrong topic";
      if (m !== n) return `Fail: ${m}/${n} sent`;
      const notJson = r.mqtt.some((x) => {
        try {
          JSON.parse(x.payload);
          return false;
        } catch {
          return true;
        }
      });
      return notJson ? "Fail: not JSON" : "Fail: not °F";
    }
    case "save": {
      const sent = r.mqtt.filter((x) => x.topic === "home/temp").length;
      if (v.pass) return `Pass: ${sent}/${n} sent`;
      if (!sent) return "Fail: nothing to home/temp";
      if (sent >= n) return "Fail: no data saved";
      return `Fail: ${sent}/${n} sent`;
    }
    default:
      return verdict;
  }
}

const joinAnd = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

/** The automatic result for the lab record, from the latest row of each challenge. */
export function summarise(rows: ObservationRow[]): string {
  const latest = new Map<string, ObservationRow>();
  for (const r of rows) latest.set(String(r.challengeId), r);
  const done = CHALLENGES.filter((c) => latest.has(c.id)).map((c) => ({ c, r: latest.get(c.id)! }));
  if (!done.length) return "";

  const passed = done.filter((d) => Number(d.r.passed) === 1);
  const failed = done.filter((d) => Number(d.r.passed) !== 1);
  const parts: string[] = [];
  if (passed.length) parts.push(`My flows passed ${passed.length} of ${CHALLENGES.length} challenges: ${joinAnd(passed.map((d) => d.c.title))}.`);
  if (failed.length) {
    const why = (r: ObservationRow) => String(r.result).replace(/^Fail:\s*/, "");
    parts.push(`${joinAnd(failed.map((d) => `${d.c.title} (${why(d.r)})`))} did not pass yet.`);
  }

  const get = (id: string) => passed.find((d) => d.c.id === id)?.r;
  const gauge = get("gauge");
  if (gauge) parts.push(`The gauge showed all ${gauge.readings} readings as they arrived.`);
  const alert = get("alert");
  if (alert) {
    const quiet = Number(alert.readings) - Number(alert.hot);
    parts.push(`The threshold sent ${alert.alerts} alerts for ${alert.hot} readings above 35 °C and stayed quiet for the other ${quiet}.`);
  }
  const fahrenheit = get("fahrenheit");
  if (fahrenheit) parts.push(`The Fahrenheit flow published ${fahrenheit.mqtt} JSON messages to home/temp/f.`);
  const save = get("save");
  if (save) {
    const readings = Number(save.readings);
    const pct = Math.round((1 - Number(save.mqtt) / readings) * 100);
    parts.push(`Report by exception published only ${save.mqtt} of ${readings} readings, so ${pct} % less data was sent.`);
  }
  if (passed.length) {
    parts.push("So small nodes wired together can read a sensor, apply a rule and send alerts without writing a program.");
  }
  return parts.join(" ");
}
