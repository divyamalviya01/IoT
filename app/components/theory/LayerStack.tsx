import { useState } from "react";
import { cn } from "~/lib/cn";

export interface StackLayer {
  name: string;
  /** What this layer does, in one or two sentences */
  detail: string;
  /** Example protocols or parts, shown as chips */
  items?: string[];
}

interface LayerStackProps {
  /** Top layer first */
  layers: StackLayer[];
  caption?: string;
  /** Index of the layer selected at first; defaults to the top one */
  initial?: number;
}

/**
 * A stack of layers (top first). Selecting a layer shows what it does, so the
 * explanation stays next to the picture instead of in a separate paragraph.
 */
export function LayerStack({ layers, caption, initial = 0 }: LayerStackProps) {
  const [selected, setSelected] = useState(initial);
  const layer = layers[selected];

  return (
    <figure className="print-avoid-break grid gap-3">
      {caption && <figcaption className="font-bold">{caption}</figcaption>}
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ol className="grid gap-1.5" aria-label="Layers, top to bottom">
          {layers.map((l, i) => {
            const active = i === selected;
            return (
              <li key={l.name}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-brand bg-brand-soft"
                      : "border-line-strong bg-surface hover:border-brand",
                  )}
                >
                  <span
                    className="h-7 w-1.5 shrink-0 rounded-full"
                    style={{ background: `var(--series-${(i % 8) + 1})` }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 font-bold">{l.name}</span>
                  {l.items && l.items.length > 0 && (
                    <span className="hidden truncate text-sm text-ink-3 sm:block">
                      {l.items.slice(0, 3).join(", ")}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
        <div className="rounded-lg border border-line bg-surface p-4" aria-live="polite">
          <p className="font-bold">{layer.name}</p>
          <p className="mt-1 text-ink-2">{layer.detail}</p>
          {layer.items && layer.items.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Examples">
              {layer.items.map((item) => (
                <li
                  key={item}
                  className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-sm"
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </figure>
  );
}
