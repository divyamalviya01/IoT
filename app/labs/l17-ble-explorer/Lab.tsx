import { motion, useReducedMotion } from "motion/react";
import { Heart, Radio, Thermometer, type LucideIcon } from "lucide-react";
import { memo, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { EventLog, type SimEvent } from "~/components/sim/EventLog";
import { SimControls } from "~/components/sim/SimControls";
import { useSimClock } from "~/components/sim/useSimClock";
import { ChartCard, ChartTooltip, chartStyle, seriesColor } from "~/components/theory/ChartCard";
import { Button } from "~/components/ui/Button";
import { Slider } from "~/components/ui/Slider";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import { createRng, type Rng } from "~/lib/sim/random";
import {
  ADVERTISING_CHANNELS,
  CCCD_UUID,
  PERIPHERALS,
  RSSI_FLOOR,
  SUBSCRIBE,
  advertising,
  averageRssi,
  estimateDistance,
  expectedRssi,
  findCharacteristic,
  getPeripheral,
  hex,
  inRange,
  readValue,
  rssiReading,
  uuidText,
  type Characteristic,
  type Peripheral,
  type PeripheralKind,
} from "./engine";

const lab = getLab("l17-ble-explorer")!;

const steps = [
  "Press Start scan. Three devices appear with their RSSI, an estimated distance and their advertising packets on channels 37, 38 and 39.",
  "Press Connect on HR Band. Press Read on Body Sensor Location, then Subscribe on Heart Rate Measurement: see 01 00 written to 0x2902 and a notification every second. Press Unsubscribe.",
  "Press Connect on Room Sensor and Read its Temperature and Humidity. Compare the bytes with the decoded values.",
  "Press View advert on Shop Beacon and read its iBeacon fields. Notice that it cannot be connected.",
  "With Measure distance to set to Shop Beacon, press 1 m, 4 m and 8 m under Place the phone. At each distance press Record observation with Average last 10 readings off, then tick it, wait for 10 readings and record again.",
  "Set Room's true n to 3.0 and Phone assumes n to 2.0. Press 4 m, wait for 10 readings and record. Then open the lab record.",
];

/* Room: metres → SVG units */
const ROOM = { width: 12, height: 10 };
const S = 30;
const PAD = 18;
const FOOT = 16;
const W = ROOM.width * S + 2 * PAD;
const H = ROOM.height * S + 2 * PAD + FOOT;
const X = (m: number) => PAD + m * S;
const Y = (m: number) => PAD + m * S;

const AVG_N = 10;
/** The phone reports one RSSI per advertising event, but at most four a second here. */
const MIN_READ_MS = 250;
const HISTORY = 60;
const SEED = 17;
const START_PHONE = { x: 6, y: 4 };
const UNSUBSCRIBE = [0x00, 0x00];
const PLACE = [1, 2, 4, 8];
const STRIP_MS = 1000;

const KIND: Record<PeripheralKind, { icon: LucideIcon; color: string; soft: string }> = {
  heart: { icon: Heart, color: "var(--u1)", soft: "var(--u1-soft)" },
  environment: { icon: Thermometer, color: "var(--u2)", soft: "var(--u2-soft)" },
  beacon: { icon: Radio, color: "var(--u3)", soft: "var(--u3-soft)" },
};

interface Pos {
  x: number;
  y: number;
}
type ReadResult = ReturnType<typeof readValue>;

interface HistPoint {
  t: number;
  single: number;
  avg: number;
  truth: number;
}

/** Mutable simulation state, advanced by the clock. */
interface SimState {
  rng: Rng;
  /** Latest RSSI per device, heard or not */
  latest: Record<string, number>;
  /** Last readings the phone actually heard, for averaging */
  buf: Record<string, number[]>;
  nextAt: Record<string, number>;
  history: HistPoint[];
  histVersion: number;
  lastNotify: Record<number, { bytes: number[]; text: string }>;
  notifyCount: number;
}
const freshSim = (): SimState => ({
  rng: createRng(SEED),
  latest: {},
  buf: {},
  nextAt: { hr: 0, env: 120, beacon: 60 },
  history: [],
  histVersion: 0,
  lastNotify: {},
  notifyCount: 0,
});

const dist = (a: Pos, b: Pos) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, dp: number) => Math.round(v * 10 ** dp) / 10 ** dp;
const fmtDbm = (v: number, dp = 0) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(dp)}`;
const fmtSigned = (v: number) => {
  const r = Math.round(v);
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r)}`;
};
const parseNum = (v: string | number | undefined) => Number(String(v ?? "").replace("−", "-").replace("+", ""));
const joinAnd = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

/** A spot d metres from the device, heading for the far corner of the room. */
function placeAt(p: Peripheral, d: number): Pos {
  const corners = [
    { x: 0, y: 0 },
    { x: ROOM.width, y: 0 },
    { x: 0, y: ROOM.height },
    { x: ROOM.width, y: ROOM.height },
  ];
  const far = corners.reduce((a, c) => (dist(c, p) > dist(a, p) + 1e-9 ? c : a));
  const len = dist(far, p);
  return { x: round(p.x + ((far.x - p.x) / len) * d, 2), y: round(p.y + ((far.y - p.y) / len) * d, 2) };
}

