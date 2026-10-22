import { useReducedMotion } from "motion/react";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SimControls } from "~/components/sim/SimControls";
import { useSimClock } from "~/components/sim/useSimClock";
import { Segmented } from "~/components/ui/Segmented";
import { cn } from "~/lib/cn";
import {
  WIDGETS,
  bulbStatus,
  createBulb,
  generateStreams,
  makeWidget,
  preset,
  reviewDashboard,
  sendCommand,
  shownTick,
  tickBulb,
  updateCost,
  type Streams,
  type UpdateMode,
  type Widget,
} from "~/labs/l21-dashboard-builder/engine";
import { Bulb, LiveWidget, type BulbView } from "~/labs/l21-dashboard-builder/widgets";

/** The dashboards open with this many seconds of history. */
const T0 = 80;
const RUN_S = 1800;
const LATENCY = 2;

/** One of every widget kind, laid out so the two wide ones share the second row. */
const SAMPLE: Widget[] = [
  makeWidget("s-alert", "alert", "temperature"),
  makeWidget("s-gauge", "gauge", "temperature"),
  makeWidget("s-value", "value", "door"),
  makeWidget("s-switch", "switch", "bulb"),
  makeWidget("s-line", "line", "power"),
  makeWidget("s-map", "map", "van"),
];

const BULB_WORDS: Record<BulbView, string> = { on: "on", off: "off", "turning on": "turning on, waiting for it", "turning off": "turning off, waiting for it" };

