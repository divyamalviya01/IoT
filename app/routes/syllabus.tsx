import { Check } from "lucide-react";
import { Link } from "react-router";
import type { Route } from "./+types/syllabus";
import { Breadcrumbs } from "~/components/layout/Breadcrumbs";
import { Page } from "~/components/layout/Page";
import { unitText } from "~/components/ui/UnitTag";
import { hasContent } from "~/content/modules";
import {
  getLabById,
  href,
  syllabusUnits,
  topics,
  topicsInUnit,
  type VisualKind,
} from "~/content/registry";
import { hasLab } from "~/labs/modules";
import { cn } from "~/lib/cn";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Syllabus coverage | IoT Simulator Lab" }];
}

const visualName: Record<VisualKind, string> = {
  "3d": "3D",
  "2d": "2D",
  chart: "Chart",
  interactive: "Interactive",
};

export default function SyllabusPage() {
  const syllabusTopics = topics.filter((t) => t.unit !== "start");
  const ready = syllabusTopics.filter(hasContent).length;

  return (
    <Page>
      <Breadcrumbs items={[{ label: "Home", to: href.home() }, { label: "Syllabus coverage" }]} />
      <header className="mt-5 grid gap-2">
        <h1 className="text-h1 font-bold tracking-tight">Syllabus coverage</h1>
        <p className="max-w-[62ch] text-ink-2">
          Every line of the BCA-501 syllabus and where it is covered in the lab. {ready} of{" "}
          {syllabusTopics.length} topics are ready so far.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-14">
        {syllabusUnits.map((unit) => {
          const n = unit.number as 1 | 2 | 3;
          return (
            <section key={unit.id} aria-labelledby={`cov-${unit.id}`}>
              <h2 id={`cov-${unit.id}`} className="text-h2 font-bold">
                <span className={cn("block text-sm", unitText[n])}>Unit {n}</span>
                {unit.title}
              </h2>
              <div className="mt-3 grid max-w-[80ch] gap-2 border-l-2 border-line-strong pl-4 text-ink-2">
                {unit.syllabus.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>

              <div className="relative mt-5 overflow-x-auto rounded-lg border border-line">
                <table className="w-full border-collapse text-[0.95rem]">
                  <caption className="sr-only">Unit {n} coverage</caption>
                  <thead className="bg-surface-2">
                    <tr>
                      {["No.", "Topic", "Syllabus words", "Theory", "Visual", "Lab", "Status"].map((h) => (
                        <th
                          key={h}
                          scope="col"
                          className="whitespace-nowrap border-b border-line-strong px-3 py-2 text-left font-bold"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topicsInUnit(unit.id).map((topic) => {
                      const lab = getLabById(topic.lab);
                      const isReady = hasContent(topic);
                      return (
                        <tr key={topic.slug} className="border-b border-line align-top last:border-0">
                          <td className="px-3 py-2.5 font-mono text-sm text-ink-3">{topic.code}</td>
                          <td className="px-3 py-2.5">
                            <Link to={href.topic(topic.slug)} className="font-semibold hover:text-brand hover:underline">
                              {topic.title}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 text-ink-2">{topic.syllabusText}</td>
                          <td className="px-3 py-2.5">
                            <Check size={16} className="text-ink-2" aria-label="Yes" />
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-ink-2">
                            {topic.visual ? visualName[topic.visual] : <span aria-label="None">—</span>}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            {lab ? (
                              <Link to={href.lab(lab.slug)} className="font-mono text-sm hover:text-brand hover:underline">
                                {lab.id}
                                {hasLab(lab) ? "" : "*"}
                              </Link>
                            ) : (
                              <span className="text-ink-3" aria-label="None">
                                —
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            {isReady ? (
                              <span className="font-semibold text-ok">Ready</span>
                            ) : (
                              <span className="text-ink-3">Phase {topic.phase}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-ink-3">* Lab not built yet. A dash means the topic has no visual or lab and is covered by theory.</p>
    </Page>
  );
}