function summarise(rows: ObservationRow[]): string {
  const parts: string[] = [];
  const d = (r: ObservationRow) => parseNum(r.distance);
  const e = (r: ObservationRow) => Math.abs(parseNum(r.error));
  const metresOff = (r: ObservationRow) => Math.abs(parseNum(r.estimate) - d(r));
  const same = rows.filter((r) => r.nTrue === r.nAssumed);

  // Single readings with the right n: the latest one at each distance.
  const byDist = new Map<number, ObservationRow>();
  for (const r of same.filter((x) => x.averaged === "No")) byDist.set(Math.round(d(r) * 2) / 2, r);
  const pts = [...byDist.values()].sort((a, b) => d(a) - d(b));
  if (pts.length >= 2) {
    const metres = pts.map(metresOff);
    const grew = metres.every((m, i) => i === 0 || m >= metres[i - 1]) && metres[metres.length - 1] > metres[0];
    parts.push(
      `With the correct n and single readings, the estimate was off by ${joinAnd(pts.map((r) => `${e(r)}% at ${r.distance} m`))}, that is ${joinAnd(metres.map((m) => `${m.toFixed(1)} m`))}.${
        grew
          ? " The error in metres grew with distance, because RSSI falls with the log of distance, so the same few dB of noise mean more metres far away."
          : " Single readings jump about, so one reading at each distance does not show a clear trend; over many readings the error in metres grows with distance."
      }`,
    );
  } else if (pts.length === 1) {
    parts.push(`With the correct n, a single reading at ${pts[0].distance} m gave ${pts[0].estimate} m (${pts[0].error}% error).`);
  }

  // Averaged against single, at the same spot.
  const pairs: [ObservationRow, ObservationRow][] = [];
  for (const a of same.filter((x) => x.averaged !== "No")) {
    const single = [...same].reverse().find((r) => r.averaged === "No" && r.device === a.device && Math.abs(d(r) - d(a)) < 0.3);
    if (single) pairs.push([single, a]);
  }
  if (pairs.length) {
    const better = pairs.filter(([s1, a]) => e(a) < e(s1)).length;
    parts.push(
      `Averaging the last 10 readings changed the error ${joinAnd(pairs.slice(-3).map(([s1, a]) => `at ${a.distance} m from ${e(s1)}% to ${e(a)}%`))}${
        better === pairs.length
          ? ": averaging narrowed the scatter, because random noise partly cancels out."
          : "; one single reading can be lucky, but averaged estimates scatter much less over many tries."
      }`,
    );
  }

  const wrong = rows.filter((r) => r.nTrue !== r.nAssumed);
  for (const r of wrong.slice(-2)) {
    const model = d(r) ** (parseNum(r.nTrue) / parseNum(r.nAssumed));
    parts.push(
      `With the room's true n ${r.nTrue} but the phone assuming ${r.nAssumed}, the phone estimated ${r.estimate} m for a true ${r.distance} m (${r.error}% error); with no noise the formula gives ${model.toFixed(1)} m.`,
    );
  }
  if (wrong.length) parts.push("A wrong n gives the same bias on every reading, so averaging cannot remove it; only the right n for the room can.");
  return parts.join(" ");
}

