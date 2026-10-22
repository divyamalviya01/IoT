import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BellRing,
  Check,
  ChevronDown,
  ChevronRight,
  Cog,
  Database,
  FileText,
  Flame,
  LayoutDashboard,
  Pause,
  Play,
  RadioTower,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Readouts, type Readout } from "~/components/lab/Readouts";
import { seriesColor } from "~/components/theory/ChartCard";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { cn } from "~/lib/cn";

type Mode = "batch" | "stream";

/* ------------------------------------------------------------------ */
/* The pipeline's clock, in animation seconds                          */
/* ------------------------------------------------------------------ */

/** A sensor reading leaves the devices this often. */
const EMIT = 0.7;
/** Time a reading takes to cross one arrow. */
const HOP = 0.9;
/** Batch: a job starts this often. 6 s here stands for 1 hour. */
const JOB = 6;
/** Batch: how long the job runs. */
const CRUNCH = 1;
/** Stream: time the stream job spends on one reading. */
const CHECK = 0.25;
/** Stream: how long an alert stays on the dashboard. */
const ALERT_FOR = 2.5;
/** A reading at or above this is too hot. */
const HOT_C = 40;

const SENSORS = 3;
/** Readings in order. Reading 6 (48 °C, from sensor 3) is the fire. */
const TEMPS = [27, 26, 28, 27, 29, 48, 28, 27, 26, 28, 29, 27, 28, 26, 27, 28];

/** Animation frame for the still picture shown with reduced motion. */
const STILL_T: Record<Mode, number> = { batch: 11, stream: 7.2 };
const TICK_MS = 100;

const sensorOf = (k: number) => k % SENSORS;
const tempOf = (k: number) => TEMPS[k % TEMPS.length];
const isHot = (k: number) => tempOf(k) >= HOT_C;

/** Which batch job picks up reading k: the first one that starts after it reaches Store. */
const jobOf = (k: number) => Math.max(0, Math.ceil((k * EMIT + HOP) / JOB - 1e-9) - 1);
const jobStart = (n: number) => (n + 1) * JOB;

interface Dot {
  key: string;
  /** 0: Ingest → Store, 1: Store → Process, 2: Process → Visualize */
  seg: 0 | 1 | 2;
  /** 0 to 1 along the arrow */
  p: number;
  sensor: number;
  hot: boolean;
  report?: boolean;
  /** Place in a bunch of dots moving together */
  lane: number;
}

interface PileItem {
  k: number;
  sensor: number;
  hot: boolean;
}

interface Report {
  run: number;
  count: number;
  avg: number;
  max: number;
}

interface Reading {
  sensor: number;
  temp: number;
  hot: boolean;
}

interface Snapshot {
  dots: Dot[];
  latest: Reading | null;
  /** Batch: readings waiting in Store */
  pile: PileItem[];
  /** Stream: copies saved in Store for later */
  saved: number;
  job:
    | { state: "waiting"; nextIn: number }
    | { state: "loading"; count: number }
    | { state: "running"; count: number; progress: number };
  checked: Reading | null;
  report: Report | null;
  live: Reading | null;
  alert: Reading | null;
  answers: number;
}

const reading = (k: number): Reading => ({ sensor: sensorOf(k), temp: tempOf(k), hot: isHot(k) });

function readingsOfJob(n: number): number[] {
  const from = Math.max(0, Math.floor((jobStart(n) - JOB - HOP) / EMIT) - 1);
  const to = Math.floor((jobStart(n) - HOP) / EMIT) + 1;
  const ks: number[] = [];
  for (let k = from; k <= to; k++) if (jobOf(k) === n) ks.push(k);
  return ks;
}

