import { motion, useReducedMotion } from "motion/react";
import { Play } from "lucide-react";
import { useId, useState } from "react";
import { Readouts } from "~/components/lab/Readouts";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { cn } from "~/lib/cn";
import { BAUD_RATES, isSendable, uartFrame, type BitKind, type Parity } from "./uart";

/** Width of one bit cell in SVG units */
const CELL = 44;
const IDLE_BEFORE = 2;
const IDLE_AFTER = 1;
const HIGH = 34;
const LOW = 84;
/** Seconds the cursor takes to cross one frame: slowed right down so students can follow it */
const SWEEP_S = 3;

const KIND_FILL: Record<BitKind, string> = {
  start: "var(--u1-soft)",
  data: "var(--u2-soft)",
  parity: "var(--u3-soft)",
  stop: "var(--ok-soft)",
};

const label = (kind: BitKind, index?: number) =>
  kind === "data" ? `D${index}` : kind === "start" ? "Start" : kind === "parity" ? "Parity" : "Stop";

/**
 * One character on a UART wire: type a character, choose parity and baud
 * rate, and watch the frame go out bit by bit.
 */
export default function UartFrame() {
  const [char, setChar] = useState("A");
  const [parity, setParity] = useState<Parity>("none");
  const [baud, setBaud] = useState<number>(9600);
  const [run, setRun] = useState(0);
  const reduced = useReducedMotion() ?? false;
  const inputId = useId();
  const frame = uartFrame(char, parity, baud);

  const cells = frame ? IDLE_BEFORE + frame.bits.length + IDLE_AFTER : 0;
  const width = cells * CELL;
  // The line as a list of levels, one per cell, idle high before and after.
  const levels = frame ? [...Array(IDLE_BEFORE).fill(1), ...frame.bits.map((b) => b.value), ...Array(IDLE_AFTER).fill(1)] : [];
  const y = (v: number) => (v ? HIGH : LOW);
  const path = levels
    .map((v, i) => {
      const x0 = i * CELL;
      const prev = i === 0 ? v : levels[i - 1];
      return `${i === 0 ? `M ${x0} ${y(v)}` : prev !== v ? `L ${x0} ${y(v)}` : ""} L ${x0 + CELL} ${y(v)}`;
    })
    .join(" ");
  const dataBits = frame?.bits.filter((b) => b.kind === "data").map((b) => b.value) ?? [];

  return (
    <section aria-labelledby={`${inputId}-title`} className="grid grid-cols-1 gap-4 rounded-lg border border-line bg-surface p-4">
      <div className="grid gap-1">
        <h2 id={`${inputId}-title`} className="text-h3 font-bold">
          A UART frame, bit by bit
        </h2>
        <p className="max-w-[70ch] text-ink-2">
          UART is the simplest wired point-to-point link: one wire each way and no clock wire. Both ends agree on a speed (the baud
          rate) and the receiver times each bit from the start bit.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <label htmlFor={inputId} className="grid gap-1.5">
          <span className="text-[0.95rem] font-semibold">Character</span>
          <input
            id={inputId}
            value={char}
            maxLength={1}
            onChange={(e) => setChar(e.target.value)}
            aria-invalid={!frame}
            className="h-10 w-20 rounded-lg border border-line-strong bg-bg px-3 text-center font-mono text-lg"
            spellCheck={false}
          />
        </label>
        <Segmented<Parity>
          label="Parity"
          size="sm"
          value={parity}
          onChange={setParity}
          options={[
            { value: "none", label: "None" },
            { value: "even", label: "Even" },
            { value: "odd", label: "Odd" },
          ]}
        />
        <Segmented<string>
          label="Baud rate"
          size="sm"
          value={String(baud)}
          onChange={(v) => setBaud(Number(v))}
          options={BAUD_RATES.map((b) => ({ value: String(b), label: String(b) }))}
        />
        <Button size="sm" onClick={() => setRun((r) => r + 1)} icon={<Play size={14} aria-hidden />} disabled={!frame || reduced}>
          Send again
        </Button>
      </div>

      {!frame ? (
        <p className="text-sm text-bad">
          {char.length === 0 ? "Type one character to send." : isSendable(char) ? "" : "Use one ordinary keyboard character (letters, digits or symbols)."}
        </p>
      ) : (
        <>
          <div className="relative overflow-x-auto rounded-lg border border-line bg-bg">
            <svg
              viewBox={`0 0 ${width} 132`}
              className="block w-full min-w-[34rem]"
              role="img"
              aria-label={`UART frame for "${frame.char}": ${frame.bits.map((b) => `${label(b.kind, b.index)} ${b.value}`).join(", ")}.`}
            >
              {frame.bits.map((b, i) => {
                const x = (IDLE_BEFORE + i) * CELL;
                return (
                  <g key={i}>
                    <rect x={x} y={20} width={CELL} height={78} fill={KIND_FILL[b.kind]} />
                    <text x={x + CELL / 2} y={14} textAnchor="middle" className="fill-ink font-mono text-[13px]">
                      {b.value}
                    </text>
                    <text x={x + CELL / 2} y={116} textAnchor="middle" className="fill-ink-2 text-[11px] font-semibold">
                      {label(b.kind, b.index)}
                    </text>
                  </g>
                );
              })}
              <text x={(IDLE_BEFORE * CELL) / 2} y={116} textAnchor="middle" className="fill-ink-3 text-[11px]">
                idle
              </text>
              <text x={width - (IDLE_AFTER * CELL) / 2} y={116} textAnchor="middle" className="fill-ink-3 text-[11px]">
                idle
              </text>
              <path d={path} fill="none" stroke="var(--brand)" strokeWidth={3} strokeLinejoin="round" />
              {!reduced && (
                <motion.line
                  key={`${run}-${frame.char}-${parity}`}
                  y1={20}
                  y2={98}
                  stroke="var(--ink)"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  initial={{ x1: IDLE_BEFORE * CELL, x2: IDLE_BEFORE * CELL, opacity: 1 }}
                  animate={{
                    x1: (IDLE_BEFORE + frame.bits.length) * CELL,
                    x2: (IDLE_BEFORE + frame.bits.length) * CELL,
                    opacity: [1, 1, 0],
                  }}
                  transition={{ duration: SWEEP_S, ease: "linear", opacity: { duration: SWEEP_S + 0.4, times: [0, 0.9, 1] } }}
                />
              )}
            </svg>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-3" aria-hidden>
            {(["start", "data", "parity", "stop"] as BitKind[])
              .filter((k) => k !== "parity" || frame.parityBit !== null)
              .map((k) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className="size-3 rounded-sm" style={{ backgroundColor: KIND_FILL[k] }} />
                  {k === "data" ? "Data bits" : `${label(k)} bit`}
                </span>
              ))}
          </div>

          <div className="grid max-w-[70ch] gap-1.5 text-ink-2">
            <p>
              “{frame.char}” is code {frame.code}, which is <span className="font-mono text-ink">{frame.binary}</span> in binary. UART
              sends the lowest bit first, so the data bits go out as{" "}
              <span className="font-mono text-ink">{dataBits.join(" ")}</span>.
            </p>
            {frame.parityBit !== null && (
              <p>
                The data has {frame.ones} one{frame.ones === 1 ? "" : "s"}. {parity === "even" ? "Even" : "Odd"} parity adds a{" "}
                <span className={cn("font-mono", "text-ink")}>{frame.parityBit}</span> so the total number of 1s is{" "}
                {parity === "even" ? "even" : "odd"}. If one bit flips on the way, the receiver can tell.
              </p>
            )}
          </div>

          <Readouts
            items={[
              { label: "Bits per frame", value: frame.bits.length },
              { label: "Time per bit", value: frame.bitTimeUs.toFixed(frame.bitTimeUs < 10 ? 2 : 1), unit: "µs" },
              { label: "Time per frame", value: frame.frameTimeMs.toFixed(3), unit: "ms" },
              { label: "Characters per second", value: frame.charsPerSecond.toLocaleString("en-IN"), hint: "At most, sending frames back to back" },
            ]}
          />
          <p className="text-sm text-ink-3">The moving line is slowed down. At {baud} baud the whole frame takes about {frame.frameTimeMs.toFixed(2)} ms.</p>
        </>
      )}
    </section>
  );
}
