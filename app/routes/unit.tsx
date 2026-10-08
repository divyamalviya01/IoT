import { Eye, FlaskConical } from "lucide-react";
import { Link } from "react-router";
import type { Route } from "./+types/unit";
import { Breadcrumbs } from "~/components/layout/Breadcrumbs";
import { NotFoundMessage } from "~/components/layout/NotFoundMessage";
import { Page } from "~/components/layout/Page";
import { ButtonLink } from "~/components/ui/Button";
import { UnitTag } from "~/components/ui/UnitTag";
import { hasContent } from "~/content/modules";
import { getUnit, href, labsInUnit, topicsInUnit } from "~/content/registry";
import { hasLab } from "~/labs/modules";

export function meta({ params }: Route.MetaArgs) {
  const unit = getUnit(params.unitId);
  return [
    {
      title: unit
        ? `${unit.number > 0 ? `Unit ${unit.number}: ` : ""}${unit.title} | IoT Simulator Lab`
        : "Unit not found | IoT Simulator Lab",
    },
  ];
}

export default function UnitPage({ params }: Route.ComponentProps) {
  const unit = getUnit(params.unitId);
  if (!unit) return <NotFoundMessage what="unit" />;

  const unitTopics = topicsInUnit(unit.id);
  const unitLabs = labsInUnit(unit.id);

  return (
    <Page>
      <Breadcrumbs
        items={[
          { label: "Home", to: href.home() },
          { label: unit.number > 0 ? `Unit ${unit.number}` : unit.title },
        ]}
      />
      <header className="mt-5 grid gap-3">
        <UnitTag unit={unit.number} className="w-fit" />
        <h1 className="text-h1 font-bold tracking-tight">{unit.title}</h1>
        <p className="max-w-[62ch] text-[1.125rem] text-ink-2">{unit.summary}</p>
      </header>

      {unit.syllabus.length > 0 && (
        <section aria-labelledby="unit-syllabus" className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 id="unit-syllabus" className="font-bold">
              Syllabus text
            </h2>
            <div className="mt-2 grid gap-2 border-l-2 border-line-strong pl-4 text-ink-2">
              {unit.syllabus.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
          <div>
            <h2 className="font-bold">After this unit you can</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2 marker:text-ink-3">
              {unit.outcomes.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section aria-labelledby="unit-topics" className="mt-10">
        <h2 id="unit-topics" className="text-h2 font-bold">
          Topics
        </h2>
        <ol className="mt-4 grid border-t border-line">
          {unitTopics.map((topic) => {
            const ready = hasContent(topic);
            return (
              <li key={topic.slug} className="border-b border-line">
                <Link
                  to={href.topic(topic.slug)}
                  className="group grid gap-1 py-3.5 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:items-baseline sm:gap-4"
                >
                  <span className="font-mono text-sm tabular-nums text-ink-3">{topic.code}</span>
                  <span>
                    <span className="block font-bold group-hover:text-brand">{topic.title}</span>
                    <span className="mt-0.5 block text-[0.95rem] text-ink-2">{topic.summary}</span>
                  </span>
                  <span className="flex items-center gap-3 text-sm text-ink-3">
                    {topic.visual && <Eye size={15} aria-label="Has a visualization" />}
                    {topic.lab && <FlaskConical size={15} aria-label="Has a lab" />}
                    <span>{ready ? "Ready" : `Phase ${topic.phase}`}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      {unitLabs.length > 0 && (
        <section aria-labelledby="unit-labs" className="mt-10">
          <h2 id="unit-labs" className="text-h2 font-bold">
            Lab experiments
          </h2>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {unitLabs.map((lab) => (
              <li key={lab.id}>
                <Link
                  to={href.lab(lab.slug)}
                  className="group block h-full rounded-lg border border-line bg-surface p-4 hover:border-line-strong"
                >
                  <span className="font-mono text-sm text-ink-3">{lab.id}</span>
                  <span className="mt-0.5 block font-bold group-hover:text-brand">{lab.title}</span>
                  <span className="mt-1 block text-[0.95rem] text-ink-2">{lab.aim}</span>
                  {!hasLab(lab) && (
                    <span className="mt-2 block text-sm text-ink-3">Built in phase {lab.phase}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {unit.number > 0 && (
        <div className="mt-10">
          <ButtonLink to={href.quiz(unit.id)} variant="primary">
            Take the Unit {unit.number} test
          </ButtonLink>
        </div>
      )}
    </Page>
  );
}
