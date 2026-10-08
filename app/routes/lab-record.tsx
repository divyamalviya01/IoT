import { ArrowLeft, Printer } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/lab-record";
import { ObservationTable } from "~/components/lab/ObservationTable";
import { NotFoundMessage } from "~/components/layout/NotFoundMessage";
import { Button } from "~/components/ui/Button";
import { getLab, getTopicByCode, href } from "~/content/registry";
import { getLabRecord } from "~/labs/modules";
import { useObservations } from "~/lib/observations";

export function meta({ params }: Route.MetaArgs) {
  const lab = getLab(params.labSlug);
  return [
    {
      title: lab
        ? `Lab record ${lab.id}: ${lab.title} | IoT Simulator Lab`
        : "Lab record not found | IoT Simulator Lab",
    },
  ];
}

const STUDENT_KEY = "iot-lab-student";

interface Student {
  name: string;
  roll: string;
  course: string;
}

/** Name and roll number are remembered on this device as a convenience. */
function useStudent() {
  const [student, setStudent] = useState<Student>({ name: "", roll: "", course: "BCA 5th semester" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STUDENT_KEY);
      if (raw) setStudent((s) => ({ ...s, ...(JSON.parse(raw) as Partial<Student>) }));
    } catch {
      // Storage blocked: fields simply start empty.
    }
  }, []);

  const update = (patch: Partial<Student>) =>
    setStudent((s) => {
      const next = { ...s, ...patch };
      try {
        localStorage.setItem(STUDENT_KEY, JSON.stringify(next));
      } catch {
        // Not fatal.
      }
      return next;
    });

  return [student, update] as const;
}

export default function LabRecordPage({ params }: Route.ComponentProps) {
  const lab = getLab(params.labSlug);
  const record = lab ? getLabRecord(lab) : undefined;
  const { rows, summary, setSummary } = useObservations(lab?.slug ?? "");
  const [student, setStudent] = useStudent();
  const [date, setDate] = useState("");
  const resultId = useId();

  useEffect(() => {
    setDate(new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }));
  }, []);

  if (!lab) return <NotFoundMessage what="lab record" />;
  const topic = getTopicByCode(lab.topic)!;

  return (
    <div className="min-h-dvh bg-bg pb-16 print:pb-0">
      <div
        data-print-hide
        className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur"
      >
        <div className="mx-auto flex h-14 max-w-[52rem] items-center gap-3 px-4">
          <Link
            to={href.lab(lab.slug)}
            className="inline-flex items-center gap-1.5 rounded-md font-semibold text-ink-2 hover:text-ink"
          >
            <ArrowLeft size={16} aria-hidden /> Back to the lab
          </Link>
          <Button
            variant="primary"
            className="ml-auto"
            onClick={() => window.print()}
            icon={<Printer size={16} aria-hidden />}
            disabled={!record}
          >
            Print or save as PDF
          </Button>
        </div>
      </div>

      <main className="mx-auto mt-6 max-w-[52rem] px-4 print:mt-0 print:max-w-none print:px-0">
        {!record ? (
          <div className="rounded-lg border border-dashed border-line-strong bg-surface p-6">
            <h1 className="text-h2 font-bold">
              {lab.id} {lab.title}
            </h1>
            <p className="mt-2 text-ink-2">
              The lab record for this experiment is added with the lab itself, in phase {lab.phase}.
            </p>
          </div>
        ) : (
          <article className="grid grid-cols-1 gap-6 rounded-lg border border-line bg-surface p-6 sm:p-10 print:gap-5 print:rounded-none print:border-0 print:p-0">
            <header className="grid gap-4 border-b-2 border-ink pb-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold">IoT Simulator Lab</p>
                <p className="text-sm text-ink-2">BCA-501 Internet of Things</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-3">Experiment {lab.id}</p>
                <h1 className="text-h2 font-bold">{lab.title}</h1>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
                <RecordField label="Student name" value={student.name} onChange={(name) => setStudent({ name })} />
                <RecordField label="Roll no." value={student.roll} onChange={(roll) => setStudent({ roll })} />
                <RecordField label="Class" value={student.course} onChange={(course) => setStudent({ course })} />
                <RecordField label="Date" value={date} onChange={setDate} />
              </div>
            </header>

            <RecordSection title="Aim">
              <p>{lab.aim}</p>
            </RecordSection>

            <RecordSection title="Software and apparatus">
              <ul className="list-disc pl-5 marker:text-ink-3">
                {record.apparatus.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </RecordSection>

            <RecordSection title="Theory">
              <p>{record.theory}</p>
              <p className="mt-1 text-sm text-ink-3" data-print-hide>
                Full theory: topic {topic.code}, {topic.title}.
              </p>
            </RecordSection>

            <RecordSection title="Procedure">
              <ol className="list-decimal space-y-1 pl-5 marker:text-ink-3">
                {record.procedure.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ol>
            </RecordSection>

            <RecordSection title="Observations">
              {rows.length === 0 && (
                <p className="mb-2 text-sm text-ink-3" data-print-hide>
                  No observations recorded yet. Go back to the lab, run it and press Record observation.
                  Empty rows are printed so you can fill them in by hand.
                </p>
              )}
              <ObservationTable columns={record.observationColumns} rows={rows} minRows={5} />
            </RecordSection>

            <RecordSection title="Result">
              <label htmlFor={resultId} className="sr-only">
                Result
              </label>
              <textarea
                id={resultId}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={record.resultHint}
                rows={4}
                className="w-full rounded-md border border-line-strong bg-bg px-3 py-2 placeholder:text-ink-3 print:hidden"
              />
              <p className="hidden min-h-16 whitespace-pre-wrap border-b border-line print:block">
                {summary}
              </p>
            </RecordSection>

            <RecordSection title="Viva questions">
              <ol className="grid list-decimal gap-2 pl-5 marker:text-ink-3">
                {record.viva.map((v) => (
                  <li key={v.q} className="print-avoid-break">
                    <p className="font-semibold">{v.q}</p>
                    <p className="text-ink-2">{v.a}</p>
                  </li>
                ))}
              </ol>
            </RecordSection>

            <footer className="mt-6 grid grid-cols-2 gap-8 pt-6 text-sm text-ink-2">
              <p className="border-t border-ink pt-1">Student’s signature</p>
              <p className="border-t border-ink pt-1 text-right">Teacher’s signature</p>
            </footer>
          </article>
        )}
      </main>
    </div>
  );
}

function RecordSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-1 gap-2">
      <h2 className="text-h3 font-bold">{title}</h2>
      <div className="text-ink">{children}</div>
    </section>
  );
}

function RecordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-baseline gap-2">
      <label htmlFor={id} className="shrink-0 text-sm font-semibold text-ink-2">
        {label}:
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 border-b border-line-strong bg-transparent px-1 py-0.5 focus:border-brand focus:outline-none print:border-ink"
      />
    </div>
  );
}
