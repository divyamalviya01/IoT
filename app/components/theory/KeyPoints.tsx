import { Check } from "lucide-react";

interface KeyPointsProps {
  title?: string;
  points: string[];
}

/** "Key points to remember": the revision list near the end of a theory page. */
export function KeyPoints({ title = "Key points to remember", points }: KeyPointsProps) {
  return (
    <section className="print-avoid-break rounded-lg border border-line bg-surface px-4 py-4">
      <h3 className="font-bold">{title}</h3>
      <ul className="mt-2 grid gap-1.5">
        {points.map((point) => (
          <li key={point} className="flex gap-2.5">
            <Check size={18} className="mt-1 shrink-0 text-brand" aria-hidden />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
