/**
 * Lab L13: one temperature-monitoring job run under the four IoT
 * communication patterns.
 *
 * Every pattern sees exactly the same sensor readings: `makeWorld` makes the
 * random events once, and each pattern is a pure function of that world.
 * Only readings whose value changed are sent, in every pattern, so the
 * comparison is fair.
 *
 * - Request–response: sensors POST each change to a server; each app asks
 *   (GET) for the latest values every few seconds. A value that changes twice
 *   between two polls is missed: the app only ever sees the newest one.
 * - Publish–subscribe: MQTT QoS 1 with persistent sessions. The broker sends
 *   one copy of each reading to every app, and keeps copies for an app that
 *   is offline.
 * - Push–pull: sensors push readings into a queue; the apps act as workers
 *   that pull one reading at a time and take a while to process it. Each
 *   reading goes to exactly one worker, and the queue absorbs bursts.
 * - Exclusive pair: every client keeps one WebSocket open to the server, which
 *   pushes each reading straight down it. Nothing is stored for a client that
 *   is not connected.
 *
 * Times are in seconds. Every message is logged at the moment the server
 * handles it, so the same log gives totals, peak load and animation.
 */

import { createRng } from "~/lib/sim/random";

export type Pattern = "requestResponse" | "pubSub" | "pushPull" | "exclusivePair";
export const PATTERNS: Pattern[] = ["requestResponse", "pubSub", "pushPull", "exclusivePair"];

export const PATTERN_LABEL: Record<Pattern, string> = {
  requestResponse: "Request–response",
  pubSub: "Publish–subscribe",
  pushPull: "Push–pull",
  exclusivePair: "Exclusive pair",
};

export const PATTERN_EXAMPLE: Record<Pattern, string> = {
  requestResponse: "HTTP REST or CoAP",
  pubSub: "MQTT",
  pushPull: "A work queue (AMQP, ZeroMQ PUSH/PULL)",
  exclusivePair: "WebSocket",
};

/** What the server is called in each pattern */
export const SERVER_NAME: Record<Pattern, string> = {
  requestResponse: "server",
  pubSub: "broker",
  pushPull: "queue",
  exclusivePair: "server",
};

export interface PatternConfig {
  durationS: number;
  sensors: number;
  /** Apps that use the readings (workers, in push–pull) */
  apps: number;
  readingEveryS: number;
  /** Chance that a reading differs from the last one, 0–1 */
  changeProb: number;
  /** Request–response: each app asks this often */
  pollEveryS: number;
  /** One-way network delay */
  delayMs: number;
  /** Publish–subscribe and exclusive pair: keep-alive interval */
  keepAliveS: number;
  /** Push–pull: time a worker spends on one reading */
  workTimeS: number;
  /** Push–pull: how long a worker waits after finding the queue empty */
  emptyWaitS: number;
  /** App 1 goes offline from 5:00 to 6:00 */
  appOffline: boolean;
  seed: number;
}

export const DEFAULT_CONFIG: PatternConfig = {
  durationS: 600,
  sensors: 10,
  apps: 3,
  readingEveryS: 5,
  changeProb: 0.3,
  pollEveryS: 15,
  delayMs: 50,
  keepAliveS: 60,
  workTimeS: 4,
  emptyWaitS: 5,
  appOffline: false,
  seed: 1,
};

export const OFFLINE_FROM = 300;
export const OFFLINE_TO = 360;
/** Window used for peak server load, seconds */
export const LOAD_WINDOW_S = 10;

export interface Change {
  /** When the sensor took the reading */
  t: number;
  sensor: number;
  /** Position in time order */
  seq: number;
}

export interface World {
  cfg: PatternConfig;
  changes: Change[];
  sensorPhase: number[];
  appPhase: number[];
}

export type MsgKind = "data" | "control" | "setup";

export interface Msg {
  /** When the server handles it */
  t: number;
  from: string;
  to: string;
  kind: MsgKind;
  label: string;
}

export interface PatternResult {
  pattern: Pattern;
  messages: { data: number; control: number; setup: number; total: number };
  /** Readings that should reach a consumer: one per app, or one in total for push–pull */
  expected: number;
  delivered: number;
  /** Lost, or replaced by a newer value before anyone saw it */
  missed: number;
  /** Still on the way when the run ended */
  pending: number;
  avgDelayS: number | null;
  worstDelayS: number | null;
  /** Connections the server keeps open */
  connections: number;
  /** Most readings waiting at the server at one moment */
  maxQueue: number;
  /** Most messages the server handled in any LOAD_WINDOW_S seconds */
  peakLoad: number;
  /** How many consumers get each reading */
  copies: number;
  /** Queue length every 10 s (push–pull; empty for the others) */
  backlog: { t: number; queue: number }[];
  /** Every message, in time order */
  log: Msg[];
}

