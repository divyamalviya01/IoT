import { useState, type ReactNode } from "react";
import { Segmented } from "~/components/ui/Segmented";
import { Slider } from "~/components/ui/Slider";
import { quantize } from "~/labs/l02-sensor-node/engine";
import { cn } from "~/lib/cn";

/** Same ADC maths as lab L02, with a 5 V reference. */
const VREF = 5;

type Bits = "3" | "8" | "10";
const BIT_OPTIONS: { value: Bits; label: string }[] = [
  { value: "3", label: "3-bit" },
  { value: "8", label: "8-bit" },
  { value: "10", label: "10-bit" },
];

function Cell({ label, unit, className, children }: { label: string; unit?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <div className={cn("bg-surface px-3 py-2.5", className)}>
      <dt className="text-sm text-ink-3">{label}</dt>
      <dd className="mt-0.5 font-mono text-xl tabular-nums text-ink">
        {children}
        {unit && <span className="ml-1 text-sm text-ink-3">{unit}</span>}
      </dd>
    </div>
  );
}

/* 3-bit staircase, drawn in a fixed viewBox: input voltage across, output code up. */
const W = 320;
const H = 210;
const PAD = { left: 40, right: 10, top: 20, bottom: 36 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;
const STEP3 = VREF / 8;
const sx = (v: number) => PAD.left + (v / VREF) * PW;
const sy = (code: number) => PAD.top + PH - ((code + 0.5) / 8) * PH;
const STAIRS =
  `M ${sx(0)} ${sy(0)}` +
  Array.from({ length: 8 }, (_, k) => ` H ${sx((k + 1) * STEP3)}${k < 7 ? ` V ${sy(k + 1)}` : ""}`).join("");

function Staircase({ volts, code }: { volts: number; code: number }) {
  const binary = code.toString(2).padStart(3, "0");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto block h-auto w-full max-w-md font-sans"
      role="img"
      aria-label={`Staircase of 8 steps. ${volts.toFixed(2)} V falls on step ${code}, code ${binary}.`}
    >
      {/* Every voltage inside this band gives the same code */}
      <rect x={sx(code * STEP3)} y={PAD.top} width={PW / 8} height={PH} fill="var(--brand-soft)" />
      <path d={`M ${PAD.left} ${PAD.top} V ${PAD.top + PH} H ${PAD.left + PW}`} fill="none" stroke="var(--line-strong)" />
      <path d={STAIRS} fill="none" stroke="var(--ink-3)" strokeWidth={2} />
      <line x1={sx(code * STEP3)} x2={sx((code + 1) * STEP3)} y1={sy(code)} y2={sy(code)} stroke="var(--brand)" strokeWidth={4} strokeLinecap="round" />
      <line x1={sx(volts)} x2={sx(volts)} y1={PAD.top + PH} y2={sy(code)} stroke="var(--copper)" strokeWidth={1.5} strokeDasharray="4 3" />
      <circle cx={sx(volts)} cy={sy(code)} r={5} fill="var(--copper)" stroke="var(--surface)" strokeWidth={2} />

      <text x={PAD.left - 6} y={PAD.top - 8} textAnchor="end" fontSize="11" fill="var(--ink-3)">
        Code
      </text>
      {Array.from({ length: 8 }, (_, k) => (
        <text
          key={k}
          x={PAD.left - 6}
          y={sy(k) + 4}
          textAnchor="end"
          fontSize="11"
          fontWeight={k === code ? 700 : 400}
          fill={k === code ? "var(--brand)" : "var(--ink-3)"}
          className="font-mono"
        >
          {k.toString(2).padStart(3, "0")}
        </text>
      ))}
      {[0, 1, 2, 3, 4, 5].map((v) => (
        <text key={v} x={sx(v)} y={PAD.top + PH + 16} textAnchor="middle" fontSize="11" fill="var(--ink-3)">
          {v}
        </text>
      ))}
      <text x={PAD.left + PW / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="var(--ink-3)">
        Input voltage (V)
      </text>
    </svg>
  );
}

/** Voltage → step → number → binary, the way a sensor node's ADC does it. */
export default function AdcSteps() {
  const [volts, setVolts] = useState(2);
  const [bitsValue, setBitsValue] = useState<Bits>("3");
  const bits = Number(bitsValue);
  const q = quantize(volts, VREF, bits);
  const binary = q.code.toString(2).padStart(bits, "0");
  // Volts for 3-bit (0.625 V), millivolts for finer steps (19.5 mV, 4.88 mV).
  const [stepValue, stepUnit] = q.step >= 0.1 ? [q.step.toFixed(3), "V"] : [(q.step * 1000).toPrecision(3), "mV"];

  return (
    <figure className="print-avoid-break grid min-w-0 grid-cols-1 gap-4 rounded-lg border border-line bg-surface p-4">
      <figcaption>
        <span className="block font-bold">Inside the ADC: from voltage to binary</span>
        <span className="mt-0.5 block text-sm text-ink-2">
          The ADC splits 0–5 V into equal steps, finds the step the voltage falls on, and outputs that step’s number in binary.
        </span>
      </figcaption>

      <div className="grid gap-4 sm:grid-cols-2">
        <Slider label="Input voltage" value={volts} min={0} max={VREF} step={0.05} format={(v) => `${v.toFixed(2)} V`} onChange={setVolts} />
        <Segmented label="ADC resolution" options={BIT_OPTIONS} value={bitsValue} onChange={setBitsValue} />
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
        <Cell label="Number of steps" unit={<>= 2<sup>{bits}</sup></>}>
          {q.levels}
        </Cell>
        <Cell label="Step size" unit={stepUnit}>
          {stepValue}
        </Cell>
        <Cell label="Output number" unit={`of 0–${q.levels - 1}`}>
          {q.code}
        </Cell>
        <Cell label="Stands for" unit="V">
          {q.volts.toFixed(3)}
        </Cell>
        <Cell label="Binary code" className="col-span-2">
          <span className="tracking-wider text-brand">{binary}</span>
        </Cell>
      </dl>
      <p className="sr-only" aria-live="polite">
        {volts.toFixed(2)} V gives number {q.code}, binary {binary}.
      </p>

      {bits === 3 ? (
        <Staircase volts={volts} code={q.code} />
      ) : (
        <p className="rounded-md border border-dashed border-line-strong px-3 py-2 text-sm text-ink-3">
          With {q.levels} steps, each only {stepValue} {stepUnit} wide, the staircase is too fine to draw. Choose 3-bit to see it.
        </p>
      )}

      <p className="text-sm text-ink-2">More bits → more, smaller steps → a number closer to the real voltage.</p>
    </figure>
  );
}
