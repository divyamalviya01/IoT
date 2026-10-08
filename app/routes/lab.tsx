import { Suspense } from "react";
import type { Route } from "./+types/lab";
import { Breadcrumbs } from "~/components/layout/Breadcrumbs";
import { NotFoundMessage } from "~/components/layout/NotFoundMessage";
import { Page, SectionLoading } from "~/components/layout/Page";
import { ButtonLink } from "~/components/ui/Button";
import { getLab, getTopicByCode, href } from "~/content/registry";
import { getLabComponent } from "~/labs/modules";

export function meta({ params }: Route.MetaArgs) {
  const lab = getLab(params.labSlug);
  return [
    {
      title: lab ? `${lab.id} ${lab.title} | IoT Simulator Lab` : "Lab not found | IoT Simulator Lab",
    },
    ...(lab ? [{ name: "description", content: lab.aim }] : []),
  ];
}

export default function LabPage({ params }: Route.ComponentProps) {
  const lab = getLab(params.labSlug);
  if (!lab) return <NotFoundMessage what="lab" />;

  const topic = getTopicByCode(lab.topic)!;
  const LabComponent = getLabComponent(lab);

  return (
    <Page className="max-w-[90rem]">
      <Breadcrumbs
        items={[
          { label: "Home", to: href.home() },
          { label: "Lab manual", to: href.labs() },
          { label: `${lab.id} ${lab.title}` },
        ]}
      />
      <div className="mt-5">
        {LabComponent ? (
          <Suspense fallback={<SectionLoading label="Loading lab" />}>
            <LabComponent />
          </Suspense>
        ) : (
          <div className="grid max-w-[62ch] gap-3">
            <p className="text-sm font-semibold text-ink-3">Experiment {lab.id}</p>
            <h1 className="text-h1 font-bold tracking-tight">{lab.title}</h1>
            <p className="text-ink-2">
              <span className="font-semibold text-ink">Aim: </span>
              {lab.aim}
            </p>
            <p className="rounded-lg border border-dashed border-line-strong bg-surface p-4 text-ink-2">
              This lab is built in phase {lab.phase}. Until then, read the theory for topic{" "}
              {topic.code}.
            </p>
            <ButtonLink to={href.topic(topic.slug)} className="w-fit">
              Read topic {topic.code}: {topic.title}
            </ButtonLink>
          </div>
        )}
      </div>
    </Page>
  );
}
