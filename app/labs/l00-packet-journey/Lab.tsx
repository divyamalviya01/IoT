import { Cloud, Globe, Router, Thermometer, X, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { EventLog, type SimEvent } from "~/components/sim/EventLog";
import { SimControls } from "~/components/sim/SimControls";
import { useSimClock } from "~/components/sim/useSimClock";
import { ChartCard, ChartTooltip, chartStyle, seriesColor } from "~/components/theory/ChartCard";
import { Slider } from "~/components/ui/Slider";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { useObservations } from "~/lib/observations";
import { PacketJourney, STOPS, expectedDeliveryPct, type JourneyConfig } from "./engine";

const lab = getLab("l00-packet-journey")!;
const SEED = 2024;

const STOP_ICONS: LucideIcon[] = [Thermometer, Router, Globe, Cloud];
/** Horizontal position of each stop, as % of the track width */
const STOP_X = [8, 36, 64, 92];

const steps = [
  "Leave the delay at 100 ms and the loss at 0%, then press Start sending.",
  "Watch the packets travel. When the run finishes, press Record observation.",
  "Raise the packet loss to 10%, then 20%. Run and record each time.",
  "Set the loss back to 0% and try a delay of 50 ms and then 300 ms.",
  "Compare your rows, then open the lab record to write the result and print it.",
];

function summarise(rows: ObservationRow[]): string {
  if (rows.length < 2) return "";
  const byLoss = [...rows].sort((a, b) => Number(a.loss) - Number(b.loss));
  const low = byLoss[0];
  const high = byLoss[byLoss.length - 1];
  const parts: string[] = [];
  if (Number(high.loss) > Number(low.loss)) {
    parts.push(
      `When packet loss per link rose from ${low.loss}% to ${high.loss}%, delivered packets fell from ${low.delivered} to ${high.delivered} out of ${high.sent}, because a packet must survive all three links.`,
    );
  }
  const byDelay = [...rows].sort((a, b) => Number(a.delay) - Number(b.delay));
  const fast = byDelay[0];
  const slow = byDelay[byDelay.length - 1];
  if (Number(slow.delay) > Number(fast.delay)) {
    parts.push(
      `Raising the delay per link from ${fast.delay} ms to ${slow.delay} ms raised the average end-to-end delay from ${fast.avgDelay} ms to ${slow.avgDelay} ms, about three times the link delay.`,
    );
  }
  return parts.join(" ");
}

export default function PacketJourneyLab() {
  const [config, setConfig] = useState<JourneyConfig>({
    delayMs: 100,
    lossPct: 0,
    packetCount: 20,
    intervalMs: 600,
  });
  // Read by onReset, which may run before React re-renders with new settings.
  const configRef = useRef(config);
  const journey = useRef(new PacketJourney(config, SEED));
  const [events, setEvents] = useState<SimEvent[]>([]);
  const eventId = useRef(0);
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAutoSummary = useRef("");

  const onTick = useCallback((dt: number) => {
    const happened = journey.current.advance(dt);
    if (happened.length) {
      setEvents((prev) => [
        ...prev,
        ...happened.map((e) => ({
          id: ++eventId.current,
          t: e.t,
          text: e.text,
          kind: e.kind,
          tone: e.kind === "lost" ? ("bad" as const) : e.kind === "delivered" ? ("ok" as const) : ("info" as const),
        })),
      ]);
    }
  }, []);

  const onReset = useCallback(() => {
    journey.current = new PacketJourney(configRef.current, SEED);
    setEvents([]);
  }, []);

  const clock = useSimClock({ onTick, onReset, stepMs: 100 });

  const updateConfig = (patch: Partial<JourneyConfig>) => {
    const next = { ...config, ...patch };
    configRef.current = next;
    setConfig(next);
    // A new setting means a new run.
    clock.reset();
  };

  const j = journey.current;
  const stats = j.stats;

  // Stop the clock once every packet has arrived or been lost.
  useEffect(() => {
    if (clock.running && journey.current.done) clock.pause();
  }, [clock.running, clock.timeMs, clock]);

  const chartData = useMemo(
    () =>
      j.packets
        .filter((p) => p.endAt <= clock.timeMs)
        .map((p) => ({
          packet: p.id,
          delay: p.lostAtHop === null ? Math.round(p.endAt - p.sentAt) : null,
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clock.timeMs, j],
  );

  const record = () => {
    const row: ObservationRow = {
      delay: config.delayMs,
      loss: config.lossPct,
      sent: stats.sent,
      delivered: stats.delivered,
      lost: stats.lost,
      avgDelay: Math.round(stats.avgDelayMs),
    };
    addRow(row);
    const auto = summarise([...rows, row]);
    if (auto && (summary === "" || summary === lastAutoSummary.current)) {
      setSummary(auto);
      lastAutoSummary.current = auto;
    }
  };

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordDisabled={!j.done}
      recordHint={
        j.done
          ? "Adds this run to the observation table below."
          : "Finish a run first: every packet must arrive or be lost."
      }
      controls={
        <>
          <Slider
            label="Delay per link"
            value={config.delayMs}
            min={20}
            max={500}
            step={10}
            unit="ms"
            onChange={(delayMs) => updateConfig({ delayMs })}
            hint="Time each link adds. There are three links."
          />
          <Slider
            label="Packet loss per link"
            value={config.lossPct}
            min={0}
            max={40}
            step={5}
            unit="%"
            onChange={(lossPct) => updateConfig({ lossPct })}
            hint={`Expected delivery: about ${Math.round(expectedDeliveryPct(config.lossPct))}% of packets.`}
          />
          <Slider
            label="Packets to send"
            value={config.packetCount}
            min={5}
            max={50}
            step={5}
            onChange={(packetCount) => updateConfig({ packetCount })}
          />
          <Slider
            label="Send a packet every"
            value={config.intervalMs}
            min={200}
            max={2000}
            step={100}
            unit="ms"
            onChange={(intervalMs) => updateConfig({ intervalMs })}
          />
          <p className="text-sm text-ink-3">Changing a setting starts a new run.</p>
        </>
      }
      stage={<Track journey={j} timeMs={clock.timeMs} />}
      toolbar={<SimControls clock={clock} playLabel="Start sending" />}
      readouts={
        <>
          <Readouts
            items={[
              { label: "Sent", value: `${stats.sent} / ${config.packetCount}` },
              { label: "Delivered", value: stats.delivered, tone: stats.delivered ? "ok" : "default" },
              { label: "Lost", value: stats.lost, tone: stats.lost ? "bad" : "default" },
              {
                label: "Average delay",
                value: stats.delivered ? Math.round(stats.avgDelayMs) : "—",
                unit: stats.delivered ? "ms" : undefined,
              },
            ]}
          />
          <ChartCard
            title="End-to-end delay of each packet"
            description="Gaps are packets that were lost on the way."
            data={chartData}
            xKey="packet"
            xLabel="Packet"
            series={[{ key: "delay", label: "Delay", unit: "ms" }]}
            height={200}
            emptyText="The chart fills in as packets arrive."
          >
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid {...chartStyle.grid} />
              <XAxis dataKey="packet" {...chartStyle.axis} />
              <YAxis {...chartStyle.axis} unit=" ms" width={64} />
              <Tooltip
                cursor={chartStyle.barCursor}
                content={<ChartTooltip labelPrefix="Packet " units={{ delay: "ms" }} />}
              />
              <Bar
                dataKey="delay"
                name="Delay"
                fill={seriesColor(0)}
                radius={chartStyle.bar.radius}
                maxBarSize={chartStyle.bar.maxBarSize}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartCard>
        </>
      }
      log={
        <EventLog
          events={events}
          filters={[
            { kind: "sent", label: "Sent" },
            { kind: "delivered", label: "Delivered" },
            { kind: "lost", label: "Lost" },
          ]}
          emptyText="Press Start sending to send the first packet."
        />
      }
    />
  );
}

interface TrackShape {
  id: number;
  /** Horizontal position, % of track width */
  x: number;
  kind: "moving" | "lost" | "arrived";
}

/** The four stops with packets drawn at their live positions. */
function Track({ journey, timeMs }: { journey: PacketJourney; timeMs: number }) {
  const shapes = journey.packets.flatMap((p): TrackShape[] => {
    const pos = journey.positionOf(p, timeMs);
    if (!pos) return [];
    if (pos.state === "arrived") {
      // Show a short pulse at the cloud, then remove.
      return timeMs - pos.since < 400 ? [{ id: p.id, x: STOP_X[3], kind: "arrived" }] : [];
    }
    const x = STOP_X[pos.link] + (STOP_X[pos.link + 1] - STOP_X[pos.link]) * pos.progress;
    if (pos.state === "lost") {
      return timeMs - pos.since < 900 ? [{ id: p.id, x, kind: "lost" }] : [];
    }
    return [{ id: p.id, x, kind: "moving" }];
  });

  return (
    <div
      className="relative h-56 px-2"
      role="img"
      aria-label={`Packets travelling from sensor to cloud. ${journey.stats.delivered} delivered, ${journey.stats.lost} lost, ${journey.stats.inFlight} on the way.`}
    >
      {/* Links between stops */}
      {STOP_X.slice(0, -1).map((x, i) => (
        <span
          key={i}
          className="absolute top-[38%] h-0.5 -translate-y-1/2 bg-line-strong"
          style={{ left: `${x}%`, width: `${STOP_X[i + 1] - x}%` }}
          aria-hidden
        />
      ))}

      {/* Stops */}
      {STOPS.map((name, i) => {
        const Icon = STOP_ICONS[i];
        return (
          <div
            key={name}
            className="absolute top-[38%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${STOP_X[i]}%` }}
            aria-hidden
          >
            <span className="flex size-12 items-center justify-center rounded-full border-2 border-line-strong bg-surface sm:size-14">
              <Icon size={22} className="text-ink-2" />
            </span>
          </div>
        );
      })}
      {STOPS.map((name, i) => (
        <span
          key={`${name}-label`}
          className="absolute top-[60%] -translate-x-1/2 text-sm font-semibold text-ink-2"
          style={{ left: `${STOP_X[i]}%` }}
          aria-hidden
        >
          {name}
        </span>
      ))}

      {/* Packets */}
      {shapes.map((s) =>
        s.kind === "lost" ? (
          <span
            key={s.id}
            className="absolute top-[38%] flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-bad-soft text-bad"
            style={{ left: `${s.x}%` }}
            aria-hidden
          >
            <X size={16} strokeWidth={3} />
          </span>
        ) : (
          <span
            key={s.id}
            className={
              s.kind === "arrived"
                ? "absolute top-[38%] size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ok opacity-60"
                : "absolute top-[38%] size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand shadow-[0_0_0_3px_var(--surface)]"
            }
            style={{ left: `${s.x}%` }}
            aria-hidden
          />
        ),
      )}

      <p className="absolute inset-x-0 bottom-3 text-center text-sm text-ink-3">
        {journey.stats.inFlight > 0
          ? `${journey.stats.inFlight} packet${journey.stats.inFlight === 1 ? "" : "s"} on the way`
          : journey.done
            ? "Run complete. Record your observation."
            : "Ready"}
      </p>
    </div>
  );
}
