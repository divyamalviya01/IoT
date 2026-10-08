import { ArrowLeft, ArrowRight, Maximize2 } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/topic";
import { VivaList } from "~/components/assess/VivaList";
import { Quiz } from "~/components/assess/Quiz";
import { Breadcrumbs } from "~/components/layout/Breadcrumbs";
import { NotFoundMessage } from "~/components/layout/NotFoundMessage";
import { Page, SectionLoading } from "~/components/layout/Page";
import {
  TAB_META,
  TopicTabs,
  panelId,
  tabId,
  type TopicTab,
} from "~/components/layout/TopicTabs";
import { ButtonLink } from "~/components/ui/Button";
import { UnitTag } from "~/components/ui/UnitTag";
import { getQuiz, getTheory, getViva, getVisual, hasContent } from "~/content/modules";
import {
  getLabById,
  getTopic,
  href,
  topicNeighbours,
  unitOfTopic,
  type Topic,
} from "~/content/registry";
import { getLabComponent, hasLab } from "~/labs/modules";
import { useHydrated } from "~/lib/useHydrated";

export function meta({ params }: Route.MetaArgs) {
  const topic = getTopic(params.topicSlug);
  if (!topic) return [{ title: "Topic not found | IoT Simulator Lab" }];
  return [
    { title: `${topic.code} ${topic.title} | IoT Simulator Lab` },
    { name: "description", content: topic.summary },
  ];
}

function tabsFor(topic: Topic): TopicTab[] {
  const tabs: TopicTab[] = ["theory"];
  if (topic.visual) tabs.push("visualize");
  if (topic.lab) tabs.push("lab");
  tabs.push("quiz", "viva");
  return tabs;
}

const visualLabel = {
  "3d": "an interactive 3D view",
  "2d": "an animated diagram",
  chart: "interactive charts",
  interactive: "an interactive diagram",
} as const;

