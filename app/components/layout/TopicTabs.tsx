import { BookOpen, Eye, FlaskConical, ListChecks, Mic, type LucideIcon } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import { cn } from "~/lib/cn";

export type TopicTab = "theory" | "visualize" | "lab" | "quiz" | "viva";

export const TAB_META: Record<TopicTab, { label: string; icon: LucideIcon }> = {
  theory: { label: "Theory", icon: BookOpen },
  visualize: { label: "Visualize", icon: Eye },
  lab: { label: "Lab", icon: FlaskConical },
  quiz: { label: "Quiz", icon: ListChecks },
  viva: { label: "Viva", icon: Mic },
};

export const tabId = (tab: TopicTab) => `tab-${tab}`;
export const panelId = (tab: TopicTab) => `panel-${tab}`;

interface TopicTabsProps {
  tabs: TopicTab[];
  active: TopicTab;
  onChange: (tab: TopicTab) => void;
}

/** Tabs with roving focus: arrow keys move between tabs, as screen-reader users expect. */
export function TopicTabs({ tabs, active, onChange }: TopicTabsProps) {
  const refs = useRef<Partial<Record<TopicTab, HTMLButtonElement | null>>>({});

  const onKeyDown = (e: KeyboardEvent) => {
    const i = tabs.indexOf(active);
    let next: TopicTab | undefined;
    if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
    if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
    if (e.key === "Home") next = tabs[0];
    if (e.key === "End") next = tabs[tabs.length - 1];
    if (next) {
      e.preventDefault();
      onChange(next);
      refs.current[next]?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Topic sections"
      onKeyDown={onKeyDown}
      data-print-hide
      className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0"
    >
      {tabs.map((tab) => {
        const { label, icon: Icon } = TAB_META[tab];
        const selected = tab === active;
        return (
          <button
            key={tab}
            ref={(el) => {
              refs.current[tab] = el;
            }}
            id={tabId(tab)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId(tab)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab)}
            className={cn(
              "relative -mb-px flex shrink-0 items-center gap-2 rounded-t-md border-b-2 px-3.5 py-2.5 font-semibold transition-colors",
              selected
                ? "border-brand text-ink"
                : "border-transparent text-ink-2 hover:border-line-strong hover:text-ink",
            )}
          >
            <Icon size={17} aria-hidden className={selected ? "text-brand" : "text-ink-3"} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
