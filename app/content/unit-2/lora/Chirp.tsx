import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Readouts } from "~/components/lab/Readouts";
import { Segmented } from "~/components/ui/Segmented";
import { SPREADING_FACTORS, airtime, bitRate, type SF } from "~/labs/l19-lora-airtime/engine";
import { APP_BYTES, BANDWIDTH_KHZ, PHY_BYTES, formatMs } from "./FarmScene";

/* ------------------------------------------------------------------ */
/* What the plot shows: preamble, sync, then the first data chirps     */
/* ------------------------------------------------------------------ */

type ChirpKind = "preamble" | "sync" | "data";

interface ChirpSpec {
  kind: ChirpKind;
  /** Start, in symbols from the beginning of the packet. */
  at: number;
  /** Length in symbols (a quarter for the last sync down-chirp). */
  length: number;
  /** Where in the channel an up-chirp starts, 0 (bottom) to 1 (top). */
  start: number;
  down?: boolean;
}

const PREAMBLE = 8;
/** Two sync-word chirps and 2.25 down-chirps: the 4.25 symbols in the airtime formula. */
const SYNC_WORD = [0.19, 0.25];
const DOWN_CHIRPS = [1, 1, 0.25];
/** Made-up data symbols: each start position stands for SF bits. */
const DATA = [0.62, 0.15, 0.83, 0.4, 0.07, 0.71];

const SEQUENCE: ChirpSpec[] = (() => {
  const list: ChirpSpec[] = [];
  let at = 0;
  for (let i = 0; i < PREAMBLE; i++) list.push({ kind: "preamble", at: at++, length: 1, start: 0 });
  for (const start of SYNC_WORD) list.push({ kind: "sync", at: at++, length: 1, start });
  for (const length of DOWN_CHIRPS) {
    list.push({ kind: "sync", at, length, start: 1, down: true });
    at += length;
  }
  for (const start of DATA) list.push({ kind: "data", at: at++, length: 1, start });
  return list;
})();

const SYNC_AT = PREAMBLE;
const DATA_AT = PREAMBLE + SYNC_WORD.length + DOWN_CHIRPS.reduce((a, b) => a + b, 0);
const SHOWN = DATA_AT + DATA.length;

/* ------------------------------------------------------------------ */
/* Drawing                                                             */
/* ------------------------------------------------------------------ */

const W = 760;
const X0 = 74;
const X1 = 748;
const TOP = 34;
const BOTTOM = 150;
const H = 206;
const SYMBOL_W = (X1 - X0) / SHOWN;
/** Seconds the cursor takes to cross the plot: slowed right down so students can follow it. */
const SWEEP_S = 7;

const freqY = (f: number) => BOTTOM - f * (BOTTOM - TOP);
const timeX = (symbols: number) => X0 + symbols * SYMBOL_W;

/** One chirp as a path, plus where it wraps from the top of the channel to the bottom (if it does). */
function chirpPath(c: ChirpSpec): { d: string; wrapX: number | null } {
  const x0 = timeX(c.at);
  const w = c.length * SYMBOL_W;
  if (c.down) return { d: `M${x0},${freqY(1)}L${x0 + w},${freqY(1 - c.length)}`, wrapX: null };
  if (c.start <= 0) return { d: `M${x0},${freqY(0)}L${x0 + w},${freqY(1)}`, wrapX: null };
  const xTop = x0 + (1 - c.start) * w;
  return {
    d: `M${x0},${freqY(c.start)}L${xTop},${freqY(1)}M${xTop},${freqY(0)}L${x0 + w},${freqY(c.start)}`,
    wrapX: xTop,
  };
}

const PATHS = SEQUENCE.map(chirpPath);

const REGION_FILL: Record<ChirpKind, string> = {
  preamble: "var(--u2-soft)",
  sync: "var(--u3-soft)",
  data: "var(--u1-soft)",
};

/** "0", "8.2 ms", "262 ms" */
function tick(ms: number): string {
  if (ms === 0) return "0";
  return ms < 10 ? `${ms.toFixed(1)} ms` : `${Math.round(ms)} ms`;
}

const symbolTime = (ms: number) => (ms < 10 ? `${ms.toFixed(2)}` : ms.toFixed(1));

/* Same-scale strip: one chirp per spreading factor */
const STRIP_X0 = 74;
const STRIP_MAX_W = 560;
const ROW_H = 26;
const STRIP_H = SPREADING_FACTORS.length * ROW_H + 8;
const SLOWEST = SPREADING_FACTORS[SPREADING_FACTORS.length - 1];

export interface ChirpProps {
  sf: SF;
  onSfChange: (sf: SF) => void;
}

const sfOptions = SPREADING_FACTORS.map((sf) => ({ value: String(sf), label: `SF${sf}` }));