function batchAt(t: number): Snapshot {
  const dots: Dot[] = [];
  const pile: PileItem[] = [];
  const kMax = Math.floor(t / EMIT);
  const kMin = Math.max(0, Math.floor((t - JOB - 2 * HOP) / EMIT) - 1);
  const lanes = new Map<number, number>();

  for (let k = kMin; k <= kMax; k++) {
    const sent = k * EMIT;
    const stored = sent + HOP;
    const n = jobOf(k);
    const start = jobStart(n);
    const base = { sensor: sensorOf(k), hot: isHot(k) };
    if (t < stored) {
      dots.push({ key: `r${k}-0`, seg: 0, p: (t - sent) / HOP, lane: 0, ...base });
    } else if (t < start) {
      pile.push({ k, ...base });
    } else if (t < start + HOP) {
      const lane = lanes.get(n) ?? 0;
      lanes.set(n, lane + 1);
      dots.push({ key: `r${k}-1`, seg: 1, p: (t - start) / HOP, lane, ...base });
    }
  }

  // The job that is loading or running now, if any
  const recent = Math.max(0, Math.floor(t / JOB) - 1);
  let job: Snapshot["job"] = { state: "waiting", nextIn: jobStart(recent) - t };
  for (let n = recent; n <= recent + 1; n++) {
    const start = jobStart(n);
    if (t < start) {
      job = { state: "waiting", nextIn: start - t };
      break;
    }
    if (t < start + HOP) {
      job = { state: "loading", count: readingsOfJob(n).length };
      break;
    }
    if (t < start + HOP + CRUNCH) {
      job = { state: "running", count: readingsOfJob(n).length, progress: (t - start - HOP) / CRUNCH };
      break;
    }
    const sendAt = start + HOP + CRUNCH;
    if (t < sendAt + HOP) {
      dots.push({ key: `job${n}`, seg: 2, p: (t - sendAt) / HOP, sensor: 0, hot: false, report: true, lane: 0 });
    }
  }

  // Reports that have reached the dashboard
  const delivered = (n: number) => jobStart(n) + 2 * HOP + CRUNCH <= t;
  let last = -1;
  for (let n = 0; delivered(n); n++) last = n;
  let report: Report | null = null;
  if (last >= 0) {
    const temps = readingsOfJob(last).map(tempOf);
    report = {
      run: last + 1,
      count: temps.length,
      avg: temps.reduce((a, b) => a + b, 0) / temps.length,
      max: Math.max(...temps),
    };
  }

  return {
    dots,
    latest: t >= 0 ? reading(kMax) : null,
    pile,
    saved: 0,
    job,
    checked: null,
    report,
    live: null,
    alert: null,
    answers: last + 1,
  };
}