export default function TopicPage({ params }: Route.ComponentProps) {
  const topic = getTopic(params.topicSlug);
  const [searchParams, setSearchParams] = useSearchParams();
  const hydrated = useHydrated();

  if (!topic) return <NotFoundMessage what="topic" />;

  const unit = unitOfTopic(topic);
  const tabs = tabsFor(topic);
  // Pre-rendered HTML always shows Theory; switch to ?tab= after hydration.
  const requested = searchParams.get("tab") as TopicTab | null;
  const active: TopicTab =
    hydrated && requested && tabs.includes(requested) ? requested : "theory";
  const { prev, next } = topicNeighbours(topic.slug);

  const setTab = (tab: TopicTab) =>
    setSearchParams(tab === "theory" ? {} : { tab }, {
      replace: true,
      preventScrollReset: true,
    });

  return (
    <Page>
      <Breadcrumbs
        items={[
          { label: "Home", to: href.home() },
          ...(unit.number > 0
            ? [{ label: `Unit ${unit.number}`, to: href.unit(unit.id) }]
            : []),
          { label: unit.number > 0 ? `${topic.code} ${topic.title}` : topic.title },
        ]}
      />

      <header className="mt-5 grid gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <UnitTag unit={unit.number} />
          {unit.number > 0 && (
            <span className="font-mono text-sm text-ink-3">Topic {topic.code}</span>
          )}
        </div>
        <h1 className="max-w-[24ch] text-h1 font-bold tracking-tight text-balance">
          {topic.title}
        </h1>
        <p className="max-w-[62ch] text-[1.125rem] text-ink-2">{topic.summary}</p>
        {unit.number > 0 && (
          <p className="text-sm text-ink-3">
            Syllabus wording: <q className="text-ink-2">{topic.syllabusText}</q>
          </p>
        )}
      </header>

      <div className="mt-7">
        <TopicTabs tabs={tabs} active={active} onChange={setTab} />
        <div
          id={panelId(active)}
          role="tabpanel"
          aria-labelledby={tabId(active)}
          tabIndex={0}
          className="pt-7 focus-visible:outline-offset-8"
        >
          <TabContent topic={topic} tab={active} />
        </div>
      </div>

      <nav
        aria-label="Previous and next topic"
        className="mt-16 grid gap-3 border-t border-line pt-6 sm:grid-cols-2"
        data-print-hide
      >
        {prev ? (
          <Link
            to={href.topic(prev.slug)}
            className="group rounded-lg border border-line p-4 hover:border-line-strong hover:bg-surface"
          >
            <span className="flex items-center gap-1.5 text-sm text-ink-3">
              <ArrowLeft size={14} aria-hidden /> Previous
            </span>
            <span className="mt-1 block font-semibold group-hover:text-brand">
              {prev.code !== "0.1" && `${prev.code} `}
              {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            to={href.topic(next.slug)}
            className="group rounded-lg border border-line p-4 text-right hover:border-line-strong hover:bg-surface"
          >
            <span className="flex items-center justify-end gap-1.5 text-sm text-ink-3">
              Next <ArrowRight size={14} aria-hidden />
            </span>
            <span className="mt-1 block font-semibold group-hover:text-brand">
              {next.code} {next.title}
            </span>
          </Link>
        )}
      </nav>
    </Page>
  );
}

function TabContent({ topic, tab }: { topic: Topic; tab: TopicTab }) {
  const ready = hasContent(topic);

  if (tab === "theory") {
    const Theory = getTheory(topic);
    if (!Theory) return <Planned topic={topic} tab={tab} />;
    return (
      <Suspense fallback={<SectionLoading label="Loading theory" />}>
        <article className="prose-lab">
          <Theory />
        </article>
      </Suspense>
    );
  }

  if (tab === "visualize") {
    const Visual = getVisual(topic);
    if (!Visual) return <Planned topic={topic} tab={tab} />;
    return (
      <Suspense fallback={<SectionLoading label="Loading visualization" />}>
        <Visual />
      </Suspense>
    );
  }

  if (tab === "lab") {
    const lab = getLabById(topic.lab);
    if (!lab || !hasLab(lab)) return <Planned topic={topic} tab={tab} />;
    const LabComponent = getLabComponent(lab)!;
    return (
      <div className="grid gap-4">
        <div className="flex justify-end" data-print-hide>
          <ButtonLink to={href.lab(lab.slug)} size="sm" icon={<Maximize2 size={15} aria-hidden />}>
            Open lab on its own page
          </ButtonLink>
        </div>
        <Suspense fallback={<SectionLoading label="Loading lab" />}>
          <LabComponent />
        </Suspense>
      </div>
    );
  }

  if (tab === "quiz") {
    const questions = getQuiz(topic);
    if (questions.length === 0 && !ready) return <Planned topic={topic} tab={tab} />;
    return <Quiz questions={questions} />;
  }

  const viva = getViva(topic);
  if (viva.length === 0 && !ready) return <Planned topic={topic} tab={tab} />;
  return <VivaList items={viva} />;
}

/** Placeholder for topics whose content is scheduled for a later phase. */
function Planned({ topic, tab }: { topic: Topic; tab: TopicTab }) {
  const lab = getLabById(topic.lab);
  const parts: ReactNode[] = ["simple-English theory with tables and diagrams"];
  if (topic.visual) parts.push(visualLabel[topic.visual]);
  if (lab) parts.push(`lab ${lab.id}, ${lab.title.toLowerCase()}`);
  parts.push("a quiz and viva questions");

  return (
    <div className="max-w-[62ch] rounded-lg border border-dashed border-line-strong bg-surface p-6">
      <p className="font-bold">
        The {TAB_META[tab].label.toLowerCase()} section for this topic is built in phase{" "}
        {topic.phase}.
      </p>
      <p className="mt-2 text-ink-2">
        When it’s ready, this topic will have{" "}
        {parts.map((part, i) => (
          <span key={i}>
            {i > 0 && (i === parts.length - 1 ? " and " : ", ")}
            {part}
          </span>
        ))}
        .
      </p>
      {lab && (
        <p className="mt-2 text-ink-2">
          <span className="font-semibold text-ink">Lab aim: </span>
          {lab.aim}
        </p>
      )}
    </div>
  );
}