const sensorName = (i: number) => `sensor ${i + 1}`;
const appName = (i: number) => `app ${i + 1}`;

export function makeWorld(cfg: PatternConfig): World {
  const rng = createRng(cfg.seed);
  const sensorPhase = Array.from({ length: cfg.sensors }, () => rng.next() * cfg.readingEveryS);
  const changes: Change[] = [];
  for (let s = 0; s < cfg.sensors; s++) {
    for (let t = sensorPhase[s]; t < cfg.durationS; t += cfg.readingEveryS) {
      if (rng.chance(cfg.changeProb)) changes.push({ t, sensor: s, seq: 0 });
    }
  }
  // Drawn after the readings, so changing the number of apps keeps the same readings.
  const appPhase = Array.from({ length: cfg.apps }, () => rng.next() * cfg.pollEveryS);
  changes.sort((a, b) => a.t - b.t || a.sensor - b.sensor);
  changes.forEach((c, i) => (c.seq = i));
  return { cfg, changes, sensorPhase, appPhase };
}

const isOffline = (cfg: PatternConfig, app: number, t: number) => cfg.appOffline && app === 0 && t >= OFFLINE_FROM && t < OFFLINE_TO;

/* ------------------------------------------------------------------ */
/* Shared bookkeeping                                                  */
/* ------------------------------------------------------------------ */

class Tally {
  log: Msg[] = [];
  delays: number[] = [];
  missed = 0;
  pending = 0;

  msg(t: number, from: string, to: string, kind: MsgKind, label: string) {
    this.log.push({ t, from, to, kind, label });
  }

  result(pattern: Pattern, extra: Pick<PatternResult, "expected" | "connections" | "maxQueue" | "copies" | "backlog">): PatternResult {
    const log = this.log.sort((a, b) => a.t - b.t);
    const count = (k: MsgKind) => log.filter((m) => m.kind === k).length;
    let peak = 0;
    let lo = 0;
    for (let hi = 0; hi < log.length; hi++) {
      while (log[hi].t - log[lo].t >= LOAD_WINDOW_S) lo++;
      peak = Math.max(peak, hi - lo + 1);
    }
    return {
      pattern,
      messages: { data: count("data"), control: count("control"), setup: count("setup"), total: log.length },
      delivered: this.delays.length,
      missed: this.missed,
      pending: this.pending,
      avgDelayS: this.delays.length ? this.delays.reduce((a, b) => a + b, 0) / this.delays.length : null,
      worstDelayS: this.delays.length ? Math.max(...this.delays) : null,
      peakLoad: peak,
      log,
      ...extra,
    };
  }
}

/** Keep-alive exchanges a client needs: one every K seconds of silence while connected. */
function keepAlives(sendTimes: number[], from: number, to: number, k: number): number[] {
  const times = [from, ...sendTimes.filter((t) => t >= from && t < to), to].sort((a, b) => a - b);
  const pings: number[] = [];
  for (let i = 1; i < times.length; i++) {
    for (let p = times[i - 1] + k; p < times[i]; p += k) pings.push(p);
  }
  return pings;
}

/* ------------------------------------------------------------------ */
/* The four patterns                                                   */
/* ------------------------------------------------------------------ */

function requestResponse(w: World): PatternResult {
  const { cfg, changes } = w;
  const d = cfg.delayMs / 1000;
  const tally = new Tally();

  for (const c of changes) {
    tally.msg(c.t + d, sensorName(c.sensor), "server", "data", "POST reading");
    tally.msg(c.t + d, "server", sensorName(c.sensor), "control", "201 Created");
  }

  const bySensor = Array.from({ length: cfg.sensors }, (_, s) => changes.filter((c) => c.sensor === s));
  for (let a = 0; a < cfg.apps; a++) {
    const polls: number[] = [];
    for (let t = w.appPhase[a]; t < cfg.durationS; t += cfg.pollEveryS) {
      if (isOffline(cfg, a, t)) continue;
      polls.push(t);
      tally.msg(t + d, appName(a), "server", "control", "GET latest");
      tally.msg(t + d, "server", appName(a), "data", "latest readings");
    }
    // The server has a reading from c.t + d; a poll sent at τ reaches it at τ + d.
    for (const list of bySensor) {
      list.forEach((c, i) => {
        const poll = polls.find((p) => p >= c.t);
        if (poll === undefined) return void tally.pending++;
        const newer = list[i + 1];
        if (newer && newer.t <= poll) return void tally.missed++;
        tally.delays.push(poll + 2 * d - c.t);
      });
    }
  }

  return tally.result("requestResponse", { expected: changes.length * cfg.apps, connections: 0, maxQueue: 0, copies: cfg.apps, backlog: [] });
}

