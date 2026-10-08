import { useCallback, useState } from "react";
import { Outlet } from "react-router";
import { MobileDrawer } from "~/components/layout/MobileDrawer";
import { SidebarNav } from "~/components/layout/SidebarNav";
import { TopBar } from "~/components/layout/TopBar";

export default function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-brand focus:px-3 focus:py-2 focus:font-semibold focus:text-brand-ink"
      >
        Skip to content
      </a>
      <TopBar onOpenMenu={() => setMenuOpen(true)} />
      <div className="mx-auto flex max-w-[1600px]">
        <aside
          data-print-hide
          className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-72 shrink-0 overflow-y-auto border-r border-line lg:block"
        >
          <SidebarNav />
        </aside>
        <main id="main" className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
      <MobileDrawer open={menuOpen} onClose={closeMenu} />
    </div>
  );
}
