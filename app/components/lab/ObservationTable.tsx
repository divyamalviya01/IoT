import { Trash2 } from "lucide-react";
import type { ObservationColumn, ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";

interface ObservationTableProps {
  columns: ObservationColumn[];
  rows: ObservationRow[];
  /** Shows a remove button per row (hidden when printing) */
  onRemoveRow?: (index: number) => void;
  emptyText?: string;
  /** Minimum rows to draw, so a printed record has space to write in */
  minRows?: number;
  className?: string;
}

export function ObservationTable({
  columns,
  rows,
  onRemoveRow,
  emptyText = "No observations yet. Run the simulation, then press Record observation.",
  minRows = 0,
  className,
}: ObservationTableProps) {
  const blankRows = Math.max(0, minRows - rows.length);

  return (
    <div className={cn("relative overflow-x-auto rounded-lg border border-line", className)}>
      <table className="w-full border-collapse text-[0.95rem]">
        <thead className="bg-surface-2">
          <tr>
            <th scope="col" className="w-12 border-b border-line-strong px-3 py-2 text-left font-bold">
              No.
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="border-b border-line-strong px-3 py-2 text-left font-bold"
              >
                {col.label}
                {col.unit && <span className="font-normal text-ink-3"> ({col.unit})</span>}
              </th>
            ))}
            {onRemoveRow && (
              <th scope="col" className="w-12 border-b border-line-strong" data-print-hide>
                <span className="sr-only">Remove</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-line last:border-0">
              <td className="px-3 py-2 tabular-nums text-ink-3">{i + 1}</td>
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 tabular-nums">
                  {row[col.key] ?? "—"}
                </td>
              ))}
              {onRemoveRow && (
                <td className="px-2 py-1" data-print-hide>
                  <button
                    type="button"
                    onClick={() => onRemoveRow(i)}
                    className="inline-flex size-8 items-center justify-center rounded-md text-ink-3 hover:bg-bad-soft hover:text-bad"
                    aria-label={`Remove observation ${i + 1}`}
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </td>
              )}
            </tr>
          ))}
          {Array.from({ length: blankRows }, (_, i) => (
            <tr key={`blank-${i}`} className="border-b border-line last:border-0">
              <td className="px-3 py-3 tabular-nums text-ink-3">{rows.length + i + 1}</td>
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-3" />
              ))}
            </tr>
          ))}
          {rows.length === 0 && blankRows === 0 && (
            <tr>
              <td colSpan={columns.length + 2} className="px-3 py-6 text-center text-ink-3">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
