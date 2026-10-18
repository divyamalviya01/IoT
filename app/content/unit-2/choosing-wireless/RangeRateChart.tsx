import { CartesianGrid, LabelList, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { ChartCard, chartStyle, seriesColor } from "~/components/theory/ChartCard";
import { TECHS } from "~/labs/l15-wireless-selector/engine";

/** Same figures as lab L15, so the chart and the selector always agree. */
const DATA = TECHS.map((t) => ({ name: t.name, range: t.typicalRangeM, rate: t.rateKbps }));

const RANGE_TICKS = [0.01, 0.1, 1, 10, 100, 1000, 10_000];
const RATE_TICKS = [1, 10, 100, 1000, 10_000, 100_000];

export const fmtRange = (m: number) => (m >= 1000 ? `${m / 1000} km` : m >= 1 ? `${m} m` : `${Math.round(m * 100)} cm`);
export const fmtRate = (k: number) => (k >= 1000 ? `${k / 1000} Mbps` : `${k} kbps`);

function PointTooltip({ active, payload }: { active?: boolean; payload?: { payload: (typeof DATA)[number] }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-sm shadow-sm">
      <p className="font-bold text-ink">{p.name}</p>
      <p className="text-ink-2">Typical range {fmtRange(p.range)}</p>
      <p className="text-ink-2">Data rate up to {fmtRate(p.rate)}</p>
    </div>
  );
}

/** Range against data rate on log scales: each step on an axis is ten times the last. */
export default function RangeRateChart() {
  return (
    <ChartCard
      title="Range and data rate of IoT wireless technologies"
      description="Both axes are logarithmic: each grid step is ten times bigger. No technology sits in the top-right corner, because long range and high speed cost power."
      data={DATA}
      xKey="name"
      xLabel="Technology"
      series={[
        { key: "range", label: "Typical range", unit: "m" },
        { key: "rate", label: "Data rate", unit: "kbps" },
      ]}
      legend={DATA.map((d, i) => ({ label: d.name, color: seriesColor(i) }))}
      height={320}
    >
      <ScatterChart margin={{ top: 16, right: 40, bottom: 8, left: 4 }}>
        <CartesianGrid {...chartStyle.grid} vertical />
        <XAxis
          type="number"
          dataKey="range"
          name="Range"
          scale="log"
          domain={[0.01, 20_000]}
          ticks={RANGE_TICKS}
          tickFormatter={fmtRange}
          {...chartStyle.axis}
        />
        <YAxis
          type="number"
          dataKey="rate"
          name="Data rate"
          scale="log"
          domain={[1, 200_000]}
          ticks={RATE_TICKS}
          tickFormatter={fmtRate}
          width={78}
          {...chartStyle.axis}
        />
        <ZAxis range={[110, 110]} />
        <Tooltip cursor={false} content={<PointTooltip />} />
        {DATA.map((d, i) => (
          <Scatter key={d.name} name={d.name} data={[d]} fill={seriesColor(i)} stroke="var(--surface)" strokeWidth={2} isAnimationActive={false}>
            <LabelList dataKey="name" position="top" offset={10} style={{ fill: "var(--ink-2)", fontSize: 12 }} />
          </Scatter>
        ))}
      </ScatterChart>
    </ChartCard>
  );
}
