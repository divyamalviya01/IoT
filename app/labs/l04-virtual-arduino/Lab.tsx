import { CircleAlert, Upload } from "lucide-react";
import { useCallback, useId, useRef, useState, type KeyboardEvent } from "react";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { SimControls } from "~/components/sim/SimControls";
import { useSimClock } from "~/components/sim/useSimClock";
import { Button } from "~/components/ui/Button";
import { Slider } from "~/components/ui/Slider";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import {
  ANALOG_PINS,
  DEFAULT_PARAMS,
  DIGITAL_PINS,
  SKETCH_TITLES,
  SKETCH_USES,
  SketchRunner,
  arduinoMap,
  isPwmPin,
  sketchSource,
  validateParams,
  type AnalogPin,
  type SketchId,
  type SketchParams,
} from "./engine";

const lab = getLab("l04-virtual-arduino")!;

const steps = [
  "Choose a sketch. Its code appears next to the board; highlighted values are the ones you can change.",
  "Change a value in Setup, then press Upload to board, just as you would in the Arduino IDE.",
  "Use the button and the knob below the board, and watch the LED and the serial monitor.",
  "Press Record observation after each experiment.",
];

const SKETCH_INFO: Record<SketchId, string> = {
  blink: "Switch an LED on and off with digitalWrite() and delay().",
  button: "Read a push button with digitalRead() and copy it to an LED.",
  dimmer: "Read a knob with analogRead() and set LED brightness with analogWrite().",
  alarm: "Switch an alarm LED on when a reading passes a limit.",
};

const PIN_X = (pin: number) => 66 + (13 - pin) * 19; // header runs 13 … 2, left to right
const ANALOG_X = (pin: AnalogPin) => 196 + ANALOG_PINS.indexOf(pin) * 19;

function settingsText(id: SketchId, p: SketchParams): string {
  switch (id) {
    case "blink":
      return `LED pin ${p.ledPin}, delay ${p.delayMs} ms`;
    case "button":
      return `Button pin ${p.buttonPin}, LED pin ${p.ledPin}`;
    case "dimmer":
      return `Knob ${p.potPin}, LED pin ${p.ledPin}${isPwmPin(p.ledPin) ? " (PWM)" : " (no PWM)"}`;
    case "alarm":
      return `Sensor ${p.potPin}, limit ${p.threshold}, alarm pin ${p.ledPin}`;
  }
}

function summarise(rows: ObservationRow[]): string {
  if (rows.length === 0) return "";
  return rows
    .map((r) => `${r.sketch} (${r.settings}): ${String(r.measured).replace(/\.$/, "")}.`)
    .join(" ");
}

