import { useId, useState, type ReactNode } from "react";
import { getTerm } from "~/content/glossary";

/**
 * An inline glossary term. Hover, focus or tap shows a short definition;
 * the full list lives on the Glossary page.
 */
export function Term({ id, children }: { id: string; children?: ReactNode }) {
  const term = getTerm(id);
  const [open, setOpen] = useState(false);
  const tipId = useId();

  if (!term) {
    if (import.meta.env.DEV) console.warn(`<Term id="${id}"> is not in app/content/glossary.ts`);
    return <>{children}</>;
  }

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={open ? tipId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="cursor-help rounded-sm text-inherit underline decoration-ink-3 decoration-dotted decoration-1 underline-offset-[5px] hover:decoration-brand"
      >
        {children ?? term.term}
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-20 mb-2 block w-72 max-w-[80vw] -translate-x-1/2 rounded-lg border border-line-strong bg-surface p-3 text-left text-sm font-normal leading-snug text-ink-2 shadow-md"
        >
          <span className="block font-bold text-ink">{term.term}</span>
          <span className="mt-1 block">{term.definition}</span>
        </span>
      )}
    </span>
  );
}
