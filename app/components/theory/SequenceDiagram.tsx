import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/Button";

export interface SequenceMessage {
  from: string;
  to: string;
  label: string;
  /** Plain-language explanation shown when this step is current */
  note?: string;
  /** Replies and acknowledgements are drawn dashed */
  reply?: boolean;
  /** Draw the message as lost on the way */
  lost?: boolean;
}

interface SequenceDiagramProps {
  participants: string[];
  messages: SequenceMessage[];
  caption?: string;
  /** Start with every message visible instead of stepping from zero */
  startComplete?: boolean;
}

const COL = 160;
const HEAD = 52;
const ROW = 58;
const PAD_BOTTOM = 24;

/**
 * Step-through sequence diagram: lifelines for each participant and messages
 * drawn one at a time. Used for handshakes and protocol exchanges.
 */
export function SequenceDiagram({
  participants,
  messages,
  caption,
  startComplete = false,
}: SequenceDiagramProps) {
  const [step, setStep] = useState(startComplete ? messages.length : 0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (step >= messages.length) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setStep((s) => s + 1), 1300);
    return () => clearTimeout(timer);
  }, [playing, step, messages.length]);

  const width = participants.length * COL;
  // The diagram grows as messages are drawn, so there is no empty block up front.
  const height = HEAD + Math.max(step, 1) * ROW + PAD_BOTTOM;
  const x = (name: string) => participants.indexOf(name) * COL + COL / 2;
  const current = step > 0 ? messages[step - 1] : null;

  return (
    <figure className="print-avoid-break grid grid-cols-1 gap-3 rounded-lg border border-line bg-surface p-4">
      {caption && <figcaption className="font-bold">{caption}</figcaption>}

      <div className="overflow-x-auto" tabIndex={0} aria-label="Sequence diagram, scroll sideways if needed">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ minWidth: width, maxWidth: width * 1.3 }}
          className="mx-auto block w-full font-sans"
          role="img"
          aria-label={`Message sequence between ${participants.join(", ")}`}
        >
          {participants.map((p) => (
            <g key={p}>
              <line
                x1={x(p)}
                x2={x(p)}
                y1={HEAD - 8}
                y2={height - 8}
                stroke="var(--line-strong)"
                strokeDasharray="4 4"
              />
              <rect
                x={x(p) - COL / 2 + 12}
                y={4}
                width={COL - 24}
                height={34}
                rx={6}
                fill="var(--surface-2)"
                stroke="var(--line-strong)"
              />
              <text
                x={x(p)}
                y={26}
                textAnchor="middle"
                fontSize="14"
                fontWeight="700"
                fill="var(--ink)"
              >
                {p}
              </text>
            </g>
          ))}

          {messages.slice(0, step).map((m, i) => {
            const y = HEAD + i * ROW + ROW / 2 + 6;
            const x1 = x(m.from);
            const x2 = x(m.to);
            const isCurrent = i === step - 1;
            const color = m.lost ? "var(--bad)" : isCurrent ? "var(--brand)" : "var(--ink-3)";
            const dir = x2 >= x1 ? 1 : -1;
            const tip = x2 - dir * 2;
            const end = m.lost ? x1 + (x2 - x1) * 0.6 : tip - dir * 8;
            const labelX = (x1 + (m.lost ? end : x2)) / 2;

            return (
              <g key={i}>
                <motion.path
                  d={`M ${x1} ${y} L ${end} ${y}`}
                  stroke={color}
                  strokeWidth={isCurrent ? 2.25 : 1.75}
                  strokeDasharray={m.reply ? "6 4" : undefined}
                  fill="none"
                  initial={{ pathLength: isCurrent ? 0 : 1 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
                {!m.lost && (
                  <motion.path
                    d={`M ${tip} ${y} L ${tip - dir * 10} ${y - 5.5} L ${tip - dir * 10} ${y + 5.5} Z`}
                    fill={color}
                    initial={{ opacity: isCurrent ? 0 : 1 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: isCurrent ? 0.4 : 0, duration: 0.15 }}
                  />
                )}
                {m.lost && (
                  <g stroke="var(--bad)" strokeWidth={2.25} strokeLinecap="round">
                    <line x1={end - 6} y1={y - 6} x2={end + 6} y2={y + 6} />
                    <line x1={end - 6} y1={y + 6} x2={end + 6} y2={y - 6} />
                  </g>
                )}
                <text
                  x={labelX}
                  y={y - 9}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight={isCurrent ? 700 : 400}
                  fill={isCurrent ? "var(--ink)" : "var(--ink-2)"}
                >
                  {m.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="min-h-12 text-ink-2" aria-live="polite">
        {current ? (
          <>
            <span className="font-semibold text-ink">
              Step {step} of {messages.length}:{" "}
            </span>
            {current.note ?? `${current.from} sends ${current.label} to ${current.to}.`}
          </>
        ) : (
          "Press Next step to draw the first message."
        )}
      </p>

      <div className="flex flex-wrap gap-2" data-print-hide>
        <Button
          size="sm"
          disabled={step === 0}
          onClick={() => {
            setPlaying(false);
            setStep((s) => s - 1);
          }}
          icon={<ChevronLeft size={16} aria-hidden />}
        >
          Previous step
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={step >= messages.length}
          onClick={() => {
            setPlaying(false);
            setStep((s) => s + 1);
          }}
          icon={<ChevronRight size={16} aria-hidden />}
        >
          Next step
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (step >= messages.length) setStep(0);
            setPlaying((p) => !p);
          }}
          icon={playing ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
        >
          {playing ? "Pause" : "Play all"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setPlaying(false);
            setStep(0);
          }}
          icon={<RotateCcw size={16} aria-hidden />}
        >
          Restart
        </Button>
      </div>
    </figure>
  );
}
