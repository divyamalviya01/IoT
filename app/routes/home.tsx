import { BookOpen, Eye, FlaskConical, ListChecks, Mic } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/home";
import { ButtonLink } from "~/components/ui/Button";
import { unitBar, unitText } from "~/components/ui/UnitTag";
import { hasContent } from "~/content/modules";
import {
  href,
  labs,
  syllabusUnits,
  topics,
  topicsInUnit,
  type UnitId,
  type UnitNumber,
} from "~/content/registry";
import { cn } from "~/lib/cn";

const HeroBoard = lazy(() => import("~/components/home/HeroBoard"));

export function meta({}: Route.MetaArgs) {
  return [
    { title: "IoT Simulator Lab | BCA-501 Internet of Things" },
    {
      name: "description",
      content:
        "The BCA-501 Internet of Things syllabus as an interactive lab: simple theory, animated visuals, simulations, quizzes and printable lab records.",
    },
  ];
}

const steps = [
  { icon: BookOpen, title: "Theory", text: "Short sentences, tables and diagrams. Every new word is explained." },
  { icon: Eye, title: "Visualize", text: "Watch the idea move in 2D or 3D, and click parts to learn what they do." },
  { icon: FlaskConical, title: "Lab", text: "Change the settings, run the simulation and record what you observe." },
  { icon: ListChecks, title: "Quiz", text: "Check yourself with multiple-choice questions and explanations." },
  { icon: Mic, title: "Viva", text: "Practise the questions examiners usually ask, with model answers." },
];

export default function Home() {
  const navigate = useNavigate();
  const [activeUnit, setActiveUnit] = useState<1 | 2 | 3 | null>(null);
  const syllabusTopics = topics.filter((t) => t.unit !== "start");

  return (
    <div className="pb-20">
      <section className="mx-auto grid max-w-[80rem] items-center gap-6 px-4 pt-8 sm:px-6 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:gap-4 lg:px-10 lg:pt-12">
        <div className="grid gap-5">
          <h1 className="text-[2.5rem] font-bold leading-[1.05] tracking-tight sm:text-display">
            IoT Simulator Lab
          </h1>
          <p className="max-w-[44ch] text-[1.1875rem] leading-relaxed text-ink-2">
            The BCA-501 Internet of Things syllabus as a lab you can explore. Read each topic in
            plain English, watch it work, then run the experiment yourself.
          </p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink to={href.topic("getting-started")} variant="primary">
              Start with the orientation
            </ButtonLink>
            <ButtonLink to={href.labs()}>Open the lab manual</ButtonLink>
          </div>
          <p className="text-sm text-ink-3">
            {syllabusTopics.length} topics and {labs.length - 1} lab experiments. Everything runs in
            your browser, with no hardware or internet connection needed.
          </p>
        </div>

        <div className="min-w-0">
          <Suspense fallback={<div className="h-[460px] rounded-xl bg-surface-2" aria-hidden />}>
            <HeroBoard
              activeUnit={activeUnit}
              onSelectUnit={(n: 1 | 2 | 3) => navigate(href.unit(`unit-${n}` as UnitId))}
            />
          </Suspense>
          <p className="mt-2 text-center text-sm text-ink-3">
            Each chip on the board is one unit. Select a chip, or use the list below.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="syllabus-map"
        className="mx-auto mt-14 max-w-[80rem] px-4 sm:px-6 lg:px-10"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="syllabus-map" className="text-h2 font-bold">
            Syllabus map
          </h2>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-3">
            <span className="flex items-center gap-1.5">
              <Eye size={15} aria-hidden /> has a visualization
            </span>
            <span className="flex items-center gap-1.5">
              <FlaskConical size={15} aria-hidden /> has a lab
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-line-strong" aria-hidden /> coming in a later
              phase
            </span>
          </p>
        </div>

        <div className="mt-5 grid gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
          {syllabusUnits.map((unit) => {
            const n = unit.number as Exclude<UnitNumber, 0>;
            return (
              <section
                key={unit.id}
                aria-labelledby={`map-${unit.id}`}
                onMouseEnter={() => setActiveUnit(n)}
                onMouseLeave={() => setActiveUnit(null)}
                onFocus={() => setActiveUnit(n)}
                onBlur={() => setActiveUnit(null)}
              >
                <div className={cn("h-1 w-12 rounded-full", unitBar[n])} aria-hidden />
                <h3 id={`map-${unit.id}`} className="mt-3">
                  <Link to={href.unit(unit.id)} className="group block">
                    <span className={cn("block text-sm font-bold", unitText[n])}>Unit {n}</span>
                    <span className="block text-h3 font-bold group-hover:underline">{unit.title}</span>
                  </Link>
                </h3>
                <p className="mt-1 text-ink-2">{unit.summary}</p>
                <ol className="mt-4 grid border-t border-line">
                  {topicsInUnit(unit.id).map((topic) => {
                    const ready = hasContent(topic);
                    return (
                      <li key={topic.slug} className="border-b border-line">
                        <Link
                          to={href.topic(topic.slug)}
                          className="group flex items-baseline gap-3 py-2 hover:bg-surface"
                        >
                          <span className="w-9 shrink-0 font-mono text-sm tabular-nums text-ink-3">
                            {topic.code}
                          </span>
                          <span
                            className={cn(
                              "min-w-0 flex-1 group-hover:text-brand",
                              ready ? "text-ink" : "text-ink-2",
                            )}
                          >
                            {topic.title}
                            {!ready && (
                              <span
                                className="ml-2 inline-block size-1.5 -translate-y-0.5 rounded-full bg-line-strong"
                                title={`Coming in phase ${topic.phase}`}
                              >
                                <span className="sr-only">(coming in phase {topic.phase})</span>
                              </span>
                            )}
                          </span>
                          <span className="flex shrink-0 gap-1.5 text-ink-3">
                            {topic.visual && <Eye size={15} aria-label="Has a visualization" />}
                            {topic.lab && <FlaskConical size={15} aria-label="Has a lab" />}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="how-it-works"
        className="mx-auto mt-16 max-w-[80rem] px-4 sm:px-6 lg:px-10"
      >
        <h2 id="how-it-works" className="text-h2 font-bold">
          How every topic works
        </h2>
        <p className="mt-1 max-w-[60ch] text-ink-2">
          Each topic page has the same tabs, so you always know where to look. Work through them in
          order, or jump to the one you need.
        </p>
        <ol className="mt-6 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {steps.map(({ icon: Icon, title, text }) => (
            <li key={title} className="bg-surface p-4">
              <Icon size={22} className="text-brand" aria-hidden />
              <p className="mt-2 font-bold">{title}</p>
              <p className="mt-1 text-[0.95rem] text-ink-2">{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
