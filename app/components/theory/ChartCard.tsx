import { Table2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "~/lib/cn";
import { useHydrated } from "~/lib/useHydrated";

export interface ChartSeries {
  key: string;
  label: string;
  unit?: string;
}

interface ChartCardProps<Row extends Record<string, unknown>> {
  title: string;
  /** One sentence on what the chart shows and what to notice */
  description?: string;
  data: Row[];
  /** Category / x-axis field, used for the table view */
  xKey: keyof Row & string;
  xLabel: string;
  series: ChartSeries[];
  height?: number;
  /** The Recharts chart element (LineChart, BarChart, …) */
  children: ReactNode;
  emptyText?: string;
  className?: string;
}

/** Series colour by fixed slot order. Never cycle: past 8 series, regroup. */
export function seriesColor(index: number): string {
  return `var(--series-${Math.min(index, 7) + 1})`;
}

/** Shared Recharts styling so every chart looks like one system. */
export const chartStyle = {
  grid: { stroke: "var(--line)", strokeDasharray: undefined, vertical: false },
  axis: {
    stroke: "var(--line-strong)",
    tick: { fill: "var(--ink-3)", fontSize: 13 },
    tickLine: false,
  },
  line: { strokeWidth: 2, dot: false, activeDot: { r: 5, stroke: "var(--surface)", strokeWidth: 2 } },
  bar: { radius: [4, 4, 0, 0] as [number, number, number, number], maxBarSize: 24 },
  cursor: { stroke: "var(--line-strong)", strokeWidth: 1 },
  barCursor: { fill: "var(--surface-2)" },
};

/**
 * Frame for every chart: title, description, legend (for two or more
 * series) and a data-table view so values never depend on colour alone.
 */
export function ChartCard<Row extends Record<string, unknown>>({
  title,
  description,
  data,
  xKey,
  xLabel,
  series,
  height = 260,
  children,
  emptyText = "No data yet.",
  className,
}: ChartCardProps<Row>) {
  const hydrated = useHydrated();
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  return (
    <figure className={cn("print-avoid-break grid grid-cols-1 gap-3 rounded-lg border border-line bg-surface p-4", className)}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <figcaption className="min-w-0 flex-1">
          <span className="block font-bold">{title}</span>
          {description && <span className="mt-0.5 block text-sm text-ink-2">{description}</span>}
        </figcaption>
        <button
          type="button"
          aria-expanded={showTable}
          aria-controls={tableId}
          onClick={() => setShowTable((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink"
          data-print-hide
        >
          <Table2 size={16} aria-hidden />
          {showTable ? "Hide data table" : "Show data table"}
        </button>
      </div>

      {series.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2" aria-label="Legend">
          {series.map((s, i) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm" style={{ background: seriesColor(i) }} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>
      )}

      <div style={{ height }} aria-hidden={showTable}>
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-line-strong text-sm text-ink-3">
            {emptyText}
          </div>
        ) : hydrated ? (
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        ) : (
          <div className="h-full rounded-md bg-surface-2" />
        )}
      </div>

      <div id={tableId} hidden={!showTable} className="relative overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="border-b border-line-strong px-2 py-1.5 text-left font-bold">
                {xLabel}
              </th>
              {series.map((s) => (
                <th key={s.key} scope="col" className="border-b border-line-strong px-2 py-1.5 text-right font-bold">
                  {s.label}
                  {s.unit && <span className="font-normal text-ink-3"> ({s.unit})</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                <th scope="row" className="px-2 py-1.5 text-left font-normal">
                  {String(row[xKey])}
                </th>
                {series.map((s) => (
                  <td key={s.key} className="px-2 py-1.5 text-right tabular-nums">
                    {formatCell(row[s.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

function formatCell(value: unknown): string {
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(1);
  if (value === null || value === undefined) return "—";
  return String(value);
}

interface TooltipPayloadItem {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

/** Tooltip content for Recharts: `<Tooltip content={<ChartTooltip … />} />`. */
export function ChartTooltip({
  active,
  payload,
  label,
  labelPrefix,
  units,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  labelPrefix?: string;
  /** Unit per dataKey, e.g. { latency: "ms" } */
  units?: Record<string, string>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-line-strong bg-surface px-3 py-2 text-sm shadow-sm">
      <p className="font-bold text-ink">
        {labelPrefix}
        {label}
      </p>
      <ul className="mt-1 grid gap-0.5">
        {payload.map((item) => (
          <li key={String(item.dataKey)} className="flex items-center gap-2 text-ink-2">
            <span className="size-2.5 rounded-full" style={{ background: item.color }} aria-hidden />
            <span>{item.name}</span>
            <span className="ml-auto pl-3 font-semibold tabular-nums text-ink">
              {typeof item.value === "number" ? formatCell(item.value) : item.value}
              {units?.[String(item.dataKey)] ? ` ${units[String(item.dataKey)]}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
