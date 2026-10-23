import { CircleCheck, CircleX, EyeOff, HardHat, Lock, RotateCcw, Umbrella, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button } from "~/components/ui/Button";
import { cn } from "~/lib/cn";
import { PILLARS, SCENARIOS, type Pillar } from "./scenarios";

const ICON: Record<Pillar, LucideIcon> = { protection: Umbrella, security: Lock, privacy: EyeOff, safety: HardHat };

/** Where each pillar sits around the drawing on wider screens (top, right, bottom, left). */
const PLACE: Record<Pillar, string> = {
  protection: "sm:col-start-2 sm:row-start-1",
  security: "sm:col-start-3 sm:row-start-2",
  privacy: "sm:col-start-2 sm:row-start-3",
  safety: "sm:col-start-1 sm:row-start-2",
};

const pillarOf = (id: Pillar) => PILLARS.find((p) => p.id === id)!;

/* ------------------------------------------------------------------ */
/* Drawing: a smart home with a hub, lock, camera, phone and cloud     */
/* ------------------------------------------------------------------ */

function HomeDrawing({ pillar }: { pillar: Pillar }) {
  const on = (p: Pillar) => p === pillar;
  const stroke = (p: Pillar) => (on(p) ? "var(--u3)" : "var(--ink-3)");
  const fill = (p: Pillar) => (on(p) ? "var(--u3-soft)" : "var(--surface)");
  const sw = (p: Pillar) => (on(p) ? 3 : 2);
  const highlight: Record<Pillar, string> = {
    protection: "the hub and the storm",
    security: "the door lock and the camera",
    privacy: "the data going to the cloud and the phone",
    safety: "the person inside and the door",
  };

  return (
    <svg viewBox="0 0 260 220" className="mx-auto block w-full max-w-[17rem]" role="img" aria-label={`A smart home with a hub, a smart lock, a camera, a phone and the cloud. Highlighted for ${pillarOf(pillar).name.toLowerCase()}: ${highlight[pillar]}.`}>
      {/* Cloud and the data line from the hub (privacy) */}
      <path d="M150 42 a16 16 0 0 1 4 -31 a22 22 0 0 1 41 6 a14 14 0 0 1 9 25 z" fill={fill("privacy")} stroke={stroke("privacy")} strokeWidth={sw("privacy")} />
      <text x="177" y="32" textAnchor="middle" className="fill-ink-2 text-[11px] font-semibold">
        Cloud
      </text>
      <path d="M118 128 C 130 90, 160 80, 174 46" fill="none" stroke={stroke("privacy")} strokeWidth={sw("privacy")} strokeDasharray="5 4" />

      {/* Storm (protection) */}
      <path d="M40 12 l-10 22 h10 l-6 18 l18 -26 h-10 l6 -14 z" fill={on("protection") ? "var(--u3)" : "var(--surface-2)"} stroke={stroke("protection")} strokeWidth={1.5} strokeLinejoin="round" />

      {/* House */}
      <path d="M20 100 L100 50 L180 100" fill="none" stroke="var(--ink-2)" strokeWidth={3} strokeLinejoin="round" />
      <rect x="32" y="96" width="136" height="110" fill="var(--surface)" stroke="var(--ink-2)" strokeWidth={2.5} />

      {/* Camera (security) */}
      <rect x="40" y="104" width="22" height="13" rx="3" fill={fill("security")} stroke={stroke("security")} strokeWidth={sw("security")} />
      <circle cx="51" cy="110.5" r="3.5" fill={stroke("security")} />

      {/* Hub with Wi-Fi arcs (protection) */}
      <rect x="104" y="122" width="34" height="20" rx="4" fill={fill("protection")} stroke={stroke("protection")} strokeWidth={sw("protection")} />
      <text x="121" y="135.5" textAnchor="middle" className="fill-ink-2 text-[9px] font-bold">
        HUB
      </text>
      <path d="M113 116 a12 12 0 0 1 16 0 M109 111 a18 18 0 0 1 24 0" fill="none" stroke={stroke("protection")} strokeWidth={1.8} />

      {/* Person (safety) */}
      <circle cx="80" cy="150" r="7" fill={fill("safety")} stroke={stroke("safety")} strokeWidth={sw("safety")} />
      <path d="M80 157 v22 M80 165 l-9 7 M80 165 l9 7 M80 179 l-7 15 M80 179 l7 15" fill="none" stroke={stroke("safety")} strokeWidth={sw("safety")} strokeLinecap="round" />

      {/* Door with smart lock (security + safety) */}
      <rect x="138" y="156" width="24" height="50" fill={on("safety") ? "var(--u3-soft)" : "var(--surface-2)"} stroke={on("safety") ? "var(--u3)" : "var(--ink-2)"} strokeWidth={on("safety") ? 3 : 2} />
      <rect x="141" y="176" width="9" height="12" rx="2" fill={fill("security")} stroke={stroke("security")} strokeWidth={sw("security")} />

      {/* Phone outside (privacy) */}
      <rect x="208" y="140" width="26" height="46" rx="5" fill={fill("privacy")} stroke={stroke("privacy")} strokeWidth={sw("privacy")} />
      <line x1="216" y1="180" x2="226" y2="180" stroke={stroke("privacy")} strokeWidth={2} strokeLinecap="round" />
      <path d="M208 150 C 195 145, 170 140, 140 134" fill="none" stroke={stroke("privacy")} strokeWidth={sw("privacy") - 0.5} strokeDasharray="4 4" />

      <line x1="8" y1="206" x2="252" y2="206" stroke="var(--line-strong)" strokeWidth={2} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Part (a): the four pillars                                          */
/* ------------------------------------------------------------------ */

function Pillars() {
  const reduced = useReducedMotion() ?? false;
  const [pillar, setPillar] = useState<Pillar>("security");
  const p = pillarOf(pillar);
  const examples = SCENARIOS.filter((s) => s.answer === pillar).slice(0, 2);

  return (
    <section className="grid min-w-0 gap-4" aria-labelledby="qt-pillars">
      <div className="grid gap-1">
        <h3 id="qt-pillars" className="text-lg font-bold text-ink">
          Four kinds of trust around one IoT system
        </h3>
        <p className="max-w-[70ch] text-ink-2">
          The IEEE 2413 standard calls these four together the “quadruple trust”. An IoT system must earn all four. Tap a pillar to see what it means.
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 grid-cols-2 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,15rem)_minmax(0,1fr)] sm:gap-3">
          {PILLARS.map((x, i) => {
            const Icon = ICON[x.id];
            const active = x.id === pillar;
            return (
              <button
                key={x.id}
                type="button"
                aria-pressed={active}
                onClick={() => setPillar(x.id)}
                className={cn(
                  "grid min-h-16 min-w-0 justify-items-center gap-1 rounded-lg border-2 px-2 py-2 text-center transition-colors",
                  active ? "border-u3 bg-u3-soft" : "border-line bg-surface hover:border-u3",
                  PLACE[x.id],
                  i >= 2 && "order-last sm:order-none",
                )}
              >
                <Icon size={22} aria-hidden className={active ? "text-u3" : "text-ink-3"} />
                <span className="font-bold text-ink">{x.name}</span>
              </button>
            );
          })}
          <div className="col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-2">
            <HomeDrawing pillar={pillar} />
          </div>
        </div>

        <motion.div
          key={pillar}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="grid min-w-0 content-start gap-3"
          aria-live="polite"
        >
          <h4 className="flex items-center gap-2 text-lg font-bold text-ink">
            {(() => {
              const Icon = ICON[pillar];
              return <Icon size={20} aria-hidden className="text-u3" />;
            })()}
            {p.name}
          </h4>
          <p className="text-ink">{p.meaning}</p>
          <p className="rounded-lg border-l-4 border-u3 bg-surface-2 px-3 py-2 text-ink">
            <span className="block text-sm font-semibold text-ink-3">Guiding question</span>
            {p.question}
          </p>
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-ink-3">Examples</p>
            {examples.map((s) => (
              <div key={s.id} className="rounded-lg border border-line bg-surface p-3">
                <p className="text-ink">{s.text}</p>
                <p className="mt-1 text-sm text-ink-2">{s.why}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <p className="max-w-[70ch] rounded-lg border border-warn/50 bg-warn-soft px-3 py-2 text-sm text-ink">
        <strong>The pillars can pull against each other.</strong> A lock that opens by itself in a fire is safer, but a little less secure. Designers must balance all four.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Part (b): classify the scenario                                     */
/* ------------------------------------------------------------------ */

function Classify() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<string, Pillar>>>({});
  const total = SCENARIOS.length;
  const done = index >= total;
  const s = SCENARIOS[Math.min(index, total - 1)];
  const chosen = answers[s.id];
  const answered = SCENARIOS.filter((x) => answers[x.id]).length;
  const score = SCENARIOS.filter((x) => answers[x.id] === x.answer).length;

  const restart = () => {
    setAnswers({});
    setIndex(0);
  };

  return (
    <section className="grid min-w-0 gap-4" aria-labelledby="qt-classify">
      <div className="grid gap-1">
        <h3 id="qt-classify" className="text-lg font-bold text-ink">
          Classify the scenario
        </h3>
        <p className="max-w-[70ch] text-ink-2">Which pillar does each story mostly test? Every class sees the same {total} scenarios in the same order.</p>
      </div>

      <div className="grid min-w-0 gap-3 rounded-lg border border-line bg-surface p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-semibold text-ink-2">{done ? "Finished" : `Scenario ${index + 1} of ${total}`}</span>
          <span className="font-semibold text-ink" aria-live="polite">
            Score: <span className="font-mono tabular-nums">{score}</span> / <span className="font-mono tabular-nums">{answered}</span>
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="Scenarios answered" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered}>
          <div className="h-full rounded-full bg-u3 transition-[width]" style={{ width: `${(answered / total) * 100}%` }} />
        </div>

        {done ? (
          <div className="grid gap-3" aria-live="polite">
            <p className="text-lg font-bold text-ink">
              You classified {score} of {total} scenarios correctly.
            </p>
            {score < total && (
              <div className="grid gap-1.5">
                <p className="text-sm font-semibold text-ink-3">Look again at these:</p>
                <ul className="grid gap-1.5 text-sm">
                  {SCENARIOS.filter((x) => answers[x.id] !== x.answer).map((x) => (
                    <li key={x.id} className="rounded-md border border-line bg-surface-2 px-2 py-1.5 text-ink-2">
                      {x.text} <strong className="text-ink">Answer: {pillarOf(x.answer).name}.</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button variant="primary" onClick={restart} icon={<RotateCcw size={16} aria-hidden />} className="justify-self-start">
              Restart
            </Button>
          </div>
        ) : (
          <>
            <p className="min-h-[3.5rem] text-lg text-ink">{s.text}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Choose a pillar">
              {PILLARS.map((x) => {
                const Icon = ICON[x.id];
                const isAnswer = !!chosen && x.id === s.answer;
                const isWrong = chosen === x.id && x.id !== s.answer;
                return (
                  <button
                    key={x.id}
                    type="button"
                    disabled={!!chosen}
                    onClick={() => setAnswers((a) => ({ ...a, [s.id]: x.id }))}
                    className={cn(
                      "flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg border-2 px-2 py-1.5 font-semibold transition-colors",
                      !chosen && "border-line-strong bg-surface text-ink hover:border-u3 hover:bg-u3-soft",
                      isAnswer && "border-ok bg-ok-soft text-ink",
                      isWrong && "border-bad bg-bad-soft text-ink",
                      chosen && !isAnswer && !isWrong && "border-line bg-surface text-ink-3",
                      "disabled:cursor-default",
                    )}
                  >
                    {isAnswer ? <CircleCheck size={18} aria-hidden className="text-ok" /> : isWrong ? <CircleX size={18} aria-hidden className="text-bad" /> : <Icon size={18} aria-hidden />}
                    {x.name}
                    {isAnswer && <span className="sr-only"> (correct answer)</span>}
                    {isWrong && <span className="sr-only"> (your answer, wrong)</span>}
                  </button>
                );
              })}
            </div>

            <div aria-live="polite" className="min-h-[1rem]">
              {chosen && (
                <div className={cn("grid gap-1 rounded-lg border p-3", chosen === s.answer ? "border-ok/60 bg-ok-soft" : "border-bad/60 bg-bad-soft")}>
                  <p className={cn("flex items-center gap-1.5 font-bold", chosen === s.answer ? "text-ok" : "text-bad")}>
                    {chosen === s.answer ? <CircleCheck size={18} aria-hidden /> : <CircleX size={18} aria-hidden />}
                    {chosen === s.answer ? `Correct: ${pillarOf(s.answer).name}.` : `Not quite. You chose ${pillarOf(chosen).name}; this one is ${pillarOf(s.answer).name}.`}
                  </p>
                  <p className="text-ink">{s.why}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => setIndex((i) => i + 1)} disabled={!chosen}>
                {index === total - 1 ? "See my score" : "Next scenario"}
              </Button>
              {answered > 0 && (
                <Button variant="ghost" onClick={restart} icon={<RotateCcw size={16} aria-hidden />}>
                  Restart
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default function QuadrupleTrustVisual() {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-8">
      <Pillars />
      <Classify />
      <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
        <p className="font-semibold text-ink">What to notice</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Security is about deliberate attacks. Protection also covers accidents, faults and the weather.</li>
          <li>Privacy problems can happen with no attacker at all, when data is used in a way people never agreed to.</li>
          <li>Safety asks what happens when the system fails: it should fail in a way that hurts nobody.</li>
        </ul>
      </div>
    </div>
  );
}
