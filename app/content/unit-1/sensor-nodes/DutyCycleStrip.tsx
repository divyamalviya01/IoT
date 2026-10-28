import { useState, type ReactNode } from "react";
import { Segmented } from "~/components/ui/Segmented";
import { batteryLife } from "~/labs/l02-sensor-node/engine";
import { cn } from "~/lib/cn";

/** A fixed example node: 1 s awake per wake-up, 20 mA awake, 0.01 mA asleep, 2000 mAh battery. */
const NODE = { capacityMah: 2000, awakeMa: 20, awakeSeconds: 1, sleepMa: 0.01 };

/** Seconds between wake-ups. "Always awake" is a 1 s period, so the duty cycle is 100%. */
type Wake = "1" | "10" | "100" | "900";
const WAKE_OPTIONS: { value: Wake; label: string }[] = [
  { value: "1", label: "Always awake" },
  { value: "10", label: "10 s" },
  { value: "100", label: "100 s" },
  { value: "900", label: "15 min" },
];

function Cell({ label, unit, note, className, children }: { label: string; unit?: string; note?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("bg-surface px-3 py-2.5", className)}>
      <dt className="text-sm text-ink-3">{label}</dt>
      <dd className="mt-0.5 font-mono text-xl tabular-nums text-ink">
        {children}
        {unit && <span className="ml-1 text-sm text-ink-3">{unit}</span>}
        {note && <span className="block font-sans text-sm text-ink-2">{note}</span>}
      </dd>
    </div>
  );
}

/** 100%, 10%, 1%, then two significant figures below 1% (0.11%). */
function formatDuty(duty: number): string {
  const pct = duty * 100;
  return pct >= 1 ? `${Math.round(pct)}%` : `${pct.toPrecision(2)}%`;
}

/** Awake and asleep time in one wake period, and what that does to battery life. */
export default function DutyCycleStrip() {
  const [wake, setWake] = useState<Wake>("100");
  const interval = Number(wake);
  const r = batteryLife({ ...NODE, intervalSeconds: interval });
  const asleepSeconds = Math.max(0, interval - NODE.awakeSeconds);
  const label = WAKE_OPTIONS.find((o) => o.value === wake)!.label;

  return (
    <figure className="print-avoid-break grid min-w-0 grid-cols-1 gap-4 rounded-lg border border-line bg-surface p-4">
      <figcaption>
        <span className="block font-bold">Duty cycle and battery life</span>
        <span className="mt-0.5 block text-sm text-ink-2">
          A node that wakes, measures, sends and goes back to sleep uses far less energy than one that stays on.
        </span>
      </figcaption>

      <Segmented label="Wake every" options={WAKE_OPTIONS} value={wake} onChange={setWake} />

      <div className="grid gap-1.5">
        <p className="text-sm font-semibold text-ink">
          {wake === "1" ? "The node never sleeps" : `One wake period: ${label}`}
        </p>
        {/* The awake slice keeps a few pixels even at 0.1%, so it never disappears */}
        <div aria-hidden className="flex h-8 overflow-hidden rounded-md border border-line-strong bg-u1-soft">
          <div className="h-full shrink-0 bg-u1" style={{ width: `max(3px, ${r.duty * 100}%)` }} />
        </div>
        <ul className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-ink-2" aria-label="Legend">
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm bg-u1" aria-hidden />
            Awake {NODE.awakeSeconds} s
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm border border-line-strong bg-u1-soft" aria-hidden />
            Asleep {asleepSeconds} s
          </li>
        </ul>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
        <Cell label="Duty cycle">{formatDuty(r.duty)}</Cell>
        <Cell label="Average current" unit="mA">
          {r.averageMa.toPrecision(2)}
        </Cell>
        <Cell
          label="Battery life"
          unit="days"
          note={r.days >= 365 ? `about ${(r.days / 365).toFixed(1)} years` : undefined}
          className="col-span-2 sm:col-span-1"
        >
          ≈ {r.days < 10 ? r.days.toFixed(1) : Math.round(r.days)}
        </Cell>
      </dl>

      <p className="text-sm text-ink-3">
        Assumes the node is awake for {NODE.awakeSeconds} s each time it wakes, draws {NODE.awakeMa} mA awake and {NODE.sleepMa} mA
        asleep, and runs on a {NODE.capacityMah} mAh battery.
      </p>
      <p className="text-sm text-ink-2">Less time awake → lower average current → a battery that lasts months or years instead of days.</p>
    </figure>
  );
}
