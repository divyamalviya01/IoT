import { Gauge, RotateCcw, TrendingUp, Zap } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, Scatter, Tooltip, XAxis, YAxis } from "recharts";
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
import { useObservations } from "~/lib/observations";
import {
  DRIFT_LEN,
  K_RANGE,
  RUN_SAMPLES,
  START_MINUTE,
  STUCK_LEN,
  STUCK_RUN,
  WINDOW_RANGE,
  analyse,
  clock,
  defaultFaults,
  generateStream,
  score,
  smoothingLag,
  type Fault,
  type FaultKind,
} from "./engine";

const lab = getLab("l22-stream-analytics")!;

const steps = [
  "Keep window 20 and k = 3. Press Play (or Show whole run) and watch the moving average and the flags. When the run ends, press Record observation.",
  "Lower k to 2 and record again. Count the false alarms: flags where no spike was injected.",
  "Set k back to 3. Try a window of 5, then 50, recording each. Watch how much the average lags and how many false alarms appear.",
  "Reset, then use Inject during a run: add a stuck sensor and a slow drift. See which one the z-score catches and which it misses.",
  "Open the lab record and write which settings worked best, and why.",
];

/** Simulated milliseconds per reading: one reading a minute, shown four per second at 1×. */
const MS_PER_READING = 250;
const FAULT_LABEL: Record<FaultKind, string> = { spike: "Spike", stuck: "Stuck sensor", drift: "Slow drift" };

function summarise(rows: ObservationRow[]): string {
  const full = rows.filter((r) => Number(r.spikes) > 0);
  if (full.length < 2) return "";
  const n = (r: ObservationRow, k: string) => Number(r[k]);
  const parts: string[] = [];
  const best = [...full].sort((a, b) => n(a, "missed") * 2 + n(a, "falseAlarms") - (n(b, "missed") * 2 + n(b, "falseAlarms")))[0];
  parts.push(`The best setting was a window of ${best.window} with k = ${best.k}: it caught ${best.caught} of ${best.spikes} spikes with ${best.falseAlarms} false alarms.`);

  // Compare k within the window that was tried with the most k values, and windows within the k tried with the most windows.
  const widest = (key: "window" | "k", other: "window" | "k") => {
    const groups = new Map<string, ObservationRow[]>();
    for (const r of full) groups.set(String(r[key]), [...(groups.get(String(r[key])) ?? []), r]);
    const group = [...groups.values()].sort((a, b) => new Set(b.map((r) => r[other])).size - new Set(a.map((r) => r[other])).size)[0];
    return [...group].sort((a, b) => n(a, other) - n(b, other));
  };
  const byK = widest("window", "k");
  if (byK[0].k !== byK.at(-1)!.k) {
    parts.push(`At window ${byK[0].window}, lowering k from ${byK.at(-1)!.k} to ${byK[0].k} changed the false alarms from ${byK.at(-1)!.falseAlarms} to ${byK[0].falseAlarms}.`);
  }
  const byW = widest("k", "window");
  if (byW[0].window !== byW.at(-1)!.window) {
    const lo = byW[0];
    const hi = byW.at(-1)!;
    parts.push(
      `At k = ${lo.k}, a window of ${lo.window} gave ${lo.falseAlarms} false alarms while a window of ${hi.window} gave ${hi.falseAlarms}, but its moving average trailed by about ${smoothingLag(n(hi, "window"))} minutes instead of ${smoothingLag(n(lo, "window"))}.`,
    );
  }
  parts.push("A low k or a small window flags more readings, including false alarms; a high k or a large window is calmer but reacts more slowly.");
  return parts.join(" ");
}

