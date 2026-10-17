import { useReducedMotion } from "motion/react";
import { Inbox, RadioTower, Server, Smartphone, Thermometer, type LucideIcon } from "lucide-react";
import { memo, useId, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceArea, Tooltip, XAxis, YAxis } from "recharts";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { EventLog, type SimEvent } from "~/components/sim/EventLog";
import { SimControls } from "~/components/sim/SimControls";
import { useSimClock } from "~/components/sim/useSimClock";
import { ChartCard, ChartTooltip, chartStyle, seriesColor } from "~/components/theory/ChartCard";
import { Segmented } from "~/components/ui/Segmented";
import { Slider } from "~/components/ui/Slider";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import {
  DEFAULT_CONFIG,
  LOAD_WINDOW_S,
  OFFLINE_FROM,
  OFFLINE_TO,
  PATTERNS,
  PATTERN_EXAMPLE,
  PATTERN_LABEL,
  SERVER_NAME,
  runAll,
  type Msg,
  type MsgKind,
  type Pattern,
  type PatternConfig,
  type PatternResult,
} from "./engine";

const lab = getLab("l13-communication-patterns")!;
/** Simulated seconds the animation replays */
const WINDOW_S = 60;
/** Latest Watch from value, so the window stays inside the run */
const LAST_WINDOW_START = DEFAULT_CONFIG.durationS - WINDOW_S;
/** Most dots drawn at once; more would only blur into one another */
const MAX_DOTS = 240;
/** Rows kept in the message log */
const MAX_LOG = 150;
const noop = () => {};

const steps = [
  "Keep the default settings. Pick each pattern under Pattern to watch and press Play to watch its messages, then press Record observation.",
  "Lower Apps poll every from 15 s to 5 s and record again. In the results table, request–response misses fewer readings but sends more messages.",
  "Set Apps poll every back to 15 s, set Apps to 2 and record. Watch the Push–pull queue over time chart: two workers cannot keep up, so the backlog grows.",
  "Set Apps back to 3, tick App 1 goes offline from 5:00 to 6:00 and record. Set Watch from to 5:30 and play publish–subscribe, then exclusive pair. Which one delivers App 1's readings late, and which one loses them?",
  "Untick the offline box, raise Sensors to 20 and record. Compare the Peak load chart: which pattern keeps its server busiest?",
];

/** Short names for chart axes, where the full label does not fit on a phone. */
const SHORT: Record<Pattern, string> = {
  requestResponse: "Req–resp",
  pubSub: "Pub–sub",
  pushPull: "Push–pull",
  exclusivePair: "Excl. pair",
};
const SHORT_BY_LABEL = Object.fromEntries(PATTERNS.map((p) => [PATTERN_LABEL[p], SHORT[p]]));

const KINDS: MsgKind[] = ["data", "control", "setup"];
const KIND_LABEL: Record<MsgKind, string> = { data: "Data", control: "Control", setup: "Setup" };
const KIND_NOTE: Record<MsgKind, string> = {
  data: "carries readings",
  control: "requests, polls and acks",
  setup: "connecting and keep-alive",
};

const KIND_FILTERS = KINDS.map((k) => ({ kind: k, label: KIND_LABEL[k] }));
const PATTERN_OPTIONS = PATTERNS.map((p) => ({ value: p, label: PATTERN_LABEL[p] }));

/** Each pattern keeps one colour everywhere, whichever pattern is watched. */
const colorOf = (p: Pattern) => seriesColor(PATTERNS.indexOf(p));
/** Message kinds use other slots, so a kind never looks like a pattern. */
const KIND_COLOR: Record<MsgKind, string> = { data: seriesColor(6), control: seriesColor(4), setup: seriesColor(5) };
const SERVER_ICON: Record<Pattern, LucideIcon> = {
  requestResponse: Server,
  pubSub: RadioTower,
  pushPull: Inbox,
  exclusivePair: Server,
};

