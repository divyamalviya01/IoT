import { ClipboardPlus, FileText } from "lucide-react";
import type { ReactNode } from "react";
import { href, type Lab } from "~/content/registry";
import { getLabRecord } from "~/labs/modules";
import { Button, ButtonLink } from "~/components/ui/Button";
import { useObservations } from "~/lib/observations";
import { ObservationTable } from "./ObservationTable";

interface LabLayoutProps {
  lab: Lab;
  /** Guided steps for the student, in order */
  steps: string[];
  /** Setup panel: sliders, toggles, scenario pickers */
  controls: ReactNode;
  /** The simulation itself: SVG, canvas or 3D scene */
  stage: ReactNode;
  /** Usually <SimControls>; sits under the stage */
  toolbar?: ReactNode;
  /** Usually <Readouts> */
  readouts?: ReactNode;
  /** Usually <EventLog> */
  log?: ReactNode;
  /** Adds the current run to the observation table */
  onRecord?: () => void;
  recordDisabled?: boolean;
  recordHint?: string;
}

/**
 * Standard lab page: Aim → How to do it → Setup + Simulation → Readouts →
 * Observations → Lab record. Every lab uses this so students always know
 * where to look.
 */
export function LabLayout({
  lab,
  steps,
  controls,
  stage,
  toolbar,
  readouts,
  log,
  onRecord,
  recordDisabled,
  recordHint = "Record a row after each run so your lab record has observations to show.",
}: LabLayoutProps) {
  const record = getLabRecord(lab);
  const { rows, removeRow, clear } = useObservations(lab.slug);

  return (
    <div className="grid grid-cols-1 gap-6">
      <header className="grid gap-2">
        <p className="text-sm font-semibold text-ink-3">Experiment {lab.id}</p>
        <h2 className="text-h2 font-bold">{lab.title}</h2>
        <p className="max-w-[70ch] text-ink-2">
          <span className="font-semibold text-ink">Aim: </span>
          {lab.aim}
        </p>
      </header>

      <details className="group rounded-lg border border-line bg-surface" open>
        <summary className="cursor-pointer select-none rounded-lg px-4 py-3 font-bold marker:text-ink-3">
          How to do this lab
        </summary>
        <ol className="list-decimal space-y-1.5 px-4 pb-4 pl-10 text-ink-2 marker:text-ink-3">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </details>

      <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <section
          aria-label="Setup"
          className="grid content-start gap-5 rounded-lg border border-line bg-surface p-4"
        >
          <h3 className="font-bold">Setup</h3>
          {controls}
          {onRecord && (
            <div className="grid gap-2 border-t border-line pt-4">
              <Button
                variant="primary"
                onClick={onRecord}
                disabled={recordDisabled}
                icon={<ClipboardPlus size={16} aria-hidden />}
              >
                Record observation
              </Button>
              <p className="text-sm text-ink-3">{recordHint}</p>
            </div>
          )}
        </section>

        <section aria-label="Simulation" className="grid min-w-0 content-start gap-3">
          <div className="min-w-0 overflow-hidden rounded-lg border border-line bg-surface">
            {stage}
          </div>
          {toolbar}
          {readouts}
        </section>
      </div>

      {log}

      {record && (
        <section aria-labelledby={`${lab.slug}-obs`} className="grid grid-cols-1 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={`${lab.slug}-obs`} className="text-h3 font-bold">
              Observations
            </h3>
            <div className="ml-auto flex flex-wrap gap-2">
              {rows.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clear}>
                  Clear table
                </Button>
              )}
              <ButtonLink
                to={href.labRecord(lab.slug)}
                variant="secondary"
                size="sm"
                icon={<FileText size={16} aria-hidden />}
              >
                Open lab record
              </ButtonLink>
            </div>
          </div>
          <ObservationTable
            columns={record.observationColumns}
            rows={rows}
            onRemoveRow={removeRow}
          />
        </section>
      )}
    </div>
  );
}
