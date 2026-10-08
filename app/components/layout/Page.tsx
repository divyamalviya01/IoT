import type { ReactNode } from "react";
import { cn } from "~/lib/cn";

/** Standard page padding and width inside the app shell. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[72rem] px-4 pb-20 pt-6 sm:px-6 lg:px-10 lg:pt-8", className)}>
      {children}
    </div>
  );
}

/** Loading placeholder while a lazy section (theory, lab, 3D view) downloads. */
export function SectionLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="grid gap-3" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="h-5 w-2/5 animate-pulse rounded bg-surface-2" />
      <div className="h-4 w-full animate-pulse rounded bg-surface-2" />
      <div className="h-4 w-11/12 animate-pulse rounded bg-surface-2" />
      <div className="h-4 w-4/5 animate-pulse rounded bg-surface-2" />
    </div>
  );
}
