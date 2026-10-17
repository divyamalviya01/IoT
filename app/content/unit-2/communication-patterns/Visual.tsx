import { motion, useReducedMotion } from "motion/react";
import { Pause, Play, Server, Smartphone, Thermometer, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { cn } from "~/lib/cn";

type Pattern = "rr" | "ps" | "pp" | "ep";
type Spot = "sensor" | "hub" | "a1" | "a2";
type Kind = "data" | "control" | "setup";

interface Step {
  from: Spot;
  to: Spot | Spot[];
  label: string;
  kind: Kind;
  note: string;
  /** Push–pull: what is waiting in the queue after this step */
  queue?: string[];
  /** Exclusive pair: app 1's connection is open after this step */
  opens?: boolean;
}

const PATTERNS: { id: Pattern; label: string }[] = [
  { id: "rr", label: "Request–response" },
  { id: "ps", label: "Publish–subscribe" },
  { id: "pp", label: "Push–pull" },
  { id: "ep", label: "Exclusive pair" },
];

const HUB_NAME: Record<Pattern, string> = { rr: "Server", ps: "Broker", pp: "Queue", ep: "Server" };
const CONSUMER: Record<Pattern, string> = { rr: "App", ps: "App", pp: "Worker", ep: "App" };

const SCRIPTS: Record<Pattern, Step[]> = {
  rr: [
    { from: "sensor", to: "hub", label: "POST 28.5", kind: "data", note: "The sensor sends its reading to the server." },
    { from: "a1", to: "hub", label: "GET", kind: "control", note: "App 1 asks for the latest reading." },
    { from: "hub", to: "a1", label: "28.5", kind: "data", note: "The server answers. App 1 now shows 28.5." },
    { from: "a2", to: "hub", label: "GET", kind: "control", note: "App 2 must ask separately." },
    { from: "hub", to: "a2", label: "28.5", kind: "data", note: "The server answers App 2 the same way." },
    { from: "sensor", to: "hub", label: "POST 29.0", kind: "data", note: "The value changes. The apps do not know yet." },
    { from: "sensor", to: "hub", label: "POST 29.5", kind: "data", note: "It changes again before anyone asks, so 29.0 will never be seen." },
    { from: "a1", to: "hub", label: "GET", kind: "control", note: "App 1 polls again." },
    { from: "hub", to: "a1", label: "29.5", kind: "data", note: "App 1 gets 29.5. It missed 29.0, and it learned of the change late." },
  ],
  ps: [
    { from: "a1", to: "hub", label: "SUBSCRIBE", kind: "setup", note: "App 1 tells the broker it wants the topic home/temp." },
    { from: "a2", to: "hub", label: "SUBSCRIBE", kind: "setup", note: "App 2 subscribes to the same topic." },
    { from: "sensor", to: "hub", label: "PUBLISH 29.0", kind: "data", note: "The sensor publishes a change. It does not know who is listening." },
    { from: "hub", to: ["a1", "a2"], label: "29.0", kind: "data", note: "The broker sends one copy to each subscriber, straight away." },
    { from: "sensor", to: "hub", label: "PUBLISH 29.5", kind: "data", note: "Another change is published." },
    { from: "hub", to: ["a1", "a2"], label: "29.5", kind: "data", note: "Both apps get every change at once. Nobody had to ask." },
  ],
  pp: [
    { from: "sensor", to: "hub", label: "push A", kind: "data", note: "The sensor pushes reading A into the queue and carries on.", queue: ["A"] },
    { from: "sensor", to: "hub", label: "push B", kind: "data", note: "It pushes B without waiting for anyone.", queue: ["A", "B"] },
    { from: "sensor", to: "hub", label: "push C", kind: "data", note: "And C. The readings wait in the queue.", queue: ["A", "B", "C"] },
    { from: "a1", to: "hub", label: "pull", kind: "control", note: "Worker 1 is free, so it asks for work.", queue: ["A", "B", "C"] },
    { from: "hub", to: "a1", label: "A", kind: "data", note: "Reading A goes to worker 1 only.", queue: ["B", "C"] },
    { from: "a2", to: "hub", label: "pull", kind: "control", note: "Worker 2 asks for work too.", queue: ["B", "C"] },
    { from: "hub", to: "a2", label: "B", kind: "data", note: "Reading B goes to worker 2. The work is shared.", queue: ["C"] },
    { from: "a1", to: "hub", label: "pull", kind: "control", note: "Worker 1 has finished A and pulls again.", queue: ["C"] },
    { from: "hub", to: "a1", label: "C", kind: "data", note: "Reading C goes to worker 1. Each reading reached exactly one worker.", queue: [] },
  ],
  ep: [
    { from: "a1", to: "hub", label: "open", kind: "setup", note: "App 1 opens a WebSocket connection to the server, once." },
    { from: "hub", to: "a1", label: "open", kind: "setup", note: "The connection stays open. The sensor and App 2 are already connected.", opens: true },
    { from: "sensor", to: "hub", label: "29.0", kind: "data", note: "The sensor sends a change over its open connection." },
    { from: "hub", to: ["a1", "a2"], label: "29.0", kind: "data", note: "The server pushes it down each open connection at once." },
    { from: "a1", to: "hub", label: "fan ON", kind: "control", note: "The app can send at any moment too: here it switches on the fan." },
    { from: "hub", to: "sensor", label: "fan ON", kind: "control", note: "The command reaches the device instantly, in the other direction." },
    { from: "sensor", to: "hub", label: "28.5", kind: "data", note: "The room cools and the new reading comes back." },
    { from: "hub", to: ["a1", "a2"], label: "28.5", kind: "data", note: "Both apps see it immediately. The server keeps every connection open." },
  ],
};

const FACTS: Record<Pattern, { label: string; value: string }[]> = {
  rr: [
    { label: "Who starts", value: "The app, every time" },
    { label: "Copies of a reading", value: "One per request" },
    { label: "Server remembers", value: "Nothing between requests" },
    { label: "Protocols", value: "HTTP REST, CoAP" },
  ],
  ps: [
    { label: "Who starts", value: "The publisher" },
    { label: "Copies of a reading", value: "One per subscriber" },
    { label: "Broker remembers", value: "Subscriptions and sessions" },
    { label: "Protocols", value: "MQTT" },
  ],
  pp: [
    { label: "Who starts", value: "Producer pushes, worker pulls" },
    { label: "Copies of a reading", value: "One in total" },
    { label: "Queue remembers", value: "Readings not yet taken" },
    { label: "Protocols", value: "AMQP work queues, ZeroMQ" },
  ],
  ep: [
    { label: "Who starts", value: "Either side, any time" },
    { label: "Copies of a reading", value: "One per open connection" },
    { label: "Server remembers", value: "Every open connection" },
    { label: "Protocols", value: "WebSocket" },
  ],
};

/** Position of each participant, % of the stage */
const POS: Record<Spot, { x: number; y: number }> = {
  sensor: { x: 12, y: 50 },
  hub: { x: 50, y: 50 },
  a1: { x: 88, y: 24 },
  a2: { x: 88, y: 76 },
};

const KIND_CLASS: Record<Kind, string> = {
  data: "border-brand bg-brand-soft",
  control: "border-u2 bg-u2-soft",
  setup: "border-line-strong bg-surface-2",
};

const STEP_MS = 1700;

export default function CommunicationPatternsVisual() {
  const [pattern, setPattern] = useState<Pattern>("rr");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const reduced = useReducedMotion() ?? false;
  const script = SCRIPTS[pattern];
  const current = script[step];

  useEffect(() => {
    if (!playing || reduced) return;
    const id = setInterval(() => setStep((s) => (s + 1) % script.length), STEP_MS);
    return () => clearInterval(id);
  }, [playing, reduced, script.length]);

  const choose = (p: Pattern) => {
    setPattern(p);
    setStep(0);
  };

  const name = (s: Spot) =>
    s === "sensor" ? (pattern === "ep" ? "Sensor + fan" : "Sensor") : s === "hub" ? HUB_NAME[pattern] : `${CONSUMER[pattern]} ${s === "a1" ? 1 : 2}`;
  const icon: Record<Spot, LucideIcon> = { sensor: Thermometer, hub: Server, a1: Smartphone, a2: Smartphone };
  const queue = pattern === "pp" ? (current.queue ?? []) : [];
  const a1Open = pattern !== "ep" || script.slice(0, step + 1).some((s) => s.opens);

  return (
    <div className="grid grid-cols-1 gap-6">
      <p className="max-w-[70ch] text-ink-2">
        The same job four ways: a temperature sensor and two apps that want its readings. Choose a pattern and watch who starts each
        message, where it goes and how many copies are made.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <Segmented<Pattern> label="Pattern" value={pattern} onChange={choose} options={PATTERNS.map((p) => ({ value: p.id, label: p.label }))} />
        {!reduced && (
          <Button
            size="sm"
            onClick={() => setPlaying((v) => !v)}
            icon={playing ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
          >
            {playing ? "Pause" : "Play"}
          </Button>
        )}
      </div>

      {!reduced ? (
        <figure className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-surface p-3 sm:p-4">
          <div className="relative h-64" role="img" aria-label={`${PATTERNS.find((p) => p.id === pattern)!.label}: step ${step + 1} of ${script.length}. ${current.note}`}>
            <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              {(["sensor", "a1", "a2"] as Spot[]).map((s) => {
                const open = pattern === "ep" && (s !== "a1" || a1Open);
                return (
                  <line
                    key={s}
                    x1={POS[s].x}
                    y1={POS[s].y}
                    x2={POS.hub.x}
                    y2={POS.hub.y}
                    stroke={open ? "var(--brand)" : "var(--line-strong)"}
                    strokeWidth={open ? 4 : 1.5}
                    opacity={open ? 0.45 : 1}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>

            {(Object.keys(POS) as Spot[]).map((s) => {
              const Icon = icon[s];
              const active = current.from === s || (Array.isArray(current.to) ? current.to.includes(s) : current.to === s);
              return (
                <div
                  key={s}
                  className="absolute flex w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center"
                  style={{ left: `${POS[s].x}%`, top: `${POS[s].y}%` }}
                  aria-hidden
                >
                  <span
                    className={cn(
                      "flex size-12 items-center justify-center rounded-xl border-2 bg-surface transition-colors",
                      active ? "border-brand" : "border-line-strong",
                    )}
                  >
                    <Icon size={22} className={active ? "text-brand" : "text-ink-2"} />
                  </span>
                  <span className="mt-1 rounded bg-surface px-1 text-xs font-semibold leading-tight">{name(s)}</span>
                  {s === "hub" && pattern === "pp" && (
                    <span className="mt-1 flex h-6 gap-1">
                      {queue.map((q) => (
                        <span key={q} className="flex size-6 items-center justify-center rounded border border-brand bg-brand-soft font-mono text-xs">
                          {q}
                        </span>
                      ))}
                      {queue.length === 0 && <span className="text-xs text-ink-3">empty</span>}
                    </span>
                  )}
                </div>
              );
            })}

            {(Array.isArray(current.to) ? current.to : [current.to]).map((to) => (
              <motion.span
                key={`${pattern}-${step}-${to}`}
                className={cn(
                  "absolute z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border px-1.5 font-mono text-xs leading-5 text-ink",
                  KIND_CLASS[current.kind],
                )}
                initial={{ left: `${POS[current.from].x}%`, top: `${POS[current.from].y}%`, opacity: 0 }}
                animate={{ left: `${POS[to].x}%`, top: `${POS[to].y}%`, opacity: [0, 1, 1, 0.9] }}
                transition={{ duration: STEP_MS / 1000 - 0.4, ease: "easeInOut" }}
                aria-hidden
              >
                {current.label}
              </motion.span>
            ))}
          </div>
          <figcaption className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-sm tabular-nums text-ink-3">
              Step {step + 1} / {script.length}
            </span>
            <span className="text-ink-2" aria-live="polite">
              {current.note}
            </span>
          </figcaption>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-3" aria-hidden>
            {(["data", "control", "setup"] as Kind[]).map((k) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className={cn("h-3 w-5 rounded border", KIND_CLASS[k])} />
                {k === "data" ? "Reading" : k === "control" ? "Request or command" : "Setup"}
              </span>
            ))}
            {pattern === "ep" && (
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-5 rounded bg-brand opacity-45" /> Open connection
              </span>
            )}
          </div>
        </figure>
      ) : (
        <ol className="grid list-decimal gap-1.5 rounded-lg border border-line bg-surface p-4 pl-9 text-ink-2 marker:text-ink-3">
          {script.map((s, i) => (
            <li key={i}>
              <span className="font-semibold text-ink">
                {name(s.from)} → {(Array.isArray(s.to) ? s.to : [s.to]).map(name).join(" and ")}:
              </span>{" "}
              <span className="font-mono">{s.label}</span>. {s.note}
            </li>
          ))}
        </ol>
      )}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
        {FACTS[pattern].map((f) => (
          <div key={f.label} className="bg-surface px-3 py-2.5">
            <dt className="text-sm text-ink-3">{f.label}</dt>
            <dd className="mt-0.5 font-semibold">{f.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="patterns-notice" className="max-w-[70ch]">
        <h2 id="patterns-notice" className="text-h3 font-bold">
          What to notice
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2 marker:text-ink-3">
          <li>In request–response the apps must keep asking, so they learn of changes late and can miss some.</li>
          <li>In publish–subscribe the broker makes one copy per subscriber, and nobody has to ask.</li>
          <li>In push–pull each reading goes to one worker, and the queue holds readings until a worker is free.</li>
          <li>In exclusive pair the connections stay open, so messages flow instantly in both directions.</li>
        </ul>
      </section>
    </div>
  );
}
