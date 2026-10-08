import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { SidebarNav } from "./SidebarNav";

/**
 * Syllabus navigation for small screens. Built on <dialog> so focus trapping
 * and the Escape key work without extra code.
 */
export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const location = useLocation();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Close after navigating to a new page.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label="Menu"
      className="m-0 h-dvh max-h-dvh w-[min(22rem,88vw)] max-w-none border-r border-line bg-bg p-0 text-ink backdrop:bg-ink/40 open:animate-[drawer-in_180ms_ease-out]"
    >
      <div className="flex h-14 items-center justify-between border-b border-line px-4">
        <span className="font-bold">Menu</span>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-9 items-center justify-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink"
          aria-label="Close menu"
        >
          <X size={20} aria-hidden />
        </button>
      </div>
      <SidebarNav showSecondary />
    </dialog>
  );
}