export default function BleExplorerLab() {
  const [phone, setPhone] = useState<Pos>(START_PHONE);
  const phoneRef = useRef<Pos>(START_PHONE);
  const [target, setTarget] = useState("beacon");
  const [nTrue, setNTrue] = useState(2);
  const [nAssumed, setNAssumed] = useState(2);
  const [sigma, setSigma] = useState(3);
  const [averaging, setAveraging] = useState(false);
  const [panel, setPanel] = useState<string | null>(null);
  const [subs, setSubs] = useState<Set<number>>(() => new Set());
  const [reads, setReads] = useState<Record<number, ReadResult>>({});
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [status, setStatus] = useState(`Your phone is ${dist(START_PHONE, getPeripheral("beacon")).toFixed(1)} m from Shop Beacon. Press Start scan.`);
  const eventId = useRef(0);
  const sim = useRef<SimState | null>(null);
  sim.current ??= freshSim();
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");

  const connected = panel !== null && getPeripheral(panel).connectable ? panel : null;

  const pushEvents = (list: Omit<SimEvent, "id">[]) => {
    const withIds = list.map((e) => ({ ...e, id: ++eventId.current }));
    setEvents((prev) => [...prev, ...withIds].slice(-200));
  };

  const onTick = (dt: number, t: number) => {
    const s = sim.current!;
    const here = phoneRef.current;
    for (const p of PERIPHERALS) {
      const every = Math.max(p.advIntervalMs, MIN_READ_MS);
      let next = s.nextAt[p.id] ?? 0;
      while (next <= t) {
        const d = dist(here, p);
        const rssi = rssiReading(d, nTrue, s.rng, sigma, p.power1m);
        s.latest[p.id] = rssi;
        if (inRange(rssi)) {
          const buf = [...(s.buf[p.id] ?? []), rssi].slice(-AVG_N);
          s.buf[p.id] = buf;
          if (p.id === target) {
            s.history = [
              ...s.history,
              { t: next, single: estimateDistance(rssi, nAssumed, p.power1m), avg: estimateDistance(averageRssi(buf), nAssumed, p.power1m), truth: d },
            ].slice(-HISTORY);
            s.histVersion++;
          }
        }
        next += every;
      }
      s.nextAt[p.id] = next;
    }

    // Notifications once a simulated second.
    if (connected && subs.size && Math.floor(t / 1000) > Math.floor((t - dt) / 1000)) {
      const p = getPeripheral(connected);
      const out: Omit<SimEvent, "id">[] = [];
      for (const uuid of subs) {
        const c = findCharacteristic(p, uuid);
        if (!c) continue;
        const bytes = c.value(t);
        const text = c.decode(bytes);
        s.lastNotify[uuid] = { bytes, text };
        s.notifyCount++;
        out.push({ t, text: `Notification from ${c.name} (${uuidText(uuid)}): ${hex(bytes)} → ${text}`, kind: "notify", tone: "ok" });
      }
      if (out.length) pushEvents(out);
    }
  };

  const onReset = () => {
    sim.current = freshSim();
    setEvents([]);
    setPanel(null);
    setSubs(new Set());
    setReads({});
  };

  const clock = useSimClock({ onTick, onReset, stepMs: 250 });
  const s = sim.current;
  const tp = getPeripheral(target);

  const clearReadings = (alsoHistory = false) => {
    sim.current!.buf = {};
    if (alsoHistory) {
      sim.current!.history = [];
      sim.current!.histVersion++;
    }
  };

  const movePhone = (p: Pos, note?: string) => {
    phoneRef.current = p;
    setPhone(p);
    clearReadings();
    if (note) setStatus(note);
  };
  const where = (p: Pos) => `${dist(p, tp).toFixed(1)} m from ${tp.name}`;

  const changeTarget = (id: string) => {
    setTarget(id);
    clearReadings(true);
    setStatus(`Measuring the distance to ${getPeripheral(id).name}: ${dist(phone, getPeripheral(id)).toFixed(1)} m away.`);
  };

  /* GATT actions */
  const log = (text: string, kind: string, tone?: SimEvent["tone"]) => pushEvents([{ t: clock.timeMs, text, kind, tone }]);

  const open = (p: Peripheral) => {
    sim.current!.lastNotify = {};
    setSubs(new Set());
    setReads({});
    if (connected && connected !== p.id) log(`Disconnected from ${getPeripheral(connected).name}.`, "connect");
    setPanel(p.id);
    if (p.connectable) {
      log(`Connected to ${p.name}. Found ${p.services.length} services: ${p.services.map((sv) => `${sv.name} (${uuidText(sv.uuid)})`).join(", ")}.`, "connect", "ok");
    } else {
      const r = readValue(p, 0x2a00, clock.timeMs);
      log(`Opened the advertisement of ${p.name}. ${r.ok ? "" : r.reason}`, "connect", "warn");
    }
  };

  const close = () => {
    if (connected) log(`Disconnected from ${getPeripheral(connected).name}. Its subscriptions end with the connection.`, "connect");
    sim.current!.lastNotify = {};
    setPanel(null);
    setSubs(new Set());
    setReads({});
  };

  const read = (c: Characteristic) => {
    if (!connected) return;
    const r = readValue(getPeripheral(connected), c.uuid, clock.timeMs);
    setReads((prev) => ({ ...prev, [c.uuid]: r }));
    log(r.ok ? `Read ${c.name} (${uuidText(c.uuid)}) → ${hex(r.bytes)} = ${r.text}` : `Read ${c.name} refused: ${r.reason}`, "read", r.ok ? "info" : "warn");
  };

  const subscribe = (c: Characteristic, on: boolean) => {
    const next = new Set(subs);
    if (on) next.add(c.uuid);
    else {
      next.delete(c.uuid);
      delete sim.current!.lastNotify[c.uuid];
    }
    setSubs(next);
    log(`Write ${hex(on ? SUBSCRIBE : UNSUBSCRIBE)} to the CCCD (${uuidText(CCCD_UUID)}) of ${c.name}: notifications ${on ? "on" : "off"}.`, "write");
  };

  /* Distance lesson */
  const trueD = dist(phone, tp);
  const buf = s.buf[target] ?? [];
  const single = buf.length ? buf[buf.length - 1] : null;
  const used = averaging ? (buf.length ? averageRssi(buf) : null) : single;
  const est = used === null ? null : estimateDistance(used, nAssumed, tp.power1m);
  const err = est === null ? null : ((est - trueD) / trueD) * 100;
  const singles = buf.map((r) => estimateDistance(r, nAssumed, tp.power1m));
  const expected = expectedRssi(trueD, nTrue, tp.power1m);
  const nMismatch = nTrue.toFixed(1) !== nAssumed.toFixed(1);

  const chartData = useMemo(
    () => s.history.map((h) => ({ t: round(h.t / 1000, 2), single: round(h.single, 2), avg: round(h.avg, 2), truth: round(h.truth, 2) })),
    // The history lives in a ref; its version number says when it changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s, s.histVersion],
  );

  const record = () => {
    if (used === null || est === null || err === null) return;
    const row: ObservationRow = {
      device: tp.name,
      distance: trueD.toFixed(1),
      nTrue: nTrue.toFixed(1),
      nAssumed: nAssumed.toFixed(1),
      averaged: averaging ? `Yes (${buf.length})` : "No",
      rssi: fmtDbm(used, averaging ? 1 : 0),
      estimate: est.toFixed(1),
      error: fmtSigned(err),
    };
    addRow(row);
    const auto = summarise([...rows, row]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  const errTone = err === null ? "default" : Math.abs(err) < 15 ? "ok" : Math.abs(err) < 40 ? "warn" : "bad";

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordDisabled={used === null}
      recordHint={
        used === null
          ? `Start the scan and wait for a reading from ${tp.name} first.`
          : `Adds the reading from ${tp.name} at ${trueD.toFixed(1)} m to the observation table.`
      }
      controls={
        <>
          <label className="grid min-w-0 gap-1.5">
            <span className="text-[0.95rem] font-semibold">Measure distance to</span>
            <select className="h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3" value={target} onChange={(e) => changeTarget(e.target.value)}>
              {PERIPHERALS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="grid min-w-0 gap-1.5">
            <legend className="mb-1.5 text-[0.95rem] font-semibold">Place the phone</legend>
            <div className="flex flex-wrap gap-2">
              {PLACE.map((m) => (
                <Button
                  key={m}
                  size="sm"
                  aria-label={`Place the phone ${m} m from ${tp.name}`}
                  onClick={() => {
                    const p = placeAt(tp, m);
                    movePhone(p, `Phone placed ${where(p)}.`);
                  }}
                >
                  {m} m
                </Button>
              ))}
            </div>
            <p className="text-sm text-ink-3">Or drag the phone in the room. Focus it with Tab to move it with the arrow keys.</p>
          </fieldset>
          <Slider
            label="Room's true n"
            value={nTrue}
            min={2}
            max={3}
            step={0.1}
            format={(v) => v.toFixed(1)}
            onChange={(v) => {
              setNTrue(v);
              clearReadings(true);
            }}
            hint="How fast the signal fades: 2 in free space, about 3 indoors with walls and people."
          />
          <Slider
            label="Phone assumes n"
            value={nAssumed}
            min={2}
            max={3}
            step={0.1}
            format={(v) => v.toFixed(1)}
            onChange={(v) => {
              setNAssumed(v);
              clearReadings(true);
            }}
            hint="The n the phone uses to turn RSSI back into metres."
          />
          <Slider
            label="Noise σ"
            value={sigma}
            min={0}
            max={6}
            step={0.5}
            format={(v) => `${v.toFixed(1)} dB`}
            onChange={(v) => {
              setSigma(v);
              clearReadings(true);
            }}
            hint="Random wobble on each RSSI reading, from reflections and people moving."
          />
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={averaging} onChange={(e) => setAveraging(e.target.checked)} />
            <span>Average last 10 readings</span>
          </label>
        </>
      }
      stage={
        <div className="grid grid-cols-1 gap-4 p-3 sm:p-4 md:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
          <div className="grid min-w-0 content-start gap-2">
            <RoomView
              phone={phone}
              target={target}
              connected={connected}
              scanning={clock.running}
              notifyCount={subs.size ? s.notifyCount : 0}
              onMove={(p) => movePhone(p)}
              onMoveEnd={(p) => setStatus(`Phone moved: ${where(p)}.`)}
              onNudge={(p) => movePhone(p, `Phone at ${p.x.toFixed(1)} m, ${p.y.toFixed(1)} m: ${where(p)}.`)}
            />
            <p className="min-h-6 text-sm text-ink-2" aria-live="polite">
              {status}
            </p>
          </div>
          <ScanPanel scanning={clock.running} t={clock.timeMs} latest={s.latest} nAssumed={nAssumed} panel={panel} onOpen={open} />
        </div>
      }
      toolbar={<SimControls clock={clock} playLabel="Start scan" />}
      readouts={
        <>
          <Readouts
            items={[
              { label: "True distance", value: trueD.toFixed(1), unit: "m", hint: `From the phone to ${tp.name}` },
              { label: "Expected RSSI", value: fmtDbm(expected, 1), unit: "dBm", hint: "With no noise, using the room's true n" },
              {
                label: averaging ? "RSSI (average)" : "RSSI (latest)",
                value: used === null ? "—" : fmtDbm(used, averaging ? 1 : 0),
                unit: used === null ? undefined : "dBm",
              },
              { label: "Estimated distance", value: est === null ? "—" : est.toFixed(1), unit: est === null ? undefined : "m", hint: "Using the n the phone assumes" },
              { label: "Error", value: err === null ? "—" : `${fmtSigned(err)}%`, tone: errTone },
              {
                label: "Single estimates",
                value: singles.length >= 2 ? `${Math.min(...singles).toFixed(1)}–${Math.max(...singles).toFixed(1)}` : "—",
                unit: singles.length >= 2 ? "m" : undefined,
                hint: "Lowest and highest distance from the last 10 single readings: the scatter",
              },
              { label: "Readings averaged", value: averaging ? `${buf.length} / ${AVG_N}` : "Off" },
              { label: "n: room / phone", value: `${nTrue.toFixed(1)} / ${nAssumed.toFixed(1)}`, tone: nMismatch ? "warn" : "default" },
            ]}
          />
          <DistanceChart data={chartData} name={tp.name} />
        </>
      }
      log={
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GattPanel
            panelId={panel}
            running={clock.running}
            subs={subs}
            reads={reads}
            lastNotify={s.lastNotify}
            onRead={read}
            onSubscribe={subscribe}
            onClose={close}
          />
          <EventLog
            events={events}
            title="GATT log"
            height={320}
            filters={[
              { kind: "connect", label: "Connect" },
              { kind: "read", label: "Reads" },
              { kind: "write", label: "Writes" },
              { kind: "notify", label: "Notifications" },
            ]}
            emptyText="Connect to a device to see reads, writes and notifications here."
            className="self-start"
          />
        </div>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Room                                                                */
/* ------------------------------------------------------------------ */

function RoomView({
  phone,
  target,
  connected,
  scanning,
  notifyCount,
  onMove,
  onMoveEnd,
  onNudge,
}: {
  phone: Pos;
  target: string;
  connected: string | null;
  scanning: boolean;
  notifyCount: number;
  onMove: (p: Pos) => void;
  onMoveEnd: (p: Pos) => void;
  onNudge: (p: Pos) => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x0: number; y0: number; moved: boolean; last: Pos } | null>(null);
  const tp = getPeripheral(target);
  const linked = connected ? getPeripheral(connected) : null;

  const toRoom = (clientX: number, clientY: number): Pos | null => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: round(clamp((p.x - PAD) / S, 0, ROOM.width), 1), y: round(clamp((p.y - PAD) / S, 0, ROOM.height), 1) };
  };
  const down = (e: PointerEvent<SVGGElement>) => {
    if (e.button !== 0) return;
    drag.current = { x0: e.clientX, y0: e.clientY, moved: false, last: phone };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<SVGGElement>) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 4) return;
    d.moved = true;
    const p = toRoom(e.clientX, e.clientY);
    if (p && (p.x !== d.last.x || p.y !== d.last.y)) {
      d.last = p;
      onMove(p);
    }
  };
  const up = (e: PointerEvent<SVGGElement>) => {
    const d = drag.current;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (d?.moved) onMoveEnd(d.last);
  };
  const key = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.5;
    const dir: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const v = dir[e.key];
    if (!v) return;
    e.preventDefault();
    const p = { x: round(clamp(phone.x + v[0], 0, ROOM.width), 1), y: round(clamp(phone.y + v[1], 0, ROOM.height), 1) };
    if (p.x !== phone.x || p.y !== phone.y) onNudge(p);
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto block w-full max-w-[30rem] select-none"
      role="group"
      aria-label={`Room ${ROOM.width} by ${ROOM.height} metres with three BLE devices and your phone. ${PERIPHERALS.map((p) => `${p.name} is ${dist(phone, p).toFixed(1)} m away`).join(", ")}.`}
    >
      <rect x={X(0)} y={Y(0)} width={ROOM.width * S} height={ROOM.height * S} fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth={3} rx={2} />
      {Array.from({ length: ROOM.width - 1 }, (_, i) => (
        <line key={`v${i}`} x1={X(i + 1)} x2={X(i + 1)} y1={Y(0)} y2={Y(ROOM.height)} stroke="var(--line)" strokeWidth={1} aria-hidden />
      ))}
      {Array.from({ length: ROOM.height - 1 }, (_, i) => (
        <line key={`h${i}`} x1={X(0)} x2={X(ROOM.width)} y1={Y(i + 1)} y2={Y(i + 1)} stroke="var(--line)" strokeWidth={1} aria-hidden />
      ))}
      <g aria-hidden>
        <line x1={X(0)} x2={X(1)} y1={Y(ROOM.height) + 10} y2={Y(ROOM.height) + 10} stroke="var(--ink-3)" strokeWidth={1.5} />
        <line x1={X(0)} x2={X(0)} y1={Y(ROOM.height) + 6} y2={Y(ROOM.height) + 14} stroke="var(--ink-3)" strokeWidth={1.5} />
        <line x1={X(1)} x2={X(1)} y1={Y(ROOM.height) + 6} y2={Y(ROOM.height) + 14} stroke="var(--ink-3)" strokeWidth={1.5} />
        <text x={X(1) + 5} y={Y(ROOM.height) + 14} className="fill-ink-3 text-[11px]">
          1 m (one grid square)
        </text>
        <text x={X(ROOM.width)} y={Y(ROOM.height) + 14} textAnchor="end" className="fill-ink-3 text-[11px]">
          {`Room ${ROOM.width} m × ${ROOM.height} m`}
        </text>
      </g>

      {/* Phone → device lines with the true distance */}
      {PERIPHERALS.map((p) => {
        const isTarget = p.id === target;
        const mx = (X(p.x) + X(phone.x)) / 2;
        const my = (Y(p.y) + Y(phone.y)) / 2;
        return (
          <g key={`l-${p.id}`} aria-hidden>
            <line
              x1={X(phone.x)}
              y1={Y(phone.y)}
              x2={X(p.x)}
              y2={Y(p.y)}
              stroke={isTarget ? "var(--brand)" : "var(--ink-3)"}
              strokeWidth={isTarget ? 2.5 : 1.5}
              strokeDasharray={isTarget ? undefined : "4 4"}
            />
            <text
              x={mx}
              y={my}
              textAnchor="middle"
              dominantBaseline="central"
              className={cn("font-mono text-[12px] font-semibold", isTarget ? "fill-brand" : "fill-ink-2")}
              paintOrder="stroke"
              stroke="var(--surface-2)"
              strokeWidth={5}
            >
              {dist(phone, p).toFixed(1)} m
            </text>
          </g>
        );
      })}

      {/* Advertising ripples while scanning */}
      {scanning &&
        !reduced &&
        PERIPHERALS.map((p, i) => (
          <motion.circle
            key={`r-${p.id}`}
            cx={X(p.x)}
            cy={Y(p.y)}
            fill="none"
            stroke={KIND[p.kind].color}
            strokeWidth={1.5}
            initial={{ r: 15, opacity: 0.55 }}
            animate={{ r: 44, opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: i * 0.4 }}
            aria-hidden
          />
        ))}

      {/* A notification travelling to the phone */}
      {linked && notifyCount > 0 && !reduced && (
        <motion.circle
          key={notifyCount}
          r={5}
          fill="var(--brand)"
          stroke="var(--surface)"
          strokeWidth={1.5}
          initial={{ cx: X(linked.x), cy: Y(linked.y), opacity: 1 }}
          animate={{ cx: X(phone.x), cy: Y(phone.y), opacity: [1, 1, 0] }}
          transition={{ duration: 0.7, ease: "easeIn" }}
          aria-hidden
        />
      )}

      {/* Devices */}
      {PERIPHERALS.map((p) => {
        const k = KIND[p.kind];
        const Icon = k.icon;
        const isLinked = connected === p.id;
        return (
          <g key={p.id} aria-hidden>
            {isLinked && <circle cx={X(p.x)} cy={Y(p.y)} r={20} fill="none" stroke="var(--ok)" strokeWidth={2.5} />}
            <circle cx={X(p.x)} cy={Y(p.y)} r={15} fill={k.soft} stroke={k.color} strokeWidth={2} />
            <Icon x={X(p.x) - 9} y={Y(p.y) - 9} width={18} height={18} color={k.color} strokeWidth={2.2} />
            <text
              x={X(p.x)}
              y={Y(p.y) + 30}
              textAnchor="middle"
              className="fill-ink text-[12px] font-semibold"
              paintOrder="stroke"
              stroke="var(--surface-2)"
              strokeWidth={4}
            >
              {p.name}
            </text>
            {isLinked && (
              <text x={X(p.x)} y={Y(p.y) + 43} textAnchor="middle" className="fill-ok text-[11px] font-semibold" paintOrder="stroke" stroke="var(--surface-2)" strokeWidth={4}>
                connected
              </text>
            )}
          </g>
        );
      })}

      {/* The phone */}
      <g
        role="button"
        tabIndex={0}
        aria-roledescription="movable phone"
        aria-label={`Phone at ${phone.x.toFixed(1)} m across and ${phone.y.toFixed(1)} m down, ${dist(phone, tp).toFixed(1)} m from ${tp.name}. Drag it, or use the arrow keys (Shift for 0.1 m steps), to move it.`}
        className="group cursor-grab outline-none active:cursor-grabbing"
        style={{ touchAction: "none" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
      >
        <circle cx={X(phone.x)} cy={Y(phone.y)} r={24} fill="transparent" />
        <rect
          x={X(phone.x) - 15}
          y={Y(phone.y) - 21}
          width={30}
          height={42}
          rx={8}
          fill="none"
          stroke="var(--focus)"
          strokeWidth={2.5}
          className="opacity-0 group-focus-visible:opacity-100"
        />
        <rect x={X(phone.x) - 9} y={Y(phone.y) - 15} width={18} height={30} rx={4} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
        <rect x={X(phone.x) - 6} y={Y(phone.y) - 11} width={12} height={19} rx={1.5} fill="var(--brand-soft)" />
        <circle cx={X(phone.x)} cy={Y(phone.y) + 11} r={1.5} fill="var(--ink)" />
        <text
          x={X(phone.x)}
          y={Y(phone.y) - 21}
          textAnchor="middle"
          className="pointer-events-none fill-ink text-[11px] font-bold"
          paintOrder="stroke"
          stroke="var(--surface-2)"
          strokeWidth={4}
        >
          Phone
        </text>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Scan results                                                        */
/* ------------------------------------------------------------------ */

function ScanPanel({
  scanning,
  t,
  latest,
  nAssumed,
  panel,
  onOpen,
}: {
  scanning: boolean;
  t: number;
  latest: Record<string, number>;
  nAssumed: number;
  panel: string | null;
  onOpen: (p: Peripheral) => void;
}) {
  const heard = PERIPHERALS.filter((p) => latest[p.id] !== undefined);
  const found = heard.filter((p) => inRange(latest[p.id]));
  const lost = heard.length - found.length;

  return (
    <section aria-labelledby="l17-scan" className="grid min-w-0 content-start gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 id="l17-scan" className="font-bold">
          Scan results
        </h3>
        <span className="text-sm text-ink-3">
          {scanning ? `Scanning… ${found.length} device${found.length === 1 ? "" : "s"} found` : heard.length ? "Scan paused" : "Not scanning"}
        </span>
      </div>
      {heard.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong p-4 text-center text-sm text-ink-3">
          Press Start scan (under the room) to listen for advertising packets.
        </p>
      ) : (
        <ul className="grid gap-2">
          {found.map((p) => (
            <ScanCard key={p.id} p={p} rssi={latest[p.id]} nAssumed={nAssumed} t={t} open={panel === p.id} onOpen={onOpen} />
          ))}
        </ul>
      )}
      {lost > 0 && (
        <p className="text-sm text-warn">
          {lost} device{lost === 1 ? " is" : "s are"} hidden: the last signal was weaker than {fmtDbm(RSSI_FLOOR)} dBm, too weak to hear.
        </p>
      )}
      {heard.length > 0 && (
        <p className="text-sm text-ink-3">
          Each strip shows the last second of advertising: every advertising event sends the same packet on channels 37, 38 and 39 (newest on
          the right). Distances use the n the phone assumes.
        </p>
      )}
    </section>
  );
}

function ScanCard({ p, rssi, nAssumed, t, open, onOpen }: { p: Peripheral; rssi: number; nAssumed: number; t: number; open: boolean; onOpen: (p: Peripheral) => void }) {
  const k = KIND[p.kind];
  const Icon = k.icon;
  const est = estimateDistance(rssi, nAssumed, p.power1m);
  return (
    <li className={cn("grid min-w-0 gap-2 rounded-lg border p-3", open ? "border-brand bg-brand-soft" : "border-line bg-surface")}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full" style={{ background: k.soft, color: k.color }}>
          <Icon size={16} aria-hidden />
        </span>
        <span className="font-semibold">{p.name}</span>
        <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold", p.connectable ? "bg-ok-soft text-ok" : "bg-surface-2 text-ink-2")}>
          {p.connectable ? "Connectable" : "Not connectable"}
        </span>
        <span className="ml-auto">
          <Button size="sm" onClick={() => onOpen(p)} disabled={open} aria-label={`${p.connectable ? (open ? "Connected to" : "Connect to") : "View advert of"} ${p.name}`}>
            {p.connectable ? (open ? "Connected" : "Connect") : "View advert"}
          </Button>
        </span>
      </div>
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <div className="flex items-center gap-1.5">
          <dt className="text-ink-3">RSSI</dt>
          <dd className="font-mono tabular-nums">{fmtDbm(rssi)} dBm</dd>
          <SignalBars rssi={rssi} />
        </div>
        <div className="flex gap-1.5">
          <dt className="text-ink-3">Distance ≈</dt>
          <dd className="font-mono tabular-nums">{est.toFixed(1)} m</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-ink-3">Advertises every</dt>
          <dd className="font-mono tabular-nums">{p.advIntervalMs} ms</dd>
        </div>
      </dl>
      <AdvStrip p={p} t={t} />
    </li>
  );
}

function SignalBars({ rssi }: { rssi: number }) {
  const level = rssi >= -60 ? 4 : rssi >= -70 ? 3 : rssi >= -80 ? 2 : rssi >= -90 ? 1 : 0;
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 4.5} y={9 - i * 3} width={3} height={3 + i * 3} rx={0.5} fill={i < level ? "var(--ink-2)" : "var(--line-strong)"} />
      ))}
    </svg>
  );
}