/**
 * Topic 2.10: LoRa up-chirps on a frequency-against-time plot for the chosen
 * spreading factor, and one chirp at every spreading factor on the same time
 * scale, so each step visibly doubles the length.
 */
export default function Chirp({ sf, onSfChange }: ChirpProps) {
  const id = useId();
  const reduced = useReducedMotion() ?? false;
  const a = airtime(sf, BANDWIDTH_KHZ, PHY_BYTES);
  const rate = bitRate(sf, BANDWIDTH_KHZ);
  const shownMs = SHOWN * a.symbolMs;
  const packetSymbols = DATA_AT + a.payloadSymbols;

  const regions: Array<{ kind: ChirpKind; from: number; to: number; label: string }> = [
    { kind: "preamble", from: 0, to: SYNC_AT, label: `Preamble: ${PREAMBLE} chirps` },
    { kind: "sync", from: SYNC_AT, to: DATA_AT, label: "Sync" },
    { kind: "data", from: DATA_AT, to: SHOWN, label: `Data: first ${DATA.length} of ${a.payloadSymbols}` },
  ];

  return (
    <section aria-labelledby={`${id}-title`} className="grid grid-cols-1 gap-4 rounded-lg border border-line bg-surface p-4">
      <div className="grid gap-1">
        <h2 id={`${id}-title`} className="text-h3 font-bold">
          The LoRa chirp
        </h2>
        <p className="max-w-[70ch] text-ink-2">
          LoRa sends each symbol as a chirp: a tone that sweeps up from the bottom of the {BANDWIDTH_KHZ} kHz channel to the top.
          The data is in where the sweep starts. It climbs from there, wraps round to the bottom, and climbs back to where it
          began. Each chirp carries SF bits, and every step up in spreading factor makes the chirp last twice as long.
        </p>
      </div>

      <Segmented
        label="Spreading factor"
        options={sfOptions}
        value={String(sf)}
        onChange={(v) => onSfChange(Number(v) as SF)}
        size="sm"
      />

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="grid min-w-0 grid-cols-1 gap-3">
          <div className="overflow-x-auto rounded-lg border border-line bg-bg">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="block w-full min-w-[36rem]"
              role="img"
              aria-label={`Frequency against time for a LoRa packet at SF${sf}: ${PREAMBLE} rising preamble chirps, a sync part, then data chirps that start at different frequencies and wrap round. One chirp lasts ${symbolTime(a.symbolMs)} ms.`}
            >
              <text x={6} y={14} className="fill-ink-3 text-[11px] font-semibold">
                Frequency
              </text>
              {regions.map((r) => (
                <g key={r.kind}>
                  <rect
                    x={timeX(r.from)}
                    y={TOP}
                    width={timeX(r.to) - timeX(r.from)}
                    height={BOTTOM - TOP}
                    fill={REGION_FILL[r.kind]}
                  />
                  <text
                    x={(timeX(r.from) + timeX(r.to)) / 2}
                    y={TOP - 9}
                    textAnchor="middle"
                    className="fill-ink-2 text-[12px] font-semibold"
                  >
                    {r.label}
                  </text>
                </g>
              ))}

              {/* Axes */}
              <line x1={X0} x2={X1} y1={TOP} y2={TOP} stroke="var(--line)" strokeDasharray="3 3" />
              <line x1={X0} x2={X1} y1={(TOP + BOTTOM) / 2} y2={(TOP + BOTTOM) / 2} stroke="var(--line)" strokeDasharray="3 3" />
              <line x1={X0} x2={X1} y1={BOTTOM} y2={BOTTOM} stroke="var(--line-strong)" />
              <line x1={X0} x2={X0} y1={TOP} y2={BOTTOM} stroke="var(--line-strong)" />
              <text x={X0 - 6} y={TOP + 4} textAnchor="end" className="fill-ink-3 text-[11px]">
                +62.5 kHz
              </text>
              <text x={X0 - 6} y={(TOP + BOTTOM) / 2 + 4} textAnchor="end" className="fill-ink-3 text-[11px]">
                centre
              </text>
              <text x={X0 - 6} y={BOTTOM + 4} textAnchor="end" className="fill-ink-3 text-[11px]">
                −62.5 kHz
              </text>
              {[0, SYNC_AT, DATA_AT, SHOWN].map((s, i, all) => (
                <g key={s}>
                  <line x1={timeX(s)} x2={timeX(s)} y1={BOTTOM} y2={BOTTOM + 5} stroke="var(--line-strong)" />
                  <text
                    x={timeX(s)}
                    y={BOTTOM + 18}
                    textAnchor={i === 0 ? "start" : i === all.length - 1 ? "end" : "middle"}
                    className="fill-ink-2 font-mono text-[11px]"
                  >
                    {tick(s * a.symbolMs)}
                  </text>
                </g>
              ))}

              {/* One symbol, measured */}
              <path
                d={`M${timeX(0)},${BOTTOM + 26}v5H${timeX(1)}v-5`}
                fill="none"
                stroke="var(--ink-3)"
                strokeWidth={1.2}
              />
              <text x={timeX(0)} y={BOTTOM + 46} className="fill-ink-2 text-[12px]">
                1 chirp = {symbolTime(a.symbolMs)} ms
              </text>
              <text x={X1} y={BOTTOM + 46} textAnchor="end" className="fill-ink-3 text-[11px]">
                Time
              </text>

              {/* The chirps */}
              {PATHS.map((p, i) =>
                p.wrapX === null ? null : (
                  <line
                    key={`w${i}`}
                    x1={p.wrapX}
                    x2={p.wrapX}
                    y1={TOP}
                    y2={BOTTOM}
                    stroke="var(--line-strong)"
                    strokeDasharray="2 3"
                  />
                ),
              )}
              <path
                d={PATHS.map((p) => p.d).join("")}
                fill="none"
                stroke="var(--brand)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {!reduced && (
                <motion.line
                  key={sf}
                  y1={TOP - 2}
                  y2={BOTTOM + 2}
                  stroke="var(--ink)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  initial={{ x1: X0, x2: X0 }}
                  animate={{ x1: X1, x2: X1 }}
                  transition={{ duration: SWEEP_S, ease: "linear", repeat: Infinity, repeatDelay: 0.6 }}
                />
              )}
            </svg>
          </div>
          <p className="text-sm text-ink-3">
            {reduced ? "" : "The moving line is slowed down. "}
            At SF{sf} the {SHOWN} symbols drawn here take {tick(shownMs)}. A whole packet with {APP_BYTES} bytes of data is{" "}
            {packetSymbols} symbols and takes {formatMs(a.totalMs)}.
          </p>

          <p id={`${id}-strip`} className="text-sm font-semibold text-ink">
            One chirp at each spreading factor, on the same time scale
          </p>
          <div className="overflow-x-auto rounded-lg border border-line bg-bg">
            <svg
              viewBox={`0 0 ${W} ${STRIP_H}`}
              className="block w-full min-w-[36rem]"
              role="img"
              aria-labelledby={`${id}-strip`}
            >
              {SPREADING_FACTORS.map((s, row) => {
                const ms = airtime(s, BANDWIDTH_KHZ, PHY_BYTES).symbolMs;
                const w = STRIP_MAX_W / 2 ** (SLOWEST - s);
                const y0 = 4 + row * ROW_H;
                const chosen = s === sf;
                return (
                  <g key={s}>
                    <title>{`SF${s}: one chirp lasts ${symbolTime(ms)} ms`}</title>
                    <text
                      x={STRIP_X0 - 12}
                      y={y0 + ROW_H / 2 + 4}
                      textAnchor="end"
                      className={chosen ? "fill-ink text-[13px] font-bold" : "fill-ink-3 text-[12px]"}
                    >
                      SF{s}
                    </text>
                    <rect
                      x={STRIP_X0}
                      y={y0 + 3}
                      width={w}
                      height={ROW_H - 6}
                      rx={2}
                      fill={chosen ? "var(--brand-soft)" : "var(--surface-2)"}
                      stroke={chosen ? "var(--brand)" : "none"}
                    />
                    <line
                      x1={STRIP_X0}
                      y1={y0 + ROW_H - 5}
                      x2={STRIP_X0 + w}
                      y2={y0 + 5}
                      stroke={chosen ? "var(--brand)" : "var(--ink-3)"}
                      strokeWidth={chosen ? 2.5 : 1.5}
                    />
                    <text
                      x={STRIP_X0 + w + 8}
                      y={y0 + ROW_H / 2 + 4}
                      className={chosen ? "fill-ink font-mono text-[12px] font-bold" : "fill-ink-3 font-mono text-[12px]"}
                    >
                      {symbolTime(ms)} ms
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <Readouts
          columns={2}
          className="self-start"
          items={[
            { label: "Symbol time", value: symbolTime(a.symbolMs), unit: "ms", hint: "How long one chirp lasts" },
            {
              label: "Bit rate",
              value: Math.round(rate).toLocaleString("en-IN"),
              unit: "bps",
              hint: "Raw bit rate after 4/5 error-correction coding",
            },
            { label: "Bits per chirp", value: sf, hint: "A chirp can start at 2^SF positions, so it carries SF bits" },
            {
              label: "Symbols per packet",
              value: packetSymbols,
              hint: `${DATA_AT} for preamble and sync, ${a.payloadSymbols} for ${PHY_BYTES} bytes (${APP_BYTES} of data and ${PHY_BYTES - APP_BYTES} of LoRaWAN header)`,
            },
          ]}
        />
      </div>
    </section>
  );
}
