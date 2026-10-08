import { useId } from "react";
import { cn } from "~/lib/cn";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** Formats the displayed value; defaults to the raw number plus unit */
  format?: (value: number) => string;
  onChange: (value: number) => void;
  disabled?: boolean;
  hint?: string;
  className?: string;
}

/** A labelled range input that shows its current value. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  format,
  onChange,
  disabled,
  hint,
  className,
}: SliderProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const shown = format ? format(value) : `${value}${unit ? ` ${unit}` : ""}`;
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[0.95rem] font-semibold text-ink">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-sm tabular-nums text-ink-2">
          {shown}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-describedby={hint ? hintId : undefined}
        aria-valuetext={shown}
        onChange={(e) => onChange(Number(e.target.value))}
        className="lab-range h-6 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        style={{ "--fill": `${percent}%` } as React.CSSProperties}
      />
      {hint && (
        <p id={hintId} className="text-sm text-ink-3">
          {hint}
        </p>
      )}
    </div>
  );
}