/** One or two sentences on what the stage shows for each pattern. */
const HOW: Record<Pattern, (cfg: PatternConfig) => string> = {
  requestResponse: (cfg) =>
    `Sensors POST each changed reading to the server. Every ${cfg.pollEveryS} s each app sends GET to ask for the latest values.`,
  pubSub: () =>
    "Sensors PUBLISH each changed reading to the broker, which sends a copy to every app at once. Every copy is acknowledged with a PUBACK (QoS 1).",
  pushPull: (cfg) =>
    `Sensors push each changed reading into the queue. A free app pulls one reading and works on it for ${cfg.workTimeS} s, so each reading goes to one app only.`,
  exclusivePair: () =>
    "Every sensor and app keeps one WebSocket open. The server pushes each reading straight down the open connection to every app.",
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: string | number | undefined) => (typeof v === "number" ? v : Number(v));
const fmt = (n: number) => n.toLocaleString("en-IN");
const plural = (n: number, word: string) => `${n} ${n === 1 ? word : `${word}s`}`;
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Axis ticks for big message counts: 12000 → 12k */
const compact = (n: number) => (n >= 1000 ? `${round1(n / 1000)}k` : String(n));
/** "5:30" style time within the 10-minute run */
function runTime(s: number): string {
  const t = Math.max(0, Math.floor(s + 1e-6));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
/** Delay in seconds, rounded for display; null when nothing was delivered */
const delayValue = (s: number | null) => (s === null ? null : s < 10 ? round2(s) : round1(s));
/** Missed readings as % of those expected; null when no reading changed */
const missedPct = (r: PatternResult) => (r.expected > 0 ? round1((r.missed / r.expected) * 100) : null);

function listWords(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Index of the first item whose key is above t, for items sorted by key. */
function upperBound<T>(items: T[], t: number, key: (item: T) => number): number {
  let lo = 0;
  let hi = items.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (key(items[mid]) <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/* ------------------------------------------------------------------ */
/* Replaying the log                                                   */
/* ------------------------------------------------------------------ */

interface Flight {
  id: number;
  msg: Msg;
  /** Run time, in seconds, when the dot sets off */
  start: number;
}

/**
 * When each message's dot sets off. Real messages cross the network in a few
 * milliseconds, too fast to see, so every dot takes `travel` seconds instead.
 * A reply waits until the message it answers has landed, so an ACK never sets
 * off before the reading it acknowledges arrives.
 */
function timeline(log: Msg[], server: string, delayS: number, travel: number, from: number, to: number): Flight[] {
  const key = (name: string, t: number) => `${name}@${Math.round(t * 1e4)}`;
  const landedAtClient = new Map<string, number>();
  const landedAtServer = new Map<string, number>();
  const sentTo = new Map<string, { t: number; land: number }[]>();
  const flights: Flight[] = [];
  // Messages just before the window decide when replies inside it set off.
  for (let i = upperBound(log, from - 5, (m) => m.t); i < log.length && log[i].t < to; i++) {
    const m = log[i];
    let start: number;
    if (m.to === server) {
      // A client answers 2 × delay after the server sent to it (an ACK or a pong),
      // or soon after (SUBSCRIBE after CONNACK).
      let answers = landedAtClient.get(key(m.from, m.t - 2 * delayS));
      if (answers === undefined) {
        const sent = sentTo.get(m.from) ?? [];
        for (let j = sent.length - 1; j >= 0; j--) {
          if (sent[j].t > m.t - 1e-6) continue;
          if (sent[j].t >= m.t - 2 * delayS - 1e-6) answers = sent[j].land;
          break;
        }
      }
      start = answers ?? m.t - delayS;
      landedAtServer.set(key(m.from, m.t), start + travel);
    } else {
      // The server sends once whatever it is answering has landed.
      start = Math.max(m.t - delayS + travel, landedAtServer.get(key(m.to, m.t)) ?? -Infinity);
      landedAtClient.set(key(m.to, m.t), start + travel);
      const sent = sentTo.get(m.to) ?? [];
      sent.push({ t: m.t, land: start + travel });
      sentTo.set(m.to, sent);
    }
    if (m.t >= from) flights.push({ id: i, msg: m, start });
  }
  return flights.sort((a, b) => a.start - b.start);
}

/** Is App 1 offline at server time t? */
const appOneOffline = (cfg: PatternConfig, t: number) =>
  cfg.appOffline && cfg.apps > 0 && t >= OFFLINE_FROM && t < OFFLINE_TO;

function toEvent(f: Flight, pattern: Pattern, cfg: PatternConfig): SimEvent {
  const m = f.msg;
  let text = `${capital(m.from)} → ${m.to}: ${m.label}`;
  let tone: SimEvent["tone"] = m.label === "PUBLISH (kept)" ? "warn" : "info";
  if (m.kind === "data" && m.from.startsWith("sensor") && appOneOffline(cfg, m.t)) {
    if (pattern === "pubSub") {
      text += " (the broker keeps a copy for app 1)";
      tone = "warn";
    } else if (pattern === "exclusivePair") {
      text += " (app 1 is not connected, so it never gets this reading)";
      tone = "bad";
    }
  }
  return { id: f.id, t: m.t * 1000, text, tone, kind: m.kind };
}

/* ------------------------------------------------------------------ */
/* Auto-written result                                                 */
/* ------------------------------------------------------------------ */

const SETTINGS = ["sensors", "apps", "poll", "offline"] as const;
type Setting = (typeof SETTINGS)[number];

/** Rows recorded with the same settings, keeping the latest row per pattern. */
function groupRuns(rows: ObservationRow[]): ObservationRow[][] {
  const groups = new Map<string, ObservationRow[]>();
  for (const r of rows) {
    const key = SETTINGS.map((k) => r[k]).join("|");
    const list = groups.get(key) ?? [];
    groups.set(key, [...list.filter((x) => x.pattern !== r.pattern), r]);
  }
  return [...groups.values()];
}

/** Two runs that differ only in one setting: its lowest and highest value (offline: No, then Yes). */
function spread(groups: ObservationRow[][], setting: Setting): { low: ObservationRow[]; high: ObservationRow[] } | null {
  const others = SETTINGS.filter((k) => k !== setting);
  let best: { low: ObservationRow[]; high: ObservationRow[] } | null = null;
  let bestGap = 0;
  for (const low of groups) {
    for (const high of groups) {
      if (others.some((k) => low[0][k] !== high[0][k])) continue;
      const gap =
        setting === "offline"
          ? Number(low[0].offline === "No" && high[0].offline === "Yes")
          : num(high[0][setting]) - num(low[0][setting]);
      if (gap > bestGap) {
        best = { low, high };
        bestGap = gap;
      }
    }
  }
  return best;
}

/** The same pattern's row in two runs, for every pattern recorded in both. */
function pairs(low: ObservationRow[], high: ObservationRow[]) {
  return PATTERNS.flatMap((p) => {
    const label = PATTERN_LABEL[p];
    const before = low.find((r) => r.pattern === label);
    const after = high.find((r) => r.pattern === label);
    return before && after ? [{ label, before, after }] : [];
  });
}

function summarise(rows: ObservationRow[]): string {
  if (rows.length === 0) return "";
  const groups = groupRuns(rows);
  const parts: string[] = [];

  // Messages, delay and missed readings in the first run recorded.
  const base = groups.find((g) => g.length >= 2);
  if (base) {
    const c = base[0];
    const cond =
      `With ${plural(num(c.sensors), "sensor")}, ${plural(num(c.apps), "app")} and apps polling every ${c.poll} s` +
      (c.offline === "Yes" ? ", with App 1 offline from 5:00 to 6:00" : "");
    const byMessages = [...base].sort((a, b) => num(a.messages) - num(b.messages));
    const fewest = byMessages[0];
    const most = byMessages[byMessages.length - 1];
    if (num(most.messages) > num(fewest.messages)) {
      parts.push(
        `${cond}, ${most.pattern} sent the most messages (${fmt(num(most.messages))}) and ${fewest.pattern} the fewest (${fmt(num(fewest.messages))}).`,
      );
    }
    const timed = base.filter((r) => typeof r.avgDelay === "number");
    if (timed.length >= 2) {
      const slow = Math.max(...timed.map((r) => num(r.avgDelay)));
      const fast = Math.min(...timed.map((r) => num(r.avgDelay)));
      if (slow > fast) {
        const slowest = timed.filter((r) => num(r.avgDelay) === slow).map((r) => String(r.pattern));
        const fastest = timed.filter((r) => num(r.avgDelay) === fast).map((r) => String(r.pattern));
        parts.push(
          `${listWords(slowest)} ${slowest.length === 1 ? "was" : "were"} the slowest, with an average delay of ${slow} s, and ${listWords(fastest)} the fastest (${fast} s).`,
        );
      }
    }
    const missing = base.filter((r) => num(r.missed) > 0);
    const none = base.filter((r) => num(r.missed) === 0).map((r) => String(r.pattern));
    if (missing.length) {
      parts.push(
        `${listWords(missing.map((r) => `${r.pattern} missed ${r.missed}% of readings`))}` +
          (none.length ? `, while ${listWords(none)} missed none.` : "."),
      );
    } else if (none.length) {
      parts.push("No pattern missed a reading.");
    }
  }

  // Polling faster: request–response only.
  const poll = spread(groups, "poll");
  const polled = poll && pairs(poll.low, poll.high).find((x) => x.label === PATTERN_LABEL.requestResponse);
  if (polled) {
    const { before: fast, after: slow } = polled;
    parts.push(
      `When apps polled every ${fast.poll} s instead of ${slow.poll} s, ${polled.label} missed ${fast.missed}% of readings instead of ${slow.missed}% and sent ${fmt(num(fast.messages))} messages instead of ${fmt(num(slow.messages))}.`,
    );
  }

  // Fewer apps: push–pull has fewer workers, publish–subscribe fewer copies.
  const appRuns = spread(groups, "apps");
  if (appRuns) {
    const both = pairs(appRuns.low, appRuns.high);
    const queue = both.find((x) => x.label === PATTERN_LABEL.pushPull);
    const copies = both.find((x) => x.label === PATTERN_LABEL.pubSub);
    const few = num(appRuns.low[0].apps);
    const many = num(appRuns.high[0].apps);
    const said: string[] = [];
    if (queue && typeof queue.before.avgDelay === "number" && typeof queue.after.avgDelay === "number") {
      said.push(`${queue.label}'s average delay was ${queue.before.avgDelay} s instead of ${queue.after.avgDelay} s`);
    }
    if (copies) {
      said.push(`${copies.label} sent ${fmt(num(copies.before.messages))} messages instead of ${fmt(num(copies.after.messages))}`);
    }
    if (said.length) parts.push(`With ${plural(few, "app")} instead of ${many}, ${listWords(said)}.`);
  }

  // App 1 offline: which patterns lost readings, and which only delivered them late.
  const off = spread(groups, "offline");
  if (off) {
    const both = pairs(off.low, off.high);
    const lost = both.filter((x) => num(x.after.missed) > num(x.before.missed));
    const late = both.filter(
      (x) => num(x.after.missed) === num(x.before.missed) && num(x.after.avgDelay) > num(x.before.avgDelay),
    );
    const when = "With App 1 offline from 5:00 to 6:00";
    if (lost.length) {
      parts.push(
        `${when}, ${listWords(lost.map((x) => `${x.label} missed ${x.after.missed}% of readings instead of ${x.before.missed}%`))}.`,
      );
    }
    if (late.length) {
      parts.push(
        `${lost.length ? "" : `${when}, `}${listWords(late.map((x) => x.label))} missed no more readings than before, but the average delay rose: ${listWords(late.map((x) => `${x.label} from ${x.before.avgDelay} s to ${x.after.avgDelay} s`))}.`,
      );
    }
    if (both.length && !lost.length && !late.length) {
      parts.push(`${when}, no pattern missed more readings or slowed down.`);
    }
  }

  // More sensors: which server's peak load grew most.
  const more = spread(groups, "sensors");
  if (more) {
    const rises = pairs(more.low, more.high)
      .map((x) => ({ ...x, rise: num(x.after.peak) - num(x.before.peak) }))
      .sort((a, b) => b.rise - a.rise);
    const top = rises[0];
    const bottom = rises[rises.length - 1];
    if (top && top.rise > 0) {
      let tail = "";
      if (rises.length > 1 && bottom.rise < top.rise) {
        if (bottom.rise > 0) tail = ` and the least for ${bottom.label} (from ${bottom.before.peak} to ${bottom.after.peak})`;
        else if (bottom.rise < 0) tail = `, while ${bottom.label}'s fell from ${bottom.before.peak} to ${bottom.after.peak}`;
        else tail = `, while ${bottom.label}'s stayed at ${bottom.before.peak}`;
      }
      parts.push(
        `With ${plural(num(top.after.sensors), "sensor")} instead of ${top.before.sensors}, peak load rose the most for ${top.label} (from ${top.before.peak} to ${top.after.peak} messages in 10 s)${tail}.`,
      );
    }
  }

  return parts.join(" ");
}

/* ------------------------------------------------------------------ */
/* The lab                                                             */
/* ------------------------------------------------------------------ */

export default function CommunicationPatternsLab() {
  const [sensors, setSensors] = useState(DEFAULT_CONFIG.sensors);
  const [apps, setApps] = useState(DEFAULT_CONFIG.apps);
  const [readingEveryS, setReadingEveryS] = useState(DEFAULT_CONFIG.readingEveryS);
  const [changePct, setChangePct] = useState(Math.round(DEFAULT_CONFIG.changeProb * 100));
  const [pollEveryS, setPollEveryS] = useState(DEFAULT_CONFIG.pollEveryS);
  const [delayMs, setDelayMs] = useState(DEFAULT_CONFIG.delayMs);
  const [workTimeS, setWorkTimeS] = useState(DEFAULT_CONFIG.workTimeS);
  const [appOffline, setAppOffline] = useState(DEFAULT_CONFIG.appOffline);
  const [pattern, setPattern] = useState<Pattern>("requestResponse");
  const [windowStart, setWindowStart] = useState(0);
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");
  const reduced = useReducedMotion() ?? false;
  const offlineId = useId();

  const cfg = useMemo<PatternConfig>(
    () => ({
      ...DEFAULT_CONFIG,
      sensors,
      apps,
      readingEveryS,
      changeProb: changePct / 100,
      pollEveryS,
      delayMs,
      workTimeS,
      appOffline,
    }),
    [sensors, apps, readingEveryS, changePct, pollEveryS, delayMs, workTimeS, appOffline],
  );
  // Every pattern runs on the same readings, so the comparison is fair.
  const results = useMemo(() => runAll(cfg).results, [cfg]);
  const chosen = results[pattern];
  const server = SERVER_NAME[pattern];

  // Dots take longer on a slower network, but are always slow enough to follow.
  const travel = 0.6 + delayMs / 1000;
  const flights = useMemo(
    () => timeline(chosen.log, server, delayMs / 1000, travel, windowStart, windowStart + WINDOW_S),
    [chosen, server, delayMs, travel, windowStart],
  );
  /** Server times of readings arriving from sensors, and (push–pull) taken by workers */
  const marks = useMemo(() => {
    const arrived: number[] = [];
    const taken: number[] = [];
    for (const m of chosen.log) {
      if (m.kind !== "data") continue;
      if (m.to === server && m.from.startsWith("sensor")) arrived.push(m.t);
      else if (m.from === server) taken.push(m.t);
    }
    return { arrived, taken };
  }, [chosen, server]);

  const clock = useSimClock({ onTick: noop, stepMs: 250, maxTimeMs: Math.round((WINDOW_S + 3 * travel) * 1000) });
  const now = windowStart + clock.timeMs / 1000;
  const started = upperBound(flights, now, (f) => f.start);

  const events = useMemo(
    () => flights.slice(Math.max(0, started - MAX_LOG), started).map((f) => toEvent(f, pattern, cfg)),
    [flights, started, pattern, cfg],
  );

  const record = () => {
    const newRows: ObservationRow[] = PATTERNS.map((p) => {
      const r = results[p];
      return {
        pattern: PATTERN_LABEL[p],
        sensors,
        apps,
        poll: pollEveryS,
        offline: appOffline ? "Yes" : "No",
        messages: r.messages.total,
        avgDelay: delayValue(r.avgDelayS) ?? "—",
        missed: missedPct(r) ?? "—",
        peak: r.peakLoad,
        connections: r.connections,
      };
    });
    newRows.forEach(addRow);
    const auto = summarise([...rows, ...newRows]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  // The clock re-renders this component on every animation frame. The parts
  // that do not depend on it are memoised, so React skips them.
  const controls = useMemo(
    () => (
      <>
        <Slider
          label="Sensors"
          value={sensors}
          min={1}
          max={20}
          onChange={setSensors}
          hint="Each sensor takes a temperature reading and sends it only when the value has changed."
        />
        <Slider
          label="Apps"
          value={apps}
          min={1}
          max={10}
          onChange={setApps}
          hint="Apps that use the readings. In push–pull the apps act as workers that share the readings."
        />
        <Slider label="A reading every" value={readingEveryS} min={2} max={30} unit="s" onChange={setReadingEveryS} />
        <Slider
          label="Chance a reading changes"
          value={changePct}
          min={5}
          max={100}
          step={5}
          unit="%"
          onChange={setChangePct}
          hint="Only changed readings are sent, in every pattern."
        />
        <Slider
          label="Apps poll every"
          value={pollEveryS}
          min={2}
          max={60}
          unit="s"
          onChange={setPollEveryS}
          hint="Request–response only: how often each app asks for the latest values."
        />
        <Slider
          label="Network delay"
          value={delayMs}
          min={10}
          max={500}
          step={10}
          unit="ms"
          onChange={setDelayMs}
          hint="One way, for every message."
        />
        <Slider
          label="Worker time per reading"
          value={workTimeS}
          min={1}
          max={10}
          unit="s"
          onChange={setWorkTimeS}
          hint="Push–pull only: how long an app works on one reading before it pulls the next."
        />
        <div className="grid gap-1">
          <label className="flex items-center gap-2.5 font-semibold">
            <input
              type="checkbox"
              className="size-4 shrink-0 accent-[var(--brand)]"
              checked={appOffline}
              aria-describedby={`${offlineId}-hint`}
              onChange={(e) => setAppOffline(e.target.checked)}
            />
            App 1 goes offline from 5:00 to 6:00
          </label>
          <p id={`${offlineId}-hint`} className="pl-6.5 text-sm text-ink-3">
            Its connection drops for one minute of the run.
          </p>
        </div>
        <p className="text-sm text-ink-3">
          Every pattern runs the same 10 minutes with the same readings, so the results compare like with like.
        </p>
      </>
    ),
    [sensors, apps, readingEveryS, changePct, pollEveryS, delayMs, workTimeS, appOffline, offlineId],
  );

  const { reset } = clock;
  const picker = useMemo(
    () => (
      <>
        <Segmented label="Pattern to watch" size="sm" className="min-w-0" options={PATTERN_OPTIONS} value={pattern} onChange={setPattern} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <p className="flex min-w-0 items-baseline gap-2 text-sm text-ink-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(pattern) }} aria-hidden />
            <span>
              <span className="font-semibold text-ink">{PATTERN_EXAMPLE[pattern]}.</span> {HOW[pattern](cfg)}
            </span>
          </p>
          <Slider
            label="Watch from"
            value={windowStart}
            min={0}
            max={LAST_WINDOW_START}
            step={30}
            format={(v) => `${runTime(v)} to ${runTime(v + WINDOW_S)}`}
            onChange={(start) => {
              setWindowStart(start);
              reset();
            }}
            hint="The animation replays one minute of the 10-minute run."
          />
        </div>
      </>
    ),
    [pattern, cfg, windowStart, reset],
  );

  const readouts = useMemo(() => {
    const missed = missedPct(chosen);
    const avg = delayValue(chosen.avgDelayS);
    const worst = delayValue(chosen.worstDelayS);
    return (
      <>
        <h3 className="mt-2 font-bold">{PATTERN_LABEL[pattern]}: whole 10-minute run</h3>
        <Readouts
          columns={4}
          items={[
            { label: "Messages", value: fmt(chosen.messages.total) },
            { label: "Average delay", value: avg ?? "—", unit: avg === null ? undefined : "s" },
            { label: "Worst delay", value: worst ?? "—", unit: worst === null ? undefined : "s" },
            {
              label: "Missed readings",
              value: missed ?? "—",
              unit: missed === null ? undefined : "%",
              tone: chosen.missed > 0 ? "bad" : "ok",
              hint: `${fmt(chosen.missed)} of ${fmt(chosen.expected)} expected readings`,
            },
            { label: "Peak load", value: chosen.peakLoad, unit: `per ${LOAD_WINDOW_S} s` },
            { label: "Connections held", value: chosen.connections },
            { label: "Copies of each reading", value: chosen.copies },
            {
              label: `Most waiting at the ${server}`,
              value: chosen.maxQueue,
              tone: chosen.maxQueue > 0 ? "warn" : "default",
            },
          ]}
        />
        <Comparison results={results} cfg={cfg} />
      </>
    );
  }, [pattern, chosen, server, results, cfg]);

  const log = useMemo(
    () => (
      <EventLog
        title="Message log"
        events={events}
        filters={KIND_FILTERS}
        emptyText="Press Play to replay the messages of the chosen minute."
      />
    ),
    [events],
  );

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordHint="Adds four rows, one for each pattern, with the current settings."
      controls={controls}
      stage={
        <div className="grid grid-cols-1 gap-4 p-4">
          {picker}
          <Track
            pattern={pattern}
            cfg={cfg}
            flights={flights}
            started={started}
            now={now}
            travel={travel}
            reduced={reduced}
            marks={marks}
            windowStart={windowStart}
          />
        </div>
      }
      toolbar={<SimControls clock={clock} playLabel="Play" />}
      readouts={readouts}
      log={log}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Stage                                                               */
/* ------------------------------------------------------------------ */

/** Horizontal positions on the track, % of its width */
const SENSOR_X = 8;
const SERVER_LEFT = 36;
const SERVER_RIGHT = 64;
const APP_X = 80;
/** Vertical position of row i of n, % of the track height */
const rowY = (i: number, n: number) => 6 + ((i + 0.5) / n) * 88;

interface TrackProps {
  pattern: Pattern;
  cfg: PatternConfig;
  flights: Flight[];
  /** Flights that have set off by now */
  started: number;
  /** Run time, seconds */
  now: number;
  travel: number;
  reduced: boolean;
  marks: { arrived: number[]; taken: number[] };
  windowStart: number;
}

/** Where a sensor or an app sits on the track, and which side of the server it uses. */
function place(name: string, cfg: PatternConfig) {
  const [kind, n] = name.split(" ");
  const i = Number(n) - 1;
  if (kind === "sensor") return { x: SENSOR_X, y: rowY(i, cfg.sensors), hub: SERVER_LEFT };
  if (kind === "app") return { x: APP_X, y: rowY(i, cfg.apps), hub: SERVER_RIGHT };
  return null;
}

/** Sensors on the left, the server, broker or queue in the middle, apps on the right. */
function Track({ pattern, cfg, flights, started, now, travel, reduced, marks, windowStart }: TrackProps) {
  const server = SERVER_NAME[pattern];
  const Icon = SERVER_ICON[pattern];
  // Publish–subscribe and exclusive pair keep a connection open to every client.
  const held = pattern === "pubSub" || pattern === "exclusivePair";
  const offline = appOneOffline(cfg, now);
  const appWord = pattern === "pushPull" ? "workers" : "apps";

  const counts = { data: 0, control: 0, setup: 0, sensorsIn: 0, sensorsOut: 0, appsIn: 0, appsOut: 0 };
  for (let i = 0; i < started; i++) {
    const m = flights[i].msg;
    counts[m.kind]++;
    const inbound = m.to === server;
    const client = inbound ? m.from : m.to;
    if (client.startsWith("sensor")) counts[inbound ? "sensorsIn" : "sensorsOut"]++;
    else counts[inbound ? "appsIn" : "appsOut"]++;
  }

  const first = Math.max(upperBound(flights, now - travel, (f) => f.start), started - MAX_DOTS);
  const dots = reduced
    ? []
    : flights.slice(first, started).flatMap((f) => {
        const m = f.msg;
        const inbound = m.to === server;
        const at = place(inbound ? m.from : m.to, cfg);
        if (!at) return [];
        const p = Math.min(1, Math.max(0, (now - f.start) / travel));
        const [x0, y0, x1, y1] = inbound ? [at.x, at.y, at.hub, 50] : [at.hub, 50, at.x, at.y];
        return [{ id: f.id, kind: m.kind, x: x0 + (x1 - x0) * p, y: y0 + (y1 - y0) * p }];
      });

  // Readings sitting in the queue (push–pull) or kept for App 1 (publish–subscribe).
  const waiting = upperBound(marks.arrived, now, (t) => t) - upperBound(marks.taken, now, (t) => t);
  const sentWhileOff = cfg.appOffline
    ? upperBound(marks.arrived, Math.min(now, OFFLINE_TO - 1e-9), (t) => t) - upperBound(marks.arrived, OFFLINE_FROM - 1e-9, (t) => t)
    : 0;
  const offCount = Math.max(0, sentWhileOff);

  let status = "";
  if (cfg.appOffline && cfg.apps > 0) {
    if (offline) {
      status = {
        requestResponse: "App 1 is offline, so it sends no polls. It only sees the newest values when it is back at 6:00.",
        pubSub: `App 1 is offline. The broker keeps its copies, ${offCount} so far, and sends them when it reconnects at 6:00.`,
        pushPull:
          cfg.apps > 1
            ? "App 1 is offline. The other workers keep pulling readings from the queue."
            : "App 1, the only worker, is offline. Readings wait in the queue until it is back at 6:00.",
        exclusivePair: `App 1 is offline and its WebSocket is closed. The server keeps nothing: ${plural(offCount, "reading")} lost for app 1 so far.`,
      }[pattern];
    } else if (now >= OFFLINE_TO && now < OFFLINE_TO + 15) {
      status = {
        requestResponse: "App 1 came back at 6:00 and polls again.",
        pubSub: `App 1 reconnected at 6:00 and the broker sent it all ${offCount} kept copies at once.`,
        pushPull: "App 1 came back at 6:00 and pulls readings again.",
        exclusivePair: `App 1 reconnected at 6:00. The ${plural(offCount, "reading")} sent while it was away are gone.`,
      }[pattern];
    } else if (now < OFFLINE_FROM && windowStart + WINDOW_S <= OFFLINE_FROM) {
      status = "App 1 goes offline at 5:00. Set Watch from to 4:30 or later to see it.";
    }
  }

  const label =
    `${PATTERN_LABEL[pattern]} at ${runTime(now)} of the run: ${plural(cfg.sensors, "sensor")} on the left, ` +
    `the ${server} in the middle and ${plural(cfg.apps, "app")} on the right. ` +
    `${plural(dots.length, "message")} on the way.` +
    (pattern === "pushPull" ? ` ${plural(waiting, "reading")} waiting in the queue.` : "");

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm text-ink-2">
        <p>
          Run time <span className="font-mono text-base font-semibold tabular-nums text-ink">{runTime(now)}</span>
        </p>
        <p className="text-ink-3">
          Lines are {held ? "solid: each device keeps a connection open" : "dashed: no connection is kept open"}.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm font-semibold text-ink-2" aria-hidden>
        <span className="flex items-start gap-1.5">
          <Thermometer size={16} className="mt-0.5 shrink-0" />
          <span>
            {cfg.sensors === 1 ? "Sensor" : "Sensors"} <span className="whitespace-nowrap">{cfg.sensors === 1 ? "1" : `1–${cfg.sensors}`}</span>
          </span>
        </span>
        <span className="text-center capitalize">{server}</span>
        <span className="flex items-start justify-end gap-1.5 text-right">
          <Smartphone size={16} className="mt-0.5 shrink-0" />
          <span>
            {cfg.apps === 1 ? "App" : "Apps"} <span className="whitespace-nowrap">{cfg.apps === 1 ? "1" : `1–${cfg.apps}`}</span>
            {pattern === "pushPull" && " (workers)"}
          </span>
        </span>
      </div>

      <div className="relative h-64 rounded-md bg-surface-2 sm:h-72" role="img" aria-label={label}>
        <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {Array.from({ length: cfg.sensors }, (_, i) => (
            <line
              key={`s${i}`}
              x1={SENSOR_X}
              y1={rowY(i, cfg.sensors)}
              x2={SERVER_LEFT}
              y2={50}
              stroke="var(--line-strong)"
              strokeWidth={1}
              strokeDasharray={held ? undefined : "3 4"}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {Array.from({ length: cfg.apps }, (_, i) => (
            <line
              key={`a${i}`}
              x1={SERVER_RIGHT}
              y1={50}
              x2={APP_X}
              y2={rowY(i, cfg.apps)}
              stroke="var(--line-strong)"
              strokeWidth={1}
              strokeDasharray={held && !(i === 0 && offline) ? undefined : "3 4"}
              strokeOpacity={i === 0 && offline ? 0.35 : 1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {Array.from({ length: cfg.sensors }, (_, i) => (
          <span
            key={`sensor-${i}`}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink-3 bg-surface",
              cfg.sensors > 12 ? "size-2.5" : "size-3.5",
            )}
            style={{ left: `${SENSOR_X}%`, top: `${rowY(i, cfg.sensors)}%` }}
            aria-hidden
          />
        ))}

        {Array.from({ length: cfg.apps }, (_, i) => {
          const off = i === 0 && offline;
          return (
            <span
              key={`app-${i}`}
              className={cn(
                "absolute w-13 -translate-y-1/2 rounded-md border px-1 text-center text-xs leading-5 font-semibold whitespace-nowrap",
                off ? "border-dashed border-line-strong bg-surface-2 text-ink-3 line-through" : "border-line-strong bg-surface text-ink",
              )}
              style={{ left: `${APP_X}%`, top: `${rowY(i, cfg.apps)}%` }}
              aria-hidden
            >
              App {i + 1}
            </span>
          );
        })}

        <div
          className="absolute top-1/2 left-1/2 flex w-[28%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-lg border-2 border-line-strong bg-surface px-1 py-2 text-center"
          aria-hidden
        >
          <Icon size={22} className="text-ink-2" />
          <span className="text-sm font-bold capitalize">{server}</span>
          {pattern === "pushPull" && (
            <>
              <span className="flex flex-wrap justify-center gap-0.5">
                {Array.from({ length: Math.min(waiting, 8) }, (_, i) => (
                  <span key={i} className="size-2 rounded-sm" style={{ background: KIND_COLOR.data }} />
                ))}
              </span>
              <span className="text-xs text-ink-2">{waiting} waiting</span>
            </>
          )}
          {pattern === "pubSub" && offline && <span className="text-xs text-warn">Keeping {offCount}</span>}
        </div>

        {dots.map((d) => (
          <span
            key={d.id}
            className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_var(--surface)]"
            style={{ left: `${d.x}%`, top: `${d.y}%`, background: KIND_COLOR[d.kind] }}
            aria-hidden
          />
        ))}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2" aria-label="Messages so far in this minute, by kind">
        {KINDS.map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: KIND_COLOR[k] }} aria-hidden />
            <span>
              <span className="font-semibold text-ink">{KIND_LABEL[k]}</span> ({KIND_NOTE[k]}):{" "}
              <span className="font-mono tabular-nums text-ink">{counts[k]}</span>
            </span>
          </li>
        ))}
      </ul>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line text-sm sm:grid-cols-4">
        {[
          { label: `Sensors → ${server}`, value: counts.sensorsIn },
          { label: `${capital(server)} → sensors`, value: counts.sensorsOut },
          { label: `${capital(appWord)} → ${server}`, value: counts.appsIn },
          { label: `${capital(server)} → ${appWord}`, value: counts.appsOut },
        ].map((c) => (
          <div key={c.label} className="bg-surface px-3 py-2">
            <dt className="text-ink-3">{c.label}</dt>
            <dd className="font-mono text-lg tabular-nums text-ink">{c.value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-sm text-ink-3">
        {reduced
          ? "Reduced motion is on, so the dots are hidden. The counts above still grow as you play."
          : "Each dot is one message. Dots move far slower than real messages so you can follow them."}{" "}
        Counts are messages sent so far in this minute.
      </p>
      {status && (
        <p className={cn("rounded-md px-3 py-2 text-sm font-semibold", offline && pattern === "exclusivePair" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn")}>
          {status}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Comparison of all four patterns                                     */
/* ------------------------------------------------------------------ */

interface ChartRow extends Record<string, unknown> {
  id: Pattern;
  pattern: string;
}

/** Charts and the results table. Memoised, so the animation does not redraw them. */
const Comparison = memo(function Comparison({
  results,
  cfg,
}: {
  results: Record<Pattern, PatternResult>;
  cfg: PatternConfig;
}) {
  const data = PATTERNS.map((p) => {
    const r = results[p];
    return {
      id: p,
      pattern: PATTERN_LABEL[p],
      data: r.messages.data,
      control: r.messages.control,
      setup: r.messages.setup,
      avg: delayValue(r.avgDelayS),
      worst: delayValue(r.worstDelayS),
      missed: missedPct(r),
      peak: r.peakLoad,
    };
  });
  const silent = PATTERNS.filter((p) => results[p].avgDelayS === null);
  const push = results.pushPull;
  const backlog = push.backlog.map((b) => ({ time: runTime(b.t), queue: b.queue }));
  const barsHeight = 44 + PATTERNS.length * 34;

  return (
    <section aria-labelledby="l13-compare" className="grid grid-cols-1 gap-3">
      <div>
        <h3 id="l13-compare" className="mt-2 font-bold">
          All four patterns, same readings
        </h3>
        <p className="mt-0.5 text-sm text-ink-2">
          {plural(cfg.sensors, "sensor")} and {plural(cfg.apps, "app")} for 10 minutes. Each pattern keeps its colour in
          every chart.
        </p>
      </div>
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
        <ChartCard
          title="Messages by kind"
          description="Every message the server, broker or queue sent or received in 10 minutes."
          data={data}
          xKey="pattern"
          xLabel="Pattern"
          series={KINDS.map((k) => ({ key: k, label: KIND_LABEL[k], color: KIND_COLOR[k] }))}
          height={barsHeight}
        >
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid {...chartStyle.grid} vertical horizontal={false} />
            <XAxis type="number" {...chartStyle.axis} tickFormatter={compact} />
            <PatternAxis />
            <Tooltip cursor={chartStyle.barCursor} content={<ChartTooltip />} />
            {KINDS.map((k) => (
              <Bar
                key={k}
                dataKey={k}
                name={KIND_LABEL[k]}
                stackId="messages"
                fill={KIND_COLOR[k]}
                stroke="var(--surface)"
                strokeWidth={1}
                maxBarSize={chartStyle.bar.maxBarSize}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ChartCard>
        <ChartCard
          title="Average and worst delay"
          description={
            silent.length
              ? `No bars for ${listWords(silent.map((p) => PATTERN_LABEL[p]))}: no reading was delivered.`
              : "From a sensor reading to an app having it. Solid: average. Pale: worst."
          }
          data={data}
          xKey="pattern"
          xLabel="Pattern"
          series={[
            { key: "avg", label: "Average delay", unit: "s", color: "var(--ink-2)" },
            { key: "worst", label: "Worst delay", unit: "s", color: "color-mix(in srgb, var(--ink-2) 40%, transparent)" },
          ]}
          height={44 + PATTERNS.length * 46}
        >
          <BarChart data={data} layout="vertical" barGap={2} margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid {...chartStyle.grid} vertical horizontal={false} />
            <XAxis type="number" {...chartStyle.axis} unit=" s" />
            <PatternAxis />
            <Tooltip cursor={chartStyle.barCursor} content={<ChartTooltip units={{ avg: "s", worst: "s" }} />} />
            <Bar dataKey="avg" name="Average delay" fill="var(--ink-2)" radius={[0, 4, 4, 0]} maxBarSize={14} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.id} fill={colorOf(d.id)} />
              ))}
            </Bar>
            <Bar
              dataKey="worst"
              name="Worst delay"
              fill="color-mix(in srgb, var(--ink-2) 40%, transparent)"
              radius={[0, 4, 4, 0]}
              maxBarSize={14}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.id} fill={colorOf(d.id)} fillOpacity={0.4} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>
        <ChartCard
          title="Missed readings"
          description="Readings an app never saw, as a % of the readings it should have got."
          data={data}
          xKey="pattern"
          xLabel="Pattern"
          series={[{ key: "missed", label: "Missed", unit: "%" }]}
          height={barsHeight}
        >
          <PatternBars data={data} dataKey="missed" name="Missed" unit="%" />
        </ChartCard>
        <ChartCard
          title="Peak load"
          description={`Most messages the server, broker or queue handled in any ${LOAD_WINDOW_S} seconds.`}
          data={data}
          xKey="pattern"
          xLabel="Pattern"
          series={[{ key: "peak", label: "Peak load", unit: `messages per ${LOAD_WINDOW_S} s` }]}
          height={barsHeight}
        >
          <PatternBars data={data} dataKey="peak" name="Peak load" unit="messages" />
        </ChartCard>
      </div>
      <ChartCard
        title="Push–pull queue over time"
        description={`Readings waiting in the queue, every 10 s. Most waiting at once: ${push.maxQueue}. Still waiting at 10:00: ${push.pending}.`}
        data={backlog}
        xKey="time"
        xLabel="Run time"
        series={[{ key: "queue", label: "Readings waiting", color: colorOf("pushPull") }]}
        height={220}
      >
        <LineChart data={backlog} margin={{ top: 8, right: 24, bottom: 0, left: -8 }}>
          <CartesianGrid {...chartStyle.grid} />
          {cfg.appOffline && (
            <ReferenceArea
              x1={runTime(OFFLINE_FROM)}
              x2={runTime(OFFLINE_TO)}
              fill="var(--warn-soft)"
              fillOpacity={1}
              label={{ value: "App 1 offline", position: "insideTop", fill: "var(--ink-2)", fontSize: 12 }}
            />
          )}
          <XAxis dataKey="time" {...chartStyle.axis} interval={11} />
          <YAxis {...chartStyle.axis} allowDecimals={false} width={48} />
          <Tooltip cursor={chartStyle.cursor} content={<ChartTooltip labelPrefix="At " units={{ queue: "readings" }} />} />
          <Line dataKey="queue" name="Readings waiting" stroke={colorOf("pushPull")} {...chartStyle.line} isAnimationActive={false} />
        </LineChart>
      </ChartCard>
      <ResultsTable results={results} />
    </section>
  );
});

/** Pattern names down the side of a horizontal bar chart. */
function PatternAxis() {
  return (
    <YAxis
      type="category"
      dataKey="pattern"
      {...chartStyle.axis}
      width={84}
      interval={0}
      tickFormatter={(v: string) => SHORT_BY_LABEL[v] ?? v}
    />
  );
}

/** Horizontal bars, one colour per pattern, so long names fit on a phone. */
function PatternBars({ data, dataKey, name, unit }: { data: ChartRow[]; dataKey: string; name: string; unit: string }) {
  return (
    <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
      <CartesianGrid {...chartStyle.grid} vertical horizontal={false} />
      <XAxis type="number" {...chartStyle.axis} allowDecimals={false} />
      <PatternAxis />
      <Tooltip cursor={chartStyle.barCursor} content={<ChartTooltip units={{ [dataKey]: unit }} />} />
      <Bar dataKey={dataKey} name={name} radius={[0, 4, 4, 0]} maxBarSize={chartStyle.bar.maxBarSize} isAnimationActive={false}>
        {data.map((d) => (
          <Cell key={d.id} fill={colorOf(d.id)} />
        ))}
      </Bar>
    </BarChart>
  );
}

interface Metric {
  label: string;
  unit?: string;
  /** null when there is nothing to compare, e.g. delay with no reading delivered */
  value: (r: PatternResult) => number | null;
  /** Small second line under the value */
  detail?: (r: PatternResult) => string;
  /** null for a column with no better or worse, such as copies of each reading */
  better: "low" | null;
  word: string;
  /** Only patterns that missed nothing can be best (missed readings would flatter the delay) */
  completeOnly?: boolean;
}

const METRICS: Metric[] = [
  { label: "Messages", value: (r) => r.messages.total, better: "low", word: "fewest" },
  {
    label: "Average delay",
    unit: "s",
    value: (r) => delayValue(r.avgDelayS),
    better: "low",
    word: "lowest",
    completeOnly: true,
  },
  {
    label: "Worst delay",
    unit: "s",
    value: (r) => delayValue(r.worstDelayS),
    better: "low",
    word: "lowest",
    completeOnly: true,
  },
  {
    label: "Missed",
    unit: "%",
    value: missedPct,
    detail: (r) => `${fmt(r.missed)} of ${fmt(r.expected)}`,
    better: "low",
    word: "fewest",
  },
  { label: "Still waiting at 10:00", value: (r) => r.pending, better: "low", word: "fewest" },
  { label: "Peak load", unit: `per ${LOAD_WINDOW_S} s`, value: (r) => r.peakLoad, better: "low", word: "lowest" },
  { label: "Connections held", value: (r) => r.connections, better: "low", word: "fewest" },
  { label: "Copies of each reading", value: (r) => r.copies, better: null, word: "" },
  { label: "Most waiting at once", value: (r) => r.maxQueue, better: "low", word: "fewest" },
];

/** Every metric per pattern, with the best value in each column named in words. */
function ResultsTable({ results }: { results: Record<Pattern, PatternResult> }) {
  const list = PATTERNS.map((p) => results[p]);
  // The best value per column, unless every pattern ties.
  const best = METRICS.map((m) => {
    if (!m.better) return null;
    const values = list
      .filter((r) => !m.completeOnly || r.missed === 0)
      .map(m.value)
      .filter((v): v is number => v !== null);
    if (values.length < 2) return null;
    const top = Math.min(...values);
    return values.every((v) => v === top) ? null : top;
  });

  return (
    <section aria-labelledby="l13-results" className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-surface p-4">
      <div>
        <h3 id="l13-results" className="font-bold">
          All results
        </h3>
        <p className="mt-0.5 text-sm text-ink-2">
          A word marks the best value in each column. Delay counts delivered readings only, so only a pattern that missed
          nothing can be best for delay. Copies of each reading is how many apps get each one: push–pull shares the
          readings out instead.
        </p>
      </div>
      <div className="relative overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="border-b border-line-strong px-2 py-1.5 text-left align-bottom font-bold">
                Pattern
              </th>
              {METRICS.map((m) => (
                <th key={m.label} scope="col" className="border-b border-line-strong px-2 py-1.5 text-right align-bottom font-bold">
                  {m.label}
                  {m.unit && <span className="font-normal text-ink-3"> ({m.unit})</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.pattern} className="border-b border-line last:border-0">
                <th scope="row" className="min-w-28 px-2 py-1.5 text-left align-top font-semibold">
                  <span className="flex items-baseline gap-2">
                    <span className="size-2.5 shrink-0 translate-y-px rounded-full" style={{ background: colorOf(r.pattern) }} aria-hidden />
                    {PATTERN_LABEL[r.pattern]}
                  </span>
                </th>
                {METRICS.map((m, i) => {
                  const v = m.value(r);
                  const isBest = v !== null && v === best[i];
                  return (
                    <td key={m.label} className="px-2 py-1.5 text-right align-top whitespace-nowrap tabular-nums">
                      {v === null ? "—" : v.toLocaleString("en-IN")}
                      {m.detail && <span className="block text-xs text-ink-3">{m.detail(r)}</span>}
                      {isBest && (
                        <span className="mt-0.5 ml-auto block w-fit rounded bg-ok-soft px-1.5 text-xs font-semibold text-ok">
                          {m.word}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
