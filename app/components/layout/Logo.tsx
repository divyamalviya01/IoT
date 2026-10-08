import { Link } from "react-router";

/** Chip mark plus wordmark. The mark matches public/favicon.svg. */
export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-md font-bold text-ink">
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="var(--pcb)" />
        <path
          d="M11 4v5M16 4v5M21 4v5M11 23v5M16 23v5M21 23v5M4 11h5M4 16h5M4 21h5M23 11h5M23 16h5M23 21h5"
          stroke="var(--pcb-trace)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect x="9" y="9" width="14" height="14" rx="2.5" fill="var(--silk)" />
        <circle cx="16" cy="16" r="3" fill="var(--pcb)" />
      </svg>
      <span className="text-[1.0625rem] tracking-tight">IoT Simulator Lab</span>
    </Link>
  );
}
