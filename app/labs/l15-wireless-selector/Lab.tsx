import { Ban, Trophy } from "lucide-react";
import { useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { ChartCard, ChartTooltip, chartStyle, seriesColor } from "~/components/theory/ChartCard";
import { Segmented } from "~/components/ui/Segmented";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import { SCENARIOS, TECHS, rank, type Battery, type CostNeed, type Needs, type TechId } from "./engine";

const lab = getLab("l15-wireless-selector")!;

const steps = [
  "Choose the Farm soil sensors scenario. Read why LoRaWAN wins and why the others are ruled out, then press Record observation.",
  "Do the same for the Fitness band, Tap-to-pay counter, CCTV camera and Home lighting scenarios.",
  "Start from Home lighting and untick Mesh needed. See how the ranking changes, and record it.",
  "Make your own project: set the range, data rate and battery life, and see which technology the selector picks.",
  "Compare the winners and runners-up in your table, then open the lab record.",
];

/** Steps on a log scale so one slider covers centimetres to kilometres. */
const RANGE_STEPS = [0.05, 0.5, 2, 5, 10, 15, 20, 50, 100, 500, 1000, 2000, 5000, 10_000];
const RATE_STEPS = [0.1, 1, 10, 100, 250, 1000, 4000, 20_000];

const fmtRange = (m: number) => (m >= 1000 ? `${m / 1000} km` : m >= 1 ? `${m} m` : `${Math.round(m * 100)} cm`);
const fmtRate = (k: number) => (k >= 1000 ? `${k / 1000} Mbps` : `${k} kbps`);
const colourOf = (id: TechId) => seriesColor(TECHS.findIndex((t) => t.id === id));
const nearest = (steps: number[], v: number) => steps.reduce((best, s, i) => (Math.abs(Math.log10(s / v)) < Math.abs(Math.log10(steps[best] / v)) ? i : best), 0);

function StepSlider({ label, steps, value, format, onChange }: { label: string; steps: number[]; value: number; format: (v: number) => string; onChange: (v: number) => void }) {
  const index = nearest(steps, value);
  return (
    <label className="grid gap-1.5">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[0.95rem] font-semibold">{label}</span>
        <span className="font-mono text-sm tabular-nums">{format(steps[index])}</span>
      </span>
      <input
        type="range"
        min={0}
        max={steps.length - 1}
        step={1}
        value={index}
        onChange={(e) => onChange(steps[Number(e.target.value)])}
        aria-valuetext={format(steps[index])}
        className="w-full accent-[var(--brand)]"
      />
    </label>
  );
}

function summarise(rows: ObservationRow[]): string {
  if (!rows.length) return "";
  const lines = rows.map((r) => `${r.scenario}: ${r.winner}${r.runnerUp !== "—" ? ` (runner-up ${r.runnerUp})` : " (the only option)"}`);
  const parts = [`The selector chose ${lines.join("; ")}.`];
  const ruled = rows.filter((r) => Number(r.ruledOut) > 0);
  if (ruled.length) parts.push("Hard needs such as range, data rate or a direct phone link ruled some technologies out before any scoring.");
  parts.push("The best technology depends on the balance of range, data rate, power and cost each project needs.");
  return parts.join(" ");
}

export default function WirelessSelectorLab() {
  const [scenarioId, setScenarioId] = useState<string>(SCENARIOS[0].id);
  const [needs, setNeeds] = useState<Needs>(SCENARIOS[0].needs);
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");

  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  const results = rank(needs);
  const allowed = results.filter((r) => !r.excluded);
  const excluded = results.filter((r) => r.excluded);
  const winner = allowed[0];
  const runnerUp = allowed[1];

  const pick = (id: string) => {
    const s = SCENARIOS.find((x) => x.id === id)!;
    setScenarioId(id);
    setNeeds(s.needs);
  };
  const change = (patch: Partial<Needs>) => {
    setNeeds((n) => ({ ...n, ...patch }));
    setScenarioId("custom");
  };

  const chartData = TECHS.map((t) => {
    const r = results.find((x) => x.tech.id === t.id)!;
    return { tech: t.name, score: r.excluded ? 0 : r.score, label: r.excluded ? "" : r.score.toFixed(2), id: t.id, excluded: r.excluded };
  });

  const record = () => {
    const row: ObservationRow = {
      scenario: scenario?.title ?? "Custom",
      range: fmtRange(needs.rangeM),
      rate: fmtRate(needs.rateKbps),
      battery: needs.battery === "mains" ? "Mains" : needs.battery === "months" ? "Months" : "Years",
      winner: winner?.tech.name ?? "None",
      runnerUp: runnerUp?.tech.name ?? "—",
      ruledOut: excluded.length,
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
      recordHint="Adds the needs and the selector's choice to the observation table."
      controls={
        <>
          <fieldset className="grid min-w-0 gap-2">
            <legend className="mb-1.5 text-[0.95rem] font-semibold">Scenario</legend>
            {SCENARIOS.map((s) => (
              <label
                key={s.id}
                className={cn(
                  "flex cursor-pointer gap-2.5 rounded-lg border px-3 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
                  s.id === scenarioId ? "border-brand bg-brand-soft" : "border-line hover:border-line-strong",
                )}
              >
                <input type="radio" name="l15-scenario" className="sr-only" checked={s.id === scenarioId} onChange={() => pick(s.id)} />
                <span>
                  <span className="block font-semibold">{s.title}</span>
                  <span className="block text-sm text-ink-2">{s.story}</span>
                </span>
              </label>
            ))}
            {scenarioId === "custom" && <p className="text-sm font-semibold text-brand">Custom needs (you changed a setting)</p>}
          </fieldset>
          <StepSlider label="Range needed" steps={RANGE_STEPS} value={needs.rangeM} format={fmtRange} onChange={(rangeM) => change({ rangeM })} />
          <StepSlider label="Data rate needed" steps={RATE_STEPS} value={needs.rateKbps} format={fmtRate} onChange={(rateKbps) => change({ rateKbps })} />
          <Segmented<Battery> label="Power" value={needs.battery} onChange={(battery) => change({ battery })} options={[{ value: "mains", label: "Mains" }, { value: "months", label: "Battery: months" }, { value: "years", label: "Battery: years" }]} />
          <Segmented<CostNeed> label="Cost per device" value={needs.cost} onChange={(cost) => change({ cost })} options={[{ value: "normal", label: "Normal" }, { value: "veryLow", label: "Very low" }]} />
          <fieldset className="grid min-w-0 gap-2">
            <legend className="mb-1 text-[0.95rem] font-semibold">Must have</legend>
            {([
              ["mesh", "Mesh needed (devices relay for each other)"],
              ["phone", "A phone connects directly"],
              ["ip", "Needs an IP address"],
            ] as const).map(([key, text]) => (
              <label key={key} className="flex items-center gap-2">
                <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={needs[key]} onChange={(e) => change({ [key]: e.target.checked })} />
                <span>{text}</span>
              </label>
            ))}
          </fieldset>
          <p className="text-sm text-ink-3">Figures are typical values. NB-IoT and LTE-M join the list in topic 3.22.</p>
        </>
      }
      stage={
        <div className="grid grid-cols-1 gap-3 p-3 sm:p-4" aria-live="polite">
          {winner ? (
            <div className="grid gap-2 rounded-lg border-2 border-ok bg-ok-soft p-3">
              <p className="flex items-center gap-2 text-lg font-bold">
                <Trophy size={20} className="text-ok" aria-hidden />
                Best fit: {winner.tech.name}
                <span className="font-mono text-sm font-normal text-ink-2">score {winner.score.toFixed(2)}</span>
              </p>
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink">
                {winner.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-lg border-2 border-bad bg-bad-soft p-3 font-semibold">No technology meets these needs. Try a shorter range or a lower data rate.</p>
          )}
          {allowed.length > 1 && (
            <ol className="grid gap-2" aria-label="Other suitable technologies">
              {allowed.slice(1).map((r, i) => (
                <li key={r.tech.id} className="grid gap-1 rounded-lg border border-line bg-surface p-3">
                  <p className="flex flex-wrap items-baseline gap-2 font-semibold">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: colourOf(r.tech.id) }} aria-hidden />
                    {i + 2}. {r.tech.name}
                    <span className="font-mono text-sm font-normal text-ink-3">score {r.score.toFixed(2)}</span>
                  </p>
                  <p className="text-sm text-ink-2">{r.reasons.slice(0, 2).join(" ")}</p>
                </li>
              ))}
            </ol>
          )}
          {excluded.length > 0 && (
            <div className="grid gap-1.5">
              <p className="text-sm font-bold text-ink-2">Ruled out</p>
              <ul className="grid gap-1">
                {excluded.map((r) => (
                  <li key={r.tech.id} className="flex items-start gap-2 text-sm">
                    <Ban size={14} className="mt-0.5 shrink-0 text-bad" aria-hidden />
                    <span>
                      <span className="font-semibold">{r.tech.name}:</span> {r.reasons.join(" ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      }
      readouts={
        <>
          <Readouts
            items={[
              { label: "Best fit", value: winner?.tech.name ?? "None", tone: winner ? "ok" : "bad" },
              { label: "Runner-up", value: runnerUp?.tech.name ?? "—" },
              { label: "Suitable", value: allowed.length },
              { label: "Ruled out", value: excluded.length, tone: excluded.length ? "warn" : "default" },
            ]}
          />
          <ChartCard
            title="Score for each technology"
            description="Higher is a better fit for these needs. Ruled-out technologies score nothing."
            data={chartData}
            xKey="tech"
            xLabel="Technology"
            series={[{ key: "score", label: "Score" }]}
            legend={TECHS.map((t) => ({ label: t.name, color: colourOf(t.id) }))}
            height={240}
          >
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 56, bottom: 0, left: 8 }}>
              <CartesianGrid {...chartStyle.grid} horizontal={false} vertical />
              <XAxis type="number" {...chartStyle.axis} />
              <YAxis
                type="category"
                dataKey="tech"
                width={118}
                {...chartStyle.axis}
                tick={(props) => {
                  // Ruled-out technologies have no bar, so say so beside the name.
                  const { x, y, payload } = props as { x: number; y: number; payload: { value: string } };
                  const out = chartData.find((d) => d.tech === payload.value)?.excluded;
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text textAnchor="end" dx={-4} dy={out ? -2 : 4} fill="var(--ink-3)" fontSize={13}>
                        {payload.value}
                      </text>
                      {out && (
                        <text textAnchor="end" dx={-4} dy={12} fill="var(--bad)" fontSize={11}>
                          ruled out
                        </text>
                      )}
                    </g>
                  );
                }}
              />
              <Tooltip cursor={chartStyle.barCursor} content={<ChartTooltip />} />
              <Bar dataKey="score" name="Score" radius={[0, 4, 4, 0]} maxBarSize={chartStyle.bar.maxBarSize} isAnimationActive={false}>
                {chartData.map((d) => (
                  <Cell key={d.id} fill={colourOf(d.id as TechId)} />
                ))}
                <LabelList dataKey="label" position="right" style={{ fill: "var(--ink-2)", fontSize: 12 }} />
              </Bar>
            </BarChart>
          </ChartCard>
        </>
      }
    />
  );
}
