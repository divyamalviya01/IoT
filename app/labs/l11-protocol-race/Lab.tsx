import { motion, useReducedMotion } from "motion/react";
import { Flag } from "lucide-react";
import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { ChartCard, ChartTooltip, chartStyle, seriesColor } from "~/components/theory/ChartCard";
import { Button } from "~/components/ui/Button";
import { Slider } from "~/components/ui/Slider";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import {
  PROTOCOL_LABEL,
  PROTOCOL_NOTE,
  RACE_PROTOCOLS,
  appSizes,
  race,
  type RaceProtocol,
  type RaceResult,
} from "./engine";

const lab = getLab("l11-protocol-race")!;
const SEED = 1;
const MAX_READING_CHARS = 24;
/** Seconds the longest bar takes to fill. Every bar grows at the same speed. */
const RACE_SECONDS = 3;

const steps = [
  "Keep Packet loss at 0% and Readings to send at 200. Press Start race, see which lane finishes first, then press Record observation.",
  "Compare the bytes per reading. Change Readings to send from 200 to 2: which protocols get heavier? Check the Setup column in the results table.",
  "Set Readings to send back to 200 and raise Packet loss to 20%. Start the race again and press Record observation. Which lane lost readings?",
  "Compare the Average delay chart at 0% and 20% loss. Which protocols slowed down the most?",
  'Make the Sensor reading longer, for example {"t":28.5,"h":61}. Does the order of the lanes change?',
];

/** Short names for chart axes, where the full label does not fit on a phone. */
const SHORT: Record<RaceProtocol, string> = {
  coapNon: "CoAP NON",
  coapCon: "CoAP CON",
  mqtt0: "MQTT QoS 0",
  mqtt1: "MQTT QoS 1",
  xmpp: "XMPP",
  httpKeep: "HTTP (open)",
  httpNew: "HTTP (new)",
};
const SHORT_BY_LABEL = Object.fromEntries(RACE_PROTOCOLS.map((p) => [PROTOCOL_LABEL[p], SHORT[p]]));

/** Each protocol keeps one colour everywhere, whatever is selected. */
const colorOf = (p: RaceProtocol) => seriesColor(RACE_PROTOCOLS.indexOf(p));
const utf8Length = (s: string) => new TextEncoder().encode(s).length;
const round1 = (n: number) => Math.round(n * 10) / 10;
const num = (v: string | number | undefined) => (typeof v === "number" ? v : Number(v));
const times = (ratio: number) => (ratio >= 10 ? String(Math.round(ratio)) : ratio.toFixed(1));

