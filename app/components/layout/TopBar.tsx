import { Menu } from "lucide-react";
import { NavLink } from "react-router";
import { href } from "~/content/registry";
import { cn } from "~/lib/cn";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { to: href.labs(), label: "Labs" },
  { to: href.quiz(), label: "Tests" },
  { to: href.viva(), label: "Viva" },
  { to: href.glossary(), label: "Glossary" },
  { to: href.syllabus(), label: "Syllabus" },
];

export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header
      data-print-hide
      className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/80"
    >
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4">
        <button
          type="button"
          onClick={onOpenMenu}
          className="-ml-1 inline-flex size-9 items-center justify-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} aria-hidden />
        </button>
        <Logo />
        <nav aria-label="Main" className="ml-auto hidden md:block">
          <ul className="flex items-center gap-1">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      "rounded-md px-3 py-1.5 font-semibold",
                      isActive ? "bg-surface-2 text-ink" : "text-ink-2 hover:text-ink",
                    )
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto md:ml-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
