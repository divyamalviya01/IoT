import { useCallback, useEffect, useRef, useState } from "react";

export const SIM_SPEEDS = [0.25, 0.5, 1, 2, 4] as const;
export type SimSpeed = (typeof SIM_SPEEDS)[number];

interface SimClockOptions {
  /** Advance the simulation by dtMs of simulated time. */
  onTick: (dtMs: number, timeMs: number) => void;
  /** Called by reset(), after time returns to zero. */
  onReset?: () => void;
  /** Simulated milliseconds advanced by one press of Step. Default 100. */
  stepMs?: number;
  /** Stop automatically after this much simulated time. */
  maxTimeMs?: number;
}

export interface SimClock {
  timeMs: number;
  running: boolean;
  speed: SimSpeed;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  step: () => void;
  reset: () => void;
  setSpeed: (speed: SimSpeed) => void;
}

/** Longest real frame gap we simulate; avoids huge jumps after a hidden tab. */
const MAX_FRAME_MS = 100;

/**
 * Drives a simulation with requestAnimationFrame. Engines stay pure: they only
 * receive "advance by dt" calls, so tests can drive them without React.
 */
export function useSimClock({
  onTick,
  onReset,
  stepMs = 100,
  maxTimeMs,
}: SimClockOptions): SimClock {
  const [timeMs, setTimeMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState<SimSpeed>(1);

  const time = useRef(0);
  const tickRef = useRef(onTick);
  const resetRef = useRef(onReset);
  tickRef.current = onTick;
  resetRef.current = onReset;

  const advance = useCallback(
    (dtMs: number) => {
      let dt = dtMs;
      if (maxTimeMs !== undefined) dt = Math.min(dt, maxTimeMs - time.current);
      if (dt <= 0) return false;
      time.current += dt;
      tickRef.current(dt, time.current);
      setTimeMs(time.current);
      return maxTimeMs === undefined || time.current < maxTimeMs;
    },
    [maxTimeMs],
  );

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const real = Math.min(now - last, MAX_FRAME_MS);
      last = now;
      if (advance(real * speed)) {
        frame = requestAnimationFrame(loop);
      } else {
        setRunning(false);
      }
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running, speed, advance]);

  const play = useCallback(() => {
    if (maxTimeMs === undefined || time.current < maxTimeMs) setRunning(true);
  }, [maxTimeMs]);
  const pause = useCallback(() => setRunning(false), []);
  const toggle = useCallback(() => (running ? pause() : play()), [running, pause, play]);
  const step = useCallback(() => {
    setRunning(false);
    advance(stepMs);
  }, [advance, stepMs]);
  const reset = useCallback(() => {
    setRunning(false);
    time.current = 0;
    setTimeMs(0);
    resetRef.current?.();
  }, []);

  return { timeMs, running, speed, play, pause, toggle, step, reset, setSpeed };
}

/** "12.4 s" style label for simulated time. */
export function formatSimTime(ms: number): string {
  if (ms < 10_000) return `${(ms / 1000).toFixed(2)} s`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m} min ${s.toString().padStart(2, "0")} s`;
}
