import { useId, type ReactNode } from "react";
import { cn } from "~/lib/cn";

interface Option<T extends string> {
  value: T;
  label: ReactNode;
  /** Accessible name when the label is an icon */
  ariaLabel?: string;
}

interface SegmentedProps<T extends string> {
  label: string;
  /** Visually hide the group label (it stays available to screen readers) */
  hideLabel?: boolean;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}

/** A row of mutually exclusive choices, built on native radio inputs. */
export function Segmented<T extends string>({
  label,
  hideLabel,
  options,
  value,
  onChange,
  size = "md",
  className,
}: SegmentedProps<T>) {
  const name = useId();

  return (
    <fieldset className={cn("grid gap-1.5", className)}>
      <legend
        className={cn(
          "mb-1.5 text-[0.95rem] font-semibold text-ink",
          hideLabel && "sr-only",
        )}
      >
        {label}
      </legend>
      <div className="inline-flex w-fit rounded-lg border border-line bg-surface-2 p-0.5">
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                "relative flex cursor-pointer items-center justify-center gap-1.5 rounded-md font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
                size === "sm" ? "h-7 min-w-7 px-2 text-sm" : "h-8 min-w-8 px-3 text-[0.95rem]",
                checked
                  ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)]"
                  : "text-ink-2 hover:text-ink",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                aria-label={option.ariaLabel}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
