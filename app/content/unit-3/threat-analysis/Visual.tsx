import { ArrowRight, Check, Minus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { cn } from "~/lib/cn";
import { Dfd, DfdLegend, KIND_LABEL, crossingOf, flowsAt, zoneName } from "~/labs/l28-threat-modeling/Dfd";
import { ELEMENTS, PER_ELEMENT, STRIDE, STRIDE_ORDER, categoriesFor, getElement, threatsFor, type ElementKind } from "~/labs/l28-threat-modeling/engine";

/** For elements with no rated flow: the process their data passes through. */
const VIA: Record<string, string> = { resident: "app", registry: "cloud", log: "cloud" };

const STEPS = [
  { name: "Assets", question: "What is worth protecting?", example: "The door, unlock commands, device keys and the family's access history." },
  { name: "Threats", question: "What could go wrong?", example: "Walk the diagram with STRIDE: each element gets the letters that fit its kind." },
  { name: "Vulnerabilities", question: "Which weakness lets it happen?", example: "No certificate check, a leftover debug port, an old web server on the hub." },
  { name: "Risk", question: "How bad is it?", example: "Risk = likelihood × impact, each 1 to 5. A stolen password: 4 × 5 = 20, critical." },
  { name: "Countermeasures", question: "What lowers the risk?", example: "A control that protects the property attacked: two-factor login stops spoofing." },
];

const KINDS: ElementKind[] = ["external", "process", "store", "flow"];

export default function ThreatAnalysisVisual() {
  const reduced = useReducedMotion() ?? false;
  const [active, setActive] = useState("lock");
  const e = getElement(active);
  const threats = threatsFor([active]);
  const crossing = flowsAt(active);
  const hot = new Set(crossing.map((f) => f.id));

  return (
    <div className="grid min-w-0 grid-cols-1 gap-8">
      <section className="grid min-w-0 gap-4" aria-labelledby="ta-dfd">
        <div className="grid gap-1">
          <h3 id="ta-dfd" className="text-lg font-bold text-ink">
            STRIDE per element on a smart door lock
          </h3>
          <p className="max-w-[70ch] text-ink-2">Tap any part of the diagram. Its STRIDE threats appear one by one, with the security property each one attacks.</p>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <figure className="grid min-w-0 content-start gap-3 rounded-lg border border-line bg-surface p-3">
            <Dfd
              selected={new Set([active])}
              onToggle={setActive}
              crossings={hot}
              label={`Data-flow diagram of a smart door lock system. ${e.name} is selected.`}
              describe={(x, on) => `${x.name}, ${KIND_LABEL[x.kind].toLowerCase()}${on ? ", selected" : ". Press to show its threats"}`}
            />
            <figcaption className="sr-only">Smart door lock data-flow diagram</figcaption>
            <DfdLegend crossing />
          </figure>

          <section className="grid min-w-0 content-start gap-3" aria-live="polite" aria-labelledby="ta-active">
            <div className="grid gap-1">
              <h4 id="ta-active" className="text-lg font-bold text-ink">
                {e.name}
              </h4>
              <p className="text-ink-2">
                A {KIND_LABEL[e.kind].toLowerCase()} in the {zoneName(e.zone)} zone. STRIDE per element gives it {threats.length} letters:{" "}
                <span className="font-mono font-bold text-ink">{categoriesFor(e).join(" ")}</span>.
              </p>
            </div>

            <ol className="grid gap-2">
              {threats.map((t, i) => (
                <motion.li
                  key={`${active}-${t.id}`}
                  initial={reduced ? false : { opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduced ? 0 : i * 0.18, duration: 0.3 }}
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-lg border border-line bg-surface p-2.5"
                >
                  <span className="grid size-7 place-items-center rounded-md bg-u3-soft font-mono font-bold text-u3" aria-hidden>
                    {t.category}
                  </span>
                  <span className="grid min-w-0 gap-0.5">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <strong className="text-ink">{STRIDE[t.category].name}</strong>
                      <span className="text-sm text-ink-3">attacks {STRIDE[t.category].property}</span>
                    </span>
                    <span className="text-sm text-ink-2">{t.text}</span>
                  </span>
                </motion.li>
              ))}
            </ol>

            <div className={cn("rounded-lg border p-3 text-sm", crossing.length ? "border-warn/60 bg-warn-soft" : "border-line bg-surface-2")}>
              <p className="font-semibold text-ink">{crossing.length ? "Where data crosses a trust boundary" : "Trust boundaries"}</p>
              {crossing.length ? (
                <ul className="mt-1 grid gap-1 text-ink-2">
                  {crossing.map((f) => {
                    const c = crossingOf(f)!;
                    return (
                      <li key={f.id}>
                        <strong className="text-ink">{f.name}</strong> crosses from the {c.from} zone into the {c.to} zone (amber diamond).
                      </li>
                    );
                  })}
                  <li>Check these crossings closely: who sent the data, was it changed, and could someone read it?</li>
                </ul>
              ) : (
                <p className="mt-1 text-ink-2">
                  {e.name} stays inside the {zoneName(e.zone)} zone. Its data reaches other zones only through the {getElement(VIA[active] ?? "cloud").name}.
                </p>
              )}
            </div>
          </section>
        </div>
      </section>

      <section className="grid min-w-0 gap-3" aria-labelledby="ta-steps">
        <h3 id="ta-steps" className="text-lg font-bold text-ink">
          The steps of a threat analysis
        </h3>
        <ol className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s.name} className="relative grid min-w-0 content-start gap-1 rounded-lg border border-line bg-surface p-3">
              <span className="flex items-center gap-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-u3 font-mono text-sm font-bold text-surface" aria-hidden>
                  {i + 1}
                </span>
                <strong className="text-ink">{s.name}</strong>
                {i < STEPS.length - 1 && <ArrowRight size={16} aria-hidden className="ml-auto text-ink-3 md:hidden" />}
              </span>
              <span className="text-sm font-semibold text-ink-2">{s.question}</span>
              <span className="text-sm text-ink-2">{s.example}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid min-w-0 gap-3" aria-labelledby="ta-per">
        <h3 id="ta-per" className="text-lg font-bold text-ink">
          Which letters apply to which element?
        </h3>
        <div className="relative overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[26rem] border-collapse text-sm">
            <thead>
              <tr className="bg-surface-2 text-left">
                <th scope="col" className="px-3 py-2 font-semibold text-ink">
                  Kind of element
                </th>
                {STRIDE_ORDER.map((c) => (
                  <th key={c} scope="col" className="px-2 py-2 text-center font-mono font-bold text-ink" title={STRIDE[c].name}>
                    <abbr title={STRIDE[c].name} className="no-underline">
                      {c}
                    </abbr>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {KINDS.map((k) => {
                const on = k === e.kind;
                return (
                  <tr key={k} className={cn("border-t border-line", on && "bg-u3-soft")}>
                    <th scope="row" className="px-3 py-1.5 text-left font-medium text-ink">
                      {KIND_LABEL[k]}
                      {on && <span className="ml-1 text-ink-3">({e.name})</span>}
                      {k === "store" && <span className="block text-xs font-normal text-ink-3">A store of logs also gets R.</span>}
                    </th>
                    {STRIDE_ORDER.map((c) => {
                      const yes = PER_ELEMENT[k].includes(c) || (k === "store" && c === "R" && on && e.logs);
                      return (
                        <td key={c} className="px-2 py-1.5 text-center">
                          {yes ? <Check size={16} aria-label="applies" className="mx-auto text-ok" /> : <Minus size={14} aria-label="does not apply" className="mx-auto text-ink-3" />}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-ink-3">
          The whole diagram has {ELEMENTS.length} elements and {threatsFor(ELEMENTS.map((x) => x.id)).length} threats. Lab L28 rates them all on a risk matrix.
        </p>
      </section>

      <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
        <p className="font-semibold text-ink">What to notice</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Processes get all six letters. Flows and stores get T, I and D. A person gets only S and R.</li>
          <li>Each amber diamond marks data crossing a dashed trust boundary. Attacks often start at these crossings.</li>
          <li>Every letter attacks one security property, so its fix must protect that same property.</li>
          <li>The Access log also gets R: a reliable log is what proves who did what.</li>
        </ul>
      </div>
    </div>
  );
}