export default function StreamAnalyticsLab() {
  const [win, setWin] = useState(20);
  const [k, setK] = useState(3);
  const [faults, setFaults] = useState<Fault[]>(() => defaultFaults());
  const [shown, setShown] = useState(0);
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");

  const readings = useMemo(() => generateStream({ faults }), [faults]);
  const points = useMemo(() => analyse(readings.map((r) => r.value), { window: win, k }), [readings, win, k]);
  const s = score(readings, points, shown);
  const done = shown >= RUN_SAMPLES;

  const clockApi = useSimClock({
    onTick: (_dt, timeMs) => setShown(Math.min(RUN_SAMPLES, Math.floor(timeMs / MS_PER_READING))),
    onReset: () => setShown(0),
    stepMs: MS_PER_READING * 10,
    maxTimeMs: RUN_SAMPLES * MS_PER_READING,
  });

  const now = points[Math.max(0, shown - 1)];
  const nowReading = readings[Math.max(0, shown - 1)];

  const data = useMemo(
    () =>
      points.slice(0, shown).map((p) => ({
        i: p.i,
        time: clock(START_MINUTE + p.i),
        value: Math.round(p.value * 100) / 100,
        avg: Math.round(p.avg * 100) / 100,
        z: Math.round(p.z * 100) / 100,
      })),
    [points, shown],
  );
  const flagged = data.filter((d) => points[d.i].flag === "spike");
  const stuckFlags = data.filter((d) => points[d.i].flag === "stuck");

  const events: SimEvent[] = useMemo(() => {
    const list: SimEvent[] = [];
    for (const p of points.slice(0, shown)) {
      if (p.flag === "spike") {
        const real = readings.slice(Math.max(0, p.i - 1), p.i + 2).some((x) => x.fault === "spike");
        list.push({ id: p.i * 2, t: p.i * 60_000, text: `Flagged ${p.value.toFixed(1)} °C (z = ${p.z.toFixed(1)}): ${real ? "a real spike" : "a false alarm"}`, tone: real ? "ok" : "warn" });
      }
      if (p.flag === "stuck") list.push({ id: p.i * 2 + 1, t: p.i * 60_000, text: `Stuck sensor: the same value ${STUCK_RUN} times in a row`, tone: "ok" });
    }
    return list;
  }, [points, readings, shown]);

  const inject = (kind: FaultKind) => {
    const at = Math.max(1, shown + 2);
    setFaults((f) => [...f, { kind, at }]);
  };

  const reset = () => {
    clockApi.reset();
    setFaults(defaultFaults());
  };

  const record = () => {
    const row: ObservationRow = {
      window: win,
      k,
      readings: shown,
      spikes: s.spikes,
      flagged: s.flagged,
      caught: s.caught,
      falseAlarms: s.falseAlarms,
      missed: s.missed,
    };
    addRow(row);
    const auto = summarise([...rows, row]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  const bands = faults.filter((f) => f.kind !== "spike" && f.at < shown);
  const zMax = Math.max(6, ...data.map((d) => Math.abs(d.z)));

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordDisabled={shown < 60}
      recordHint={shown < 60 ? "Let at least an hour of readings arrive first (press Play or Show whole run)." : "Adds these settings and the score so far to the observation table."}
      controls={
        <>
          <Slider
            label="Window (readings)"
            value={win}
            min={WINDOW_RANGE[0]}
            max={WINDOW_RANGE[1]}
            step={1}
            onChange={setWin}
            hint={`The average and the z-score use the last ${win} readings (${win} minutes). The average trails by about ${smoothingLag(win)} min.`}
          />
          <Slider label="Anomaly limit k" value={k} min={K_RANGE[0]} max={K_RANGE[1]} step={0.5} format={(v) => v.toFixed(1)} onChange={setK} hint={`A reading is flagged when its z-score is above ${k} or below −${k}.`} />
          <div className="grid gap-2">
            <p className="text-[0.95rem] font-semibold text-ink">Inject a fault now</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => inject("spike")} disabled={shown > RUN_SAMPLES - 3} icon={<Zap size={14} aria-hidden />}>
                Spike
              </Button>
              <Button size="sm" onClick={() => inject("stuck")} disabled={shown > RUN_SAMPLES - STUCK_LEN} icon={<Gauge size={14} aria-hidden />}>
                Stuck
              </Button>
              <Button size="sm" onClick={() => inject("drift")} disabled={shown > RUN_SAMPLES - 30} icon={<TrendingUp size={14} aria-hidden />}>
                Drift
              </Button>
            </div>
            <p className="text-sm text-ink-3">
              Spike: +8 °C for one reading. Stuck: repeats one value for {STUCK_LEN} minutes. Drift: creeps up 3 °C over {DRIFT_LEN / 60} hours.
            </p>
          </div>
        </>
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <SimControls clock={clockApi} />
          <Button size="sm" onClick={() => setShown(RUN_SAMPLES)} disabled={done}>
            Show whole run
          </Button>
          <Button size="sm" onClick={reset} icon={<RotateCcw size={14} aria-hidden />}>
            Reset faults
          </Button>
        </div>
      }
      stage={
        <div className="grid grid-cols-1 gap-3 p-3 sm:p-4">
          <ChartCard
            bare
            title="Room temperature, 08:00 to 14:00"
            description="Raw readings (thin) and the moving average (thick). Dots mark flagged readings; shaded bands show injected stuck or drift faults."
            data={data}
            xKey="time"
            xLabel="Time"
            series={[
              { key: "value", label: "Reading", unit: "°C", color: seriesColor(0) },
              { key: "avg", label: `Moving average (${win})`, unit: "°C", color: seriesColor(1) },
            ]}
            legend={[
              { label: "Reading", color: seriesColor(0) },
              { label: `Moving average (${win})`, color: seriesColor(1) },
              { label: "Flagged", color: "var(--bad)" },
            ]}
            height={260}
            emptyText="Press Play to start the stream."
          >
            <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
              <CartesianGrid {...chartStyle.grid} />
              <XAxis dataKey="i" type="number" domain={[0, RUN_SAMPLES]} ticks={[0, 60, 120, 180, 240, 300, 360]} tickFormatter={(i: number) => clock(START_MINUTE + i)} {...chartStyle.axis} />
              <YAxis {...chartStyle.axis} domain={[25, 38]} ticks={[26, 28, 30, 32, 34, 36, 38]} unit=" °C" width={64} allowDataOverflow />
              <Tooltip content={<ChartTooltip units={{ value: "°C", avg: "°C" }} formatLabel={(i) => clock(START_MINUTE + Number(i))} />} />
              {bands.map((f) => (
                <ReferenceArea
                  key={`${f.kind}-${f.at}`}
                  x1={f.at}
                  x2={Math.min(shown, f.at + (f.kind === "stuck" ? STUCK_LEN : DRIFT_LEN))}
                  fill="var(--warn-soft)"
                  stroke="var(--warn)"
                  strokeDasharray="3 3"
                  label={{ value: FAULT_LABEL[f.kind], position: "insideTopLeft", fill: "var(--ink-2)", fontSize: 12 }}
                />
              ))}
              <Line dataKey="value" name="Reading" stroke={seriesColor(0)} strokeWidth={1} dot={false} isAnimationActive={false} />
              <Line dataKey="avg" name={`Moving average (${win})`} stroke={seriesColor(1)} strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Scatter data={flagged} dataKey="value" name="Flagged" fill="var(--bad)" stroke="var(--surface)" strokeWidth={2} isAnimationActive={false} />
              <Scatter data={stuckFlags} dataKey="value" name="Stuck" fill="var(--bad)" shape="square" isAnimationActive={false} />
            </ComposedChart>
          </ChartCard>

          <ChartCard
            bare
            title="How unusual each reading is (z-score)"
            description={`Dashed lines at ±${k}: readings beyond them are flagged. z stays 0 until ${win} readings have arrived.`}
            data={data}
            xKey="time"
            xLabel="Time"
            series={[{ key: "z", label: "z-score", color: seriesColor(2) }]}
            height={150}
            emptyText="No readings yet."
          >
            <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
              <CartesianGrid {...chartStyle.grid} />
              <XAxis dataKey="i" type="number" domain={[0, RUN_SAMPLES]} ticks={[0, 60, 120, 180, 240, 300, 360]} tickFormatter={(i: number) => clock(START_MINUTE + i)} {...chartStyle.axis} />
              <YAxis {...chartStyle.axis} domain={[-Math.ceil(zMax), Math.ceil(zMax)]} width={56} allowDecimals={false} />
              <Tooltip content={<ChartTooltip formatLabel={(i) => clock(START_MINUTE + Number(i))} />} />
              <ReferenceLine y={k} stroke="var(--bad)" strokeDasharray="4 3" />
              <ReferenceLine y={-k} stroke="var(--bad)" strokeDasharray="4 3" />
              <Line dataKey="z" name="z-score" stroke={seriesColor(2)} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ChartCard>
        </div>
      }
      readouts={
        <Readouts
          items={[
            { label: "Time", value: shown ? clock(nowReading.minute) : "–" },
            { label: "Reading", value: shown ? now.value.toFixed(1) : "–", unit: "°C" },
            { label: `Moving average (${win})`, value: shown ? now.avg.toFixed(1) : "–", unit: "°C" },
            { label: "Min / max in window", value: shown ? `${now.min.toFixed(1)} / ${now.max.toFixed(1)}` : "–", unit: "°C" },
            { label: "z-score now", value: shown ? now.z.toFixed(1) : "–", tone: shown && Math.abs(now.z) > k ? "bad" : "default" },
            { label: "Spikes caught", value: `${s.caught} / ${s.spikes}`, tone: s.spikes && s.caught === s.spikes ? "ok" : "default" },
            { label: "False alarms", value: s.falseAlarms, tone: s.falseAlarms > 3 ? "warn" : "default" },
            { label: "Smoothing lag", value: smoothingLag(win), unit: "min" },
          ]}
        />
      }
      log={<EventLog events={events} title="Flags" emptyText="No readings flagged yet." height={180} formatTime={(t) => clock(START_MINUTE + Math.round(t / 60_000))} />}
    />
  );
}

