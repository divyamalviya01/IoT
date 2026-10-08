import type { UnitNumber } from "~/content/registry";
import { cn } from "~/lib/cn";

const tone: Record<UnitNumber, string> = {
  0: "bg-brand-soft text-brand",
  1: "bg-u1-soft text-u1",
  2: "bg-u2-soft text-u2",
  3: "bg-u3-soft text-u3",
};

const bar: Record<UnitNumber, string> = {
  0: "bg-brand",
  1: "bg-u1",
  2: "bg-u2",
  3: "bg-u3",
};

/** Text colour class for a unit accent */
export const unitText: Record<UnitNumber, string> = {
  0: "text-brand",
  1: "text-u1",
  2: "text-u2",
  3: "text-u3",
};

/** Solid background class for a unit accent (bars, dots) */
export const unitBar = bar;

/** Small coloured tag such as "Unit 2". */
export function UnitTag({ unit, className }: { unit: UnitNumber; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-sm font-semibold",
        tone[unit],
        className,
      )}
    >
      {unit === 0 ? "Start here" : `Unit ${unit}`}
    </span>
  );
}
