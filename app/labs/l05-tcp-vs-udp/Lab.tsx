import { Server, Shuffle, Thermometer, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
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
import {
  buildUdp,
  runTransfer,
  tcpSegmentBytes,
  udpDatagramBytes,
  verifyUdp,
  type Flight,
  type Protocol,
  type TransferResult,
} from "./engine";

const lab = getLab("l05-tcp-vs-udp")!;
const PAYLOAD = 20;
const NAME: Record<Protocol, string> = { tcp: "TCP", udp: "UDP" };
/** Each protocol keeps one colour in the chart. */
const COLOR: Record<Protocol, string> = { tcp: seriesColor(0), udp: seriesColor(1) };
/** A lost packet disappears halfway along the link. */
const lostAt = (f: Flight) => (f.t0 + f.t1) / 2;

const steps = [
  "Leave the loss at 10% and press Start sending. Both protocols send the same readings over the same link.",
  "Watch the TCP lane: a handshake first, an ACK for every reading, and a resend when something is lost. In the UDP lane a lost reading is simply gone.",
  "When the run ends, press Record observation. It adds one row for TCP and one for UDP.",
  "Run again at 0% and at 30% loss, recording each time. Press Try different luck to see another random pattern of losses.",
  "Read the chart: one lost TCP reading also holds up the readings behind it.",
  "Build a UDP datagram in the header inspector below the lab and look at its 8-byte header.",
];

interface Config {
  packets: number;
  lossPct: number;
  delayMs: number;
  intervalMs: number;
  seed: number;
}

interface Run {
  results: Record<Protocol, TransferResult>;
  /** First send time of each reading, by reading number */
  firstSend: Record<Protocol, Map<number, number>>;
  /** When each reading first reached the server */
  arrival: Record<Protocol, Map<number, number>>;
  /** When TCP hands each reading to the app (in order) */
  tcpToApp: Map<number, number>;
  events: SimEvent[];
  endMs: number;
}

function flightBytes(protocol: Protocol, f: Flight) {
  if (protocol === "udp") return udpDatagramBytes(PAYLOAD);
  return tcpSegmentBytes(f.kind === "data" ? PAYLOAD : 0);
}

function flightName(f: Flight) {
  if (f.kind === "data") return `reading ${f.packet}${f.retransmission ? " (resent)" : ""}`;
  return f.retransmission ? `${f.label} (resent)` : f.label;
}

function buildRun(c: Config): Run {
  const common = { packets: c.packets, lossPct: c.lossPct, delayMs: c.delayMs, intervalMs: c.intervalMs, payloadBytes: PAYLOAD, seed: c.seed };
  const results = {
    tcp: runTransfer({ ...common, protocol: "tcp" }),
    // A different seed, so the two lanes don't lose exactly the same packets.
    udp: runTransfer({ ...common, protocol: "udp", seed: c.seed + 7919 }),
  };
  const firstSend = { tcp: new Map<number, number>(), udp: new Map<number, number>() };
  const arrival = { tcp: new Map<number, number>(), udp: new Map<number, number>() };
  const events: Omit<SimEvent, "id">[] = [];
  let endMs = 0;

  for (const p of ["tcp", "udp"] as Protocol[]) {
    for (const f of results[p].flights) {
      if (f.kind === "data" && f.packet) {
        if (!firstSend[p].has(f.packet)) firstSend[p].set(f.packet, f.t0);
        if (!f.lost && !arrival[p].has(f.packet)) arrival[p].set(f.packet, f.t1);
      }
      const t = f.lost ? lostAt(f) : f.t1;
      endMs = Math.max(endMs, f.t1);
      events.push({
        t,
        kind: f.lost ? "lost" : p,
        tone: f.lost ? "bad" : f.retransmission ? "warn" : f.kind === "data" ? "ok" : "info",
        text: `${NAME[p]}: ${flightName(f)} ${f.lost ? "lost on the way" : f.dir === "up" ? "reached the server" : "reached the sensor"}`,
      });
    }
  }

  // TCP gives readings to the app strictly in order, so a missing one holds up the rest.
  const tcpToApp = new Map<number, number>();
  let prev = 0;
  for (let n = 1; n <= c.packets; n++) {
    const a = arrival.tcp.get(n);
    if (a === undefined) break;
    prev = Math.max(prev, a);
    tcpToApp.set(n, prev);
  }

  events.sort((a, b) => a.t - b.t);
  return {
    results,
    firstSend,
    arrival,
    tcpToApp,
    events: events.map((e, i) => ({ ...e, id: i + 1 })),
    endMs: endMs + 200,
  };
}

interface LiveStats {
  delivered: number;
  lostFlights: number;
  resent: number;
  bytes: number;
  controls: number;
}

function liveStats(run: Run, p: Protocol, t: number): LiveStats {
  const s: LiveStats = { delivered: 0, lostFlights: 0, resent: 0, bytes: 0, controls: 0 };
  for (const f of run.results[p].flights) {
    if (f.t0 > t) continue;
    s.bytes += flightBytes(p, f);
    if (f.retransmission) s.resent++;
    if (f.kind !== "data") s.controls++;
    if (f.lost && lostAt(f) <= t) s.lostFlights++;
  }
  for (const a of run.arrival[p].values()) if (a <= t) s.delivered++;
  return s;
}

function fmtMs(ms: number) {
  return ms >= 10_000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms).toLocaleString("en-IN")} ms`;
}

function summarise(rows: ObservationRow[]): string {
  // Pair the TCP and UDP rows of each run (they are always recorded together).
  const runs: { tcp: ObservationRow; udp: ObservationRow }[] = [];
  for (let i = 0; i + 1 < rows.length; i++) {
    if (rows[i].protocol === "TCP" && rows[i + 1].protocol === "UDP") runs.push({ tcp: rows[i], udp: rows[i + 1] });
  }
  if (!runs.length) return "";
  const latestByLoss = new Map<number, (typeof runs)[number]>();
  for (const r of runs) latestByLoss.set(Number(r.tcp.loss), r);
  const sorted = [...latestByLoss.entries()].sort((a, b) => a[0] - b[0]);

  const sentences = sorted.map(([loss, { tcp, udp }]) => {
    const resent = Number(tcp.resent);
    return `At ${loss}% loss, TCP delivered ${tcp.delivered} readings${resent ? ` after ${resent} resend${resent === 1 ? "" : "s"}` : ""} in ${tcp.time}, sending ${tcp.bytes} bytes; UDP delivered ${udp.delivered} in ${udp.time}, sending ${udp.bytes} bytes.`;
  });

  const lossy = sorted.filter(([loss]) => loss > 0).map(([, r]) => r);
  const tcpComplete = lossy.length > 0 && lossy.every((r) => Number(r.tcp.lost) === 0);
  const udpLost = lossy.some((r) => Number(r.udp.lost) > 0);
  const tcpHeavier = runs.every((r) => Number(r.tcp.bytes) > Number(r.udp.bytes));
  if (tcpComplete && udpLost) {
    sentences.push(
      `On a lossy link TCP still delivered every reading by resending, while UDP lost some.${tcpHeavier ? " TCP paid for this with extra bytes for the handshake, ACKs and resends, and with extra time." : ""}`,
    );
  } else if (tcpHeavier) {
    sentences.push("TCP always sent more bytes than UDP because of its handshake and ACKs.");
  }
  return sentences.join(" ");
}

export default function TcpVsUdpLab() {
  const [config, setConfig] = useState<Config>({ packets: 12, lossPct: 10, delayMs: 100, intervalMs: 400, seed: 1 });
  const run = useMemo(() => buildRun(config), [config]);
  const clock = useSimClock({ onTick: () => {}, stepMs: 100 });
  const t = clock.timeMs;
  const done = t >= run.endMs;
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");

  // Stop the clock once both transfers have finished.
  useEffect(() => {
    if (clock.running && done) clock.pause();
  }, [clock, done]);

  const update = (patch: Partial<Config>) => {
    setConfig((c) => ({ ...c, ...patch }));
    // A new setting means a new run.
    clock.reset();
  };

  const stats = { tcp: liveStats(run, "tcp", t), udp: liveStats(run, "udp", t) };
  const events = run.events.filter((e) => e.t <= t);

  const chartData = Array.from({ length: config.packets }, (_, i) => {
    const n = i + 1;
    const tcpApp = run.tcpToApp.get(n);
    const udpArr = run.arrival.udp.get(n);
    return {
      reading: n,
      tcp: tcpApp !== undefined && tcpApp <= t ? Math.round(tcpApp - run.firstSend.tcp.get(n)!) : null,
      udp: udpArr !== undefined && udpArr <= t ? Math.round(udpArr - run.firstSend.udp.get(n)!) : null,
    };
  });

  const record = () => {
    const made = (["tcp", "udp"] as Protocol[]).map((p): ObservationRow => {
      const r = run.results[p];
      return {
        loss: config.lossPct,
        delay: config.delayMs,
        protocol: NAME[p],
        delivered: `${r.delivered} / ${config.packets}`,
        lost: r.lost,
        resent: r.retransmissions,
        time: fmtMs(r.completionMs),
        bytes: r.bytesOnWire,
      };
    });
    made.forEach(addRow);
    const auto = summarise([...rows, ...made]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordDisabled={!done}
      recordHint={done ? "Adds one row for TCP and one for UDP." : "Finish a run first: wait until both lanes are complete."}
      controls={
        <>
          <Slider
            label="Packet loss"
            value={config.lossPct}
            min={0}
            max={40}
            step={5}
            unit="%"
            onChange={(lossPct) => update({ lossPct })}
            hint="Chance that any one packet, in either direction, is lost."
          />
          <Slider
            label="One-way delay"
            value={config.delayMs}
            min={20}
            max={300}
            step={10}
            unit="ms"
            onChange={(delayMs) => update({ delayMs })}
          />
          <Slider
            label="Readings to send"
            value={config.packets}
            min={4}
            max={30}
            step={1}
            onChange={(packets) => update({ packets })}
          />
          <Slider
            label="Send a reading every"
            value={config.intervalMs}
            min={200}
            max={1000}
            step={50}
            unit="ms"
            onChange={(intervalMs) => update({ intervalMs })}
          />
          <Button onClick={() => update({ seed: config.seed + 1 })} icon={<Shuffle size={16} aria-hidden />}>
            Try different luck
          </Button>
          <p className="text-sm text-ink-3">
            Each reading carries {PAYLOAD} bytes of data. Changing a setting starts a new run.
          </p>
        </>
      }
      stage={
        <div className="grid grid-cols-1 gap-2 p-3 sm:p-4">
          <Lane protocol="tcp" run={run} t={t} packets={config.packets} />
          <Lane protocol="udp" run={run} t={t} packets={config.packets} />
          <p className="text-sm text-ink-3" aria-live="polite">
            {done
              ? "Run complete. Record your observation."
              : t === 0
                ? "Ready. Press Start sending."
                : "Data goes right along the top of each lane; TCP's ACKs come back along the bottom."}
          </p>
        </div>
      }
      toolbar={<SimControls clock={clock} playLabel="Start sending" />}
      readouts={
        <>
          <div className="grid grid-cols-1 gap-3">
            {(["tcp", "udp"] as Protocol[]).map((p) => {
              const s = stats[p];
              const r = run.results[p];
              return (
                <div key={p} className="grid gap-1.5">
                  <h4 className="flex items-center gap-2 text-sm font-bold">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: COLOR[p] }} aria-hidden />
                    {NAME[p]}
                  </h4>
                  <Readouts
                    items={[
                      { label: "Delivered", value: `${s.delivered} / ${config.packets}`, tone: done ? (s.delivered === config.packets ? "ok" : "bad") : "default" },
                      p === "tcp"
                        ? { label: "Resent", value: s.resent, tone: s.resent ? "warn" : "default" }
                        : { label: "Lost", value: s.lostFlights, tone: s.lostFlights ? "bad" : "default" },
                      { label: "Finished at", value: done ? fmtMs(r.completionMs) : "—" },
                      { label: "Bytes sent", value: s.bytes.toLocaleString("en-IN") },
                    ]}
                  />
                </div>
              );
            })}
          </div>
          <ChartCard
            title="Time until the app gets each reading"
            description="Gaps are readings that never arrived. TCP hands readings over in order, so a resend also delays the ones behind it."
            data={chartData}
            xKey="reading"
            xLabel="Reading"
            series={[
              { key: "tcp", label: "TCP", unit: "ms", color: COLOR.tcp },
              { key: "udp", label: "UDP", unit: "ms", color: COLOR.udp },
            ]}
            height={220}
            emptyText="The chart fills in as readings arrive."
          >
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid {...chartStyle.grid} />
              <XAxis dataKey="reading" {...chartStyle.axis} />
              <YAxis {...chartStyle.axis} unit=" ms" width={70} />
              <Tooltip cursor={chartStyle.barCursor} content={<ChartTooltip labelPrefix="Reading " units={{ tcp: "ms", udp: "ms" }} />} />
              <Bar dataKey="tcp" name="TCP" fill={COLOR.tcp} radius={chartStyle.bar.radius} maxBarSize={chartStyle.bar.maxBarSize} isAnimationActive={false} />
              <Bar dataKey="udp" name="UDP" fill={COLOR.udp} radius={chartStyle.bar.radius} maxBarSize={chartStyle.bar.maxBarSize} isAnimationActive={false} />
            </BarChart>
          </ChartCard>
        </>
      }
      log={
        <>
          <EventLog
            events={events}
            filters={[
              { kind: "tcp", label: "TCP" },
              { kind: "udp", label: "UDP" },
              { kind: "lost", label: "Lost" },
            ]}
            emptyText="Press Start sending to send the first packets."
          />
          <UdpInspector />
        </>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* One lane: sensor on the left, server on the right                   */
/* ------------------------------------------------------------------ */

const X0 = 9;
const X1 = 91;

function Lane({ protocol, run, t, packets }: { protocol: Protocol; run: Run; t: number; packets: number }) {
  const result = run.results[protocol];
  const chips = result.flights.flatMap((f, i) => {
    const end = f.lost ? lostAt(f) : f.t1;
    if (t < f.t0) return [];
    if (f.lost && t >= end) {
      // Show where it was lost for a moment.
      if (t - end > 700) return [];
    } else if (t >= end) return [];
    const progress = Math.min(1, (Math.min(t, end) - f.t0) / (f.t1 - f.t0));
    const along = f.dir === "up" ? progress : 1 - progress;
    return [{ key: i, f, x: X0 + (X1 - X0) * along, gone: f.lost && t >= end }];
  });

  const status = (n: number): "waiting" | "buffered" | "delivered" | "lost" => {
    const a = run.arrival[protocol].get(n);
    if (protocol === "tcp") {
      const app = run.tcpToApp.get(n);
      if (app !== undefined && app <= t) return "delivered";
      if (a !== undefined && a <= t) return "buffered";
      return "waiting";
    }
    if (a !== undefined && a <= t) return "delivered";
    const lost = result.flights.find((f) => f.packet === n && f.lost);
    return lost && lostAt(lost) <= t ? "lost" : "waiting";
  };

  const statuses = Array.from({ length: packets }, (_, i) => status(i + 1));
  const delivered = statuses.filter((s) => s === "delivered").length;

  return (
    <div className="grid gap-1.5 rounded-lg border border-line bg-surface-2 p-2.5">
      <div className="flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: COLOR[protocol] }} aria-hidden />
        <span className="font-bold">{NAME[protocol]}</span>
        <span className="text-sm text-ink-3">
          {protocol === "tcp" ? "connection, ACKs and resends" : "fire and forget"}
        </span>
      </div>
      <div
        className="relative h-24"
        role="img"
        aria-label={`${NAME[protocol]} lane. ${delivered} of ${packets} readings delivered to the app so far.`}
      >
        <span className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-line-strong" style={{ left: `${X0}%`, right: `${100 - X1}%` }} aria-hidden />
        <Endpoint x={X0} icon={<Thermometer size={18} className="text-ink-2" />} label="Sensor" />
        <Endpoint x={X1} icon={<Server size={18} className="text-ink-2" />} label="Server" />
        {chips.map(({ key, f, x, gone }) =>
          gone ? (
            <span
              key={key}
              className={cn(
                "absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-bad-soft text-bad",
                f.dir === "up" ? "top-[30%]" : "top-[70%]",
              )}
              style={{ left: `${x}%` }}
              aria-hidden
            >
              <X size={14} strokeWidth={3} />
            </span>
          ) : (
            <span
              key={key}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border px-1.5 font-mono text-xs leading-5 shadow-[0_0_0_2px_var(--surface-2)]",
                f.dir === "up" ? "top-[30%]" : "top-[70%]",
                f.kind === "data"
                  ? f.retransmission
                    ? "border-warn bg-warn-soft text-ink"
                    : "border-brand bg-brand-soft text-ink"
                  : f.kind === "ack"
                    ? "border-ok bg-ok-soft text-ink"
                    : "border-line-strong bg-surface text-ink",
              )}
              style={{ left: `${x}%` }}
              aria-hidden
            >
              {f.kind === "data" ? f.packet : f.label}
            </span>
          ),
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1" aria-label={`Readings at the server app: ${delivered} delivered`}>
        <span className="mr-1 text-xs text-ink-3">App got:</span>
        {statuses.map((s, i) => (
          <span
            key={i}
            title={`Reading ${i + 1}: ${s}`}
            className={cn(
              "flex size-5 items-center justify-center rounded font-mono text-[0.65rem] leading-none",
              s === "delivered" && "bg-ok text-surface",
              s === "buffered" && "border border-dashed border-warn text-ink",
              s === "lost" && "bg-bad-soft text-bad",
              s === "waiting" && "border border-line text-ink-3",
            )}
          >
            {s === "lost" ? <X size={11} strokeWidth={3} aria-hidden /> : i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}

function Endpoint({ x, icon, label }: { x: number; icon: ReactNode; label: string }) {
  return (
    <span className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5" style={{ left: `${x}%` }} aria-hidden>
      <span className="flex size-9 items-center justify-center rounded-full border-2 border-line-strong bg-surface">{icon}</span>
      <span className="absolute top-full mt-0.5 text-[0.7rem] font-semibold text-ink-3">{label}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* UDP header inspector                                                */
/* ------------------------------------------------------------------ */

const SRC_IP = "192.168.1.20";
const DST_IP = "192.168.1.10";

const hex2 = (b: number) => b.toString(16).padStart(2, "0");

function portError(v: string) {
  const n = Number(v);
  return /^\d+$/.test(v) && n >= 0 && n <= 65535 ? null : "Enter a whole number from 0 to 65535.";
}

function UdpInspector() {
  const [src, setSrc] = useState("49152");
  const [dst, setDst] = useState("5683");
  const [payload, setPayload] = useState("28.5");
  const [flip, setFlip] = useState(false);
  const srcErr = portError(src);
  const dstErr = portError(dst);
  const ok = !srcErr && !dstErr;

  const dg = ok ? buildUdp(SRC_IP, DST_IP, Number(src), Number(dst), payload) : null;
  const received = dg ? dg.bytes.map((b, i) => (flip && i === 8 ? b ^ 0x01 : b)) : [];
  const valid = dg ? verifyUdp(SRC_IP, DST_IP, received) : false;
  const canFlip = payload.length > 0;

  const fields = dg
    ? [
        { name: "Source port", bytes: dg.bytes.slice(0, 2), value: String(dg.srcPort), meaning: "The sender's port, so a reply can find the right program." },
        { name: "Destination port", bytes: dg.bytes.slice(2, 4), value: String(dg.dstPort), meaning: dg.dstPort === 5683 ? "5683 is CoAP's standard port." : "Which program on the server gets the data." },
        { name: "Length", bytes: dg.bytes.slice(4, 6), value: `${dg.length} bytes`, meaning: `8-byte header + ${dg.length - 8}-byte payload.` },
        { name: "Checksum", bytes: dg.bytes.slice(6, 8), value: `0x${dg.checksum.toString(16).padStart(4, "0")}`, meaning: "Lets the receiver detect damaged data." },
      ]
    : [];

  const input = "h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3 font-mono";

  return (
    <section aria-labelledby="l05-udp-inspector" className="grid grid-cols-1 gap-4 rounded-lg border border-line bg-surface p-4">
      <div className="grid gap-1">
        <h3 id="l05-udp-inspector" className="text-h3 font-bold">
          UDP header inspector
        </h3>
        <p className="max-w-[70ch] text-ink-2">
          A UDP datagram has only four header fields, 8 bytes in total. Change the values and see the bytes that go on the wire.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="grid min-w-0 gap-1.5">
          <span className="text-[0.95rem] font-semibold">Source port</span>
          <input className={input} inputMode="numeric" value={src} onChange={(e) => setSrc(e.target.value.trim())} aria-invalid={!!srcErr} />
          {srcErr && <span className="text-sm text-bad">{srcErr}</span>}
        </label>
        <label className="grid min-w-0 gap-1.5">
          <span className="text-[0.95rem] font-semibold">Destination port</span>
          <input className={input} inputMode="numeric" value={dst} onChange={(e) => setDst(e.target.value.trim())} aria-invalid={!!dstErr} />
          {dstErr && <span className="text-sm text-bad">{dstErr}</span>}
        </label>
        <label className="grid min-w-0 gap-1.5">
          <span className="text-[0.95rem] font-semibold">Payload (text)</span>
          <input className={input} maxLength={24} value={payload} onChange={(e) => setPayload(e.target.value)} />
        </label>
      </div>

      {dg && (
        <>
          <div className="relative overflow-x-auto rounded-lg border border-line">
            <table className="w-full border-collapse text-[0.95rem]">
              <caption className="sr-only">UDP header fields</caption>
              <thead className="bg-surface-2">
                <tr>
                  {["Field", "Bytes (hex)", "Value", "What it means"].map((h) => (
                    <th key={h} scope="col" className="border-b border-line-strong px-3 py-2 text-left font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fields.map((f) => (
                  <tr key={f.name} className="border-b border-line last:border-b-0">
                    <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-semibold">
                      {f.name}
                    </th>
                    <td className="whitespace-nowrap px-3 py-2 font-mono">{f.bytes.map(hex2).join(" ")}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono">{f.value}</td>
                    <td className="min-w-48 px-3 py-2 text-ink-2">{f.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-1.5">
            <p className="text-sm font-semibold text-ink-2">
              The whole datagram, {dg.bytes.length} bytes (header first, then the payload)
            </p>
            <p className="flex flex-wrap gap-1 font-mono text-sm">
              {received.map((b, i) => (
                <span
                  key={i}
                  className={cn(
                    "rounded px-1 py-0.5",
                    i < 8 ? "bg-u2-soft" : "bg-surface-2",
                    flip && i === 8 && "bg-bad-soft text-bad",
                  )}
                >
                  {hex2(b)}
                </span>
              ))}
            </p>
            <p className="text-sm text-ink-3">
              Over IPv4 this datagram becomes {20 + dg.length} bytes. The same data over TCP needs at least {20 + 20 + (dg.length - 8)} bytes, plus the handshake and ACKs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={flip && canFlip} disabled={!canFlip} onChange={(e) => setFlip(e.target.checked)} />
              <span>Damage one bit of the payload on the way</span>
            </label>
            <p
              className={cn("rounded-md px-2.5 py-1 text-sm font-semibold", valid ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad")}
              aria-live="polite"
            >
              {valid
                ? "Checksum OK: the server accepts the datagram."
                : "Checksum wrong: the server throws the datagram away. UDP does not ask for it again."}
            </p>
          </div>
        </>
      )}
    </section>
  );
}
