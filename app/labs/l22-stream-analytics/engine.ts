/**
 * L22 Stream analytics: a temperature sensor reports once a minute. The
 * lab smooths the stream with a moving average and flags anomalies with a
 * z-score, then compares the flags with the faults that were really injected.
 *
 * The noise for every reading is drawn up front from the seed, so injecting a
 * fault changes only the readings it touches.
 */
import { createRng } from "~/lib/sim/random";

export const SAMPLE_MINUTES = 1;
/** The run covers 08:00 to 14:00, while the room slowly warms up */
export const START_MINUTE = 8 * 60;
export const RUN_SAMPLES = 360;
export const BASE_C = 28;
export const DAILY_SWING_C = 2;
export const NOISE_SD = 0.3;
export const SPIKE_C = 8;
export const STUCK_LEN = 12;
export const DRIFT_LEN = 120;
export const DRIFT_TOTAL_C = 3;
export const STUCK_RUN = 6;
export const WINDOW_RANGE = [3, 50] as const;
export const K_RANGE = [2, 4] as const;

export type FaultKind = "spike" | "stuck" | "drift";

export interface Fault {
  kind: FaultKind;
  /** Index of the first reading the fault touches */
  at: number;
}

export interface Reading {
  i: number;
  /** Minutes since midnight */
  minute: number;
  value: number;
  /** What the sensor should have read (no fault) */
  truth: number;
  fault?: FaultKind;
}

/** Five spikes at seeded places, at least 30 readings apart, after a warm-up. */
export function defaultFaults(seed = 1, count = RUN_SAMPLES): Fault[] {
  const rng = createRng(seed * 31 + 7);
  const at: number[] = [];
  while (at.length < 5) {
    const i = rng.int(60, count - 10);
    if (at.every((a) => Math.abs(a - i) >= 30)) at.push(i);
  }
  return at.sort((a, b) => a - b).map((i) => ({ kind: "spike", at: i }));
}

export function generateStream({ count = RUN_SAMPLES, seed = 1, faults = defaultFaults(seed, count) }: { count?: number; seed?: number; faults?: Fault[] } = {}): Reading[] {
  const rng = createRng(seed);
  const noise = Array.from({ length: count }, () => rng.normal(0, NOISE_SD));
  const out: Reading[] = noise.map((n, i) => {
    const minute = (START_MINUTE + i * SAMPLE_MINUTES) % (24 * 60);
    const truth = BASE_C + DAILY_SWING_C * Math.sin((2 * Math.PI * (minute / 60 - 9)) / 24) + n;
    return { i, minute, value: truth, truth };
  });

  // Drift first (a slow calibration error that stays), then stuck (repeats the last value), then spikes.
  for (const f of faults.filter((f) => f.kind === "drift")) {
    for (let j = f.at; j < count; j++) {
      out[j].value += DRIFT_TOTAL_C * Math.min(1, (j - f.at + 1) / DRIFT_LEN);
      if (j < f.at + DRIFT_LEN) out[j].fault ??= "drift";
    }
  }
  for (const f of faults.filter((f) => f.kind === "stuck" && f.at > 0)) {
    for (let j = f.at; j < Math.min(count, f.at + STUCK_LEN); j++) {
      out[j].value = out[f.at - 1].value;
      out[j].fault = "stuck";
    }
  }
  for (const f of faults.filter((f) => f.kind === "spike" && f.at < count)) {
    out[f.at].value += SPIKE_C;
    out[f.at].fault = "spike";
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Analytics                                                           */
/* ------------------------------------------------------------------ */

/** Average of the last `window` readings (fewer at the very start). */
export function movingAverage(values: number[], window: number): number[] {
  let sum = 0;
  return values.map((v, i) => {
    sum += v;
    if (i >= window) sum -= values[i - window];
    return sum / Math.min(i + 1, window);
  });
}

function stats(xs: number[]): { mean: number; sd: number } {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
  return { mean, sd };
}

/**
 * How unusual each reading is: (value − mean) ÷ standard deviation of the
 * previous `window` readings. The reading itself is left out, so a spike
 * cannot hide itself by raising the average. Until a full window has
 * arrived there is nothing fair to compare with, so z stays 0.
 */
export function zScores(values: number[], window: number): number[] {
  return values.map((v, i) => {
    if (i < window) return 0;
    const prev = values.slice(i - window, i);
    const { mean, sd } = stats(prev);
    return sd < 1e-9 ? 0 : (v - mean) / sd;
  });
}

export interface Point {
  i: number;
  value: number;
  avg: number;
  min: number;
  max: number;
  z: number;
  flag?: "spike" | "stuck";
}

export interface Settings {
  window: number;
  k: number;
  stuckRun?: number;
}

export function analyse(values: number[], { window, k, stuckRun = STUCK_RUN }: Settings): Point[] {
  const avg = movingAverage(values, window);
  const z = zScores(values, window);
  let run = 1;
  return values.map((value, i) => {
    const recent = values.slice(Math.max(0, i - window + 1), i + 1);
    run = i > 0 && value === values[i - 1] ? run + 1 : 1;
    const flag = Math.abs(z[i]) > k ? "spike" : run === stuckRun ? "stuck" : undefined;
    return { i, value, avg: avg[i], min: Math.min(...recent), max: Math.max(...recent), z: z[i], flag };
  });
}

/** How far the moving average trails the real signal, in readings. */
export const smoothingLag = (window: number) => (window - 1) / 2;

export interface Score {
  spikes: number;
  caught: number;
  missed: number;
  falseAlarms: number;
  flagged: number;
  stuckFaults: number;
  stuckCaught: number;
}

/** Compares the flags with the injected faults. A spike counts as caught if flagged within one reading. */
export function score(readings: Reading[], points: Point[], upTo = readings.length): Score {
  const spikeAt = readings.slice(0, upTo).filter((r) => r.fault === "spike").map((r) => r.i);
  const flags = points.slice(0, upTo).filter((p) => p.flag === "spike").map((p) => p.i);
  const near = (a: number, b: number) => Math.abs(a - b) <= 1;
  const caught = spikeAt.filter((s) => flags.some((f) => near(f, s))).length;
  const stuckStarts = readings.slice(0, upTo).filter((r) => r.fault === "stuck" && readings[r.i - 1]?.fault !== "stuck").map((r) => r.i);
  const stuckFlags = points.slice(0, upTo).filter((p) => p.flag === "stuck").map((p) => p.i);
  return {
    spikes: spikeAt.length,
    caught,
    missed: spikeAt.length - caught,
    falseAlarms: flags.filter((f) => !spikeAt.some((s) => near(f, s))).length,
    flagged: flags.length + stuckFlags.length,
    stuckFaults: stuckStarts.length,
    stuckCaught: stuckStarts.filter((s) => stuckFlags.some((f) => f >= s - 1 && f < s + STUCK_LEN)).length,
  };
}

export const clock = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