export default function CloudDashboardsVisual() {
  const reduced = useReducedMotion() ?? false;
  const streams = useMemo(() => generateStreams(T0 + RUN_S + 1, 1), []);
  const [bulb, setBulb] = useState(createBulb);
  const bulbRef = useRef(bulb);
  const [layout, setLayout] = useState<"cluttered" | "clean">("cluttered");

  const setBoth = (b: typeof bulb) => {
    bulbRef.current = b;
    setBulb(b);
  };

  const clock = useSimClock({
    stepMs: 1000,
    maxTimeMs: RUN_S * 1000,
    onTick: (dt, t) => {
      const from = T0 + Math.floor((t - dt) / 1000);
      const to = T0 + Math.floor(t / 1000);
      let b = bulbRef.current;
      for (let k = from + 1; k <= to; k++) b = tickBulb(b, k, { online: true, latency: LATENCY });
      if (b !== bulbRef.current) setBoth(b);
    },
    onReset: () => setBoth(createBulb()),
  });

  // Start the live data straight away, unless the reader prefers less motion.
  const { play } = clock;
  useEffect(() => {
    if (!reduced) play();
  }, [reduced, play]);

  const tick = T0 + Math.floor(clock.timeMs / 1000);
  const tickRef = useRef(tick);
  tickRef.current = tick;
  const status = bulbStatus(bulb);
  const onSwitch = useCallback((on: boolean) => setBoth(sendCommand(bulbRef.current, on ? "on" : "off", tickRef.current)), []);

  const shown = useMemo(() => preset(layout), [layout]);
  const tips = useMemo(() => reviewDashboard(shown), [shown]);
  const tipNumbers = useMemo(() => {
    const m = new Map<string, number[]>();
    tips.forEach((t, i) => t.widget && m.set(t.widget, [...(m.get(t.widget) ?? []), i + 1]));
    return m;
  }, [tips]);

  return (
    <div className="grid grid-cols-1 gap-10">
      <section aria-labelledby="dash-sample" className="@container grid grid-cols-1 gap-3">
        <div className="grid gap-1">
          <h2 id="dash-sample" className="text-h3 font-bold">
            A live dashboard
          </h2>
          <p className="max-w-[70ch] text-ink-2">
            Each widget below is fed by a simulated home sensor, one reading a second. Press the switch to send a command to the porch bulb.
          </p>
        </div>
        <SimControls clock={clock} playLabel="Play" />
        <ul className="grid grid-cols-2 gap-3 @2xl:grid-cols-4" aria-label="Sample dashboard, one widget of each kind">
          {SAMPLE.map((w) => (
            <li key={w.id} className={cn("flex min-w-0 flex-col gap-1.5", w.size === 2 && "col-span-2")}>
              <div className="min-w-0 flex-1">
                <LiveWidget widget={w} streams={streams} tick={tick} mode="push" bulb={status} onSwitch={onSwitch} />
              </div>
              {w.kind === "switch" && (
                <div className="flex items-center gap-2 rounded-md border border-line bg-surface px-2 py-1.5">
                  <Bulb status={status} width={30} caption={false} />
                  <span className="text-xs text-ink-2">The bulb itself: {BULB_WORDS[status]}.</span>
                </div>
              )}
              <p className="text-sm text-ink-2">
                <span className="font-semibold text-ink">{WIDGETS[w.kind].label}: </span>
                {WIDGETS[w.kind].useFor}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="dash-compare" className="@container grid grid-cols-1 gap-3">
        <div className="grid gap-1">
          <h2 id="dash-compare" className="text-h3 font-bold">
            Cluttered or clean?
          </h2>
          <p className="max-w-[70ch] text-ink-2">Both dashboards watch the same home. Switch between them and read the design review.</p>
        </div>
        <Segmented<"cluttered" | "clean">
          label="Dashboard"
          value={layout}
          onChange={setLayout}
          options={[
            { value: "cluttered", label: `Cluttered (${preset("cluttered").length} widgets)` },
            { value: "clean", label: `Clean (${preset("clean").length} widgets)` },
          ]}
        />
        <div className="grid grid-cols-1 gap-4 @5xl:grid-cols-[minmax(0,1fr)_18rem]">
          <ul className="grid grid-cols-2 content-start gap-3 @2xl:grid-cols-4" aria-label={`${layout} dashboard`}>
            {shown.map((w) => {
              const nums = tipNumbers.get(w.id);
              return (
                <li key={w.id} className={cn("min-w-0", w.size === 2 && "col-span-2")}>
                  <LiveWidget
                    widget={w}
                    streams={streams}
                    tick={tick}
                    mode="push"
                    bulb={status}
                    onSwitch={onSwitch}
                    className={nums ? "border-warn" : undefined}
                    badges={
                      nums && (
                        <span className="inline-flex items-center gap-1 rounded bg-warn-soft px-1.5 py-0.5 text-xs font-semibold text-warn">
                          <TriangleAlert size={12} aria-hidden />
                          Tip {nums.join(", ")}
                        </span>
                      )
                    }
                  />
                </li>
              );
            })}
          </ul>
          <section aria-labelledby="dash-review" className="grid content-start gap-2.5 self-start rounded-lg border border-line bg-surface p-4">
            <h3 id="dash-review" className="font-bold">
              Design review
            </h3>
            {tips.length === 0 ? (
              <p className="flex items-start gap-2 text-sm text-ink">
                <CircleCheck size={18} className="shrink-0 text-ok" aria-hidden />
                Nothing to fix. The alert is top left, every widget has a title and a job, and nothing is repeated.
              </p>
            ) : (
              <ol className="grid gap-1.5">
                {tips.map((t, i) => (
                  <li key={t.id} className="flex items-start gap-2 rounded-md border border-line px-2.5 py-2 text-sm">
                    <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-warn">
                      <TriangleAlert size={14} aria-hidden />
                      {i + 1}
                    </span>
                    <span className="text-ink">{t.text}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </section>

      <PollVsPush streams={streams} />

      <section aria-labelledby="dash-notice" className="max-w-[70ch]">
        <h2 id="dash-notice" className="text-h3 font-bold">
          What to notice
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2 marker:text-ink-3">
          <li>Each widget has one job. Pick it by the kind of data, not by looks.</li>
          <li>The switch says “turning on…” until the bulb confirms. The command travels through the device shadow.</li>
          <li>The cluttered dashboard shows temperature three times and hides its only alert at the bottom.</li>
          <li>A gauge with no range and a card with no title leave the reader guessing.</li>
          <li>Push sends a message only when the door changes. Slow polling sends fewer messages but can miss a short opening.</li>
        </ul>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Polling vs push for the front door                                  */
/* ------------------------------------------------------------------ */

const WIN_START = 90;
const WIN = 60;
const DOOR_MODES: { mode: UpdateMode; label: string }[] = [
  { mode: "push", label: "Push" },
  { mode: "poll5", label: "Poll every 5 s" },
  { mode: "poll30", label: "Poll every 30 s" },
];

/** Starts of each opening (closed → open) in a run of door states. */
const openings = (states: boolean[]) => states.filter((v, i) => v && (i === 0 || !states[i - 1])).length;

function PollVsPush({ streams }: { streams: Streams }) {
  const real = streams.door.slice(WIN_START, WIN_START + WIN);
  const realOpenings = openings(real);
  const rows = DOOR_MODES.map(({ mode, label }) => {
    const seen = real.map((_, i) => streams.door[shownTick(mode, WIN_START + i)]);
    const marks =
      mode === "push"
        ? real.flatMap((v, i) => (i === 0 || v !== real[i - 1] ? [i] : []))
        : real.flatMap((_, i) => (shownTick(mode, WIN_START + i) === WIN_START + i ? [i] : []));
    return { label, seen, marks, messages: updateCost(real, mode).messages, seenOpenings: openings(seen) };
  });

  return (
    <section aria-labelledby="dash-door" className="grid grid-cols-1 gap-3">
      <div className="grid gap-1">
        <h2 id="dash-door" className="text-h3 font-bold">
          Polling or push: one minute of the front door
        </h2>
        <p className="max-w-[70ch] text-ink-2">
          The top strip is what the door really did. The others show what a dashboard would display with each way of updating.
        </p>
      </div>
      <figure className="grid gap-3 rounded-lg border border-line bg-surface p-4">
        <DoorStrip label="Real door (sensor)" states={real} note={`opened ${realOpenings} time${realOpenings === 1 ? "" : "s"}`} />
        {rows.map((r) => (
          <DoorStrip
            key={r.label}
            label={r.label}
            states={r.seen}
            marks={r.marks}
            note={`${r.messages} message${r.messages === 1 ? "" : "s"} · saw ${r.seenOpenings} of ${realOpenings} opening${realOpenings === 1 ? "" : "s"}`}
          />
        ))}
        <p className="flex justify-between text-xs text-ink-3" aria-hidden>
          <span>0 s</span>
          <span>30 s</span>
          <span>60 s</span>
        </p>
        <figcaption className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-3">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-4 rounded-sm bg-u3" aria-hidden /> Door shown open
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-4 rounded-sm border border-line-strong bg-surface-2" aria-hidden /> Door shown closed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-ink-2" aria-hidden /> A message to the dashboard
          </span>
        </figcaption>
      </figure>
    </section>
  );
}

function DoorStrip({ label, states, marks, note }: { label: string; states: boolean[]; marks?: number[]; note: string }) {
  const open = states.filter(Boolean).length;
  return (
    <div className="grid min-w-0 gap-1">
      <p className="flex flex-wrap justify-between gap-x-3 text-sm">
        <span className="font-semibold text-ink">{label}</span>
        <span className="text-ink-2">{note}</span>
      </p>
      <div className="relative pt-2">
        {marks && (
          <div className="absolute inset-x-0 top-0 h-2" aria-hidden>
            {marks.map((i) => (
              <span key={i} className="absolute top-0 h-2 w-0.5 bg-ink-2" style={{ left: `${(i / states.length) * 100}%` }} />
            ))}
          </div>
        )}
        <div className="flex h-6 overflow-hidden rounded-md border border-line-strong" role="img" aria-label={`${label}: shown open for ${open} of ${states.length} seconds. ${note}.`}>
          {states.map((v, i) => (
            <span key={i} className={cn("h-full flex-1", v ? "bg-u3" : "bg-surface-2")} />
          ))}
        </div>
      </div>
    </div>
  );
}
