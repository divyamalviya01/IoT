import { useCallback, useSyncExternalStore } from "react";
import type { ObservationRow } from "~/content/types";

/*
 * Observations a student records during a lab run. They carry over to the
 * printable lab record. Kept in memory, with a sessionStorage copy so a page
 * reload in the same tab doesn't lose a half-finished experiment.
 * Nothing leaves the browser.
 */

interface LabObservations {
  rows: ObservationRow[];
  /** Auto-generated result summary from the lab, editable on the record */
  summary: string;
}

const EMPTY: LabObservations = { rows: [], summary: "" };
const store = new Map<string, LabObservations>();
const listeners = new Set<() => void>();

const storageKey = (slug: string) => `iot-lab-observations:${slug}`;

function load(slug: string): LabObservations {
  const cached = store.get(slug);
  if (cached) return cached;
  let value = EMPTY;
  try {
    const raw = sessionStorage.getItem(storageKey(slug));
    if (raw) {
      const parsed = JSON.parse(raw) as LabObservations;
      if (Array.isArray(parsed.rows)) value = { rows: parsed.rows, summary: parsed.summary ?? "" };
    }
  } catch {
    // Storage blocked or corrupt: start empty.
  }
  store.set(slug, value);
  return value;
}

function save(slug: string, value: LabObservations) {
  store.set(slug, value);
  try {
    sessionStorage.setItem(storageKey(slug), JSON.stringify(value));
  } catch {
    // Not fatal: observations still live in memory for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useObservations(slug: string) {
  const data = useSyncExternalStore(
    subscribe,
    () => load(slug),
    () => EMPTY,
  );

  const addRow = useCallback(
    (row: ObservationRow) => {
      const current = load(slug);
      save(slug, { ...current, rows: [...current.rows, row] });
    },
    [slug],
  );

  const removeRow = useCallback(
    (index: number) => {
      const current = load(slug);
      save(slug, { ...current, rows: current.rows.filter((_, i) => i !== index) });
    },
    [slug],
  );

  const clear = useCallback(() => save(slug, EMPTY), [slug]);

  const setSummary = useCallback(
    (summary: string) => save(slug, { ...load(slug), summary }),
    [slug],
  );

  return { rows: data.rows, summary: data.summary, addRow, removeRow, clear, setSummary };
}
