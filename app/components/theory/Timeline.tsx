interface TimelineItem {
  /** Year or period, e.g. "1999" or "2010s" */
  when: string;
  title: string;
  text?: string;
}

/** A vertical timeline for history and evolution sections. */
export function Timeline({ items, caption }: { items: TimelineItem[]; caption?: string }) {
  return (
    <figure className="grid gap-3">
      {caption && <figcaption className="font-bold">{caption}</figcaption>}
      <ol className="relative grid gap-5 border-l-2 border-line pl-6">
        {items.map((item) => (
          <li key={`${item.when}-${item.title}`} className="print-avoid-break relative">
            <span
              className="absolute -left-[1.95rem] top-1.5 size-3.5 rounded-full border-2 border-bg bg-copper"
              aria-hidden
            />
            <p className="font-mono text-sm font-semibold text-copper">{item.when}</p>
            <p className="font-bold">{item.title}</p>
            {item.text && <p className="mt-0.5 text-ink-2">{item.text}</p>}
          </li>
        ))}
      </ol>
    </figure>
  );
}