function AdvStrip({ p, t }: { p: Peripheral; t: number }) {
  const tq = Math.floor(t / 50) * 50;
  const pkts = useMemo(() => advertising(p, tq - STRIP_MS, tq), [p, tq]);
  const LW = 20;
  const SW = 240;
  const laneY = (i: number) => 7 + i * 11;
  return (
    <div className="min-w-0">
      <svg viewBox={`0 0 ${SW} 36`} className="block h-auto w-full max-w-[20rem]" aria-hidden>
        {ADVERTISING_CHANNELS.map((c, i) => (
          <g key={c.channel}>
            <text x={0} y={laneY(i) + 3} className="fill-ink-3 font-mono text-[8px]">
              {c.channel}
            </text>
            <line x1={LW} x2={SW} y1={laneY(i)} y2={laneY(i)} stroke="var(--line)" strokeWidth={1} />
          </g>
        ))}
        {pkts.map((k, j) => {
          const x = LW + ((k.t - (tq - STRIP_MS)) / STRIP_MS) * (SW - LW - 3);
          return <rect key={j} x={x} y={laneY(k.channel - 37) - 4} width={2.5} height={8} rx={0.5} fill={KIND[p.kind].color} />;
        })}
      </svg>
      <p className="sr-only">
        Sends each advertising packet on channels 37, 38 and 39, every {p.advIntervalMs} ms.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Distance chart                                                      */
/* ------------------------------------------------------------------ */

interface ChartRow extends Record<string, unknown> {
  t: number;
  single: number;
  avg: number;
  truth: number;
}

const DistanceChart = memo(function DistanceChart({ data, name }: { data: ChartRow[]; name: string }) {
  return (
    <ChartCard
      title={`Estimated distance to ${name}`}
      description="Each dot is one single reading. The average of the last 10 readings is much steadier. The dashed line is the true distance."
      data={data}
      xKey="t"
      xLabel="Time (s)"
      series={[
        { key: "single", label: "Single reading", unit: "m" },
        { key: "avg", label: "Average of last 10", unit: "m" },
        { key: "truth", label: "True distance", unit: "m", color: "var(--ink-3)" },
      ]}
      height={220}
      emptyText="Start the scan to plot the estimates here."
    >
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
        <CartesianGrid {...chartStyle.grid} />
        <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} {...chartStyle.axis} unit=" s" tickFormatter={(v: number) => v.toFixed(0)} />
        <YAxis {...chartStyle.axis} unit=" m" width={56} domain={[0, "auto"]} />
        <Tooltip cursor={chartStyle.cursor} content={<ChartTooltip labelPrefix="Time " units={{ single: "m", avg: "m", truth: "m" }} />} />
        <Line
          dataKey="single"
          name="Single reading"
          stroke={seriesColor(0)}
          strokeWidth={1}
          dot={{ r: 2.5, fill: seriesColor(0), strokeWidth: 0 }}
          activeDot={chartStyle.line.activeDot}
          isAnimationActive={false}
        />
        <Line dataKey="avg" name="Average of last 10" stroke={seriesColor(1)} strokeWidth={2.5} dot={false} activeDot={chartStyle.line.activeDot} isAnimationActive={false} />
        <Line
          dataKey="truth"
          name="True distance"
          type="stepAfter"
          stroke="var(--ink-3)"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartCard>
  );
});

/* ------------------------------------------------------------------ */
/* GATT browser                                                        */
/* ------------------------------------------------------------------ */

function GattPanel({
  panelId,
  running,
  subs,
  reads,
  lastNotify,
  onRead,
  onSubscribe,
  onClose,
}: {
  panelId: string | null;
  running: boolean;
  subs: Set<number>;
  reads: Record<number, ReadResult>;
  lastNotify: SimState["lastNotify"];
  onRead: (c: Characteristic) => void;
  onSubscribe: (c: Characteristic, on: boolean) => void;
  onClose: () => void;
}) {
  const frame = "grid min-w-0 content-start gap-3 rounded-lg border border-line bg-surface p-4";
  if (!panelId) {
    return (
      <section aria-labelledby="l17-gatt" className={frame}>
        <h3 id="l17-gatt" className="text-h3 font-bold">
          GATT browser
        </h3>
        <p className="text-ink-2">Not connected. Start the scan, then press Connect next to HR Band or Room Sensor, or View advert next to Shop Beacon.</p>
      </section>
    );
  }
  const p = getPeripheral(panelId);
  if (!p.connectable) return <BeaconView p={p} onClose={onClose} />;

  return (
    <section aria-labelledby="l17-gatt" className={frame}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="l17-gatt" className="text-h3 font-bold">
          GATT browser
        </h3>
        <span className="rounded bg-ok-soft px-1.5 py-0.5 text-xs font-semibold text-ok">Connected to {p.name}</span>
        <span className="ml-auto">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Disconnect
          </Button>
        </span>
      </div>
      <p className="text-sm text-ink-2">The device's GATT server holds services. Each service holds characteristics, each with a 16-bit UUID and properties.</p>
      {p.services.map((sv) => (
        <section key={sv.uuid} aria-label={`Service ${sv.name}`} className="grid min-w-0 gap-2 rounded-lg border border-line p-3">
          <h4 className="flex flex-wrap items-baseline gap-x-2 font-semibold">
            <span>Service: {sv.name}</span>
            <span className="font-mono text-sm font-normal text-ink-3">{uuidText(sv.uuid)}</span>
          </h4>
          <ul className="grid gap-2">
            {sv.characteristics.map((c) => {
              const result = reads[c.uuid];
              const subbed = subs.has(c.uuid);
              const last = lastNotify[c.uuid];
              const notify = c.properties.includes("notify");
              return (
                <li key={c.uuid} className="grid min-w-0 gap-1.5 rounded-md bg-surface-2 p-2.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <span className="font-semibold">{c.name}</span>
                    <span className="font-mono text-sm text-ink-3">{uuidText(c.uuid)}</span>
                    {c.properties.map((pr) => (
                      <span key={pr} className="rounded border border-line-strong px-1.5 text-xs text-ink-2">
                        {pr}
                      </span>
                    ))}
                    <span className="ml-auto flex flex-wrap gap-1.5">
                      <Button size="sm" onClick={() => onRead(c)} aria-label={`Read ${c.name}`}>
                        Read
                      </Button>
                      {notify && (
                        <Button
                          size="sm"
                          variant={subbed ? "primary" : "secondary"}
                          onClick={() => onSubscribe(c, !subbed)}
                          aria-label={`${subbed ? "Unsubscribe from" : "Subscribe to"} ${c.name}`}
                        >
                          {subbed ? "Unsubscribe" : "Subscribe"}
                        </Button>
                      )}
                    </span>
                  </div>
                  {result &&
                    (result.ok ? (
                      <p className="text-sm [overflow-wrap:anywhere]">
                        <span className="text-ink-3">Read: </span>
                        <code className="font-mono">{hex(result.bytes)}</code>
                        <span className="text-ink-3"> → </span>
                        <span className="font-semibold">{result.text}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-warn">{result.reason}</p>
                    ))}
                  {subbed && (
                    <p className="text-sm [overflow-wrap:anywhere]">
                      {last ? (
                        <>
                          <span className="text-ink-3">Notified: </span>
                          <code className="font-mono">{hex(last.bytes)}</code>
                          <span className="text-ink-3"> → </span>
                          <span className="font-semibold">{last.text}</span>
                        </>
                      ) : (
                        <span className="text-ink-3">
                          {running ? "Subscribed. Waiting for the next notification…" : "Subscribed. Press Start scan so time runs: a notification arrives every second."}
                        </span>
                      )}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </section>
  );
}

function BeaconView({ p, onClose }: { p: Peripheral; onClose: () => void }) {
  const b = p.manufacturerData ?? [];
  const company = b[0] | (b[1] << 8);
  const uuidHex = b
    .slice(4, 20)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  const uuid = `${uuidHex.slice(0, 8)}-${uuidHex.slice(8, 12)}-${uuidHex.slice(12, 16)}-${uuidHex.slice(16, 20)}-${uuidHex.slice(20)}`;
  const major = (b[20] << 8) | b[21];
  const minor = (b[22] << 8) | b[23];
  const power = b[24] > 127 ? b[24] - 256 : b[24];
  const refusal = readValue(p, 0x2a00, 0);
  const groups = [
    { name: "Company ID", bytes: b.slice(0, 2), meaning: `${uuidText(company)} = Apple. Sent low byte first (little-endian).`, tone: "bg-u1-soft" },
    { name: "Beacon type", bytes: b.slice(2, 4), meaning: `0x02 = iBeacon, then 0x15: ${b[3]} more bytes follow.`, tone: "bg-u1-soft" },
    { name: "Proximity UUID", bytes: b.slice(4, 20), meaning: `${uuid}: says whose beacons these are.`, tone: "bg-u2-soft" },
    { name: "Major", bytes: b.slice(20, 22), meaning: `${major}: a group, such as one shop. Sent high byte first (big-endian).`, tone: "bg-u3-soft" },
    { name: "Minor", bytes: b.slice(22, 24), meaning: `${minor}: one beacon in the group, such as one shelf.`, tone: "bg-u3-soft" },
    { name: "Measured power", bytes: b.slice(24, 25), meaning: `${fmtDbm(power)} dBm: the RSSI expected at 1 m. Phones use it to estimate distance.`, tone: "bg-surface-2" },
  ];

  return (
    <section aria-labelledby="l17-gatt" className="grid min-w-0 content-start gap-3 rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="l17-gatt" className="text-h3 font-bold">
          {p.name} advertisement
        </h3>
        <span className="rounded bg-warn-soft px-1.5 py-0.5 text-xs font-semibold text-warn">Not connectable</span>
        <span className="ml-auto">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </span>
      </div>
      <p className="text-sm text-ink-2">
        {refusal.ok ? "" : `${refusal.reason} `}It has no GATT services to browse. Instead it puts iBeacon data in every advertising packet, so
        any phone nearby can hear it without connecting.
      </p>
      <p className="flex flex-wrap gap-1 font-mono text-sm" aria-label={`Manufacturer data, ${b.length} bytes`}>
        {groups.flatMap((g, gi) =>
          g.bytes.map((x, bi) => (
            <span key={`${gi}-${bi}`} className={cn("rounded px-1 py-0.5", g.tone)}>
              {x.toString(16).padStart(2, "0")}
            </span>
          )),
        )}
      </p>
      <div className="relative overflow-x-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-[0.95rem]">
          <caption className="sr-only">Meaning of each part of the iBeacon data</caption>
          <thead className="bg-surface-2">
            <tr>
              {["Field", "Bytes (hex)", "Meaning"].map((h) => (
                <th key={h} scope="col" className="border-b border-line-strong px-3 py-2 text-left font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.name} className="border-b border-line last:border-b-0">
                <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-semibold">
                  <span className={cn("mr-2 inline-block size-2.5 rounded-sm", g.tone)} aria-hidden />
                  {g.name}
                </th>
                <td className="min-w-28 px-3 py-2 font-mono text-sm">{hex(g.bytes)}</td>
                <td className="min-w-56 px-3 py-2 text-sm text-ink-2">{g.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-ink-3">A shop app that knows this UUID can look up major 1, minor 42 to tell which shelf the phone is near.</p>
    </section>
  );
}
