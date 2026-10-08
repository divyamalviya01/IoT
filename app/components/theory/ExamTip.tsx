import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";

interface ExamTipProps {
  /** The question as it might appear in the exam */
  question?: string;
  /** A model 2-mark answer: two or three sentences */
  short?: ReactNode;
  /** Points to cover in a 5 or 10-mark answer, in order */
  long?: string[];
}

/** The closing exam box on every theory page. */
export function ExamTip({ question, short, long }: ExamTipProps) {
  return (
    <aside className="print-avoid-break rounded-lg border border-u2/40 bg-u2-soft/40 px-4 py-4">
      <p className="flex items-center gap-2 font-bold text-u2">
        <GraduationCap size={18} aria-hidden />
        Exam tip
      </p>
      {question && <p className="mt-2 font-semibold text-ink">{question}</p>}
      {short && (
        <div className="mt-3">
          <p className="text-sm font-bold text-ink-2">2-mark answer</p>
          <div className="mt-1 text-ink">{short}</div>
        </div>
      )}
      {long && long.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-bold text-ink-2">5 or 10-mark answer: cover these points in order</p>
          <ol className="mt-1 list-decimal space-y-1 pl-6 text-ink marker:text-ink-3">
            {long.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ol>
        </div>
      )}
    </aside>
  );
}