function streamAt(t: number): Snapshot {
  const dots: Dot[] = [];
  const kMax = Math.floor(t / EMIT);
  const trip = 3 * HOP + CHECK;
  const kMin = Math.max(0, Math.floor((t - trip - ALERT_FOR) / EMIT) - 1);
  let checked: Reading | null = null;
  let live: Reading | null = null;
  let alert: Reading | null = null;

  for (let k = kMin; k <= kMax; k++) {
    const age = t - k * EMIT;
    const base = { sensor: sensorOf(k), hot: isHot(k), lane: 0 };
    if (age < HOP) dots.push({ key: `r${k}-0`, seg: 0, p: age / HOP, ...base });
    else if (age < 2 * HOP) dots.push({ key: `r${k}-1`, seg: 1, p: (age - HOP) / HOP, ...base });
    else if (age >= 2 * HOP + CHECK && age < trip) dots.push({ key: `r${k}-2`, seg: 2, p: (age - 2 * HOP - CHECK) / HOP, ...base });
    if (age >= 2 * HOP) checked = reading(k);
    if (age >= trip) {
      live = reading(k);
      if (isHot(k) && age < trip + ALERT_FOR) alert = reading(k);
    }
  }

  const arrived = t >= trip ? Math.floor((t - trip) / EMIT) + 1 : 0;
  return {
    dots,
    latest: reading(kMax),
    pile: [],
    saved: t >= HOP ? Math.floor((t - HOP) / EMIT) + 1 : 0,
    job: { state: "waiting", nextIn: 0 },
    checked,
    report: null,
    live,
    alert,
    answers: arrived,
  };
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

const sensorName = (i: number) => `S${i + 1}`;

/** One reading (a coloured dot), a very hot reading (flame) or a batch report (page). */
function Glyph({ sensor, hot, report }: { sensor: number; hot: boolean; report?: boolean }) {
  if (report) {
    return (
      <span className="flex size-5 items-center justify-center rounded border-2 border-brand bg-surface">
        <FileText size={11} className="text-brand" aria-hidden />
      </span>
    );
  }
  if (hot) {
    return (
      <span
        className="flex size-4 items-center justify-center rounded-full border-2 bg-surface"
        style={{ borderColor: seriesColor(sensor) }}
      >
        <Flame size={9} className="text-bad" strokeWidth={2.6} aria-hidden />
      </span>
    );
  }
  return <span className="block size-2.5 rounded-full" style={{ backgroundColor: seriesColor(sensor) }} />;
}

const LANE_ACROSS = [0, -1, 1];

/** An arrow between two stages, with the dots that are crossing it. */
function Arrow({ dots, wide, still }: { dots: Dot[]; wide: boolean; still: boolean }) {
  const Chevron = wide ? ChevronRight : ChevronDown;
  return (
    <div className={cn("relative", wide ? "min-h-16" : "h-14")} aria-hidden>
      <span
        className={cn(
          "absolute bg-line-strong",
          wide ? "inset-x-1 top-1/2 h-0.5 -translate-y-1/2" : "inset-y-1 left-1/2 w-0.5 -translate-x-1/2",
        )}
      />
      <Chevron
        size={18}
        className={cn(
          "absolute text-ink-3",
          wide ? "top-1/2 -right-1.5 -translate-y-1/2" : "-bottom-1.5 left-1/2 -translate-x-1/2",
        )}
      />
      <AnimatePresence initial={false}>
        {dots.map((d) => {
          const along = `${(Math.min(1, Math.max(0, d.p)) * 100).toFixed(2)}%`;
          // A bunch of dots travels in rows of three, side by side; a lone dot stays on the line.
          const across = LANE_ACROSS[d.lane % 3] * 9;
          const behind = -Math.floor(d.lane / 3) * 9;
          return (
            <motion.span
              key={d.key}
              className="absolute z-10"
              style={wide ? { top: "50%" } : { left: "50%" }}
              initial={false}
              animate={wide ? { left: along } : { top: along }}
              exit={still ? undefined : { opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: still ? 0 : TICK_MS / 1000, ease: "linear" }}
            >
              <span
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={wide ? { marginTop: across, marginLeft: behind } : { marginLeft: across, marginTop: behind }}
              >
                <Glyph sensor={d.sensor} hot={d.hot} report={d.report} />
              </span>
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function Stage({
  step,
  icon: Icon,
  title,
  tools,
  children,
  busy = false,
}: {
  step: number;
  icon: LucideIcon;
  title: string;
  tools: string;
  children: ReactNode;
  busy?: boolean;
}) {
  return (
    <section
      aria-label={`Stage ${step}: ${title}`}
      className={cn(
        "grid min-w-0 content-start gap-2 rounded-lg border bg-surface p-3 transition-colors",
        busy ? "border-u3" : "border-line",
      )}
    >
      <p className="flex items-center gap-2 font-bold">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-u3-soft">
          <Icon size={17} className="text-u3" aria-hidden />
        </span>
        {title}
      </p>
      <p className="text-sm text-ink-2">{tools}</p>
      <div className="grid min-h-[4.5rem] content-start gap-1.5 border-t border-line pt-2 text-sm">{children}</div>
    </section>
  );
}

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <span
      className="block h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
    >
      <span className="block h-full rounded-full bg-u3" style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </span>
  );
}

function ReadingText({ r }: { r: Reading }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex w-4 justify-center">
        <Glyph sensor={r.sensor} hot={r.hot} />
      </span>
      <span className="tabular-nums">
        {sensorName(r.sensor)}: {r.temp} °C
      </span>
    </span>
  );
}

/** Width of an element, measured before paint and kept up to date. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/* ------------------------------------------------------------------ */
/* Text for each mode                                                  */
/* ------------------------------------------------------------------ */

const MODE_TEXT: Record<
  Mode,
  { process: string; store: string; example: string; scale: string; insight: Readout; answersUnit: string }
> = {
  batch: {
    process: "Batch job: MapReduce or Spark",
    store: "Data lake (HDFS) or a time-series database",
    example:
      "A smart meter's readings are added up each night for the electricity bill. A monthly energy report is made the same way.",
    scale: "Sped up: 6 seconds here stand for 1 hour.",
    insight: { label: "Time to insight", value: "≤ 1", unit: "hour", hint: "A reading can wait up to a whole hour for the next job" },
    answersUnit: "reports",
  },
  stream: {
    process: "Stream job: Spark Streaming, Flink or Kafka Streams",
    store: "A copy goes to the data lake for later",
    example:
      "A heat sensor's reading sets off a fire alarm within seconds. A bank checks each card payment for fraud while it happens.",
    scale: "Shown at about real speed: each reading is answered in a few seconds.",
    insight: { label: "Time to insight", value: "1–3", unit: "seconds", hint: "Each reading is checked as soon as it arrives" },
    answersUnit: "checks",
  },
};

/* ------------------------------------------------------------------ */
/* Visual                                                              */
/* ------------------------------------------------------------------ */

export default function BigDataVisual() {
  const [mode, setMode] = useState<Mode>("batch");
  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const still = useReducedMotion() ?? false;
  const [figureRef, width] = useWidth<HTMLDivElement>();
  const wide = width >= 640;

  useEffect(() => {
    if (still || !playing) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      // Never jump more than a quarter second, for example after the tab was hidden.
      const step = Math.min((now - last) / 1000, 0.25);
      last = now;
      setTime((v) => v + step);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [still, playing]);

  const choose = (m: Mode) => {
    setMode(m);
    setTime(0);
  };

  const t = still ? STILL_T[mode] : time;
  const snap = mode === "batch" ? batchAt(t) : streamAt(t);
  const text = MODE_TEXT[mode];
  const onArrow = (seg: Dot["seg"]) => snap.dots.filter((d) => d.seg === seg);
  const job = snap.job;

  const readouts: Readout[] = [
    text.insight,
    { label: "Answers so far", value: snap.answers, unit: text.answersUnit },
    {
      label: "Waiting in Store",
      value: snap.pile.length,
      unit: snap.pile.length === 1 ? "reading" : "readings",
      hint: "Readings stored but not yet processed",
    },
    {
      label: "1 second here is",
      value: mode === "batch" ? "10" : "1",
      unit: mode === "batch" ? "minutes" : "second",
      hint: text.scale,
    },
  ];

  const arrows = (seg: Dot["seg"]) => <Arrow dots={onArrow(seg)} wide={wide} still={still} />;

  return (
    <div className="grid grid-cols-1 gap-6">
      <p className="max-w-[70ch] text-ink-2">
        IoT devices send readings all day. A big data pipeline collects them, stores them, processes them and shows the
        answers. Batch processing waits and handles a big pile at once. Stream processing handles each reading as it
        arrives.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <Segmented<Mode>
          label="Processing style"
          value={mode}
          onChange={choose}
          options={[
            { value: "batch", label: "Batch" },
            { value: "stream", label: "Stream" },
          ]}
        />
        {!still && (
          <Button
            size="sm"
            onClick={() => setPlaying((v) => !v)}
            icon={playing ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
          >
            {playing ? "Pause" : "Play"}
          </Button>
        )}
      </div>

      <figure className="m-0 grid min-w-0 grid-cols-1 gap-3 rounded-lg border border-line bg-surface-2 p-3 sm:p-4">
        <div
          ref={figureRef}
          className={cn(
            "grid min-w-0",
            wide
              ? "grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,1fr)_2.75rem_minmax(0,1fr)_2.75rem_minmax(0,1fr)] items-stretch"
              : "grid-cols-1",
          )}
        >
          <Stage step={1} icon={RadioTower} title="Ingest" tools="Sensors send to an MQTT broker or Kafka">
            <span className="flex flex-wrap gap-x-3 gap-y-1">
              {Array.from({ length: SENSORS }, (_, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-ink-2">
                  <Glyph sensor={i} hot={false} />
                  {sensorName(i)}
                </span>
              ))}
            </span>
            {snap.latest && (
              <span className="text-ink-2">
                Latest: <ReadingText r={snap.latest} />
              </span>
            )}
          </Stage>

          {arrows(0)}

          <Stage step={2} icon={Database} title="Store" tools={text.store} busy={mode === "batch" && snap.pile.length > 0}>
            {mode === "batch" ? (
              <>
                <span className="flex min-h-5 flex-wrap items-center gap-1" aria-hidden>
                  <AnimatePresence initial={false}>
                    {snap.pile.map((item) => (
                      <motion.span
                        key={item.k}
                        className="inline-flex"
                        initial={still ? false : { scale: 0.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={still ? undefined : { opacity: 0, transition: { duration: 0.15 } }}
                        transition={{ duration: still ? 0 : 0.2 }}
                      >
                        <Glyph sensor={item.sensor} hot={item.hot} />
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </span>
                <span className="font-semibold text-ink">
                  {snap.pile.length} {snap.pile.length === 1 ? "reading waits" : "readings wait"} for the next job
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold text-ink">Nothing waits here</span>
                <span className="text-ink-2">
                  <span className="tabular-nums">{snap.saved}</span> copies saved for later
                </span>
              </>
            )}
          </Stage>

          {arrows(1)}

          <Stage step={3} icon={Cog} title="Process" tools={text.process} busy={mode === "stream" || job.state !== "waiting"}>
            {mode === "batch" ? (
              job.state === "waiting" ? (
                <>
                  <span className="font-semibold text-ink">
                    Next job in <span className="tabular-nums">{Math.max(1, Math.ceil((job.nextIn / JOB) * 60))}</span> min
                  </span>
                  <Bar value={1 - job.nextIn / JOB} label="Time until the next batch job" />
                  <span className="text-ink-3">Runs once an hour</span>
                </>
              ) : job.state === "loading" ? (
                <>
                  <span className="font-semibold text-ink">Job starting</span>
                  <span className="text-ink-2">Loading {job.count} stored readings</span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-ink">Job running on {job.count} readings</span>
                  <Bar value={job.progress} label="Batch job progress" />
                  <span className="text-ink-3">Average and maximum</span>
                </>
              )
            ) : (
              <>
                <span className="font-semibold text-ink">Checks each reading as it arrives</span>
                {snap.checked ? (
                  <span className="inline-flex flex-wrap items-center gap-1.5 text-ink-2">
                    <ReadingText r={snap.checked} />
                    {snap.checked.hot ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-bad">
                        <Flame size={14} aria-hidden /> too hot
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-ink-2">
                        <Check size={14} className="text-ok" aria-hidden /> OK
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-ink-3">Waiting for the first reading</span>
                )}
              </>
            )}
          </Stage>

          {arrows(2)}

          <Stage step={4} icon={LayoutDashboard} title="Visualize" tools="Dashboard and alerts">
            {mode === "batch" ? (
              snap.report ? (
                <>
                  <span className="font-semibold text-ink">Hourly report #{snap.report.run}</span>
                  <span className="text-ink-2">
                    <span className="tabular-nums">{snap.report.count}</span> readings, average{" "}
                    <span className="tabular-nums">{snap.report.avg.toFixed(1)} °C</span>, highest{" "}
                    <span className="tabular-nums">{snap.report.max} °C</span>
                  </span>
                  {snap.report.max >= HOT_C && (
                    <span className="inline-flex items-start gap-1.5 text-ink">
                      <Flame size={14} className="mt-0.5 shrink-0 text-bad" aria-hidden />
                      Fire found, but up to an hour late
                    </span>
                  )}
                </>
              ) : (
                <span className="text-ink-3">No report yet. The first job has not finished.</span>
              )
            ) : (
              <>
                {snap.live ? (
                  <span className="text-ink-2">
                    Live: <ReadingText r={snap.live} />
                  </span>
                ) : (
                  <span className="text-ink-3">Waiting for the first answer</span>
                )}
                {snap.alert && (
                  <span className="inline-flex items-start gap-1.5 rounded-md bg-bad-soft px-2 py-1 font-semibold text-ink">
                    <BellRing size={15} className="mt-0.5 shrink-0 text-bad" aria-hidden />
                    Alert: {sensorName(snap.alert.sensor)} reads {snap.alert.temp} °C. Fire alarm on.
                  </span>
                )}
              </>
            )}
          </Stage>
        </div>

        <figcaption className="grid gap-2">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2" aria-label="Key">
            {Array.from({ length: SENSORS }, (_, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span className="inline-flex w-4 justify-center" aria-hidden>
                  <Glyph sensor={i} hot={false} />
                </span>
                Reading from {sensorName(i)}
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span className="inline-flex w-4 justify-center" aria-hidden>
                <Glyph sensor={2} hot />
              </span>
              Very hot reading (48 °C)
            </li>
            {mode === "batch" && (
              <li className="flex items-center gap-1.5">
                <span aria-hidden>
                  <Glyph sensor={0} hot={false} report />
                </span>
                One batch report
              </li>
            )}
          </ul>
          <p className="text-sm text-ink-3">
            {still ? "Animation is off because your device asks for less motion. This is one moment of the flow. " : ""}
            {text.scale}
          </p>
        </figcaption>
      </figure>

      <Readouts items={readouts} />

      <p className="max-w-[70ch] rounded-lg border border-line bg-surface px-4 py-3 text-ink-2" aria-live="polite">
        <span className="font-semibold text-ink">{mode === "batch" ? "Batch example: " : "Stream example: "}</span>
        {text.example}
      </p>

      <section aria-labelledby="bigdata-notice" className="max-w-[70ch]">
        <h2 id="bigdata-notice" className="text-h3 font-bold">
          What to notice
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2 marker:text-ink-3">
          <li>In batch mode, readings pile up in Store. The job takes the whole pile at once and sends one report.</li>
          <li>In stream mode, nothing waits. Each reading is checked on arrival, so the answer comes in seconds.</li>
          <li>
            Watch the 48 °C reading. Stream mode raises the fire alarm at once. Batch mode shows it only in the next
            report.
          </li>
          <li>Batch is simpler and cheaper for big totals, such as bills. Stream is needed when a late answer is useless.</li>
          <li>Velocity, one of the 5 Vs of big data, is the reason stream processing exists.</li>
          <li>Many real systems use both: stream for alerts and batch for reports.</li>
        </ul>
      </section>
    </div>
  );
}
