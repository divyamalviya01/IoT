import { Search } from "lucide-react";
import { useId, useMemo, useState } from "react";
import type { VivaItem } from "~/content/types";
import { Button } from "~/components/ui/Button";

export interface VivaEntry extends VivaItem {
  /** Where the question comes from, shown in the combined viva bank */
  source?: string;
}

interface VivaListProps {
  items: VivaEntry[];
  searchable?: boolean;
}

export function VivaList({ items, searchable = true }: VivaListProps) {
  const [query, setQuery] = useState("");
  const [openSet, setOpenSet] = useState<Set<number>>(new Set());
  const searchId = useId();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .map((item, index) => ({ item, index }))
      .filter(
        ({ item }) =>
          !q || item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q),
      );
  }, [items, query]);

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line-strong p-6 text-ink-3">
        Viva questions for this topic are added when its phase is built.
      </p>
    );
  }

  const allOpen = shown.length > 0 && shown.every(({ index }) => openSet.has(index));

  return (
    <section className="grid max-w-[70ch] gap-4" aria-label="Viva questions">
      <div className="flex flex-wrap items-center gap-2">
        {searchable && (
          <div className="relative min-w-56 flex-1">
            <label htmlFor={searchId} className="sr-only">
              Search viva questions
            </label>
            <Search
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
            />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions and answers"
              className="h-10 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 placeholder:text-ink-3"
            />
          </div>
        )}
        <Button
          size="md"
          variant="ghost"
          onClick={() =>
            setOpenSet(allOpen ? new Set() : new Set(shown.map(({ index }) => index)))
          }
        >
          {allOpen ? "Hide all answers" : "Show all answers"}
        </Button>
      </div>

      <p className="text-sm text-ink-3" aria-live="polite">
        {query ? `${shown.length} of ${items.length} questions match` : `${items.length} questions`}
      </p>

      {shown.length === 0 ? (
        <p className="py-6 text-ink-3">No questions match “{query}”. Try a shorter word.</p>
      ) : (
        <ol className="grid gap-2">
          {shown.map(({ item, index }) => (
            <li key={index}>
              <details
                open={openSet.has(index)}
                onToggle={(e) => {
                  const isOpen = e.currentTarget.open;
                  setOpenSet((s) => {
                    if (isOpen === s.has(index)) return s;
                    const next = new Set(s);
                    if (isOpen) next.add(index);
                    else next.delete(index);
                    return next;
                  });
                }}
                className="group rounded-lg border border-line bg-surface open:border-line-strong"
              >
                <summary className="flex cursor-pointer list-none gap-3 rounded-lg px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
                  <span className="w-7 shrink-0 tabular-nums text-ink-3">{index + 1}.</span>
                  <span className="flex-1">
                    {item.q}
                    {item.source && (
                      <span className="mt-0.5 block text-sm font-normal text-ink-3">
                        {item.source}
                      </span>
                    )}
                  </span>
                  <span
                    className="text-sm font-normal text-brand group-open:hidden"
                    aria-hidden
                  >
                    Show answer
                  </span>
                </summary>
                <p className="border-t border-line px-4 py-3 pl-14 text-ink-2">{item.a}</p>
              </details>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