export default function VirtualArduinoLab() {
  const [sketch, setSketch] = useState<SketchId>("blink");
  const [draft, setDraft] = useState<SketchParams>(DEFAULT_PARAMS.blink);
  const [uploaded, setUploaded] = useState<SketchParams>(DEFAULT_PARAMS.blink);
  const runner = useRef(new SketchRunner("blink", DEFAULT_PARAMS.blink));
  const [pressed, setPressed] = useState(false);
  const [knobVolts, setKnobVolts] = useState(2.5);
  const inputs = useRef({ pressed: false, knobVolts: 2.5 });
  inputs.current = { pressed, knobVolts };
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");
  const serialId = useId();

  const onTick = useCallback((dt: number) => {
    const r = runner.current;
    r.uno.inputs.set(r.params.buttonPin, inputs.current.pressed ? 1 : 0);
    r.uno.analogVolts.set(r.params.potPin, inputs.current.knobVolts);
    r.advance(dt);
  }, []);

  const clock = useSimClock({ onTick, stepMs: 50 });

  const upload = (id: SketchId, params: SketchParams) => {
    runner.current = new SketchRunner(id, params);
    setUploaded(params);
    clock.reset();
    clock.play();
  };

  const chooseSketch = (id: SketchId) => {
    setSketch(id);
    setDraft(DEFAULT_PARAMS[id]);
    upload(id, DEFAULT_PARAMS[id]);
  };

  const r = runner.current;
  const p = uploaded;
  const uses = SKETCH_USES[sketch];
  const issues = validateParams(sketch, draft);
  const pending = JSON.stringify(draft) !== JSON.stringify(uploaded);
  const led = r.uno.brightness(p.ledPin);
  const reading = r.lastReading;
  const period = r.blinkPeriod();
  const duty = r.uno.pwm.get(p.ledPin);

  const measurement = (): { input: string; measured: string } => {
    switch (sketch) {
      case "blink":
        return {
          input: "None",
          measured: period ? `Blink period ${period} ms (${period / 2} ms on, ${period / 2} ms off)` : "LED blinking",
        };
      case "button":
        return {
          input: pressed ? "Button held" : "Button released",
          measured: `LED ${led > 0 ? "on" : "off"}`,
        };
      case "dimmer":
        return {
          input: `Knob at ${knobVolts.toFixed(1)} V`,
          measured:
            duty !== undefined
              ? `analogRead ${reading ?? "—"}, PWM duty ${duty} of 255 (${Math.round((duty / 255) * 100)}%)`
              : `analogRead ${reading ?? "—"}, LED fully ${led > 0 ? "on" : "off"} (pin has no PWM)`,
        };
      case "alarm":
        return {
          input: `Knob at ${knobVolts.toFixed(1)} V`,
          measured: `analogRead ${reading ?? "—"}, alarm ${led > 0 ? "on" : "off"} (limit ${p.threshold})`,
        };
    }
  };

  const record = () => {
    const m = measurement();
    const row: ObservationRow = {
      sketch: SKETCH_TITLES[sketch],
      settings: settingsText(sketch, p),
      input: m.input,
      measured: m.measured,
    };
    addRow(row);
    const auto = summarise([...rows, row]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  const holdKeys = (e: KeyboardEvent<HTMLButtonElement>, down: boolean) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setPressed(down);
    }
  };

  const pinSelect = (key: "ledPin" | "buttonPin", label: string) => (
    <label className="grid gap-1.5">
      <span className="text-[0.95rem] font-semibold">{label}</span>
      <select
        value={draft[key]}
        onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })}
        className="h-10 rounded-lg border border-line-strong bg-surface px-3"
      >
        {DIGITAL_PINS.map((pin) => (
          <option key={pin} value={pin}>
            Pin {pin}
            {isPwmPin(pin) ? " (~PWM)" : ""}
            {pin === 13 ? " (built-in LED)" : ""}
          </option>
        ))}
      </select>
    </label>
  );

  const serialLines = r.uno.serial.slice(-12);
  const source = sketchSource(sketch, draft).split(/(⟦[^⟧]*⟧)/g);

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordHint="Adds the current sketch, settings and result to the observation table."
      controls={
        <>
          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-[0.95rem] font-semibold">Sketch</legend>
            {(Object.keys(SKETCH_TITLES) as SketchId[]).map((id) => (
              <label
                key={id}
                className={cn(
                  "flex cursor-pointer gap-2.5 rounded-lg border px-3 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
                  id === sketch ? "border-brand bg-brand-soft" : "border-line hover:border-line-strong",
                )}
              >
                <input
                  type="radio"
                  name="l04-sketch"
                  className="sr-only"
                  checked={id === sketch}
                  onChange={() => chooseSketch(id)}
                />
                <span>
                  <span className="block font-semibold">{SKETCH_TITLES[id]}</span>
                  <span className="block text-sm text-ink-2">{SKETCH_INFO[id]}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {uses.editable.includes("buttonPin") && pinSelect("buttonPin", "Button pin")}
          {uses.editable.includes("ledPin") && pinSelect("ledPin", sketch === "alarm" ? "Alarm LED pin" : "LED pin")}
          {uses.editable.includes("delayMs") && (
            <Slider
              label="Delay"
              value={draft.delayMs}
              min={100}
              max={2000}
              step={50}
              unit="ms"
              onChange={(delayMs) => setDraft({ ...draft, delayMs })}
            />
          )}
          {uses.editable.includes("potPin") && (
            <label className="grid gap-1.5">
              <span className="text-[0.95rem] font-semibold">{sketch === "alarm" ? "Sensor pin" : "Knob pin"}</span>
              <select
                value={draft.potPin}
                onChange={(e) => setDraft({ ...draft, potPin: e.target.value as AnalogPin })}
                className="h-10 rounded-lg border border-line-strong bg-surface px-3"
              >
                {ANALOG_PINS.map((pin) => (
                  <option key={pin} value={pin}>
                    {pin}
                  </option>
                ))}
              </select>
            </label>
          )}
          {uses.editable.includes("threshold") && (
            <Slider
              label="Alarm limit"
              value={draft.threshold}
              min={0}
              max={1023}
              step={10}
              onChange={(threshold) => setDraft({ ...draft, threshold })}
              hint="The alarm turns on when analogRead() is above this."
            />
          )}

          {issues.map((issue) => (
            <p key={issue} className="flex gap-2 text-sm text-warn">
              <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
              {issue}
            </p>
          ))}

          <Button
            variant={pending ? "primary" : "secondary"}
            onClick={() => upload(sketch, draft)}
            icon={<Upload size={16} aria-hidden />}
          >
            Upload to board
          </Button>
          <p className="-mt-3 text-sm text-ink-3" aria-live="polite">
            {pending ? "You have changes that are not on the board yet." : "The board is running this code."}
          </p>
        </>
      }
      stage={
        <div className="grid gap-4 p-4 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid content-start gap-3">
            <svg
              viewBox="0 0 520 300"
              className="w-full"
              role="img"
              aria-label={`Arduino Uno running ${SKETCH_TITLES[sketch]}. LED on pin ${p.ledPin} is ${led > 0 ? (led < 1 ? `at ${Math.round(led * 100)}% brightness` : "on") : "off"}.`}
            >
              {/* Board */}
              <rect x="20" y="50" width="300" height="200" rx="12" style={{ fill: "color-mix(in oklab, var(--u2) 45%, var(--brand))" }} />
              <rect x="20" y="150" width="34" height="40" rx="3" fill="var(--line-strong)" />
              <rect x="20" y="70" width="44" height="34" rx="3" fill="var(--ink-3)" />
              <rect x="120" y="135" width="150" height="34" rx="4" fill="var(--ink-2)" />
              <text x="195" y="157" textAnchor="middle" fontSize="12" fill="var(--surface)" fontFamily="var(--font-mono)">
                ATmega328P
              </text>
              <text x="96" y="232" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--silk)">
                UNO
              </text>
              {/* Digital header 13 … 2 */}
              {DIGITAL_PINS.map((pin) => {
                const used = pin === p.ledPin || (uses.button && pin === p.buttonPin);
                return (
                  <g key={pin}>
                    <rect x={PIN_X(pin) - 6} y="56" width="12" height="12" rx="2" fill={used ? "var(--copper)" : "var(--ink-2)"} />
                    <text x={PIN_X(pin)} y="82" textAnchor="middle" fontSize="9" fill="var(--silk)" fontFamily="var(--font-mono)">
                      {isPwmPin(pin) ? `~${pin}` : pin}
                    </text>
                  </g>
                );
              })}
              {/* Analog header */}
              {ANALOG_PINS.map((pin) => (
                <g key={pin}>
                  <rect
                    x={ANALOG_X(pin) - 6}
                    y="232"
                    width="12"
                    height="12"
                    rx="2"
                    fill={uses.pot && pin === p.potPin ? "var(--copper)" : "var(--ink-2)"}
                  />
                  <text x={ANALOG_X(pin)} y="226" textAnchor="middle" fontSize="9" fill="var(--silk)" fontFamily="var(--font-mono)">
                    {pin}
                  </text>
                </g>
              ))}

              {/* Wires */}
              <path
                d={`M ${PIN_X(p.ledPin)} 56 V 28 H 420 V 70`}
                fill="none"
                stroke="var(--bad)"
                strokeWidth="2.5"
              />
              {uses.button && (
                <path
                  d={`M ${PIN_X(p.buttonPin)} 56 V 38 H 400 V 150`}
                  fill="none"
                  stroke="var(--u2)"
                  strokeWidth="2.5"
                />
              )}
              {uses.pot && (
                <path
                  d={`M ${ANALOG_X(p.potPin)} 244 V 272 H 420 V 250`}
                  fill="none"
                  stroke="var(--u3)"
                  strokeWidth="2.5"
                />
              )}

              {/* LED with glow */}
              <circle cx="420" cy="84" r={10 + led * 16} fill="var(--bad)" opacity={led * 0.35} />
              <circle cx="420" cy="84" r="11" fill="var(--bad)" opacity={0.25 + led * 0.75} />
              <text x="446" y="88" fontSize="12" fill="var(--ink-2)">
                LED
              </text>

              {/* Push button */}
              {uses.button && (
                <g>
                  <rect x="384" y="150" width="32" height="32" rx="5" fill="var(--ink-3)" />
                  <circle cx="400" cy="166" r={pressed ? 8 : 10} fill={pressed ? "var(--ink)" : "var(--surface-2)"} />
                  <text x="426" y="170" fontSize="12" fill="var(--ink-2)">
                    Button
                  </text>
                </g>
              )}

              {/* Potentiometer */}
              {uses.pot && (
                <g>
                  <circle cx="420" cy="232" r="16" fill="var(--ink-3)" />
                  <line
                    x1="420"
                    y1="232"
                    x2={420 + 12 * Math.cos(Math.PI * (0.75 + (knobVolts / 5) * 1.5))}
                    y2={232 + 12 * Math.sin(Math.PI * (0.75 + (knobVolts / 5) * 1.5))}
                    stroke="var(--surface)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <text x="444" y="236" fontSize="12" fill="var(--ink-2)">
                    Knob
                  </text>
                </g>
              )}
            </svg>

            <div className="flex flex-wrap items-end gap-4">
              {uses.button && (
                <button
                  type="button"
                  aria-pressed={pressed}
                  onPointerDown={() => setPressed(true)}
                  onPointerUp={() => setPressed(false)}
                  onPointerLeave={() => setPressed(false)}
                  onKeyDown={(e) => holdKeys(e, true)}
                  onKeyUp={(e) => holdKeys(e, false)}
                  className={cn(
                    "h-11 rounded-lg border-2 px-4 font-semibold select-none touch-none",
                    pressed ? "border-brand bg-brand-soft" : "border-line-strong bg-surface",
                  )}
                >
                  {pressed ? "Button held" : "Hold to press the button"}
                </button>
              )}
              {uses.pot && (
                <Slider
                  label="Turn the knob"
                  value={knobVolts}
                  min={0}
                  max={5}
                  step={0.1}
                  format={(v) => `${v.toFixed(1)} V`}
                  onChange={setKnobVolts}
                  className="min-w-56 flex-1"
                />
              )}
            </div>

            <section aria-labelledby={serialId} className="rounded-lg border border-line bg-surface-2">
              <h3 id={serialId} className="border-b border-line px-3 py-1.5 text-sm font-bold">
                Serial monitor (9600 baud)
              </h3>
              <div role="log" aria-live="off" className="h-36 overflow-y-auto px-3 py-2 font-mono text-sm">
                {sketch === "blink" || sketch === "button" ? (
                  <p className="font-sans text-ink-3">This sketch does not print anything.</p>
                ) : serialLines.length === 0 ? (
                  <p className="font-sans text-ink-3">Waiting for the board…</p>
                ) : (
                  serialLines.map((line, i) => (
                    <p key={`${line.t}-${i}`}>
                      <span className="text-ink-3">{(line.t / 1000).toFixed(1).padStart(5, " ")} s </span>
                      {line.text}
                    </p>
                  ))
                )}
              </div>
            </section>
          </div>

          <section aria-label="Sketch code" className="min-w-0">
            <pre className="overflow-x-auto rounded-lg border border-line bg-surface-2 p-4 text-[13px] leading-relaxed">
              <code>
                {source.map((part, i) =>
                  part.startsWith("⟦") ? (
                    <mark key={i} className="rounded bg-brand-soft px-0.5 font-bold text-brand">
                      {part.slice(1, -1)}
                    </mark>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
              </code>
            </pre>
            <p className="mt-2 text-sm text-ink-3">Highlighted values come from the Setup panel.</p>
          </section>
        </div>
      }
      toolbar={<SimControls clock={clock} playLabel="Run" showSpeed={false} />}
      readouts={
        <Readouts
          items={[
            {
              label: sketch === "alarm" ? "Alarm LED" : "LED",
              value: led === 0 ? "Off" : led === 1 ? "On" : `${Math.round(led * 100)}%`,
              tone: led > 0 ? "ok" : "default",
            },
            sketch === "blink"
              ? { label: "Blink period", value: period ?? "—", unit: period ? "ms" : undefined }
              : sketch === "button"
                ? { label: "Button pin reads", value: pressed ? "HIGH" : "LOW" }
                : { label: "analogRead()", value: reading ?? "—" },
            sketch === "dimmer"
              ? {
                  label: "PWM duty",
                  value: duty !== undefined ? `${duty} / 255` : "No PWM",
                  tone: duty === undefined ? "warn" : "default",
                }
              : sketch === "alarm"
                ? { label: "Limit", value: p.threshold }
                : { label: "LED pin", value: p.ledPin },
            sketch === "dimmer"
              ? { label: "map() result", value: reading !== null ? arduinoMap(reading, 0, 1023, 0, 255) : "—", hint: "map(value, 0, 1023, 0, 255)" }
              : sketch === "alarm"
                ? { label: "Above the limit?", value: reading === null ? "—" : reading > p.threshold ? "Yes" : "No" }
                : { label: "Board time", value: (r.uno.millis / 1000).toFixed(1), unit: "s" },
          ]}
        />
      }
    />
  );
}
