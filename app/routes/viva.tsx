import { useMemo, useState } from "react";
import type { Route } from "./+types/viva";
import { VivaList, type VivaEntry } from "~/components/assess/VivaList";
import { Breadcrumbs } from "~/components/layout/Breadcrumbs";
import { Page } from "~/components/layout/Page";
import { Segmented } from "~/components/ui/Segmented";
import { getViva } from "~/content/modules";
import { href, topics, units, type UnitId } from "~/content/registry";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Viva questions | IoT Simulator Lab" }];
}

type Filter = "all" | UnitId;

export default function VivaPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const items = useMemo<VivaEntry[]>(
    () =>
      topics
        .filter((t) => filter === "all" || t.unit === filter)
        .flatMap((topic) =>
          getViva(topic).map((v) => ({
            ...v,
            source: topic.unit === "start" ? topic.title : `Topic ${topic.code}: ${topic.title}`,
          })),
        ),
    [filter],
  );

  return (
    <Page>
      <Breadcrumbs items={[{ label: "Home", to: href.home() }, { label: "Viva questions" }]} />
      <header className="mt-5 grid gap-2">
        <h1 className="text-h1 font-bold tracking-tight">Viva questions</h1>
        <p className="max-w-[62ch] text-ink-2">
          Questions examiners commonly ask in practical vivas, with short model answers. Say your
          answer out loud first, then open the model answer to check.
        </p>
      </header>
      <div className="mt-6">
        <Segmented<Filter>
          label="Show questions from"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            ...units.map((u) => ({
              value: u.id,
              label: u.number === 0 ? "Start here" : `Unit ${u.number}`,
            })),
          ]}
        />
      </div>
      <div className="mt-6">
        <VivaList key={filter} items={items} />
      </div>
    </Page>
  );
}
