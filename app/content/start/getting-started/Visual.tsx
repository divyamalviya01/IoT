import { useState } from "react";
import PacketJourneyScene from "~/components/three/scenes/PacketJourneyScene";
import { cn } from "~/lib/cn";

type Stop = "sensor" | "gateway" | "internet" | "cloud" | "app";

const stops: { id: Stop; name: string; text: string }[] = [
  {
    id: "sensor",
    name: "Sensor",
    text: "Measures the temperature outside the house and sends each reading as a small packet over a short-range radio link.",
  },
  {
    id: "gateway",
    name: "Gateway",
    text: "Collects packets from nearby devices and forwards them to the internet. A home Wi-Fi router often plays this role.",
  },
  {
    id: "internet",
    name: "Internet",
    text: "Carries the packet across many networks to a data centre that may be hundreds of kilometres away. This is usually the longest part of the delay.",
  },
  {
    id: "cloud",
    name: "Cloud",
    text: "Stores the reading, compares it with earlier readings and decides whether anyone needs an alert.",
  },
  {
    id: "app",
    name: "Phone app",
    text: "Fetches the latest data from the cloud and shows it to you, wherever you are.",
  },
];

export default function GettingStartedVisual() {
  const [active, setActive] = useState<Stop>("sensor");
  const current = stops.find((s) => s.id === active)!;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <PacketJourneyScene activeStop={active} onSelectStop={(id: Stop) => setActive(id)} />

        <section aria-labelledby="journey-stops" className="grid content-start gap-3">
          <h2 id="journey-stops" className="font-bold">
            Stops on the journey
          </h2>
          <ol className="grid gap-1.5">
            {stops.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={s.id === active}
                  onClick={() => setActive(s.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left font-semibold transition-colors",
                    s.id === active
                      ? "border-brand bg-brand-soft text-ink"
                      : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
                  )}
                >
                  {s.name}
                </button>
              </li>
            ))}
          </ol>
          <div className="rounded-lg border border-line bg-surface p-4" aria-live="polite">
            <p className="font-bold">{current.name}</p>
            <p className="mt-1 text-ink-2">{current.text}</p>
          </div>
        </section>
      </div>

      <section aria-labelledby="notice" className="max-w-[70ch]">
        <h2 id="notice" className="text-h3 font-bold">
          What to notice
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2 marker:text-ink-3">
          <li>Packets leave the sensor one at a time, not as one continuous stream.</li>
          <li>Every packet passes the same stops in the same order.</li>
          <li>
            The rings around the sensor show its radio signal. The gateway must be within range to
            hear it.
          </li>
          <li>
            Select a stop in the scene or in the list to read what it does. Drag to turn the scene.
          </li>
        </ul>
      </section>
    </div>
  );
}
