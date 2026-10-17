import { useState } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, Tooltip } from "recharts";
import { ChartCard, ChartTooltip, seriesColor } from "~/components/theory/ChartCard";
import { cn } from "~/lib/cn";

const PROTOCOLS = ["MQTT", "CoAP", "HTTP", "XMPP", "AMQP"] as const;
type Protocol = (typeof PROTOCOLS)[number];

/** Relative scores for teaching: 5 is best on each criterion. */
const SCORES: Record<string, Record<Protocol, number>> = {
  "Low overhead": { MQTT: 4, CoAP: 5, HTTP: 1, XMPP: 1, AMQP: 2 },
  "Low delay": { MQTT: 4, CoAP: 5, HTTP: 2, XMPP: 3, AMQP: 3 },
  "Reliability options": { MQTT: 5, CoAP: 3, HTTP: 3, XMPP: 3, AMQP: 5 },
  "Low power": { MQTT: 4, CoAP: 5, HTTP: 2, XMPP: 2, AMQP: 2 },
  "Easy to use": { MQTT: 4, CoAP: 3, HTTP: 5, XMPP: 2, AMQP: 2 },
  "Server push": { MQTT: 5, CoAP: 4, HTTP: 1, XMPP: 5, AMQP: 4 },
};

const WHY: Record<Protocol, string> = {
  MQTT: "Tiny binary header, publish–subscribe and three QoS levels. Needs a broker and a TCP connection.",
  CoAP: "The lightest: UDP, 4-byte header and no connection. Reliability is simple (CON/NON); Observe gives push.",
  HTTP: "Easy and universal, but heavy text headers, TCP handshakes and no server push.",
  XMPP: "Presence and push built in, but verbose XML and an always-open TCP connection.",
  AMQP: "Strong delivery guarantees and queues for back ends, but heavy for small devices.",
};

const data = Object.entries(SCORES).map(([criterion, s]) => ({ criterion, ...s }));
const MAX_SELECTED = 3;

export default function ProtocolRadar() {
  const [selected, setSelected] = useState<Protocol[]>(["MQTT", "CoAP", "HTTP"]);

  const toggle = (p: Protocol) =>
    setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : s.length < MAX_SELECTED ? [...s, p] : s));

  // Colour follows the protocol, not its position in the selection.
  const shown = PROTOCOLS.filter((p) => selected.includes(p));

  return (
    <div className="grid grid-cols-1 gap-6">
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 font-semibold">Compare up to three protocols</legend>
        <div className="flex flex-wrap gap-2">
          {PROTOCOLS.map((p, i) => {
            const on = selected.includes(p);
            const disabled = !on && selected.length >= MAX_SELECTED;
            return (
              <label
                key={p}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
                  on ? "border-line-strong bg-surface" : "border-line bg-surface-2 text-ink-3",
                  disabled && "cursor-not-allowed opacity-60",
                )}
              >
                <input type="checkbox" className="sr-only" checked={on} disabled={disabled} onChange={() => toggle(p)} />
                <span
                  className="size-3 rounded-full"
                  style={{ background: on ? seriesColor(i) : "var(--line-strong)" }}
                  aria-hidden
                />
                {p}
              </label>
            );
          })}
        </div>
        {selected.length >= MAX_SELECTED && (
          <p className="text-sm text-ink-3">Three selected. Remove one to add another.</p>
        )}
      </fieldset>

      <ChartCard
        title="How the protocols compare"
        description="Relative scores for teaching, where 5 is best. Bigger shapes are not always better: pick the protocol whose strengths match your job."
        data={data}
        xKey="criterion"
        xLabel="Criterion"
        series={shown.map((p) => ({ key: p, label: p, color: seriesColor(PROTOCOLS.indexOf(p)) }))}
        height={380}
        emptyText="Select at least one protocol."
      >
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--line)" />
          <PolarAngleAxis dataKey="criterion" tick={{ fill: "var(--ink-2)", fontSize: 13 }} />
          <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fill: "var(--ink-3)", fontSize: 11 }} axisLine={false} />
          <Tooltip content={<ChartTooltip />} />
          {shown.map((p) => {
            const color = seriesColor(PROTOCOLS.indexOf(p));
            return (
              <Radar
                key={p}
                dataKey={p}
                name={p}
                stroke={color}
                strokeWidth={2}
                fill={color}
                fillOpacity={0.1}
                dot={{ r: 3, fill: color, stroke: "var(--surface)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            );
          })}
        </RadarChart>
      </ChartCard>

      <ul className="grid gap-2 md:grid-cols-2" aria-label="What each shape means">
        {shown.map((p) => (
          <li key={p} className="flex gap-3 rounded-lg border border-line bg-surface p-3">
            <span
              className="mt-1.5 size-3 shrink-0 rounded-full"
              style={{ background: seriesColor(PROTOCOLS.indexOf(p)) }}
              aria-hidden
            />
            <span>
              <span className="font-bold">{p}: </span>
              <span className="text-ink-2">{WHY[p]}</span>
            </span>
          </li>
        ))}
      </ul>

      <section aria-labelledby="radar-notice" className="max-w-[70ch]">
        <h2 id="radar-notice" className="text-h3 font-bold">
          What to notice
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2 marker:text-ink-3">
          <li>CoAP leads on overhead, delay and power because it uses UDP and a 4-byte header.</li>
          <li>HTTP is the easiest to use but the heaviest, and it has no server push.</li>
          <li>MQTT is the best all-rounder for telemetry, with strong reliability options.</li>
          <li>No single shape covers every corner: that is why real systems mix protocols. Lab L11 measures the difference.</li>
        </ul>
      </section>
    </div>
  );
}
