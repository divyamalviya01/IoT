import { Link } from "react-router";
import type { Route } from "./+types/quiz";
import { Quiz } from "~/components/assess/Quiz";
import { Breadcrumbs } from "~/components/layout/Breadcrumbs";
import { NotFoundMessage } from "~/components/layout/NotFoundMessage";
import { Page } from "~/components/layout/Page";
import { unitBar, unitText } from "~/components/ui/UnitTag";
import { getQuiz } from "~/content/modules";
import { getUnit, href, syllabusUnits, topicsInUnit, type Unit } from "~/content/registry";
import type { MCQ } from "~/content/types";
import { cn } from "~/lib/cn";

const TEST_LENGTH = 20;

export function meta({ params }: Route.MetaArgs) {
  const unit = getUnit(params.unitId);
  return [
    {
      title: unit ? `Unit ${unit.number} test | IoT Simulator Lab` : "Unit tests | IoT Simulator Lab",
    },
  ];
}

/** All quiz questions in a unit, with ids made unique across topics. */
function unitPool(unit: Unit) {
  const source = new Map<string, string>();
  const questions: MCQ[] = topicsInUnit(unit.id).flatMap((topic) =>
    getQuiz(topic).map((q) => {
      const id = `${topic.slug}:${q.id}`;
      source.set(id, `Topic ${topic.code}: ${topic.title}`);
      return { ...q, id };
    }),
  );
  return { questions, source };
}

export default function QuizPage({ params }: Route.ComponentProps) {
  if (params.unitId) {
    const unit = getUnit(params.unitId);
    if (!unit || unit.number === 0) return <NotFoundMessage what="test" />;
    const { questions, source } = unitPool(unit);

    return (
      <Page>
        <Breadcrumbs
          items={[
            { label: "Home", to: href.home() },
            { label: "Unit tests", to: href.quiz() },
            { label: `Unit ${unit.number}` },
          ]}
        />
        <header className="mt-5 grid gap-2">
          <h1 className="text-h1 font-bold tracking-tight">
            Unit {unit.number} test: {unit.title}
          </h1>
          <p className="max-w-[62ch] text-ink-2">
            {questions.length === 0
              ? "Questions appear here as the topics in this unit are built."
              : `${Math.min(TEST_LENGTH, questions.length)} questions picked at random from ${questions.length} across the unit. Try again for a different set.`}
          </p>
        </header>
        <div className="mt-8">
          <Quiz questions={questions} limit={TEST_LENGTH} sourceOf={(q) => source.get(q.id)} />
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <Breadcrumbs items={[{ label: "Home", to: href.home() }, { label: "Unit tests" }]} />
      <header className="mt-5 grid gap-2">
        <h1 className="text-h1 font-bold tracking-tight">Unit tests</h1>
        <p className="max-w-[62ch] text-ink-2">
          Mixed questions from every topic in a unit. Use them for revision before internal exams.
        </p>
      </header>
      <ul className="mt-8 grid gap-3 md:grid-cols-3">
        {syllabusUnits.map((unit) => {
          const n = unit.number as 1 | 2 | 3;
          const count = unitPool(unit).questions.length;
          return (
            <li key={unit.id}>
              <Link
                to={href.quiz(unit.id)}
                className="group block h-full rounded-lg border border-line bg-surface p-5 hover:border-line-strong"
              >
                <span className={cn("block h-1 w-10 rounded-full", unitBar[n])} aria-hidden />
                <span className={cn("mt-3 block text-sm font-bold", unitText[n])}>Unit {n}</span>
                <span className="block font-bold group-hover:text-brand">{unit.title}</span>
                <span className="mt-2 block text-sm text-ink-3">
                  {count === 0 ? "Questions coming soon" : `${count} questions in the pool`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Page>
  );
}
