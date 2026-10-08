import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { Lab } from "~/content/registry";
import type { LabRecordDef } from "~/content/types";

/*
 * Each lab lives in app/labs/<lab-slug>/:
 *   Lab.tsx     the interactive simulation (default export)
 *   record.ts   lab record definition (default export LabRecordDef)
 *   engine.ts   pure TypeScript simulation logic, with engine.test.ts
 */

type LabModule = { default: ComponentType };

const labLoaders = import.meta.glob<LabModule>("./*/Lab.tsx");
const recordModules = import.meta.glob<{ default: LabRecordDef }>("./*/record.ts", {
  eager: true,
});

const lazyCache = new Map<string, LazyExoticComponent<ComponentType>>();

export function hasLab(lab: Lab): boolean {
  return `./${lab.slug}/Lab.tsx` in labLoaders;
}

export function getLabComponent(lab: Lab): LazyExoticComponent<ComponentType> | null {
  const key = `./${lab.slug}/Lab.tsx`;
  const load = labLoaders[key];
  if (!load) return null;
  let component = lazyCache.get(key);
  if (!component) {
    component = lazy(load);
    lazyCache.set(key, component);
  }
  return component;
}

export function getLabRecord(lab: Lab): LabRecordDef | undefined {
  return recordModules[`./${lab.slug}/record.ts`]?.default;
}