function listWords(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Rows recorded under the same conditions, keeping the latest row per protocol. */
function groupByConditions(rows: ObservationRow[]): ObservationRow[][] {
  const groups = new Map<string, ObservationRow[]>();
  for (const r of rows) {
    const key = [r.loss, r.delay, r.readings, r.size].join("|");
    const list = groups.get(key) ?? [];
    groups.set(key, [...list.filter((x) => x.protocol !== r.protocol), r]);
  }
  return [...groups.values()];
}

function summarise(rows: ObservationRow[]): string {
  if (rows.length === 0) return "";
  const groups = groupByConditions(rows);
  const parts: string[] = [];

  // Bytes and energy, from the first comparison recorded at the lowest loss.
  const multi = groups.filter((g) => g.length >= 2).sort((a, b) => num(a[0].loss) - num(b[0].loss));
  const base = multi[0];
  if (base) {
    const c = base[0];
    const byBytes = [...base].sort((a, b) => num(a.bytes) - num(b.bytes));
    const lo = byBytes[0];
    const hi = byBytes[byBytes.length - 1];
    const cond = `At ${c.loss}% loss with ${c.readings} readings of ${c.size} bytes`;
    if (num(hi.bytes) > num(lo.bytes)) {
      parts.push(
        `${cond}, ${lo.protocol} used the fewest bytes per reading (${lo.bytes} B) and ${hi.protocol} the most (${hi.bytes} B), about ${times(num(hi.bytes) / num(lo.bytes))} times as many.`,
      );
    }
    const byEnergy = [...base].sort((a, b) => num(a.energy) - num(b.energy));
    const eLo = byEnergy[0];
    const eHi = byEnergy[byEnergy.length - 1];
    if (num(eHi.energy) > num(eLo.energy)) {
      parts.push(
        eLo.protocol === lo.protocol && eHi.protocol === hi.protocol
          ? `The same two also used the least and the most energy: ${eLo.energy} and ${eHi.energy} units per reading.`
          : `${eLo.protocol} used the least energy (${eLo.energy} units per reading) and ${eHi.protocol} the most (${eHi.energy} units).`,
      );
    }
  }

  // Setup cost: the same protocol at 0% loss with different numbers of readings.
  const perfect = rows.filter((r) => num(r.loss) === 0);
  let setup: { protocol: string; few: ObservationRow; many: ObservationRow } | null = null;
  const unchanged: string[] = [];
  for (const protocol of new Set(perfect.map((r) => String(r.protocol)))) {
    const own = perfect.filter((r) => r.protocol === protocol);
    for (const few of own) {
      for (const many of own) {
        if (num(few.readings) >= num(many.readings) || few.delay !== many.delay || few.size !== many.size) continue;
        const rise = num(few.bytes) / num(many.bytes);
        if (rise > 1.001 && (!setup || rise > num(setup.few.bytes) / num(setup.many.bytes))) {
          setup = { protocol, few, many };
        } else if (rise <= 1.001 && !unchanged.includes(protocol)) unchanged.push(protocol);
      }
    }
  }
  if (setup) {
    const { protocol, few, many } = setup;
    const same = unchanged.filter((p) => p !== protocol);
    parts.push(
      `With ${few.readings} readings instead of ${many.readings}, ${protocol}'s bytes per reading rose from ${many.bytes} B to ${few.bytes} B` +
        (same.length ? `, while ${listWords(same)} stayed the same.` : "."),
    );
  }

  // Delivery under loss, at the highest loss recorded.
  const lossy = groups.filter((g) => num(g[0].loss) > 0).sort((a, b) => num(b[0].loss) - num(a[0].loss));
  const worst = lossy[0];
  if (worst) {
    const loss = worst[0].loss;
    const lost = worst.filter((r) => num(r.delivered) < 100);
    const full = worst.filter((r) => num(r.delivered) >= 100).map((r) => String(r.protocol));
    if (lost.length) {
      parts.push(
        `At ${loss}% loss, ${listWords(lost.map((r) => `${r.protocol} delivered only ${r.delivered}% of its readings`))}` +
          (full.length ? `, while ${listWords(full)} delivered all of them.` : "."),
      );
    } else {
      parts.push(`At ${loss}% loss, every protocol recorded still delivered all of its readings.`);
    }

    // Delay: the same protocols at 0% loss under otherwise equal conditions.
    const calm = groups.find(
      (g) =>
        num(g[0].loss) === 0 &&
        g[0].delay === worst[0].delay &&
        g[0].readings === worst[0].readings &&
        g[0].size === worst[0].size,
    );
    if (calm) {
      const rises = worst
        .map((r) => ({ r, before: calm.find((x) => x.protocol === r.protocol) }))
        .filter(
          (x): x is { r: ObservationRow; before: ObservationRow } =>
            !!x.before &&
            // A protocol that lost readings only averages the ones that arrived, so leave it out.
            num(x.r.delivered) === 100 &&
            Number.isFinite(num(x.r.avgDelay)) &&
            Number.isFinite(num(x.before.avgDelay)),
        )
        .sort((a, b) => num(b.r.avgDelay) - num(b.before.avgDelay) - (num(a.r.avgDelay) - num(a.before.avgDelay)));
      if (rises.length) {
        const most = rises[0];
        const least = rises[rises.length - 1];
        parts.push(
          `Going from 0% to ${loss}% loss, the average delay rose most for ${most.r.protocol} (from ${most.before.avgDelay} ms to ${most.r.avgDelay} ms)` +
            (rises.length > 1
              ? ` and least for ${least.r.protocol} (from ${least.before.avgDelay} ms to ${least.r.avgDelay} ms).`
              : "."),
        );
      }
    }
  }

  return parts.join(" ");
}

/** Readout value: a protocol name with a short detail line under it. */
function Named({ name, detail }: { name: string; detail: string }) {
  return (
    <>
      <span className="block font-sans text-lg font-semibold leading-snug">{name}</span>
      <span className="block font-sans text-sm text-ink-2">{detail}</span>
    </>
  );
}

export default function ProtocolRaceLab() {
  const [messages, setMessages] = useState(200);
  const [payload, setPayload] = useState("28.5");
  const [lossPct, setLossPct] = useState(0);
  const [delayMs, setDelayMs] = useState(50);
  const [selected, setSelected] = useState<RaceProtocol[]>(RACE_PROTOCOLS);
  /** Set by Start race; cleared by any change so the bars jump to their new length. */
  const [run, setRun] = useState<number | null>(null);
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");
  const reduced = useReducedMotion() ?? false;
  const readingId = useId();

  const results = useMemo(
    () => race({ messages, payload, lossPct, delayMs, seed: SEED }, selected),
    [messages, payload, lossPct, delayMs, selected],
  );
  const sizes = useMemo(() => appSizes(payload), [payload]);
  const readingBytes = utf8Length(payload);
  const racing = run !== null && !reduced;

  /** Wraps a setter so that changing a setting shows the final bars at once. */
  const edit =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setRun(null);
    };

  const toggle = (p: RaceProtocol) => {
    setSelected((s) => {
      if (s.includes(p)) return s.length > 1 ? s.filter((x) => x !== p) : s;
      return RACE_PROTOCOLS.filter((x) => x === p || s.includes(x));
    });
    setRun(null);
  };

  const maxBytes = Math.max(...results.map((r) => r.bytesPerReading));
  const byBytes = [...results].sort((a, b) => a.bytesPerReading - b.bytesPerReading);
  const smallest = byBytes[0];
  const biggest = byBytes[byBytes.length - 1];
  const lowestEnergy = [...results].sort((a, b) => a.energyPerReading - b.energyPerReading)[0];
  const bestDelivery = Math.max(...results.map((r) => r.deliveredPct));
  const bestDelivered = results.filter((r) => round1(r.deliveredPct) === round1(bestDelivery));
  const lostAny = results.filter((r) => r.deliveredPct < 100);

  const chartData = results.map((r) => ({
    id: r.protocol,
    protocol: PROTOCOL_LABEL[r.protocol],
    bytes: round1(r.bytesPerReading),
    energy: round1(r.energyPerReading),
    delay: r.deliveredPct > 0 ? Math.round(r.avgDelayMs) : null,
  }));
  const chartHeight = 44 + results.length * 30;
  const silent = results.filter((r) => r.deliveredPct === 0);

  const record = () => {
    const newRows: ObservationRow[] = results.map((r) => ({
      loss: lossPct,
      delay: delayMs,
      readings: messages,
      size: readingBytes,
      protocol: PROTOCOL_LABEL[r.protocol],
      bytes: round1(r.bytesPerReading),
      delivered: round1(r.deliveredPct),
      avgDelay: r.deliveredPct > 0 ? Math.round(r.avgDelayMs) : "—",
      energy: round1(r.energyPerReading),
    }));
    newRows.forEach(addRow);
    const auto = summarise([...rows, ...newRows]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  const bestDeliveryName =
    bestDelivered.length === results.length
      ? results.length === 1
        ? PROTOCOL_LABEL[results[0].protocol]
        : "All protocols"
      : bestDelivered.length <= 2
        ? listWords(bestDelivered.map((r) => PROTOCOL_LABEL[r.protocol]))
        : `${bestDelivered.length} of ${results.length} protocols`;

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordHint={
        results.length === 1
          ? "Adds one row for the protocol in the race, under the current conditions."
          : `Adds one row for each of the ${results.length} protocols in the race, under the current conditions.`
      }
      controls={
        <>
          <Slider
            label="Readings to send"
            value={messages}
            min={1}
            max={200}
            step={1}
            onChange={edit(setMessages)}
            hint="One sensor sends this many readings, one message each."
          />
          <div className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={readingId} className="text-[0.95rem] font-semibold text-ink">
                Sensor reading
              </label>
              <output htmlFor={readingId} className="font-mono text-sm tabular-nums text-ink-2">
                {readingBytes} {readingBytes === 1 ? "byte" : "bytes"}
              </output>
            </div>
            <input
              id={readingId}
              value={payload}
              maxLength={MAX_READING_CHARS}
              spellCheck={false}
              autoComplete="off"
              aria-describedby={`${readingId}-hint`}
              onChange={(e) => edit(setPayload)(e.target.value)}
              className="h-10 w-full min-w-0 rounded-lg border border-line-strong bg-bg px-3 font-mono"
            />
            <p id={`${readingId}-hint`} className="text-sm text-ink-3">
              The text each message carries, up to {MAX_READING_CHARS} characters. Try 28.5 °C or{" "}
              <code className="font-mono">{'{"t":28.5,"h":61}'}</code>.
            </p>
          </div>
          <Slider
            label="Packet loss"
            value={lossPct}
            min={0}
            max={40}
            step={5}
            unit="%"
            onChange={edit(setLossPct)}
            hint="Chance that any one packet, in either direction, is lost."
          />
          <Slider
            label="One-way delay"
            value={delayMs}
            min={10}
            max={500}
            step={10}
            unit="ms"
            onChange={edit(setDelayMs)}
            hint="Time for one packet to cross the network."
          />
          <fieldset className="grid min-w-0 gap-2">
            <legend className="mb-1.5 text-[0.95rem] font-semibold">Protocols in the race</legend>
            <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-1">
              {RACE_PROTOCOLS.map((p) => {
                const on = selected.includes(p);
                const locked = on && selected.length === 1;
                return (
                  <label
                    key={p}
                    className={cn(
                      "flex min-w-0 items-center gap-2.5 rounded-lg border px-3 py-1.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
                      on ? "border-line-strong bg-surface" : "border-line bg-surface-2 text-ink-3",
                      locked ? "cursor-not-allowed" : "cursor-pointer",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 accent-[var(--brand)]"
                      checked={on}
                      disabled={locked}
                      onChange={() => toggle(p)}
                    />
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ background: on ? colorOf(p) : "var(--line-strong)" }}
                      aria-hidden
                    />
                    <span className="min-w-0 font-semibold">{PROTOCOL_LABEL[p]}</span>
                  </label>
                );
              })}
            </div>
            {selected.length === 1 && (
              <p className="text-sm text-ink-3">At least one protocol must stay in the race.</p>
            )}
          </fieldset>
          <p className="text-sm text-ink-3">
            Sizes count the IP header and everything above it. Energy is in illustrative units: 1 per byte plus 30 per
            packet, because every packet wakes the radio.
          </p>
        </>
      }
      stage={
        <div className="grid gap-4 p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button variant="primary" onClick={() => setRun((r) => (r ?? 0) + 1)} icon={<Flag size={16} aria-hidden />}>
              Start race
            </Button>
            <p className="min-w-0 flex-1 basis-56 text-sm text-ink-2">
              Bars show bytes per reading. Every lane sends at the same speed, so fewer bytes finish first.
            </p>
          </div>
          <ol className="grid gap-3" aria-label="Race lanes, bytes per reading">
            {results.map((r) => (
              <Lane
                key={r.protocol}
                result={r}
                pct={(r.bytesPerReading / maxBytes) * 100}
                runKey={racing ? `race-${run}` : null}
              />
            ))}
          </ol>
          <p className="text-sm text-ink-3">
            Finish order, fewest bytes first: {byBytes.map((r) => PROTOCOL_LABEL[r.protocol]).join(", ")}.{" "}
            {lostAny.length ? (
              <span className="font-semibold text-bad">
                Lost readings: {listWords(lostAny.map((r) => `${PROTOCOL_LABEL[r.protocol]} (${round1(r.deliveredPct)}% delivered)`))}.
              </span>
            ) : (
              "No readings were lost."
            )}
          </p>
        </div>
      }
      readouts={
        <>
          <Readouts
            columns={4}
            items={[
              {
                label: "Fewest bytes per reading",
                value: <Named name={PROTOCOL_LABEL[smallest.protocol]} detail={`${round1(smallest.bytesPerReading)} B`} />,
              },
              {
                label: "Most bytes per reading",
                value: <Named name={PROTOCOL_LABEL[biggest.protocol]} detail={`${round1(biggest.bytesPerReading)} B`} />,
              },
              {
                label: "Best delivery",
                value: <Named name={bestDeliveryName} detail={`${round1(bestDelivery)}% delivered`} />,
                tone: bestDelivery >= 100 ? "ok" : "warn",
              },
              {
                label: "Lowest energy",
                value: (
                  <Named
                    name={PROTOCOL_LABEL[lowestEnergy.protocol]}
                    detail={`${round1(lowestEnergy.energyPerReading)} units per reading`}
                  />
                ),
              },
            ]}
          />
          <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
            <ChartCard
              title="Bytes per reading"
              description="Headers, ACKs, resends and a share of the setup."
              data={chartData}
              xKey="protocol"
              xLabel="Protocol"
              series={[{ key: "bytes", label: "Bytes per reading", unit: "B" }]}
              height={chartHeight}
            >
              <HorizontalBars data={chartData} dataKey="bytes" name="Bytes per reading" unit="B" />
            </ChartCard>
            <ChartCard
              title="Energy per reading"
              description="Illustrative units: 1 per byte plus 30 per packet."
              data={chartData}
              xKey="protocol"
              xLabel="Protocol"
              series={[{ key: "energy", label: "Energy per reading", unit: "units" }]}
              height={chartHeight}
            >
              <HorizontalBars data={chartData} dataKey="energy" name="Energy per reading" unit="units" />
            </ChartCard>
            <ChartCard
              title="Average delay"
              description={
                silent.length
                  ? `No bar for ${listWords(silent.map((r) => PROTOCOL_LABEL[r.protocol]))}: no reading arrived.`
                  : "Time until the server has a reading, counting delivered readings only."
              }
              data={chartData}
              xKey="protocol"
              xLabel="Protocol"
              series={[{ key: "delay", label: "Average delay", unit: "ms" }]}
              height={chartHeight}
            >
              <HorizontalBars data={chartData} dataKey="delay" name="Average delay" unit="ms" />
            </ChartCard>
            <AppSizes sizes={sizes} readingBytes={readingBytes} />
          </div>
          <ResultsTable results={results} messages={messages} lossPct={lossPct} />
        </>
      }
    />
  );
}

/** One lane: protocol name, note, and a bar that grows to its bytes per reading. */
function Lane({ result, pct, runKey }: { result: RaceResult; pct: number; runKey: string | null }) {
  const p = result.protocol;
  const lost = result.deliveredPct < 100;
  // Same speed for every lane, so a shorter bar finishes sooner.
  const seconds = Math.max(0.2, (RACE_SECONDS * pct) / 100);
  return (
    <li className="grid min-w-0 gap-1">
      <p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
        <span className="size-3 shrink-0 self-center rounded-full" style={{ background: colorOf(p) }} aria-hidden />
        <span className="font-semibold">{PROTOCOL_LABEL[p]}</span>
        <span className="min-w-0 text-sm text-ink-3">{PROTOCOL_NOTE[p]}</span>
      </p>
      <div className={cn("relative h-11 rounded-md", lost ? "bg-bad-soft" : "bg-surface-2")}>
        {/* The bar uses the width left after room for the label at its tip. */}
        <div className="absolute inset-y-0 left-0 right-[7.5rem]">
          <motion.div
            key={runKey ?? "still"}
            className="relative h-full"
            initial={runKey ? { width: "0%" } : false}
            animate={{ width: `${pct}%` }}
            transition={runKey ? { duration: seconds, ease: "linear" } : { duration: 0 }}
          >
            <span
              className="absolute inset-y-2.5 left-0 right-0 min-w-0.5 rounded-r-sm"
              style={{ background: colorOf(p) }}
              aria-hidden
            />
            <motion.span
              className="absolute inset-y-0 left-full flex flex-col justify-center whitespace-nowrap pl-2 text-sm leading-tight"
              initial={runKey ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={runKey ? { delay: seconds, duration: 0.2 } : { duration: 0 }}
            >
              <span className="font-mono font-semibold tabular-nums text-ink">{round1(result.bytesPerReading)} B</span>
              <span className={lost ? "font-semibold text-bad" : "text-ink-3"}>
                {round1(result.deliveredPct)}% delivered
              </span>
            </motion.span>
          </motion.div>
        </div>
      </div>
    </li>
  );
}

interface ChartRow extends Record<string, unknown> {
  id: RaceProtocol;
  protocol: string;
}

/** Horizontal bars, one colour per protocol, so long names fit on a phone. */
function HorizontalBars({
  data,
  dataKey,
  name,
  unit,
}: {
  data: ChartRow[];
  dataKey: string;
  name: string;
  unit: string;
}) {
  return (
    <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
      <CartesianGrid {...chartStyle.grid} vertical horizontal={false} />
      <XAxis type="number" {...chartStyle.axis} />
      <YAxis
        type="category"
        dataKey="protocol"
        {...chartStyle.axis}
        width={104}
        interval={0}
        tickFormatter={(v: string) => SHORT_BY_LABEL[v] ?? v}
      />
      <Tooltip cursor={chartStyle.barCursor} content={<ChartTooltip units={{ [dataKey]: unit }} />} />
      <Bar
        dataKey={dataKey}
        name={name}
        radius={[0, 4, 4, 0]}
        maxBarSize={chartStyle.bar.maxBarSize}
        isAnimationActive={false}
      >
        {data.map((d) => (
          <Cell key={d.id} fill={colorOf(d.id)} />
        ))}
      </Bar>
    </BarChart>
  );
}

/** Where the bytes come from: each message's size above the transport layer. */
function AppSizes({ sizes, readingBytes }: { sizes: ReturnType<typeof appSizes>; readingBytes: number }) {
  const items: { message: string; inside: ReactNode; bytes: number }[] = [
    { message: "CoAP request", inside: "4 B header, 2 B token, 9 B path “readings”, 1 B marker, reading", bytes: sizes.coapRequest },
    { message: "CoAP ACK", inside: "4 B header and 2 B token", bytes: sizes.coapAck },
    { message: "MQTT PUBLISH, QoS 0", inside: "2 B header, 2 B topic length, topic “home/temp”, reading", bytes: sizes.mqttPublish0 },
    { message: "MQTT PUBLISH, QoS 1", inside: "Same, plus a 2 B packet ID", bytes: sizes.mqttPublish1 },
    { message: "MQTT PUBACK", inside: "2 B header and 2 B packet ID", bytes: sizes.mqttPuback },
    { message: "XMPP message", inside: "XML stanza with from, to and type, reading in <body>", bytes: sizes.xmppStanza },
    { message: "HTTP POST request", inside: "Text request line, Host, Content-Type and Content-Length, reading", bytes: sizes.httpRequest },
    { message: "HTTP 204 response", inside: "Text status line and a Server header", bytes: sizes.httpResponse },
  ];
  return (
    <section aria-labelledby="l11-app-sizes" className="grid grid-cols-1 content-start gap-3 rounded-lg border border-line bg-surface p-4">
      <div>
        <h3 id="l11-app-sizes" className="font-bold">
          What one reading costs at the application layer
        </h3>
        <p className="mt-0.5 text-sm text-ink-2">
          Your reading is {readingBytes} {readingBytes === 1 ? "byte" : "bytes"}. Each packet also carries an IP header
          (20 B) and a UDP (8 B) or TCP (20 B) header.
        </p>
      </div>
      <div className="relative overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="border-b border-line-strong px-2 py-1.5 text-left font-bold">
                Message
              </th>
              <th scope="col" className="border-b border-line-strong px-2 py-1.5 text-right font-bold whitespace-nowrap">
                Size <span className="font-normal text-ink-3">(B)</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.message} className="border-b border-line last:border-0">
                <th scope="row" className="px-2 py-1.5 text-left align-top font-normal">
                  <span className="block font-semibold">{item.message}</span>
                  <span className="block text-ink-2">{item.inside}</span>
                </th>
                <td className="px-2 py-1.5 text-right align-top font-mono tabular-nums">{item.bytes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface Metric {
  label: string;
  unit?: string;
  /** null when there is nothing to compare, e.g. delay with no reading delivered */
  value: (r: RaceResult) => number | null;
  better: "low" | "high";
  word: string;
  /** Only protocols that delivered every reading can be best (lost readings would flatter the average) */
  completeOnly?: boolean;
}

const METRICS: Metric[] = [
  { label: "Bytes per reading", unit: "B", value: (r) => round1(r.bytesPerReading), better: "low", word: "lowest" },
  { label: "Setup", unit: "B", value: (r) => r.setupBytes, better: "low", word: "lowest" },
  { label: "Packets", value: (r) => r.packets, better: "low", word: "fewest" },
  { label: "Total bytes", unit: "B", value: (r) => r.totalBytes, better: "low", word: "lowest" },
  { label: "Delivered", unit: "%", value: (r) => round1(r.deliveredPct), better: "high", word: "highest" },
  {
    label: "Average delay",
    unit: "ms",
    value: (r) => (r.deliveredPct > 0 ? Math.round(r.avgDelayMs) : null),
    better: "low",
    word: "lowest",
    completeOnly: true,
  },
  { label: "Energy per reading", unit: "units", value: (r) => round1(r.energyPerReading), better: "low", word: "lowest" },
];

/** Every metric per protocol, with the best value in each column named in words. */
function ResultsTable({ results, messages, lossPct }: { results: RaceResult[]; messages: number; lossPct: number }) {
  // The best value per column, unless every protocol ties.
  const best = METRICS.map((m) => {
    const values = results
      .filter((r) => !m.completeOnly || r.deliveredPct === 100)
      .map(m.value)
      .filter((v): v is number => v !== null);
    if (values.length < 2) return null;
    const top = m.better === "low" ? Math.min(...values) : Math.max(...values);
    return values.every((v) => v === top) ? null : top;
  });

  return (
    <section aria-labelledby="l11-results" className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-surface p-4">
      <div>
        <h3 id="l11-results" className="font-bold">
          All results
        </h3>
        <p className="mt-0.5 text-sm text-ink-2">
          {messages} {messages === 1 ? "reading" : "readings"} at {lossPct}% loss. A word marks the best value in each
          column.
        </p>
      </div>
      <div className="relative overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="border-b border-line-strong px-2 py-1.5 text-left font-bold">
                Protocol
              </th>
              {METRICS.map((m) => (
                <th key={m.label} scope="col" className="border-b border-line-strong px-2 py-1.5 text-right font-bold">
                  {m.label}
                  {m.unit && <span className="font-normal text-ink-3"> ({m.unit})</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.protocol} className="border-b border-line last:border-0">
                <th scope="row" className="min-w-32 px-2 py-1.5 text-left align-top font-semibold">
                  <span className="flex items-baseline gap-2">
                    <span
                      className="size-2.5 shrink-0 translate-y-px rounded-full"
                      style={{ background: colorOf(r.protocol) }}
                      aria-hidden
                    />
                    {PROTOCOL_LABEL[r.protocol]}
                  </span>
                </th>
                {METRICS.map((m, i) => {
                  const v = m.value(r);
                  const isBest = v !== null && v === best[i];
                  return (
                    <td key={m.label} className="px-2 py-1.5 text-right align-top whitespace-nowrap tabular-nums">
                      {v === null ? "—" : v.toLocaleString("en-IN")}
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