function pubSub(w: World): PatternResult {
  const { cfg, changes } = w;
  const d = cfg.delayMs / 1000;
  const tally = new Tally();

  for (let s = 0; s < cfg.sensors; s++) {
    tally.msg(d, sensorName(s), "broker", "setup", "CONNECT");
    tally.msg(d, "broker", sensorName(s), "setup", "CONNACK");
  }
  for (let a = 0; a < cfg.apps; a++) {
    tally.msg(d, appName(a), "broker", "setup", "CONNECT");
    tally.msg(d, "broker", appName(a), "setup", "CONNACK");
    tally.msg(2 * d, appName(a), "broker", "setup", "SUBSCRIBE");
    tally.msg(2 * d, "broker", appName(a), "setup", "SUBACK");
  }

  let queued = 0;
  const ackTimes: number[][] = Array.from({ length: cfg.apps }, () => []);
  for (const c of changes) {
    const at = c.t + d;
    tally.msg(at, sensorName(c.sensor), "broker", "data", "PUBLISH");
    tally.msg(at, "broker", sensorName(c.sensor), "control", "PUBACK");
    for (let a = 0; a < cfg.apps; a++) {
      if (isOffline(cfg, a, at)) {
        // Persistent session: the broker keeps it and sends it on reconnect.
        queued++;
        tally.msg(OFFLINE_TO + d, "broker", appName(a), "data", "PUBLISH (kept)");
        tally.msg(OFFLINE_TO + 3 * d, appName(a), "broker", "control", "PUBACK");
        ackTimes[a].push(OFFLINE_TO + 2 * d);
        tally.delays.push(OFFLINE_TO + 2 * d - c.t);
        continue;
      }
      if (at >= cfg.durationS) {
        tally.pending++;
        continue;
      }
      tally.msg(at, "broker", appName(a), "data", "PUBLISH");
      tally.msg(at + 2 * d, appName(a), "broker", "control", "PUBACK");
      ackTimes[a].push(at + d);
      tally.delays.push(2 * d);
    }
  }
  if (cfg.appOffline && cfg.apps > 0) {
    tally.msg(OFFLINE_TO + d, appName(0), "broker", "setup", "CONNECT");
    tally.msg(OFFLINE_TO + d, "broker", appName(0), "setup", "CONNACK");
  }

  // MQTT clients ping only after K seconds without sending anything.
  const ping = (name: string, times: number[], from: number, to: number) => {
    for (const p of keepAlives(times, from, to, cfg.keepAliveS)) {
      tally.msg(p + d, name, "broker", "setup", "PINGREQ");
      tally.msg(p + d, "broker", name, "setup", "PINGRESP");
    }
  };
  for (let s = 0; s < cfg.sensors; s++) {
    ping(sensorName(s), changes.filter((c) => c.sensor === s).map((c) => c.t), 0, cfg.durationS);
  }
  for (let a = 0; a < cfg.apps; a++) {
    if (cfg.appOffline && a === 0) {
      ping(appName(a), ackTimes[a], 0, OFFLINE_FROM);
      ping(appName(a), ackTimes[a], OFFLINE_TO, cfg.durationS);
    } else {
      ping(appName(a), ackTimes[a], 0, cfg.durationS);
    }
  }

  return tally.result("pubSub", {
    expected: changes.length * cfg.apps,
    connections: cfg.sensors + cfg.apps,
    maxQueue: queued,
    copies: cfg.apps,
    backlog: [],
  });
}

