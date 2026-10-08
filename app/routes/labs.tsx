import { Link } from "react-router";
import type { Route } from "./+types/labs";
import { Breadcrumbs } from "~/components/layout/Breadcrumbs";
import { Page } from "~/components/layout/Page";
import { unitBar } from "~/components/ui/UnitTag";
import { getTopicByCode, getUnit, href, labs } from "~/content/registry";
import { hasLab } from "~/labs/modules";
import { cn } from "~/lib/cn";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Lab manual | IoT Simulator Lab" }];
}

export default function LabsPage() {
  return (
    <Page>
      <Breadcrumbs items={[{ label: "Home", to: href.home() }, { label: "Lab manual" }]} />
      <header className="mt-5 grid gap-3">
        <h1 className="text-h1 font-bold tracking-tight">Lab manual</h1>
        <p className="max-w-[62ch] text-[1.125rem] text-ink-2">
          Every experiment in the course, in syllabus order. Each lab has an aim, guided steps and an
          observation table, and prints as a lab record for your practical file.
        </p>
      </header>

      <div className="relative mt-8 overflow-x-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-[0.95rem]">
          <caption className="sr-only">All lab experiments</caption>
          <thead className="bg-surface-2">
            <tr>
              <th scope="col" className="border-b border-line-strong px-4 py-2.5 text-left font-bold">
                No.
              </th>
              <th scope="col" className="border-b border-line-strong px-4 py-2.5 text-left font-bold">
                Experiment
              </th>
              <th scope="col" className="hidden border-b border-line-strong px-4 py-2.5 text-left font-bold md:table-cell">
                Topic
              </th>
              <th scope="col" className="border-b border-line-strong px-4 py-2.5 text-left font-bold">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {labs.map((lab) => {
              const topic = getTopicByCode(lab.topic)!;
              const unit = getUnit(topic.unit)!;
              const ready = hasLab(lab);
              return (
                <tr key={lab.id} className="border-b border-line align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="flex items-center gap-2 font-mono text-sm">
                      <span className={cn("size-2 rounded-full", unitBar[unit.number])} aria-hidden />
                      {lab.id}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={href.lab(lab.slug)} className="font-bold hover:text-brand hover:underline">
                      {lab.title}
                    </Link>
                    <p className="mt-0.5 max-w-[60ch] text-ink-2">{lab.aim}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-2 md:table-cell">
                    <Link to={href.topic(topic.slug)} className="hover:text-brand hover:underline">
                      {topic.code !== "0.1" && `${topic.code} `}
                      {topic.title}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-2">
                    {ready ? (
                      <span className="font-semibold text-ok">Ready</span>
                    ) : (
                      `Phase ${lab.phase}`
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
