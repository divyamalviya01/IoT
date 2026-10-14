import { motion } from "motion/react";
import { Check, CircleAlert, Lightbulb, Play, RotateCcw, Square, Wrench, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { Button } from "~/components/ui/Button";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import {
  PARTS,
  SCENARIOS,
  SLOTS,
  check,
  describePath,
  getScenario,
  readingAt,
  ruleFires,
  type CheckResult,
  type Placement,
  type SlotId,
} from "./engine";

const lab = getLab("l01-build-iot-system")!;

const steps = [
  "Choose a scenario and read what the system must do.",
  "Select a part in the tray, then select the slot where it belongs. You can also drag parts onto slots.",
  "Fill all six slots, then press Check my system. Read the hint and fix any slot marked wrong.",
  "When the system works, press Run system to watch data travel up and the command come back.",
  "Press Record observation, then try the other scenarios.",
];

/** Order the packet visits slots: data goes up to the app, the command comes back to the actuator. */
const HOPS: { slot: SlotId; kind: "data" | "command" }[] = [
  { slot: "sense", kind: "data" },
  { slot: "process", kind: "data" },
  { slot: "connect", kind: "data" },
  { slot: "cloud", kind: "data" },
  { slot: "app", kind: "data" },
  { slot: "cloud", kind: "command" },
  { slot: "connect", kind: "command" },
  { slot: "process", kind: "command" },
  { slot: "act", kind: "command" },
];
const HOP_MS = 650;

function summarise(rows: ObservationRow[]): string {
  if (rows.length === 0) return "";
  const working = rows.filter((r) => r.result === "Works");
  const titles = [...new Set(working.map((r) => String(r.scenario)))];
  const mistakes = rows.reduce((s, r) => s + Number(r.mistakes || 0), 0);
  const built = titles.length
    ? `I built working systems for ${titles.join(", ")}.`
    : "I attempted to build an IoT system.";
  return `${built} Every working system needed six parts in order: a sensor, a microcontroller, a network device, a cloud service, an app and an actuator. The checker caught ${mistakes} mistake${mistakes === 1 ? "" : "s"}; a sensor or actuator that does not suit the task stops the system even when every slot is filled.`;
}

export default function BuildIotSystemLab() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const scenario = getScenario(scenarioId);
  const [placement, setPlacement] = useState<Placement>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);
  const [actuatorOn, setActuatorOn] = useState(false);
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");

  const valid = result?.valid === true;
  const filled = SLOTS.filter((s) => placement[s.id]).length;

  // The running system: one hop every HOP_MS.
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setTick((t) => t + 1), HOP_MS);
    return () => clearTimeout(timer);
  }, [running, tick]);

  const hop = HOPS[tick % HOPS.length];
  const cycle = Math.floor(tick / HOPS.length);
  const reading = readingAt(scenario, cycle * 4);

  // The command reaches the actuator on the last hop of each cycle.
  useEffect(() => {
    if (running && tick % HOPS.length === HOPS.length - 1) {
      setActuatorOn(ruleFires(scenario, reading));
    }
  }, [running, tick, scenario, reading]);

  const resetRun = () => {
    setRunning(false);
    setTick(0);
    setActuatorOn(false);
  };

  const changed = (next: Placement) => {
    setPlacement(next);
    setResult(null);
    resetRun();
  };

  const place = (slot: SlotId, partId: string) => {
    const next: Placement = {};
    for (const s of SLOTS) if (placement[s.id] !== partId) next[s.id] = placement[s.id];
    next[slot] = partId;
    setSelected(null);
    changed(next);
  };

  const onSlot = (slot: SlotId) => {
    if (selected) place(slot, selected);
    else if (placement[slot]) changed({ ...placement, [slot]: undefined });
  };

  const runCheck = () => {
    const r = check(scenario, placement);
    setResult(r);
    setAttempts((a) => a + 1);
    if (!r.valid) setMistakes((m) => m + 1);
  };

  const chooseScenario = (id: string) => {
    setScenarioId(id);
    setPlacement({});
    setSelected(null);
    setResult(null);
    setAttempts(0);
    setMistakes(0);
    resetRun();
  };

  const record = () => {
    const row: ObservationRow = {
      scenario: scenario.title,
      attempts,
      mistakes,
      result: valid ? "Works" : "Not yet working",
      path: describePath(placement),
    };
    addRow(row);
    const auto = summarise([...rows, row]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  const slotOfPart = (id: string) => SLOTS.find((s) => placement[s.id] === id);

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordDisabled={attempts === 0}
      recordHint={
        attempts === 0
          ? "Check your system at least once first."
          : "Adds this scenario's result to the observation table below."
      }
      controls={
        <>
          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-[0.95rem] font-semibold">Scenario</legend>
            {SCENARIOS.map((s) => (
              <label
                key={s.id}
                className={cn(
                  "flex cursor-pointer gap-2.5 rounded-lg border px-3 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
                  s.id === scenarioId ? "border-brand bg-brand-soft" : "border-line hover:border-line-strong",
                )}
              >
                <input
                  type="radio"
                  name="l01-scenario"
                  className="sr-only"
                  checked={s.id === scenarioId}
                  onChange={() => chooseScenario(s.id)}
                />
                <span>
                  <span className="block font-semibold">{s.title}</span>
                  <span className="block text-sm text-ink-2">{s.story}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="grid gap-2">
            <p className="text-[0.95rem] font-semibold">Parts tray</p>
            <p className="text-sm text-ink-3">
              {selected
                ? `${PARTS[selected].name} selected. Now select a slot.`
                : "Select a part, then a slot. Some parts do not belong in this system."}
            </p>
            <ul className="grid grid-cols-2 gap-1.5">
              {scenario.tray.map((id) => {
                const part = PARTS[id];
                const inSlot = slotOfPart(id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", id)}
                      aria-pressed={selected === id}
                      onClick={() => setSelected(selected === id ? null : id)}
                      className={cn(
                        "h-full w-full rounded-lg border px-2.5 py-2 text-left transition-colors",
                        selected === id
                          ? "border-brand bg-brand-soft"
                          : inSlot
                            ? "border-line bg-surface-2 text-ink-3"
                            : "border-line-strong bg-surface hover:border-brand",
                      )}
                    >
                      <span className="block text-sm font-semibold leading-snug">{part.name}</span>
                      <span className="block text-xs text-ink-3">
                        {inSlot ? `In the ${inSlot.label} slot` : part.detail}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      }
      stage={
        <div className="grid gap-4 p-4">
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-6" aria-label="System slots, in data order">
            {SLOTS.map((slot, i) => {
              const partId = placement[slot.id];
              const state = result ? result.slots[slot.id] : null;
              const isHop = running && hop.slot === slot.id;
              return (
                <li key={slot.id}>
                  <button
                    type="button"
                    onClick={() => onSlot(slot.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData("text/plain");
                      if (PARTS[id]) place(slot.id, id);
                    }}
                    aria-label={`${i + 1}. ${slot.label} slot: ${partId ? PARTS[partId].name : "empty"}${state === "wrong" ? ", wrong" : state === "ok" ? ", correct" : ""}`}
                    className={cn(
                      "relative flex h-full min-h-28 w-full flex-col rounded-lg border-2 p-2.5 text-left transition-colors",
                      !partId && "border-dashed",
                      state === "ok" && "border-ok bg-ok-soft",
                      state === "wrong" && "border-bad bg-bad-soft",
                      state === "empty" && "border-bad",
                      !state && (partId ? "border-line-strong bg-surface" : "border-line-strong bg-surface-2"),
                      selected && "hover:border-brand",
                    )}
                  >
                    <span className="flex items-center justify-between gap-1">
                      <span className="text-sm font-bold">
                        {i + 1}. {slot.label}
                      </span>
                      {state === "ok" && <Check size={16} className="text-ok" aria-hidden />}
                      {(state === "wrong" || state === "empty") && <X size={16} className="text-bad" aria-hidden />}
                    </span>
                    <span className="text-xs text-ink-3">{slot.job}</span>
                    <span className="mt-auto pt-2 text-sm font-semibold leading-snug">
                      {partId ? PARTS[partId].name : <span className="font-normal text-ink-3">Empty</span>}
                    </span>
                    {slot.id === "act" && running && (
                      <span className={cn("mt-1 text-xs font-semibold", actuatorOn ? "text-ok" : "text-ink-3")}>
                        {actuatorOn ? scenario.actuatorOn : scenario.actuatorOff}
                      </span>
                    )}
                    {isHop && (
                      <motion.span
                        layoutId="l01-packet"
                        transition={{ type: "spring", stiffness: 260, damping: 26 }}
                        className={cn(
                          "absolute right-2 bottom-2 size-3.5 rounded-full shadow-[0_0_0_3px_var(--surface)]",
                          hop.kind === "data" ? "bg-brand" : "bg-copper",
                        )}
                        aria-hidden
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          <div aria-live="polite" className="min-h-14">
            {!result && (
              <p className="flex gap-2 text-ink-2">
                <Wrench size={18} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
                {filled < 6
                  ? `Fill all six slots (${filled} of 6 filled), then check your system.`
                  : "All slots are filled. Press Check my system."}
              </p>
            )}
            {result && !result.valid && result.problem && (
              <p className="flex gap-2 rounded-lg border-l-4 border-bad bg-surface-2 p-3 text-ink">
                <CircleAlert size={18} className="mt-0.5 shrink-0 text-bad" aria-hidden />
                <span>
                  <span className="font-semibold">Not working yet. </span>
                  {result.problem.message}
                </span>
              </p>
            )}
            {valid && (
              <div className="grid gap-2">
                <p className="flex gap-2 rounded-lg border-l-4 border-ok bg-surface-2 p-3 text-ink">
                  <Check size={18} className="mt-0.5 shrink-0 text-ok" aria-hidden />
                  <span>
                    <span className="font-semibold">Your system works. </span>
                    Press Run system to see data travel up and the command come back.
                  </span>
                </p>
                {result.tips.map((tip) => (
                  <p key={tip} className="flex gap-2 rounded-lg border-l-4 border-warn bg-surface-2 p-3 text-ink-2">
                    <Lightbulb size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden />
                    <span>
                      <span className="font-semibold text-ink">Tip: </span>
                      {tip}
                    </span>
                  </p>
                ))}
              </div>
            )}
          </div>

          {valid && running && (
            <div className="grid gap-1 rounded-lg border border-line bg-surface-2 p-3 sm:grid-cols-3">
              <p>
                <span className="block text-sm text-ink-3">{scenario.reading.label}</span>
                <span className="font-mono text-lg tabular-nums">
                  {reading} {scenario.reading.unit}
                </span>
              </p>
              <p className="sm:col-span-2">
                <span className="block text-sm text-ink-3">Rule in the cloud</span>
                <span>{scenario.rule}</span>
              </p>
              <p className="text-sm text-ink-2 sm:col-span-3">
                {hop.kind === "data"
                  ? `The reading is travelling to the app: now at ${SLOTS.find((s) => s.id === hop.slot)!.label}.`
                  : `The command is travelling back to the actuator: now at ${SLOTS.find((s) => s.id === hop.slot)!.label}.`}
              </p>
            </div>
          )}
        </div>
      }
      toolbar={
        <div className="flex flex-wrap gap-2" data-print-hide>
          <Button variant="primary" onClick={runCheck} disabled={filled === 0} icon={<Check size={16} aria-hidden />}>
            Check my system
          </Button>
          <Button
            onClick={() => (running ? setRunning(false) : setRunning(true))}
            disabled={!valid}
            icon={running ? <Square size={16} aria-hidden /> : <Play size={16} aria-hidden />}
          >
            {running ? "Stop system" : "Run system"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => changed({})}
            disabled={filled === 0}
            icon={<RotateCcw size={16} aria-hidden />}
          >
            Clear slots
          </Button>
        </div>
      }
      readouts={
        <Readouts
          items={[
            { label: "Slots filled", value: `${filled} / 6` },
            { label: "Checks", value: attempts },
            { label: "Mistakes", value: mistakes, tone: mistakes ? "warn" : "default" },
            {
              label: "Result",
              value: valid ? "Works" : result ? "Not yet" : "—",
              tone: valid ? "ok" : result ? "bad" : "default",
            },
          ]}
        />
      }
    />
  );
}