function pushPull(w: World): PatternResult {
  const { cfg, changes } = w;
  const d = cfg.delayMs / 1000;
  const tally = new Tally();

  for (const c of changes) {
    tally.msg(c.t + d, sensorName(c.sensor), "queue", "data", "push reading");
    tally.msg(c.t + d, "queue", sensorName(c.sensor), "control", "ack");
  }

  // Workers start pulling at staggered times, then pull whenever they are free.
  const next = w.appPhase.map((p) => (p / cfg.pollEveryS) * cfg.emptyWaitS);
  const queue: Change[] = [];
  let arrived = 0;
  let maxQueue = 0;
  const takenAt: number[] = [];
  for (;;) {
    let wk = -1;
    for (let i = 0; i < next.length; i++) if (next[i] < cfg.durationS && (wk < 0 || next[i] < next[wk])) wk = i;
    if (wk < 0) break;
    const tau = next[wk];
    if (isOffline(cfg, wk, tau)) {
      next[wk] = OFFLINE_TO;
      continue;
    }
    const at = tau + d;
    while (arrived < changes.length && changes[arrived].t + d <= at) queue.push(changes[arrived++]);
    maxQueue = Math.max(maxQueue, queue.length);
    tally.msg(at, appName(wk), "queue", "control", "pull");
    const item = queue.shift();
    if (item) {
      tally.msg(at, "queue", appName(wk), "data", "reading");
      tally.delays.push(at + d - item.t);
      takenAt.push(at);
      next[wk] = at + d + cfg.workTimeS;
    } else {
      tally.msg(at, "queue", appName(wk), "control", "empty");
      next[wk] = at + d + cfg.emptyWaitS;
    }
  }
  tally.pending = changes.length - takenAt.length;

  // Queue length every 10 s: arrived so far minus taken so far.
  const backlog: { t: number; queue: number }[] = [];
  for (let t = 0; t <= cfg.durationS; t += 10) {
    const inQueue = changes.filter((c) => c.t + d <= t).length - takenAt.filter((x) => x <= t).length;
    backlog.push({ t, queue: inQueue });
    maxQueue = Math.max(maxQueue, inQueue);
  }

  return tally.result("pushPull", { expected: changes.length, connections: 0, maxQueue, copies: 1, backlog });
}

function exclusivePair(w: World): PatternResult {
  const { cfg, changes } = w;
  const d = cfg.delayMs / 1000;
  const tally = new Tally();
  const clients = [...Array.from({ length: cfg.sensors }, (_, s) => sensorName(s)), ...Array.from({ length: cfg.apps }, (_, a) => appName(a))];

  for (const name of clients) {
    tally.msg(d, name, "server", "setup", "upgrade to WebSocket");
    tally.msg(d, "server", name, "setup", "101 Switching");
  }
  // The server pings every open connection every K seconds.
  for (let p = cfg.keepAliveS; p < cfg.durationS; p += cfg.keepAliveS) {
    clients.forEach((name, i) => {
      if (i >= cfg.sensors && isOffline(cfg, i - cfg.sensors, p)) return;
      tally.msg(p, "server", name, "setup", "ping");
      tally.msg(p + 2 * d, name, "server", "setup", "pong");
    });
  }
  if (cfg.appOffline && cfg.apps > 0) {
    tally.msg(OFFLINE_TO + d, appName(0), "server", "setup", "upgrade to WebSocket");
    tally.msg(OFFLINE_TO + d, "server", appName(0), "setup", "101 Switching");
  }

  for (const c of changes) {
    const at = c.t + d;
    tally.msg(at, sensorName(c.sensor), "server", "data", "reading");
    for (let a = 0; a < cfg.apps; a++) {
      if (isOffline(cfg, a, at)) {
        // No open connection and no storage: the reading is gone for this app.
        tally.missed++;
        continue;
      }
      if (at >= cfg.durationS) {
        tally.pending++;
        continue;
      }
      tally.msg(at, "server", appName(a), "data", "reading");
      tally.delays.push(2 * d);
    }
  }

  return tally.result("exclusivePair", {
    expected: changes.length * cfg.apps,
    connections: cfg.sensors + cfg.apps,
    maxQueue: 0,
    copies: cfg.apps,
    backlog: [],
  });
}

const RUN: Record<Pattern, (w: World) => PatternResult> = {
  requestResponse,
  pubSub,
  pushPull,
  exclusivePair,
};

export function runPattern(pattern: Pattern, world: World): PatternResult {
  return RUN[pattern](world);
}

/** Every pattern on the same world, so they see exactly the same readings. */
export function runAll(cfg: PatternConfig): { world: World; results: Record<Pattern, PatternResult> } {
  const world = makeWorld(cfg);
  return {
    world,
    results: {
      requestResponse: requestResponse(world),
      pubSub: pubSub(world),
      pushPull: pushPull(world),
      exclusivePair: exclusivePair(world),
    },
  };
}
