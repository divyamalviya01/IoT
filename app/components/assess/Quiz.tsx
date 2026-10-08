import { Check, RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { MCQ } from "~/content/types";
import { Button } from "~/components/ui/Button";
import { cn } from "~/lib/cn";
import { createRng } from "~/lib/sim/random";

interface QuizProps {
  questions: MCQ[];
  /** Optional label per question, e.g. its topic, shown in mixed unit tests */
  sourceOf?: (q: MCQ) => string | undefined;
  /** Pick this many questions at random from the pool (default: all) */
  limit?: number;
}

interface Prepared {
  q: MCQ;
  /** Original option indexes in display order */
  order: number[];
}

function prepare(questions: MCQ[], seed: number, limit?: number): Prepared[] {
  const rng = createRng(seed);
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, limit ?? shuffled.length).map((q) => {
    const order = q.options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return { q, order };
  });
}

export function Quiz({ questions, sourceOf, limit }: QuizProps) {
  // Seed 1 on first render keeps server and client markup identical.
  const [seed, setSeed] = useState(1);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);

  const items = useMemo(() => prepare(questions, seed, limit), [questions, seed, limit]);

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line-strong p-6 text-ink-3">
        Questions for this topic are added when its phase is built.
      </p>
    );
  }

  const score = items.filter(({ q }) => answers[q.id] === q.answer).length;
  const answeredCount = items.filter(({ q }) => q.id in answers).length;

  const restart = () => {
    setSeed((s) => s + 1);
    setIndex(0);
    setAnswers({});
    setFinished(false);
  };

  if (finished) {
    const missed = items.filter(({ q }) => answers[q.id] !== q.answer);
    const ratio = score / items.length;
    return (
      <section aria-labelledby="quiz-result" className="grid max-w-[70ch] gap-5">
        <div className="rounded-lg border border-line bg-surface p-5">
          <h3 id="quiz-result" className="text-h3 font-bold">
            You scored {score} out of {items.length}
          </h3>
          <p className="mt-1 text-ink-2">
            {ratio === 1
              ? "Every answer correct. You know this topic well."
              : ratio >= 0.7
                ? "Good work. Read the explanations below for the ones you missed."
                : "Read the Theory tab again, then try a fresh set of questions."}
          </p>
          <Button
            variant="primary"
            className="mt-4"
            onClick={restart}
            icon={<RotateCcw size={16} aria-hidden />}
          >
            Try again
          </Button>
        </div>
        {missed.length > 0 && (
          <div className="grid gap-3">
            <h4 className="font-bold">Questions to review</h4>
            <ol className="grid gap-3">
              {missed.map(({ q }) => (
                <li key={q.id} className="rounded-lg border border-line bg-surface p-4">
                  <p className="font-semibold">{q.question}</p>
                  <p className="mt-2 text-ok">
                    <span className="font-semibold">Answer: </span>
                    {q.options[q.answer]}
                  </p>
                  <p className="mt-1 text-ink-2">{q.explanation}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    );
  }

  const { q, order } = items[index];
  const chosen = answers[q.id];
  const answered = chosen !== undefined;
  const correct = chosen === q.answer;
  const last = index === items.length - 1;
  const source = sourceOf?.(q);

  return (
    <section aria-label="Quiz" className="grid max-w-[70ch] gap-4">
      <div className="flex items-center gap-3 text-sm text-ink-3">
        <span>
          Question {index + 1} of {items.length}
        </span>
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label="Questions answered"
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={answeredCount}
        >
          <div
            className="h-full rounded-full bg-brand transition-[width]"
            style={{ width: `${(answeredCount / items.length) * 100}%` }}
          />
        </div>
        <span>{score} correct</span>
      </div>

      <div role="group" aria-labelledby={`q-${q.id}`} className="grid gap-3">
        {source && <p className="text-sm text-ink-3">{source}</p>}
        <p id={`q-${q.id}`} className="text-h3 font-bold">
          {q.question}
        </p>
        <ul className="grid gap-2">
          {order.map((optionIndex) => {
            const isChosen = chosen === optionIndex;
            const isAnswer = optionIndex === q.answer;
            const state = !answered
              ? "idle"
              : isAnswer
                ? "right"
                : isChosen
                  ? "wrong"
                  : "dim";
            return (
              <li key={optionIndex}>
                <button
                  type="button"
                  disabled={answered}
                  aria-pressed={isChosen}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: optionIndex }))}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                    state === "idle" &&
                      "border-line-strong bg-surface hover:border-brand hover:bg-brand-soft",
                    state === "right" && "border-ok bg-ok-soft",
                    state === "wrong" && "border-bad bg-bad-soft",
                    state === "dim" && "border-line bg-surface text-ink-3",
                  )}
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center">
                    {state === "right" && <Check size={18} className="text-ok" aria-hidden />}
                    {state === "wrong" && <X size={18} className="text-bad" aria-hidden />}
                    {(state === "idle" || state === "dim") && (
                      <span className="size-3.5 rounded-full border-2 border-line-strong" />
                    )}
                  </span>
                  <span>
                    {q.options[optionIndex]}
                    {state === "right" && <span className="sr-only"> (correct answer)</span>}
                    {state === "wrong" && <span className="sr-only"> (your answer, incorrect)</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div aria-live="polite">
        {answered && (
          <div
            className={cn(
              "rounded-lg border-l-4 bg-surface p-4",
              correct ? "border-ok" : "border-bad",
            )}
          >
            <p className={cn("font-bold", correct ? "text-ok" : "text-bad")}>
              {correct ? "Correct" : "Not quite"}
            </p>
            <p className="mt-1 text-ink-2">{q.explanation}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          Previous
        </Button>
        {last ? (
          <Button
            variant="primary"
            disabled={answeredCount < items.length}
            onClick={() => setFinished(true)}
          >
            See my score
          </Button>
        ) : (
          <Button variant={answered ? "primary" : "secondary"} onClick={() => setIndex((i) => i + 1)}>
            {answered ? "Next question" : "Skip for now"}
          </Button>
        )}
      </div>
    </section>
  );
}
