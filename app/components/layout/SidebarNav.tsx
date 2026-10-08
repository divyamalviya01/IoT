import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import { hasContent } from "~/content/modules";
import {
  getTopic,
  href,
  topicsInUnit,
  units,
  type UnitId,
} from "~/content/registry";
import { unitBar, unitText } from "~/components/ui/UnitTag";
import { cn } from "~/lib/cn";

const secondary = [
  { to: href.labs(), label: "Lab manual" },
  { to: href.quiz(), label: "Unit tests" },
  { to: href.viva(), label: "Viva questions" },
  { to: href.glossary(), label: "Glossary" },
  { to: href.syllabus(), label: "Syllabus coverage" },
];

export function SidebarNav({ showSecondary = false }: { showSecondary?: boolean }) {
  const { topicSlug, unitId } = useParams();
  const currentUnit: UnitId | undefined = getTopic(topicSlug)?.unit ?? (unitId as UnitId);
  // Open the unit being read; on other pages, open Unit 1 as a starting point.
  const initiallyOpen = currentUnit && currentUnit !== "start" ? currentUnit : "unit-1";
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(units.map((u) => [u.id, u.id === initiallyOpen])),
  );

  // The sidebar stays mounted across pages, so open a unit when the reader moves into it.
  useEffect(() => {
    if (currentUnit && currentUnit !== "start") {
      setOpen((s) => (s[currentUnit] ? s : { ...s, [currentUnit]: true }));
    }
  }, [currentUnit]);

  return (
    <nav aria-label="Syllabus" className="px-3 py-5">
      {showSecondary && (
        <ul className="mb-5 grid gap-0.5 border-b border-line pb-5">
          {secondary.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "block rounded-md px-3 py-1.5 font-semibold",
                    isActive ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}

      <ul className="grid gap-1">
        {units.map((unit) => {
          const unitTopics = topicsInUnit(unit.id);
          const isOpen = open[unit.id];
          const panelId = `nav-${unit.id}`;

          if (unit.number === 0) {
            return unitTopics.map((topic) => (
              <li key={topic.slug} className="mb-3">
                <NavLink
                  to={href.topic(topic.slug)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 font-semibold",
                      isActive
                        ? "bg-brand-soft text-brand"
                        : "text-ink hover:bg-surface-2",
                    )
                  }
                >
                  <span className={cn("size-2 rounded-full", unitBar[0])} aria-hidden />
                  {topic.title}
                </NavLink>
              </li>
            ));
          }

          return (
            <li key={unit.id}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen((s) => ({ ...s, [unit.id]: !s[unit.id] }))}
                className="flex w-full items-start gap-2.5 rounded-md px-3 py-2 text-left hover:bg-surface-2"
              >
                <span
                  className={cn("mt-[0.45rem] size-2 shrink-0 rounded-full", unitBar[unit.number])}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm font-bold", unitText[unit.number])}>
                    Unit {unit.number}
                  </span>
                  <span className="block font-semibold leading-snug text-ink">{unit.title}</span>
                </span>
                <ChevronDown
                  size={18}
                  aria-hidden
                  className={cn(
                    "mt-1 shrink-0 text-ink-3 transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </button>

              <ul id={panelId} hidden={!isOpen} className="mb-2 mt-0.5 grid">
                {unitTopics.map((topic) => {
                  const ready = hasContent(topic);
                  return (
                    <li key={topic.slug}>
                      <NavLink
                        to={href.topic(topic.slug)}
                        title={ready ? undefined : `Coming in phase ${topic.phase}`}
                        className={({ isActive }) =>
                          cn(
                            "relative flex gap-2.5 rounded-md py-1.5 pl-8 pr-3 text-[0.95rem] leading-snug",
                            isActive
                              ? "bg-surface-2 font-semibold text-ink"
                              : ready
                                ? "text-ink-2 hover:bg-surface-2 hover:text-ink"
                                : "text-ink-3 hover:bg-surface-2",
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <span
                                className={cn(
                                  "absolute inset-y-1.5 left-4 w-0.5 rounded-full",
                                  unitBar[unit.number],
                                )}
                                aria-hidden
                              />
                            )}
                            <span className="w-9 shrink-0 tabular-nums text-ink-3">
                              {topic.code}
                            </span>
                            <span className="min-w-0">{topic.title}</span>
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
