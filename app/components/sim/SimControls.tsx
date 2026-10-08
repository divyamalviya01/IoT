import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { cn } from "~/lib/cn";
import { SIM_SPEEDS, formatSimTime, type SimClock, type SimSpeed } from "./useSimClock";

interface SimControlsProps {
  clock: SimClock;
  /** Label for the play button when stopped, e.g. "Start sending" */
  playLabel?: string;
  /** Hide the speed selector for very short simulations */
  showSpeed?: boolean;
  className?: string;
}

export function SimControls({
  clock,
  playLabel = "Play",
  showSpeed = true,
  className,
}: SimControlsProps) {
  return (
    <div
      data-print-hide
      className={cn("flex flex-wrap items-center gap-x-3 gap-y-2", className)}
    >
      <Button
        variant="primary"
        onClick={clock.toggle}
        icon={clock.running ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
        className="min-w-28"
      >
        {clock.running ? "Pause" : playLabel}
      </Button>
      <Button onClick={clock.step} icon={<StepForward size={16} aria-hidden />}>
        Step
      </Button>
      <Button variant="ghost" onClick={clock.reset} icon={<RotateCcw size={16} aria-hidden />}>
        Reset
      </Button>
      {showSpeed && (
        <Segmented<string>
          label="Simulation speed"
          hideLabel
          size="sm"
          value={String(clock.speed)}
          onChange={(v) => clock.setSpeed(Number(v) as SimSpeed)}
          options={SIM_SPEEDS.map((s) => ({
            value: String(s),
            label: `${s}×`,
            ariaLabel: `Speed ${s} times`,
          }))}
        />
      )}
      <p className="ml-auto text-sm text-ink-3">
        Simulated time{" "}
        <span className="font-mono tabular-nums text-ink" aria-live="off">
          {formatSimTime(clock.timeMs)}
        </span>
      </p>
    </div>
  );
}
