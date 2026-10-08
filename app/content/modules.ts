import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { MDXProps } from "mdx/types";
import type { Topic } from "./registry";
import type { MCQ, VivaItem } from "./types";

/*
 * Topic content lives in folders named after the topic:
 *   app/content/<unit>/<slug>/theory.mdx   Theory tab
 *   app/content/<unit>/<slug>/Visual.tsx   Visualize tab
 *   app/content/<unit>/<slug>/quiz.ts      Quiz tab (default export MCQ[])
 *   app/content/<unit>/<slug>/viva.ts      Viva tab (default export VivaItem[])
 * Adding the files is enough; nothing else needs registering.
 */

type TheoryModule = { default: ComponentType<MDXProps> };
type VisualModule = { default: ComponentType };

const theoryLoaders = import.meta.glob<TheoryModule>("./*/*/theory.mdx");
const visualLoaders = import.meta.glob<VisualModule>("./*/*/Visual.tsx");
const quizModules = import.meta.glob<{ default: MCQ[] }>("./*/*/quiz.ts", {
  eager: true,
});
const vivaModules = import.meta.glob<{ default: VivaItem[] }>("./*/*/viva.ts", {
  eager: true,
});

function path(topic: Topic, file: string) {
  return `./${topic.unit}/${topic.slug}/${file}`;
}

const lazyCache = new Map<string, LazyExoticComponent<ComponentType<any>>>();

function lazyFrom<P>(
  loaders: Record<string, () => Promise<{ default: ComponentType<P> }>>,
  key: string,
): LazyExoticComponent<ComponentType<P>> | null {
  const load = loaders[key];
  if (!load) return null;
  let component = lazyCache.get(key);
  if (!component) {
    component = lazy(load);
    lazyCache.set(key, component);
  }
  return component as LazyExoticComponent<ComponentType<P>>;
}

/** True once a topic's theory has been written. */
export function hasContent(topic: Topic): boolean {
  return path(topic, "theory.mdx") in theoryLoaders;
}

export function getTheory(topic: Topic) {
  return lazyFrom<MDXProps>(theoryLoaders, path(topic, "theory.mdx"));
}

export function getVisual(topic: Topic) {
  return lazyFrom<object>(visualLoaders, path(topic, "Visual.tsx"));
}

export function getQuiz(topic: Topic): MCQ[] {
  return quizModules[path(topic, "quiz.ts")]?.default ?? [];
}

export function getViva(topic: Topic): VivaItem[] {
  return vivaModules[path(topic, "viva.ts")]?.default ?? [];
}
