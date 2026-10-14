import { motion, useReducedMotion } from "motion/react";
import { Check, Cloud, Cpu, Router, Server, X, type LucideIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { ChartCard, ChartTooltip, chartStyle, seriesColor } from "~/components/theory/ChartCard";
import { Segmented } from "~/components/ui/Segmented";
import { Slider } from "~/components/ui/Slider";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import {
  SCENARIOS,
  TIERS,
  TIER_PARAMS,
  evaluateAll,
  formatDeadline,
  formatLatency,
  meetsDeadline,
  type Tier,
} from "./engine";

const lab = getLab("l03-edge-fog-cloud")!;

const steps = [
  "Choose a scenario and read its deadline.",
  "Choose where to process the data: edge, fog or cloud. Watch the packet's round trip.",
  "Compare the response times and the data sent to the internet, then press Record observation.",
  "Try every tier for each scenario. Increase the number of devices to see a tier become overloaded.",
];

/** Rows of the diagram, top to bottom. */
const ROWS: { id: Tier | "devices"; label: string; icon: LucideIcon }[] = [
  { id: "cloud", label: "Cloud", icon: Cloud },
  { id: "fog", label: "Fog", icon: Server },
  { id: "edge", label: "Edge", icon: Router },
  { id: "devices", label: "Devices", icon: Cpu },
];

function summarise(rows: ObservationRow[]): string {
  if (rows.length === 0) return "";
  const byScenario = new Map<string, { met: string[]; failed: string[] }>();
  for (const r of rows) {
    const key = String(r.scenario);
    const entry = byScenario.get(key) ?? { met: [], failed: [] };
    const list = r.meets === "Yes" ? entry.met : entry.failed;
    if (!list.includes(String(r.tier))) list.push(String(r.tier));
    byScenario.set(key, entry);
  }
  const sentences = [...byScenario.entries()].map(([scenario, { met, failed }]) => {
    if (met.length && failed.length)
      return `For ${scenario.toLowerCase()}, ${met.join(" and ")} met the deadline but ${failed.join(" and ")} did not.`;
    if (met.length) return `For ${scenario.toLowerCase()}, ${met.join(" and ")} met the deadline.`;
    return `For ${scenario.toLowerCase()}, ${failed.join(" and ")} could not meet the deadline.`;
  });
  sentences.push(
    "Processing closer to the devices gave faster responses and sent less data over the internet, while the cloud suited relaxed deadlines and small data.",
  );
  return sentences.join(" ");
}

export default function EdgeFogCloudLab() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!;
  const [devices, setDevices] = useState(scenario.devices);
  const [uplink, setUplink] = useState(scenario.uplinkMbps);
  const [tier, setTier] = useState<Tier>("cloud");
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");
  const reduced = useReducedMotion() ?? false;

  const results = evaluateAll({
    devices,
    dataKbps: scenario.dataKbps,
    messagesPerSec: scenario.messagesPerSec,
    uplinkMbps: uplink,
  });
  const chosen = results[tier];
  const meets = meetsDeadline(chosen, scenario.deadlineMs);
  const showDeadlineLine = scenario.deadlineMs <= 1000;

  const chooseScenario = (id: string) => {
    const s = SCENARIOS.find((x) => x.id === id)!;
    setScenarioId(id);
    setDevices(s.devices);
    setUplink(s.uplinkMbps);
  };

  const latencyData = TIERS.map((t) => ({
    tier: TIER_PARAMS[t].label,
    latency: results[t].latencyMs === null ? null : Number(results[t].latencyMs!.toFixed(1)),
  }));
  const upstreamData = TIERS.map((t) => ({
    tier: TIER_PARAMS[t].label,
    mbps: Number(results[t].upstreamMbps.toFixed(3)),
  }));
  const overloaded = TIERS.filter((t) => results[t].overload);

  // Round-trip animation: longer for slower tiers, stalls when overloaded.
  const targetRow = ROWS.findIndex((r) => r.id === tier);
  const rowCentre = (i: number) => `${(i + 0.5) * 25}%`;
  const tripSeconds =
    chosen.latencyMs === null ? 1.6 : Math.min(3, Math.max(0.7, 0.5 + chosen.latencyMs / 40));

  const record = () => {
    const row: ObservationRow = {
      scenario: scenario.title,
      devices,
      tier: TIER_PARAMS[tier].label,
      latency: formatLatency(chosen.latencyMs),
      deadline: formatDeadline(scenario.deadlineMs),
      meets: meets ? "Yes" : "No",
      upstream: chosen.upstreamMbps < 0.1 ? chosen.upstreamMbps.toFixed(3) : chosen.upstreamMbps.toFixed(1),
    };
    addRow(row);
    const auto = summarise([...rows, row]);
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
      recordHint="Adds the chosen tier's result to the observation table below."
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
                  name="l03-scenario"
                  className="sr-only"
                  checked={s.id === scenarioId}
                  onChange={() => chooseScenario(s.id)}
                />
                <span>
                  <span className="block font-semibold">{s.title}</span>
                  <span className="block text-sm text-ink-2">{s.story}</span>
                  <span className="mt-0.5 block text-sm text-ink-3">Deadline {formatDeadline(s.deadlineMs)}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <Segmented<Tier>
            label="Process the data at"
            value={tier}
            onChange={setTier}
            options={TIERS.map((t) => ({ value: t, label: TIER_PARAMS[t].label }))}
          />
          <Slider label="Number of devices" value={devices} min={1} max={500} step={1} onChange={setDevices} />
          <Slider
            label="Internet uplink"
            value={uplink}
            min={1}
            max={100}
            step={1}
            unit="Mbps"
            onChange={setUplink}
            hint={`Each device produces ${scenario.dataKbps < 1 ? scenario.dataKbps.toFixed(1) : scenario.dataKbps} kbps of raw data.`}
          />
          <p className="text-sm text-ink-3">All times and speeds are typical values, for illustration.</p>
        </>
      }
      stage={
        <div className="grid gap-3 p-4">
          <div
            className="relative h-80"
            role="img"
            aria-label={`Data from ${devices} devices is processed at the ${TIER_PARAMS[tier].label.toLowerCase()}. Response time ${formatLatency(chosen.latencyMs)}.`}
          >
            {ROWS.map((row, i) => {
              const Icon = row.icon;
              const isTier = row.id !== "devices";
              const result = isTier ? results[row.id as Tier] : null;
              const active = row.id === tier;
              return (
                <div
                  key={row.id}
                  className={cn(
                    "absolute inset-x-0 flex h-[22%] -translate-y-1/2 items-center gap-3 rounded-lg border px-3",
                    active ? "border-brand bg-brand-soft" : "border-line bg-surface-2",
                  )}
                  style={{ top: rowCentre(i) }}
                  aria-hidden
                >
                  <Icon size={20} className={active ? "text-brand" : "text-ink-3"} />
                  <span className="font-semibold">{row.label}</span>
                  {result && (
                    <span className="ml-auto flex items-center gap-1.5 font-mono text-sm tabular-nums">
                      {formatLatency(result.latencyMs)}
                      {meetsDeadline(result, scenario.deadlineMs) ? (
                        <Check size={16} className="text-ok" />
                      ) : (
                        <X size={16} className="text-bad" />
                      )}
                    </span>
                  )}
                  {!result && <span className="ml-auto text-sm text-ink-3">{devices} sending</span>}
                </div>
              );
            })}
            <motion.span
              key={`${tier}-${chosen.latencyMs === null}-${reduced}`}
              className={cn(
                "absolute left-[30%] size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_3px_var(--surface)]",
                chosen.latencyMs === null ? "bg-bad" : "bg-brand",
              )}
              initial={{ top: reduced ? rowCentre(targetRow) : rowCentre(3) }}
              animate={
                reduced
                  ? undefined
                  : {
                      top:
                        chosen.latencyMs === null
                          ? [rowCentre(3), rowCentre(targetRow)]
                          : [rowCentre(3), rowCentre(targetRow), rowCentre(3)],
                    }
              }
              transition={{
                duration: tripSeconds,
                repeat: chosen.latencyMs === null ? 0 : Infinity,
                repeatDelay: 0.4,
                ease: "easeInOut",
              }}
              aria-hidden
            />
          </div>
          <p className="text-sm text-ink-3" aria-live="polite">
            {chosen.overload === "uplink"
              ? "Overloaded: the raw data needs more bandwidth than the uplink has, so messages pile up."
              : chosen.overload === "processing"
                ? `Overloaded: the ${TIER_PARAMS[tier].label.toLowerCase()} cannot process ${Math.round(devices * scenario.messagesPerSec)} messages a second.`
                : `The packet goes up to the ${TIER_PARAMS[tier].label.toLowerCase()} and the answer comes back. Slower tiers take longer.`}
          </p>
        </div>
      }
      readouts={
        <>
          <Readouts
            items={[
              { label: "Response time", value: formatLatency(chosen.latencyMs), tone: meets ? "ok" : "bad" },
              { label: "Deadline", value: formatDeadline(scenario.deadlineMs) },
              { label: "Meets deadline?", value: meets ? "Yes" : "No", tone: meets ? "ok" : "bad" },
              { label: "Uplink use", value: `${Math.round(chosen.uplinkUtilisation * 100)}%`, tone: chosen.uplinkUtilisation >= 0.95 ? "bad" : "default" },
              { label: "Sent to internet", value: chosen.upstreamMbps < 0.1 ? chosen.upstreamMbps.toFixed(3) : chosen.upstreamMbps.toFixed(1), unit: "Mbps" },
              { label: "Data per day", value: chosen.gbPerDay < 1 ? chosen.gbPerDay.toFixed(2) : Math.round(chosen.gbPerDay), unit: "GB" },
              { label: "Messages per second", value: Math.round(devices * scenario.messagesPerSec * 10) / 10 },
              { label: "Tier busy", value: `${Math.min(999, Math.round(chosen.utilisation * 100))}%`, tone: chosen.utilisation >= 0.95 ? "bad" : "default" },
            ]}
          />
          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard
              title="Response time by tier"
              description={
                overloaded.length
                  ? `Overloaded, so no bar: ${overloaded.map((t) => TIER_PARAMS[t].label).join(", ")}.`
                  : showDeadlineLine
                    ? "The dashed line is the deadline."
                    : "All tiers are far inside the deadline."
              }
              data={latencyData}
              xKey="tier"
              xLabel="Tier"
              series={[{ key: "latency", label: "Response time", unit: "ms" }]}
              height={200}
            >
              <BarChart data={latencyData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid {...chartStyle.grid} />
                <XAxis dataKey="tier" {...chartStyle.axis} />
                <YAxis {...chartStyle.axis} unit=" ms" width={64} />
                <Tooltip cursor={chartStyle.barCursor} content={<ChartTooltip units={{ latency: "ms" }} />} />
                {showDeadlineLine && <ReferenceLine y={scenario.deadlineMs} stroke="var(--warn)" strokeDasharray="4 4" />}
                <Bar dataKey="latency" name="Response time" radius={chartStyle.bar.radius} maxBarSize={chartStyle.bar.maxBarSize} isAnimationActive={false}>
                  {TIERS.map((t) => (
                    <Cell key={t} fill={t === tier ? seriesColor(0) : "var(--line-strong)"} />
                  ))}
                </Bar>
              </BarChart>
            </ChartCard>
            <ChartCard
              title="Data sent to the internet"
              description={`The dashed line is the uplink (${uplink} Mbps).`}
              data={upstreamData}
              xKey="tier"
              xLabel="Tier"
              series={[{ key: "mbps", label: "Sent to internet", unit: "Mbps" }]}
              height={200}
            >
              <BarChart data={upstreamData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid {...chartStyle.grid} />
                <XAxis dataKey="tier" {...chartStyle.axis} />
                <YAxis {...chartStyle.axis} unit=" Mbps" width={76} />
                <Tooltip cursor={chartStyle.barCursor} content={<ChartTooltip units={{ mbps: "Mbps" }} />} />
                <ReferenceLine y={uplink} stroke="var(--warn)" strokeDasharray="4 4" />
                <Bar dataKey="mbps" name="Sent to internet" radius={chartStyle.bar.radius} maxBarSize={chartStyle.bar.maxBarSize} isAnimationActive={false}>
                  {TIERS.map((t) => (
                    <Cell key={t} fill={t === tier ? seriesColor(0) : "var(--line-strong)"} />
                  ))}
                </Bar>
              </BarChart>
            </ChartCard>
          </div>
        </>
      }
    />
  );
}
