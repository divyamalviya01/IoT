import { BookOpen, GraduationCap, Info, Lightbulb, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "~/lib/cn";

type Kind = "definition" | "remember" | "exam" | "example" | "note";

const kinds: Record<Kind, { label: string; icon: typeof Info; accent: string; border: string }> = {
  definition: { label: "Definition", icon: BookOpen, accent: "text-brand", border: "border-brand" },
  remember: { label: "Remember", icon: Lightbulb, accent: "text-warn", border: "border-warn" },
  exam: { label: "Exam tip", icon: GraduationCap, accent: "text-u2", border: "border-u2" },
  example: { label: "Real-life example", icon: MapPin, accent: "text-copper", border: "border-copper" },
  note: { label: "Note", icon: Info, accent: "text-ink-3", border: "border-line-strong" },
};

interface CalloutProps {
  kind?: Kind;
  /** Replaces the default label, e.g. a term name for a definition */
  title?: string;
  children: ReactNode;
}

/** A highlighted box inside theory text. */
export function Callout({ kind = "note", title, children }: CalloutProps) {
  const { label, icon: Icon, accent, border } = kinds[kind];
  return (
    <aside
      className={cn(
        "print-avoid-break rounded-r-lg border-l-[3px] bg-surface px-4 py-3",
        border,
      )}
    >
      <p className={cn("flex items-center gap-2 text-[0.95rem] font-bold", accent)}>
        <Icon size={17} aria-hidden />
        {title ?? label}
      </p>
      <div className="mt-1.5 text-ink [&>*+*]:mt-2">{children}</div>
    </aside>
  );
}
