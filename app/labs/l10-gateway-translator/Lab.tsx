import { motion, useReducedMotion } from "motion/react";
import { Droplets, Funnel, Router, Server, Thermometer, Zap, type LucideIcon } from "lucide-react";
import { Fragment, memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { EventLog, type SimEvent } from "~/components/sim/EventLog";
import { SimControls } from "~/components/sim/SimControls";
import { formatSimTime, useSimClock } from "~/components/sim/useSimClock";
import { ChartCard, ChartTooltip, chartStyle, seriesColor } from "~/components/theory/ChartCard";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { Slider } from "~/components/ui/Slider";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import {
  DEFAULT_RULES,
  DEVICES,
  GatewaySim,
  convert,
  decodeFrame,
  encodeFrame,
  toHex,
  topicFor,
  type DeviceKind,
  type FrameEvent,
  type MqttOut,
  type Reading,
  type Rules,
  type Totals,
} from "./engine";

const lab = getLab("l10-gateway-translator")!;
const SEED = 11;
/** Simulated time a run needs before it can be recorded */
/** Every run lasts one simulated minute, so recorded runs compare fairly. */
const RUN_MS = 60_000;
/** Real seconds a chip takes to cross one link in the animation */
const TRAVEL_S = 0.7;
/** Flights older than this (real ms) have faded out and can be removed */
const FLIGHT_LIFE_MS = 2600;
const MAX_FLIGHTS = 60;
const MAX_EVENTS = 400;

const PROTOCOL: Record<DeviceKind, string> = { zigbee: "Zigbee", ble: "BLE", modbus: "Modbus RTU" };
const DEVICE_ICON: Record<DeviceKind, LucideIcon> = { zigbee: Thermometer, ble: Droplets, modbus: Zap };

/** Quantities each device reports, read from a sample frame so they always match the engine. */
const QUANTITIES: Record<string, string[]> = Object.fromEntries(
  DEVICES.map((d) => [d.id, decodeFrame(d.kind, encodeFrame(d.kind, {})).readings.map((r) => r.quantity)]),
);

const TEMPLATE_PRESETS = ["site/{location}/{quantity}", "factory/{device}/{quantity}"];

/** Chart colours follow the entity: bytes in and bytes out always keep their slots. */
const IN_COLOR = seriesColor(0);
const OUT_COLOR = seriesColor(1);

/** Chip styles, shared by the stage, its legend and the latest-frame panel. */
const FRAME_CHIP =
  "whitespace-nowrap rounded-md border border-u1 bg-u1-soft px-1.5 py-0.5 font-mono text-[11px] font-semibold leading-4 text-ink";
const MSG_CHIP =
  "whitespace-nowrap rounded-full border border-brand bg-brand-soft px-2 py-0.5 font-mono text-[11px] font-semibold leading-4 text-ink";
const BADGE =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn";
/** Centres an absolutely placed chip on its left/top point. */
const PLACED = "absolute -translate-x-1/2 -translate-y-1/2";

const steps = [
  "Keep all three devices on, the deadband at 0 % and the unit in Celsius. Press Start gateway and choose 4×. Each run stops after one simulated minute (about 15 s at 4×); then press Record observation.",
  "Read the latest frame below the stage: match each byte to its meaning, then compare its size with the MQTT messages it made.",
  "Set the deadband to 1 %, run again and record. Repeat with 5 % and 10 %. Watch the filtered badges: small wobbles are filtered, but jumps in power when an appliance switches on still get through.",
  "Change the topic template to factory/{device}/{quantity} and look at the new topics in the event log.",
  "Switch the temperature unit to Fahrenheit and compare the temperature payloads with the Celsius ones.",
  "Untick one device, run again and record. Then open the lab record to write your result.",
];

/* ------------------------------------------------------------------ */
/* Rules helpers                                                       */
/* ------------------------------------------------------------------ */

const PLACEHOLDER = /\{(location|device|quantity)\}/g;

/** Returns what is wrong with a topic template in simple words, or null if every topic it makes is valid. */
function templateProblem(template: string): string | null {
  if (template === "") return "The template is empty.";
  const stray = template.replace(PLACEHOLDER, "").match(/\{[^{}/]*\}/);
  if (stray) return `Unknown placeholder ${stray[0]}. Use {location}, {device} or {quantity}.`;
  if (/[{}]/.test(template.replace(PLACEHOLDER, ""))) {
    return "Each placeholder needs both braces, like {location}.";
  }
  const topics = DEVICES.flatMap((d) => QUANTITIES[d.id].map((q) => topicFor(template, d, q)));
  for (const topic of topics) {
    if (/[+#]/.test(topic)) return "A topic cannot contain + or #. Those are wildcards, used only when subscribing.";
    if (topic.split("/").includes("")) return "Every topic level needs a name: no //, and no / at the start or end.";
    if (topic.startsWith("$")) return "Topics that start with $ are kept for the broker's own use.";
  }
  return null;
}

const payloadOf = (m: MqttOut) => JSON.parse(m.payload) as { value: number; unit: string };

/** "28.5 °C" style label for a message chip. */
function valueLabel(m: MqttOut): string {
  const { value, unit } = payloadOf(m);
  if (unit === "%") return `${value}%`;
  return `${value} ${unit === "C" || unit === "F" ? `°${unit}` : unit}`;
}

/** First bytes of a frame, short enough for a moving chip. The full frame is shown below the stage. */
const shortHex = (frame: number[]) => `${toHex(frame.slice(0, 3))}…`;

interface Output {
  reading: Reading;
  /** null when the deadband dropped this reading */
  message: MqttOut | null;
}

/**
 * Matches each decoded reading to the MQTT message it produced. The gateway
 * keeps reading order and each reading of a device has its own unit, so
 * matching by unit is exact.
 */
function outputsOf(ev: FrameEvent, rules: Rules): Output[] {
  const { readings } = decodeFrame(ev.device.kind, ev.frame);
  let next = 0;
  return readings.map((reading) => {
    const message = ev.out[next];
    if (message && payloadOf(message).unit === convert(reading, rules).unit) {
      next++;
      return { reading, message };
    }
    return { reading, message: null };
  });
}

/* ------------------------------------------------------------------ */
/* Result summary                                                      */
/* ------------------------------------------------------------------ */

const perMinute = (r: ObservationRow, key: string) =>
  Math.round((Number(r[key]) / Math.max(1, Number(r.time))) * 60).toLocaleString("en-IN");

function joinList(items: string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function summarise(rows: ObservationRow[]): string {
  if (rows.length === 0) return "";
  const parts: string[] = [];

  // Compare deadbands only between runs with the same devices switched on.
  const mostDevices = Math.max(...rows.map((r) => Number(r.devices)));
  const full = rows.filter((r) => Number(r.devices) === mostDevices);
  const byDeadband = [...full].sort((a, b) => Number(a.deadband) - Number(b.deadband));
  const low = byDeadband[0];
  const high = byDeadband[byDeadband.length - 1];
  if (Number(high.deadband) > Number(low.deadband)) {
    parts.push(
      `When the deadband rose from ${low.deadband}% to ${high.deadband}%, MQTT messages out fell from about ${perMinute(low, "messagesOut")} to ${perMinute(high, "messagesOut")} a minute, and bytes out fell from about ${perMinute(low, "bytesOut")} to ${perMinute(high, "bytesOut")} a minute.`,
      `Frames in stayed at about ${perMinute(low, "frames")} a minute, so the saving came only from filtering at the gateway.`,
    );
  } else {
    parts.push(
      `With a deadband of ${low.deadband}%, the gateway turned ${low.frames} frames (${low.bytesIn} bytes) into ${low.messagesOut} MQTT messages (${low.bytesOut} bytes) in ${low.time} s.`,
    );
  }
  if (Number(low.bytesOut) > Number(low.bytesIn)) {
    parts.push(
      `At ${low.deadband}% the gateway sent more bytes than it received (${low.bytesOut} against ${low.bytesIn}), because each MQTT message carries a text topic and a JSON payload, while each device frame is only 7 to 9 bytes of binary.`,
    );
  }
  if (high !== low && Number(high.bytesOut) < Number(high.bytesIn)) {
    parts.push(`At ${high.deadband}% it sent fewer bytes than it received (${high.bytesOut} against ${high.bytesIn}).`);
  }

  const templates = [...new Set(rows.map((r) => String(r.template)))];
  if (templates.length > 1) {
    const sizes = templates.map((t) => {
      const used = rows.filter((r) => r.template === t);
      const messages = used.reduce((s, r) => s + Number(r.messagesOut), 0);
      const bytes = used.reduce((s, r) => s + Number(r.bytesOut), 0);
      return `${messages ? Math.round(bytes / messages) : "—"} bytes with ${t}`;
    });
    parts.push(
      `Changing the topic template changed the average MQTT message size (${joinList(sizes)}), because the topic is sent inside every message.`,
    );
  }

  if (new Set(rows.map((r) => r.unit)).size > 1) {
    parts.push(
      "Switching to Fahrenheit changed only the temperature values in the payloads. The device frames stayed the same, because the gateway does the conversion.",
    );
  }

  const fewest = Math.min(...rows.map((r) => Number(r.devices)));
  if (fewest < mostDevices) {
    const fewer = rows.find((r) => Number(r.devices) === fewest)!;
    parts.push(
      `With ${fewest} of ${DEVICES.length} devices switched on, about ${perMinute(fewer, "frames")} frames a minute came in instead of ${perMinute(low, "frames")}.`,
    );
  }
  return parts.join(" ");
}

/* ------------------------------------------------------------------ */
/* Lab                                                                 */
/* ------------------------------------------------------------------ */

interface LabConfig {
  rules: Rules;
  /** Ids of the devices that are switched on */
  enabled: string[];
}

const newSim = (c: LabConfig) => new GatewaySim(c.rules, new Set(c.enabled), SEED);

interface Tally {
  bytesIn: number;
  bytesOut: number;
}

const emptyTallies = (): Record<string, Tally> =>
  Object.fromEntries(DEVICES.map((d) => [d.id, { bytesIn: 0, bytesOut: 0 }]));

/** One frame's trip across the stage: hex chip, then its MQTT messages. */
interface Flight {
  id: number;
  /** Index into DEVICES, which picks the lane */
  lane: number;
  hex: string;
  messages: string[];
  filtered: number;
  /** performance.now() when the frame was sent */
  born: number;
}

export default function GatewayTranslatorLab() {
  const [config, setConfig] = useState<LabConfig>({
    rules: DEFAULT_RULES,
    enabled: DEVICES.map((d) => d.id),
  });
  // Read by onTick and onReset, which may run before React re-renders with new settings.
  const configRef = useRef(config);
  const [firstSim] = useState(() => newSim(config));
  const sim = useRef(firstSim);
  // Bytes per device for the chart; the engine only keeps overall totals.
  const tallies = useRef(emptyTallies());
  const [templateDraft, setTemplateDraft] = useState(DEFAULT_RULES.topicTemplate);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const eventId = useRef(0);
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");
  const reduced = useReducedMotion() ?? false;
  const templateId = useId();

  const onTick = useCallback((dtMs: number) => {
    const fresh = sim.current.advance(dtMs / 1000);
    if (!fresh.length) return;
    const { rules } = configRef.current;
    const now = performance.now();
    const logged: SimEvent[] = [];
    const launched: Flight[] = [];
    for (const ev of fresh) {
      const tally = tallies.current[ev.device.id];
      tally.bytesIn += ev.frame.length;
      tally.bytesOut += ev.out.reduce((s, m) => s + m.bytes, 0);
      const outputs = outputsOf(ev, rules);
      const t = ev.t * 1000;
      logged.push({
        id: ++eventId.current,
        t,
        kind: "frame",
        tone: "info",
        text: `${PROTOCOL[ev.device.kind]} frame from ${ev.device.location}: ${toHex(ev.frame)} (${ev.frame.length} bytes)`,
      });
      for (const o of outputs) {
        logged.push(
          o.message
            ? {
                id: ++eventId.current,
                t,
                kind: "published",
                tone: "ok",
                text: `Published ${o.message.topic} ${o.message.payload} (${o.message.bytes} bytes)`,
              }
            : {
                id: ++eventId.current,
                t,
                kind: "filtered",
                tone: "warn",
                text: `Filtered ${ev.device.location} ${o.reading.quantity}: change smaller than ${rules.deadbandPct}%`,
              },
        );
      }
      launched.push({
        id: eventId.current,
        lane: DEVICES.indexOf(ev.device),
        hex: shortHex(ev.frame),
        messages: outputs.flatMap((o) => (o.message ? [valueLabel(o.message)] : [])),
        filtered: ev.dropped,
        born: now,
      });
    }
    setEvents((prev) => [...prev, ...logged].slice(-MAX_EVENTS));
    setFlights((prev) =>
      [...prev.filter((f) => now - f.born < FLIGHT_LIFE_MS), ...launched].slice(-MAX_FLIGHTS),
    );
  }, []);

  const onReset = useCallback(() => {
    sim.current = newSim(configRef.current);
    tallies.current = emptyTallies();
    setEvents([]);
    setFlights([]);
  }, []);

  const clock = useSimClock({ onTick, onReset, stepMs: 100, maxTimeMs: RUN_MS });

  const updateConfig = (next: LabConfig) => {
    configRef.current = next;
    setConfig(next);
    // A new setting means a new run.
    clock.reset();
  };

  const setRules = (patch: Partial<Rules>) =>
    updateConfig({ ...configRef.current, rules: { ...configRef.current.rules, ...patch } });

  const toggleDevice = (id: string) => {
    const on = configRef.current.enabled;
    updateConfig({
      ...configRef.current,
      enabled: DEVICES.map((d) => d.id).filter((x) => (x === id ? !on.includes(x) : on.includes(x))),
    });
  };

  // A template applies on Enter or when the box loses focus, so typing doesn't
  // restart the run at every key. An invalid one keeps the last valid template.
  const commitTemplate = (text: string) => {
    const template = text.trim();
    if (!templateProblem(template) && template !== configRef.current.rules.topicTemplate) {
      setRules({ topicTemplate: template });
    }
  };

  const s = sim.current;
  const totals = s.totals;
  const latest = s.events.at(-1);
  const draft = templateDraft.trim();
  const templateError = templateProblem(draft);
  const templatePending = !templateError && draft !== config.rules.topicTemplate;
  const noQuantity = !(templateError ? config.rules.topicTemplate : draft).includes("{quantity}");
  const enoughTime = clock.timeMs >= RUN_MS;
  const change = totals.bytesIn ? Math.round((totals.bytesOut / totals.bytesIn - 1) * 100) : null;

  // Only new frames change the chart, so rebuild its data (and redraw it) only then.
  const chartData = useMemo(
    () =>
      totals.frames === 0
        ? []
        : DEVICES.map((d) => ({
            device: PROTOCOL[d.kind],
            in: tallies.current[d.id].bytesIn,
            out: tallies.current[d.id].bytesOut,
          })),
    [totals.frames, s],
  );

  // The log only changes when events arrive, not on every animation frame.
  const log = useMemo(
    () => (
      <EventLog
        events={events}
        filters={[
          { kind: "frame", label: "Frames" },
          { kind: "published", label: "Published" },
          { kind: "filtered", label: "Filtered" },
        ]}
        emptyText="Press Start gateway to receive the first frame."
      />
    ),
    [events],
  );

  const record = () => {
    const row: ObservationRow = {
      template: config.rules.topicTemplate,
      unit: config.rules.fahrenheit ? "°F" : "°C",
      devices: config.enabled.length,
      deadband: config.rules.deadbandPct,
      time: Number((clock.timeMs / 1000).toFixed(1)),
      frames: totals.frames,
      bytesIn: totals.bytesIn,
      messagesOut: totals.messagesOut,
      filtered: totals.dropped,
      bytesOut: totals.bytesOut,
    };
    addRow(row);
    const auto = summarise([...rows, row]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  const status =
    config.enabled.length === 0
      ? "All devices are switched off. Tick at least one device in Setup."
      : clock.running
        ? "Raw frames travel to the gateway. It decodes them, applies the rules and publishes MQTT messages to the broker."
        : enoughTime
          ? "Run complete: one simulated minute. Record your observation, or change a setting to start a new run."
          : clock.timeMs > 0
            ? "Paused. The latest frame and its MQTT messages are shown below."
            : "Ready. Press Start gateway.";

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordDisabled={!enoughTime || config.enabled.length === 0}
      recordHint={
        config.enabled.length === 0
          ? "Switch on at least one device first."
          : enoughTime
            ? "Adds this run's totals to the observation table below."
            : `Let the run finish first: each run lasts 60 s of simulated time (now ${Math.floor(clock.timeMs / 1000)} s).`
      }
      controls={
        <>
          <fieldset className="grid min-w-0 gap-2">
            <legend className="mb-1.5 text-[0.95rem] font-semibold">Devices</legend>
            {DEVICES.map((d) => {
              const on = config.enabled.includes(d.id);
              return (
                <label
                  key={d.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2",
                    on ? "border-brand bg-brand-soft" : "border-line hover:border-line-strong",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleDevice(d.id)}
                    className="mt-1 size-4 shrink-0 accent-brand"
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold">{d.name}</span>
                    <span className="block text-sm text-ink-2">
                      {PROTOCOL[d.kind]}, {d.location}, every {d.every} s
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <div className="grid min-w-0 gap-1.5">
            <label htmlFor={templateId} className="text-[0.95rem] font-semibold text-ink">
              Topic template
            </label>
            <input
              id={templateId}
              value={templateDraft}
              onChange={(e) => setTemplateDraft(e.target.value)}
              onBlur={() => commitTemplate(templateDraft)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTemplate(templateDraft);
              }}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              aria-invalid={templateError ? true : undefined}
              aria-describedby={`${templateId}-hint`}
              className={cn(
                "h-10 w-full min-w-0 rounded-lg border bg-surface px-3 font-mono text-sm",
                templateError ? "border-bad" : "border-line-strong",
              )}
            />
            <div id={`${templateId}-hint`} className="grid gap-1 text-sm" aria-live="polite">
              {templateError ? (
                <p className="text-bad">
                  {templateError} Still using <code className="font-mono wrap-anywhere">{config.rules.topicTemplate}</code>.
                </p>
              ) : (
                <p className="text-ink-2">
                  {templatePending && <span className="font-semibold text-ink">Press Enter to use it. </span>}
                  Example topic:{" "}
                  <code className="font-mono wrap-anywhere">{topicFor(draft, DEVICES[0], "temperature")}</code>
                </p>
              )}
              <p className="text-ink-3">Placeholders: {"{location}"}, {"{device}"}, {"{quantity}"}.</p>
              {noQuantity && (
                <p className="text-warn">Without {"{quantity}"}, both readings of a device share one topic.</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm text-ink-3">Try:</span>
              {TEMPLATE_PRESETS.map((t) => (
                <Button
                  key={t}
                  size="sm"
                  onClick={() => {
                    setTemplateDraft(t);
                    commitTemplate(t);
                  }}
                  disabled={t === config.rules.topicTemplate && t === draft}
                >
                  <span className="font-mono font-normal">{t}</span>
                </Button>
              ))}
            </div>
          </div>

          <Segmented<"C" | "F">
            label="Temperature unit"
            value={config.rules.fahrenheit ? "F" : "C"}
            onChange={(u) => setRules({ fahrenheit: u === "F" })}
            options={[
              { value: "C", label: "Celsius (°C)" },
              { value: "F", label: "Fahrenheit (°F)" },
            ]}
          />
          <Slider
            label="Send only if the value changed by more than"
            value={config.rules.deadbandPct}
            min={0}
            max={20}
            step={0.5}
            // No space before %, so the value never wraps beside the long label.
            format={(v) => `${v}%`}
            onChange={(deadbandPct) => setRules({ deadbandPct })}
            hint={
              config.rules.deadbandPct === 0
                ? "A deadband filter. At 0 % every reading is sent."
                : `A reading is sent only if it moved more than ${config.rules.deadbandPct} % from the last value sent.`
            }
          />
          <p className="text-sm text-ink-3">Changing a setting starts a new run.</p>
        </>
      }
      stage={
        <Stage
          enabled={config.enabled}
          events={s.events}
          totals={totals}
          flights={flights}
          reduced={reduced}
          status={status}
        />
      }
      toolbar={<SimControls clock={clock} playLabel="Start gateway" />}
      readouts={
        <>
          <Readouts
            items={[
              { label: "Frames in", value: totals.frames },
              { label: "Bytes in", value: totals.bytesIn },
              { label: "MQTT messages out", value: totals.messagesOut },
              { label: "Bytes out", value: totals.bytesOut },
              { label: "Readings filtered", value: totals.dropped, tone: totals.dropped ? "warn" : "default" },
              {
                label: "Bytes out vs in",
                value: change === null ? "—" : `${change > 0 ? "+" : change < 0 ? "−" : ""}${Math.abs(change)}%`,
                tone: change === null || change === 0 ? "default" : change > 0 ? "warn" : "ok",
                hint: "Change from bytes in to bytes out. Above zero means MQTT sent more bytes than the devices did.",
              },
              {
                label: "Average frame size",
                value: totals.frames ? (totals.bytesIn / totals.frames).toFixed(1) : "—",
                unit: totals.frames ? "bytes" : undefined,
              },
              {
                label: "Average MQTT message",
                value: totals.messagesOut ? (totals.bytesOut / totals.messagesOut).toFixed(1) : "—",
                unit: totals.messagesOut ? "bytes" : undefined,
              },
            ]}
          />
          <LatestFrame event={latest} rules={config.rules} />
          <BytesChart data={chartData} />
        </>
      }
      log={log}
    />
  );
}

interface BytesRow extends Record<string, unknown> {
  device: string;
  in: number;
  out: number;
}

/** Bytes in vs bytes out per device. Memoised: it redraws only when its data changes. */
const BytesChart = memo(function BytesChart({ data }: { data: BytesRow[] }) {
  return (
    <ChartCard
      title="Bytes in and out per device"
      description="Bytes in are the raw frames. Bytes out are the MQTT messages made from them. Raise the deadband and the Bytes out bars shrink."
      data={data}
      xKey="device"
      xLabel="Device"
      series={[
        { key: "in", label: "Bytes in", unit: "bytes", color: IN_COLOR },
        { key: "out", label: "Bytes out", unit: "bytes", color: OUT_COLOR },
      ]}
      height={220}
      emptyText="The chart fills in as frames arrive."
    >
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid {...chartStyle.grid} />
        <XAxis dataKey="device" {...chartStyle.axis} />
        <YAxis
          {...chartStyle.axis}
          width={64}
          tickFormatter={(v: number) => (v >= 1000 ? `${Number((v / 1000).toFixed(1))}k B` : `${v} B`)}
        />
        <Tooltip cursor={chartStyle.barCursor} content={<ChartTooltip units={{ in: "bytes", out: "bytes" }} />} />
        <Bar
          dataKey="in"
          name="Bytes in"
          fill={IN_COLOR}
          radius={chartStyle.bar.radius}
          maxBarSize={chartStyle.bar.maxBarSize}
          isAnimationActive={false}
        />
        <Bar
          dataKey="out"
          name="Bytes out"
          fill={OUT_COLOR}
          radius={chartStyle.bar.radius}
          maxBarSize={chartStyle.bar.maxBarSize}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartCard>
  );
});

/* ------------------------------------------------------------------ */
/* Stage                                                               */
/* ------------------------------------------------------------------ */

interface Point {
  /** % of the drawing's width */
  x: number;
  /** % of the drawing's height */
  y: number;
}

/** Where everything sits. Wide: devices left, gateway middle, broker right. Narrow: top to bottom. */
interface StageLayout {
  vertical: boolean;
  device: (i: number) => Point;
  frameFrom: (i: number) => Point;
  frameTo: (i: number) => Point;
  gateway: Point;
  msgFrom: (i: number) => Point;
  msgTo: (i: number) => Point;
  broker: Point;
  /** Where the "filtered" badge pops up */
  badge: Point;
  /** Drawing height in px; the width follows the page */
  height: number;
}

// Chips start and end under the boxes, which are drawn on top, so they seem
// to leave one box and enter the next.
const ROW_Y = [17, 50, 83];
const WIDE: StageLayout = {
  vertical: false,
  height: 320,
  device: (i) => ({ x: 17, y: ROW_Y[i] }),
  frameFrom: (i) => ({ x: 29, y: ROW_Y[i] }),
  frameTo: (i) => ({ x: 50, y: 50 + (i - 1) * 12 }),
  gateway: { x: 54.5, y: 50 },
  msgFrom: (i) => ({ x: 59, y: 50 + (i - 1) * 14 }),
  msgTo: (i) => ({ x: 83, y: 50 + (i - 1) * 14 }),
  broker: { x: 88, y: 50 },
  badge: { x: 54.5, y: 17 },
};

const COL_X = [17, 50, 83];
const NARROW: StageLayout = {
  vertical: true,
  height: 448,
  device: (i) => ({ x: COL_X[i], y: 11 }),
  frameFrom: (i) => ({ x: COL_X[i], y: 16 }),
  frameTo: (i) => ({ x: 50 + (i - 1) * 10, y: 46 }),
  gateway: { x: 50, y: 50 },
  msgFrom: (i) => ({ x: 50 + (i - 1) * 22, y: 54 }),
  msgTo: (i) => ({ x: 50 + (i - 1) * 22, y: 86 }),
  broker: { x: 50, y: 89 },
  badge: { x: 87, y: 50 },
};

/** Below this stage width the drawing stacks top to bottom. */
const NARROW_BELOW_PX = 620;

const pct = (n: number) => `${n}%`;
const at = (p: Point) => ({ left: pct(p.x), top: pct(p.y) });
/** The point a fraction t of the way from a to b. */
const along = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
/** Where a still chip sits on its lane. Narrow lanes are close together, so stagger them. */
const restAt = (layout: StageLayout, i: number) => (layout.vertical ? [0.3, 0.65, 0.3][i] : 0.5);
/** A point in px from the drawing's top-left corner, for transform animations. */
const toPx = (p: Point, width: number, height: number) => ({ x: (p.x / 100) * width, y: (p.y / 100) * height });

/** Newest item that matches, searching from the end. */
function lastWhere<T>(items: T[], test: (item: T) => boolean): T | undefined {
  for (let i = items.length - 1; i >= 0; i--) if (test(items[i])) return items[i];
  return undefined;
}

/** Width of an element, kept up to date as the page resizes. 0 until measured. */
function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function Stage({
  enabled,
  events,
  totals,
  flights,
  reduced,
  status,
}: {
  enabled: string[];
  events: FrameEvent[];
  totals: Totals;
  flights: Flight[];
  reduced: boolean;
  status: string;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const layout = width > 0 && width < NARROW_BELOW_PX ? NARROW : WIDE;
  const latestByDevice = DEVICES.map((d) => lastWhere(events, (e) => e.device.id === d.id));
  const lastTopic = lastWhere(events, (e) => e.out.length > 0)?.out.at(-1)?.topic;

  return (
    <div ref={ref}>
      <div
        className="relative"
        style={{ height: layout.height }}
        role="img"
        aria-label={`${enabled.length} of ${DEVICES.length} devices send raw frames to the gateway, which publishes MQTT messages to the broker. So far ${totals.frames} frames in, ${totals.messagesOut} MQTT messages out and ${totals.dropped} readings filtered.`}
      >
        {/* Links: device to gateway, gateway to broker */}
        <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {DEVICES.map((d, i) => {
            const a = layout.frameFrom(i);
            const b = layout.frameTo(i);
            const c = layout.msgFrom(i);
            const e = layout.msgTo(i);
            return (
              <g key={d.id} stroke="var(--line-strong)" strokeWidth={1.5} strokeDasharray="4 4" opacity={enabled.includes(d.id) ? 1 : 0.35}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} vectorEffect="non-scaling-stroke" />
                <line x1={c.x} y1={c.y} x2={e.x} y2={e.y} vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}
        </svg>

        {/* Moving frames and messages, drawn under the boxes */}
        {!reduced && width > 0 && flights.map((f) => <FlightChips key={f.id} flight={f} layout={layout} width={width} />)}

        {/* Devices */}
        {DEVICES.map((d, i) => {
          const Icon = DEVICE_ICON[d.kind];
          const on = enabled.includes(d.id);
          return (
            <div
              key={d.id}
              className={cn(
                PLACED,
                "flex w-[31%] rounded-lg border bg-surface-2 px-2.5 py-1.5",
                layout.vertical
                  ? "h-[20%] flex-col items-center justify-center gap-0.5 text-center"
                  : "h-[26%] items-center gap-2.5",
                on ? "border-line-strong" : "border-dashed border-line opacity-60",
              )}
              style={at(layout.device(i))}
              aria-hidden
            >
              <Icon size={18} className="shrink-0 text-u1" />
              <span className="block w-full min-w-0 leading-tight">
                {!layout.vertical && <span className="block truncate text-sm font-semibold">{d.name}</span>}
                <span className={cn("block truncate", layout.vertical ? "text-sm font-semibold" : "text-xs text-ink-2")}>
                  {PROTOCOL[d.kind]}
                  {!layout.vertical && `, ${d.location}`}
                </span>
                {layout.vertical && <span className="block truncate text-xs text-ink-2">{d.location}</span>}
                <span className="block truncate text-xs text-ink-3">{on ? `every ${d.every} s` : "switched off"}</span>
              </span>
            </div>
          );
        })}

        {/* Gateway */}
        <div
          className={cn(
            PLACED,
            "flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-brand bg-brand-soft px-2 text-center",
            layout.vertical ? "h-[18%] w-[46%]" : "h-[46%] w-[17%]",
          )}
          style={at(layout.gateway)}
          aria-hidden
        >
          <span className="flex items-center gap-1.5 font-semibold">
            <Router size={20} className="shrink-0 text-brand" />
            Gateway
          </span>
          <span className="text-xs text-ink-2">decode, convert, filter</span>
        </div>

        {/* Broker */}
        <div
          className={cn(
            PLACED,
            "flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-line-strong bg-surface px-2 text-center",
            layout.vertical ? "h-[16%] w-[60%]" : "h-[36%] w-[20%]",
          )}
          style={at(layout.broker)}
          aria-hidden
        >
          <span className="flex items-center gap-1.5 font-semibold">
            <Server size={18} className="shrink-0 text-ink-2" />
            MQTT broker
          </span>
          <span className="text-xs text-ink-2">
            {totals.messagesOut} message{totals.messagesOut === 1 ? "" : "s"}
          </span>
          {lastTopic && <span className="block max-w-full truncate font-mono text-xs text-ink-3">{lastTopic}</span>}
        </div>

        {/* Still chips for reduced motion, or "filtered" badges over the gateway */}
        {reduced
          ? DEVICES.map((d, i) => {
              // Reduced motion: the latest frame and message of each device sit still in their lanes.
              const ev = latestByDevice[i];
              if (!ev) return null;
              const frameAt = at(along(layout.frameFrom(i), layout.frameTo(i), restAt(layout, i)));
              const msgAt = at(along(layout.msgFrom(i), layout.msgTo(i), restAt(layout, i)));
              return (
                <Fragment key={d.id}>
                  <span className={cn(PLACED, FRAME_CHIP)} style={frameAt} aria-hidden>
                    {shortHex(ev.frame)}
                  </span>
                  {ev.out.length > 0 ? (
                    <span className={cn(PLACED, MSG_CHIP)} style={msgAt} aria-hidden>
                      {valueLabel(ev.out[0])}
                      {ev.out.length > 1 && ` +${ev.out.length - 1}`}
                    </span>
                  ) : (
                    <span className={cn(PLACED, BADGE)} style={msgAt} aria-hidden>
                      <Funnel size={12} />
                      filtered
                    </span>
                  )}
                </Fragment>
              );
            })
          : flights.map((f) => f.filtered > 0 && <FilteredBadge key={f.id} layout={layout} />)}
      </div>

      <div className="grid gap-2 border-t border-line px-4 py-2.5 text-sm">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-ink-3" aria-label="Key">
          <li className="flex items-center gap-1.5">
            <span className={FRAME_CHIP} aria-hidden>
              18 2a…
            </span>
            Raw frame (hex)
          </li>
          <li className="flex items-center gap-1.5">
            <span className={MSG_CHIP} aria-hidden>
              28.5 °C
            </span>
            MQTT message
          </li>
          <li className="flex items-center gap-1.5">
            <span className={BADGE} aria-hidden>
              <Funnel size={12} />
              filtered
            </span>
            Dropped by the deadband
          </li>
        </ul>
        <p className="text-ink-2" aria-live="polite">
          {status}
        </p>
      </div>
    </div>
  );
}

/** Moving chips sit at the top-left corner and travel by transform, which is cheaper than animating left/top. */
const MOVING = "absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2";

/** Animates one frame to the gateway, then its MQTT messages to the broker. */
const FlightChips = memo(function FlightChips({
  flight,
  layout,
  width,
}: {
  flight: Flight;
  layout: StageLayout;
  width: number;
}) {
  const px = (p: Point) => toPx(p, width, layout.height);
  const from = px(layout.frameFrom(flight.lane));
  const to = px(layout.frameTo(flight.lane));
  const msgFrom = px(layout.msgFrom(flight.lane));
  const msgTo = px(layout.msgTo(flight.lane));
  const fade = { duration: TRAVEL_S, times: [0, 0.1, 0.9, 1], ease: "linear" as const };

  return (
    <>
      <motion.span
        className={cn(MOVING, FRAME_CHIP)}
        initial={{ x: from.x, y: from.y, opacity: 0 }}
        animate={{ x: to.x, y: to.y, opacity: [0, 1, 1, 0] }}
        transition={{ default: { duration: TRAVEL_S, ease: "easeInOut" }, opacity: fade }}
        aria-hidden
      >
        {flight.hex}
      </motion.span>
      {flight.messages.map((label, k) => {
        const delay = TRAVEL_S + k * 0.25;
        return (
          <motion.span
            key={k}
            className={cn(MOVING, MSG_CHIP)}
            initial={{ x: msgFrom.x, y: msgFrom.y, opacity: 0 }}
            animate={{ x: msgTo.x, y: msgTo.y, opacity: [0, 1, 1, 0] }}
            transition={{ default: { duration: TRAVEL_S, ease: "easeInOut", delay }, opacity: { ...fade, delay } }}
            aria-hidden
          >
            {label}
          </motion.span>
        );
      })}
    </>
  );
});

/** Pops up at the gateway as a frame arrives with a reading the deadband dropped. */
const FilteredBadge = memo(function FilteredBadge({ layout }: { layout: StageLayout }) {
  return (
    <motion.span
      className={cn(PLACED, BADGE)}
      style={at(layout.badge)}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 1] }}
      transition={{ duration: 1, delay: TRAVEL_S, times: [0, 0.15, 0.8, 1] }}
      aria-hidden
    >
      <Funnel size={12} />
      filtered
    </motion.span>
  );
});

/* ------------------------------------------------------------------ */
/* Latest frame                                                        */
/* ------------------------------------------------------------------ */

/** The newest frame, decoded field by field, and the MQTT messages it became. Redraws only for a new frame. */
const LatestFrame = memo(function LatestFrame({ event, rules }: { event: FrameEvent | undefined; rules: Rules }) {
  const headingId = useId();

  if (!event) {
    return (
      <section aria-labelledby={headingId} className="grid gap-1 rounded-lg border border-line bg-surface p-4">
        <h3 id={headingId} className="font-bold">
          Latest frame
        </h3>
        <p className="text-sm text-ink-3">No frame yet. Press Start gateway, then Pause to read a frame.</p>
      </section>
    );
  }

  const { device } = event;
  const decoded = decodeFrame(device.kind, event.frame);
  const outputs = outputsOf(event, rules);
  const bytesOut = event.out.reduce((s, m) => s + m.bytes, 0);

  return (
    <section aria-labelledby={headingId} className="grid grid-cols-1 gap-4 rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 id={headingId} className="font-bold">
          Latest frame
        </h3>
        <p className="text-sm text-ink-2">
          {device.name} ({PROTOCOL[device.kind]}, {device.location}) at {formatSimTime(event.t * 1000)}
        </p>
        <p className="text-sm text-ink-3 sm:ml-auto">Pause to read it closely.</p>
      </div>

      <ol className="flex flex-wrap gap-1.5" aria-label={`Frame bytes in hex: ${toHex(event.frame)}`}>
        {event.frame.map((b, i) => (
          <li
            key={i}
            className="flex h-8 w-9 items-center justify-center rounded-md border border-u1 bg-u1-soft font-mono text-sm font-semibold"
          >
            {b.toString(16).padStart(2, "0")}
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="relative min-w-0 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="mb-1.5 text-left font-semibold">Decoded by the {PROTOCOL[device.kind]} adapter</caption>
            <thead>
              <tr>
                <th scope="col" className="border-b border-line-strong px-2 py-1.5 text-left font-bold">
                  Field
                </th>
                <th scope="col" className="border-b border-line-strong px-2 py-1.5 text-left font-bold">
                  Bytes
                </th>
                <th scope="col" className="border-b border-line-strong px-2 py-1.5 text-left font-bold">
                  Meaning
                </th>
              </tr>
            </thead>
            <tbody>
              {decoded.fields.map((f) => (
                <tr key={f.name} className="border-b border-line last:border-0 align-top">
                  <th scope="row" className="px-2 py-1.5 text-left font-normal">
                    {f.name}
                  </th>
                  <td className="whitespace-nowrap px-2 py-1.5 font-mono">{f.raw}</td>
                  <td className="px-2 py-1.5 text-ink-2">{f.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid min-w-0 content-start gap-2">
          <p className="font-semibold">MQTT out</p>
          <ul className="grid gap-2">
            {outputs.map((o) =>
              o.message ? (
                <li key={o.reading.quantity} className="rounded-lg border border-line bg-surface-2 p-2.5 font-mono text-sm">
                  <span className="block text-xs text-ink-3">PUBLISH to</span>
                  <span className="block font-semibold wrap-anywhere">{o.message.topic}</span>
                  <span className="block text-ink-2 wrap-anywhere">{o.message.payload}</span>
                  <span className="mt-1 block font-sans text-xs text-ink-3">{o.message.bytes} bytes</span>
                </li>
              ) : (
                <li
                  key={o.reading.quantity}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-line-strong p-2.5 text-sm text-ink-2"
                >
                  <span className={BADGE}>
                    <Funnel size={12} aria-hidden />
                    filtered
                  </span>
                  {o.reading.quantity}: change smaller than {rules.deadbandPct}%
                </li>
              ),
            )}
          </ul>
          <p className="text-sm text-ink-3">
            {event.frame.length} bytes in, {bytesOut} bytes out.
          </p>
        </div>
      </div>
    </section>
  );
});
