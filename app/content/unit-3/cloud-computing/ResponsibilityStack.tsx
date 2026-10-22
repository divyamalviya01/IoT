import { Building2, Cloud, User } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Segmented } from "~/components/ui/Segmented";
import { cn } from "~/lib/cn";

export type CloudModel = "onprem" | "iaas" | "paas" | "saas";

export const MODELS: { value: CloudModel; label: string }[] = [
  { value: "onprem", label: "On-premises" },
  { value: "iaas", label: "IaaS" },
  { value: "paas", label: "PaaS" },
  { value: "saas", label: "SaaS" },
];

/** Top layer first. */
export const LAYERS = ["Applications", "Data", "Runtime", "Middleware", "Operating system", "Virtualization", "Servers", "Storage", "Networking"];

/** How many layers, counted from the top, the customer still looks after. */
export const CUSTOMER_LAYERS: Record<CloudModel, number> = { onprem: 9, iaas: 5, paas: 2, saas: 0 };

interface ResponsibilityStackProps {
  value: CloudModel;
  onChange: (m: CloudModel) => void;
  /** Words for the two owners, e.g. "You manage" / "Provider manages", or "You secure" / "Provider secures" */
  youLabel?: string;
  providerLabel?: string;
  caption?: string;
}

/**
 * The classic "who manages what" stack. Switching the model moves the line
 * between the layers the customer looks after and those the provider does.
 * Exported for reuse by the cloud-security topic (shared responsibility).
 */
export function ResponsibilityStack({ value, onChange, youLabel = "You manage", providerLabel = "Provider manages", caption }: ResponsibilityStackProps) {
  const reduced = useReducedMotion() ?? false;
  const mine = CUSTOMER_LAYERS[value];
  const ROW = 2.25; // rem, row height including gap

  return (
    <figure className="grid min-w-0 grid-cols-1 gap-3">
      {caption && <figcaption className="font-bold">{caption}</figcaption>}
      <Segmented label="Service model" options={MODELS} value={value} onChange={onChange} />
      <div className="relative">
        <ol className="grid gap-1.5" aria-label={`Layers under ${MODELS.find((m) => m.value === value)?.label}, top to bottom`}>
          {LAYERS.map((layer, i) => {
            const yours = i < mine;
            return (
              <li
                key={layer}
                className={cn(
                  "flex h-[1.875rem] items-center justify-between gap-2 rounded-md border px-3 text-sm transition-colors duration-500 motion-reduce:transition-none",
                  yours ? "border-u1 bg-u1-soft" : "border-u3 bg-u3-soft",
                )}
              >
                <span className="font-semibold text-ink">{layer}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-ink-2">
                  {yours ? <User size={13} aria-hidden className="text-u1" /> : <Cloud size={13} aria-hidden className="text-u3" />}
                  {yours ? youLabel : providerLabel}
                </span>
              </li>
            );
          })}
        </ol>
        {mine > 0 && mine < LAYERS.length && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-ink"
            initial={false}
            animate={{ top: `${mine * ROW - 0.1875 - 0.0625}rem` }}
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 200, damping: 26 }}
          />
        )}
      </div>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
        <span className="flex items-center gap-1.5">
          <User size={14} aria-hidden className="text-u1" /> {youLabel}: <strong className="text-ink">{mine}</strong> of 9 layers
        </span>
        <span className="flex items-center gap-1.5">
          <Building2 size={14} aria-hidden className="text-u3" /> {providerLabel}: <strong className="text-ink">{9 - mine}</strong>
        </span>
      </p>
    </figure>
  );
}
