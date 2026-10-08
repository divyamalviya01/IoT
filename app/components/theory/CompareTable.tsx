import type { ReactNode } from "react";
import { cn } from "~/lib/cn";

interface CompareTableProps {
  /** Shown above the table and used as its accessible name */
  caption: string;
  columns: string[];
  rows: ReactNode[][];
  /** Treat the first cell of each row as a row header (default true) */
  rowHeaders?: boolean;
  /** Short note under the table, e.g. a source or "values are typical" */
  note?: string;
}

/**
 * Comparison table that scrolls sideways on small screens, with the first
 * column pinned so students keep track of the row they are reading.
 */
export function CompareTable({ caption, columns, rows, rowHeaders = true, note }: CompareTableProps) {
  return (
    <figure className="print-avoid-break grid grid-cols-1 gap-2">
      <div className="relative overflow-x-auto rounded-lg border border-line bg-surface" tabIndex={0}>
        <table className="w-full border-collapse text-[0.95rem] leading-normal">
          <caption className="border-b border-line px-4 py-2.5 text-left font-bold">{caption}</caption>
          <thead>
            <tr className="bg-surface-2">
              {columns.map((col, i) => (
                <th
                  key={col}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap border-b border-line-strong px-4 py-2 text-left font-bold",
                    i === 0 && rowHeaders && "sticky left-0 bg-surface-2",
                  )}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="border-b border-line last:border-0">
                {row.map((cell, c) =>
                  c === 0 && rowHeaders ? (
                    <th
                      key={c}
                      scope="row"
                      className="sticky left-0 bg-surface px-4 py-2.5 text-left align-top font-semibold"
                    >
                      {cell}
                    </th>
                  ) : (
                    <td key={c} className="px-4 py-2.5 align-top text-ink-2">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <figcaption className="text-sm text-ink-3">{note}</figcaption>}
    </figure>
  );
}
