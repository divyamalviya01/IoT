import type { ReactNode } from "react";
import { cn } from "~/lib/cn";

export interface ExploreItem {
  id: string;
  name: string;
  /** What this part does, in one to three plain sentences */
  text: string;
  /** Optional small label above the name, e.g. the building block it belongs to */
  group?: string;
}

interface ExploreLayoutProps {
  /** The 2D or 3D view; selecting a part in it should call onSelect too */
  scene: ReactNode;
  /** Heading for the parts list, e.g. "Parts of a sensor node" */
  listTitle: string;
  items: ExploreItem[];
  active: string;
  onSelect: (id: string) => void;
  /** "What to notice" bullet points shown under the view */
  notice: string[];
  /** Extra controls shown above the list, e.g. a board picker or an explode slider */
  controls?: ReactNode;
}

/**
 * Standard Visualize layout: the view, a keyboard-friendly list of its parts,
 * the selected part's explanation, and "What to notice" notes. The list is the
 * accessible twin of the clickable view.
 */
export function ExploreLayout({
  scene,
  listTitle,
  items,
  active,
  onSelect,
  notice,
  controls,
}: ExploreLayoutProps) {
  const current = items.find((i) => i.id === active) ?? items[0];
  const listId = `explore-${listTitle.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0">{scene}</div>

        <section aria-labelledby={listId} className="grid content-start gap-3">
          {controls}
          <h2 id={listId} className="font-bold">
            {listTitle}
          </h2>
          <ul className="grid gap-1.5">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={item.id === current.id}
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left font-semibold transition-colors",
                    item.id === current.id
                      ? "border-brand bg-brand-soft text-ink"
                      : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
                  )}
                >
                  {item.group && (
                    <span className="block text-sm font-normal text-ink-3">{item.group}</span>
                  )}
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
          <div className="rounded-lg border border-line bg-surface p-4" aria-live="polite">
            {current.group && <p className="text-sm text-ink-3">{current.group}</p>}
            <p className="font-bold">{current.name}</p>
            <p className="mt-1 text-ink-2">{current.text}</p>
          </div>
        </section>
      </div>

      <section aria-labelledby={`${listId}-notice`} className="max-w-[70ch]">
        <h2 id={`${listId}-notice`} className="text-h3 font-bold">
          What to notice
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2 marker:text-ink-3">
          {notice.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
