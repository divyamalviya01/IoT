import { CircleCheck, CircleX, Minus, Plus, RotateCcw, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useRef, useState } from "react";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { EventLog, type SimEvent } from "~/components/sim/EventLog";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import { Dfd, DfdLegend, KIND_LABEL, SHORT_NAME } from "./Dfd";
import {
  ELEMENTS,
  MITIGATIONS,
  PER_ELEMENT,
  STRIDE,
  STRIDE_ORDER,
  band,
  countBands,
  getElement,
  getMitigation,
  ranked,
  scoreAssessment,
  threatsFor,
  tryMitigate,
  type Assessment,
  type Band,
  type Stride,
} from "./engine";

const lab = getLab("l28-threat-modeling")!;

const steps = [
  "The Smart lock and its Bluetooth link are already in the model. Read their threats in the threat list further down.",
  "Press Select all. Check that STRIDE per element finds 42 threats, then press Record observation.",
  "Look at the heat map and Top risks. If you disagree with a rating, change its likelihood or impact.",
  "Choose a mitigation for each top risk and press Apply. Try one wrong control, such as encryption against spoofing, and read why it is refused.",
  "Switch the heat map to After mitigations. Press Record observation again, then open the lab record.",
];

const ALL = ELEMENTS.map((e) => e.id);
const START = ["lock", "f-hub-lock"];
const BAND_WORD: Record<Band, string> = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };
const BAND_RANGE: Record<Band, string> = { low: "1–4", medium: "5–9", high: "10–16", critical: "20–25" };
const BANDS: Band[] = ["low", "medium", "high", "critical"];
const CAT_SHORT: Record<Stride, string> = { S: "spoofing", T: "tampering", R: "repudiation", I: "disclosure", D: "DoS", E: "privilege" };

/** Chip and cell colours; the band word and number always go with them. */
const CHIP: Record<Band, string> = {
  low: "border-ok/50 bg-ok-soft text-ok",
  medium: "border-warn/50 bg-warn-soft text-warn",
  high: "border-bad/50 bg-bad-soft text-bad",
  critical: "border-bad bg-bad text-surface",
};
const CELL: Record<Band, string> = {
  low: "bg-ok-soft",
  medium: "bg-warn-soft",
  high: "bg-bad-soft",
  critical: "bg-bad/35 dark:bg-bad/45",
};

type Rating = { likelihood: number; impact: number };
type Feedback = { ok: boolean; text: string };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function elementsLabel(ids: string[]) {
  if (ids.length === ALL.length) return `All ${ALL.length}`;
  if (ids.length <= 2) return ALL.filter((id) => ids.includes(id)).map((id) => SHORT_NAME[id]).join(", ") || "None";
  return `${ids.length} of ${ALL.length}`;
}

function summarise(rows: ObservationRow[]): string {
  const r = [...rows].reverse().find((x) => Number(x.mitigations) > 0 && Number(x.threats) > 0);
  if (!r) return "";
  const n = (k: string) => Number(r[k]);
  const hb = n("highBefore");
  const ha = n("highAfter");
  const parts: string[] = [];
  parts.push(`STRIDE per element found ${plural(n("threats"), "threat")} in ${plural(n("elementsN"), "diagram element")}.`);
  parts.push(`Before mitigation, ${hb} of them ${hb === 1 ? "was" : "were"} high or critical risk.`);
  if (hb > 0) {
    const fall = Math.round((1 - ha / hb) * 100);
    parts.push(`${plural(n("mitigations"), "matching mitigation")} brought this down to ${ha}${ha < hb ? `, a fall of ${fall} %` : ""}.`);
  } else {
    parts.push(`${plural(n("mitigations"), "matching mitigation")} lowered the remaining risks further.`);
  }
  parts.push(`The total risk score fell from ${n("sumBeforeN")} to ${n("sumAfterN")}.`);
  if (r.topText) parts.push(`The biggest remaining risk is “${r.topText}” (${r.topCat}, ${r.topEl}, risk ${r.topRisk}, ${r.topBand}).`);
  const refused = n("refusedN");
  if (refused > 0) parts.push(`${plural(refused, "wrong-category control")} ${refused === 1 ? "was" : "were"} refused, because each control protects only one security property.`);
  parts.push("Treat the highest risks first, and re-rate each risk after its control is in place.");
  return parts.join(" ");
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function BandChip({ risk, className }: { risk: number; className?: string }) {
  const b = band(risk);
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-sm font-semibold leading-tight", CHIP[b], className)}>
      <span className="font-mono tabular-nums">{risk}</span> {BAND_WORD[b]}
    </span>
  );
}

function Letter({ c, className }: { c: Stride; className?: string }) {
  return (
    <span className={cn("inline-grid size-6 shrink-0 place-items-center rounded-md bg-u3-soft font-mono text-sm font-bold text-u3", className)} aria-hidden>
      {c}
    </span>
  );
}

function Stepper({ label, value, onChange, about }: { label: string; value: number; onChange: (v: number) => void; about: string }) {
  const btn = "grid size-8 place-items-center rounded-md border border-line-strong bg-surface text-ink hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div role="group" aria-label={`${label} for: ${about}`} className="flex items-center gap-1.5">
      <span className="text-sm text-ink-2">{label}</span>
      <button type="button" className={btn} aria-label={`Lower ${label.toLowerCase()}`} disabled={value <= 1} onClick={() => onChange(value - 1)}>
        <Minus size={14} aria-hidden />
      </button>
      <output className="w-5 text-center font-mono font-bold tabular-nums text-ink" aria-live="polite">
        {value}
      </output>
      <button type="button" className={btn} aria-label={`Raise ${label.toLowerCase()}`} disabled={value >= 5} onClick={() => onChange(value + 1)}>
        <Plus size={14} aria-hidden />
      </button>
    </div>
  );
}

function ThreatCard({
  a,
  showElement,
  pick,
  feedback,
  onPick,
  onApply,
  onRemove,
  onRate,
}: {
  a: Assessment;
  showElement: boolean;
  pick: string;
  feedback?: Feedback;
  onPick: (id: string) => void;
  onApply: () => void;
  onRemove: (id: string) => void;
  onRate: (r: Partial<Rating>) => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const selectId = useId();
  const t = a.threat;
  const s = scoreAssessment(a);
  const el = getElement(t.element);
  const choices = MITIGATIONS.filter((m) => !a.mitigations.includes(m.id));

  return (
    <motion.li
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="grid min-w-0 gap-2 rounded-lg border border-line bg-surface p-3"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Letter c={t.category} />
        <span className="font-semibold text-ink">{STRIDE[t.category].name}</span>
        <span className="text-sm text-ink-3">attacks {STRIDE[t.category].property}</span>
        {showElement && <span className="text-sm font-semibold text-ink-2">· {el.name}</span>}
      </div>
      <p className="text-ink">{t.text}</p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Stepper label="Likelihood" value={a.likelihood} onChange={(v) => onRate({ likelihood: v })} about={t.text} />
        <Stepper label="Impact" value={a.impact} onChange={(v) => onRate({ impact: v })} about={t.text} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="text-ink-2">
            Risk {a.likelihood} × {a.impact} =
          </span>
          <BandChip risk={s.risk} />
        </span>
        {a.mitigations.length > 0 ? (
          <span className="flex items-center gap-1.5">
            <span className="text-ink-2">
              After controls {s.residualLikelihood} × {a.impact} =
            </span>
            <BandChip risk={s.residualRisk} />
          </span>
        ) : (
          <span className="text-ink-3">No control yet</span>
        )}
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <label htmlFor={selectId} className="sr-only">
          Mitigation for: {t.text}
        </label>
        <select
          id={selectId}
          value={pick}
          onChange={(e) => onPick(e.target.value)}
          className="h-8 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-2 text-sm text-ink"
        >
          <option value="">Choose a mitigation…</option>
          {choices.map((m) => (
            <option key={m.id} value={m.id}>
              {m.text}
            </option>
          ))}
        </select>
        <Button size="sm" variant="secondary" onClick={onApply} disabled={!pick}>
          Apply
        </Button>
      </div>

      {a.mitigations.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Mitigations applied">
          {a.mitigations.map((id) => (
            <li key={id} className="inline-flex max-w-full items-center gap-1 rounded-md border border-ok/50 bg-ok-soft py-0.5 pl-1.5 pr-0.5 text-sm text-ink">
              <CircleCheck size={14} aria-hidden className="shrink-0 text-ok" />
              <span className="min-w-0">{getMitigation(id).text}</span>
              <button type="button" onClick={() => onRemove(id)} aria-label={`Remove ${getMitigation(id).text}`} className="grid size-6 shrink-0 place-items-center rounded text-ink-3 hover:bg-surface hover:text-ink">
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p aria-live="polite" className={cn("text-sm", !feedback && "sr-only")}>
        {feedback && (
          <span className={cn("flex items-start gap-1.5 rounded-md border px-2 py-1.5", feedback.ok ? "border-ok/50 bg-ok-soft" : "border-bad/50 bg-bad-soft")}>
            {feedback.ok ? <CircleCheck size={16} aria-hidden className="mt-0.5 shrink-0 text-ok" /> : <CircleX size={16} aria-hidden className="mt-0.5 shrink-0 text-bad" />}
            <span className="text-ink">
              <strong className={feedback.ok ? "text-ok" : "text-bad"}>{feedback.ok ? "Applied. " : "Refused. "}</strong>
              {feedback.text}
            </span>
          </span>
        )}
      </p>
    </motion.li>
  );
}

function HeatMap({ list, residual }: { list: Assessment[]; residual: boolean }) {
  const counts = new Map<string, number>();
  for (const a of list) {
    const s = scoreAssessment(a);
    const key = `${residual ? s.residualLikelihood : a.likelihood}-${a.impact}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const bands = countBands(list, residual);

  return (
    <figure className="grid min-w-0 gap-2">
      <figcaption className="font-bold text-ink">Risk heat map, {residual ? "after" : "before"} mitigations</figcaption>
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-1">
        <span className="self-center text-sm font-semibold text-ink-3 [writing-mode:vertical-rl] rotate-180">Impact →</span>
        <div className="grid min-w-0 gap-1">
          <table className="w-full table-fixed border-separate border-spacing-1">
            <caption className="sr-only">Number of threats in each cell. Rows are impact from 5 down to 1; columns are likelihood from 1 to 5.</caption>
            <thead>
              <tr>
                <th scope="col" className="w-6">
                  <span className="sr-only">Impact</span>
                </th>
                {[1, 2, 3, 4, 5].map((l) => (
                  <th key={l} scope="col" className="pb-0.5 text-sm font-semibold text-ink-2">
                    <span className="sr-only">Likelihood </span>
                    {l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[5, 4, 3, 2, 1].map((i) => (
                <tr key={i}>
                  <th scope="row" className="text-sm font-semibold text-ink-2">
                    <span className="sr-only">Impact </span>
                    {i}
                  </th>
                  {[1, 2, 3, 4, 5].map((l) => {
                    const risk = l * i;
                    const b = band(risk);
                    const n = counts.get(`${l}-${i}`) ?? 0;
                    return (
                      <td key={l} className="p-0" title={`Likelihood ${l} × impact ${i} = ${risk}, ${BAND_WORD[b]}: ${plural(n, "threat")}`}>
                        <div className={cn("relative grid h-14 place-items-center rounded-md text-ink sm:h-16", CELL[b], n === 0 && "opacity-60", n > 0 && "ring-2 ring-ink/70 ring-inset")}>
                          <span className="absolute left-1 top-0.5 font-mono text-[0.65rem] tabular-nums text-ink-2">{risk}</span>
                          <motion.span key={n} initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="font-mono text-lg font-bold tabular-nums">
                            {n > 0 ? n : <span className="sr-only">0</span>}
                          </motion.span>
                          <span className="absolute inset-x-0 bottom-0.5 truncate px-0.5 text-center text-[0.62rem] font-semibold leading-none text-ink-2">{BAND_WORD[b]}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-center text-sm font-semibold text-ink-3">Likelihood →</p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-1.5 text-sm" aria-label="Threats in each band">
        {BANDS.map((b) => (
          <li key={b} className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-semibold", CHIP[b])}>
            {BAND_WORD[b]} {BAND_RANGE[b]}: <span className="font-mono tabular-nums">{bands[b]}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function TopRisks({ list, residual }: { list: Assessment[]; residual: boolean }) {
  const top = ranked(list, residual).slice(0, 5);
  return (
    <section className="grid min-w-0 content-start gap-2" aria-labelledby="l28-top">
      <h4 id="l28-top" className="font-bold text-ink">
        Top risks {residual ? "after" : "before"} mitigations
      </h4>
      {top.length === 0 ? (
        <p className="text-sm text-ink-3">Add elements to the model to see their risks.</p>
      ) : (
        <ol className="grid gap-1.5">
          {top.map((a, i) => {
            const s = scoreAssessment(a);
            return (
              <li key={a.threat.id} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 rounded-md border border-line bg-surface px-2 py-1.5">
                <span className="w-4 pt-0.5 text-right font-mono text-sm text-ink-3">{i + 1}</span>
                <span className="min-w-0 text-sm">
                  <span className="flex items-start gap-1.5 font-semibold text-ink">
                    <Letter c={a.threat.category} className="mt-0.5 size-5 text-xs" />
                    {STRIDE[a.threat.category].name} · {SHORT_NAME[a.threat.element]}
                  </span>
                  <span className="text-ink-2">{a.threat.text}</span>
                </span>
                <BandChip risk={residual ? s.residualRisk : s.risk} />
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */

export default function ThreatModelingLab() {
  const [selected, setSelected] = useState<string[]>(START);
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [applied, setApplied] = useState<Record<string, string[]>>({});
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [refused, setRefused] = useState(0);
  const [view, setView] = useState<"before" | "after">("before");
  const [order, setOrder] = useState<"element" | "risk">("element");
  const [show, setShow] = useState<"all" | "high">("all");
  const [events, setEvents] = useState<SimEvent[]>([]);
  const step = useRef(0);
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");

  const log = (text: string, tone: SimEvent["tone"] = "info") => {
    step.current += 1;
    const t = step.current;
    setEvents((e) => [...e, { id: t, t, text, tone }]);
  };

  const threats = useMemo(() => threatsFor(selected), [selected]);
  const list: Assessment[] = useMemo(
    () =>
      threats.map((t) => ({
        threat: t,
        likelihood: ratings[t.id]?.likelihood ?? t.suggested.likelihood,
        impact: ratings[t.id]?.impact ?? t.suggested.impact,
        mitigations: applied[t.id] ?? [],
      })),
    [threats, ratings, applied],
  );

  const before = countBands(list);
  const after = countBands(list, true);
  const highBefore = before.high + before.critical;
  const highAfter = after.high + after.critical;
  const mitigationCount = list.reduce((n, a) => n + a.mitigations.length, 0);
  const sumBefore = list.reduce((n, a) => n + scoreAssessment(a).risk, 0);
  const sumAfter = list.reduce((n, a) => n + scoreAssessment(a).residualRisk, 0);
  const top = ranked(list, true)[0];
  const topScore = top ? scoreAssessment(top) : null;

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const t of threats) out[t.element] = (out[t.element] ?? 0) + 1;
    return out;
  }, [threats]);

  const toggle = (id: string) => {
    const e = getElement(id);
    if (selected.includes(id)) {
      setSelected((s) => s.filter((x) => x !== id));
      log(`Removed ${e.name} from the model.`);
    } else {
      setSelected((s) => [...s, id]);
      log(`Added ${e.name} (${KIND_LABEL[e.kind].toLowerCase()}): ${plural(threatsFor([id]).length, "threat")}, STRIDE letters ${threatsFor([id]).map((t) => t.category).join(" ")}.`);
    }
  };

  const selectAll = () => {
    setSelected(ALL);
    log(`Selected all ${ALL.length} elements: ${plural(threatsFor(ALL).length, "threat")} to rate.`);
  };

  const clearAll = () => {
    setSelected([]);
    log("Cleared the model.");
  };

  const reset = () => {
    setRatings({});
    setApplied({});
    setPicks({});
    setFeedback({});
    setRefused(0);
    log("Reset all ratings and mitigations to the suggested starting values.");
  };

  const rate = (a: Assessment, r: Partial<Rating>) => {
    setRatings((all) => ({ ...all, [a.threat.id]: { likelihood: r.likelihood ?? a.likelihood, impact: r.impact ?? a.impact } }));
  };

  const apply = (a: Assessment) => {
    const id = a.threat.id;
    const mid = picks[id];
    if (!mid) return;
    const m = getMitigation(mid);
    const res = tryMitigate(a.threat, mid);
    const where = `${STRIDE[a.threat.category].name} of ${getElement(a.threat.element).name}`;
    if (res.ok) {
      const was = scoreAssessment(a).residualRisk;
      const now = scoreAssessment({ ...a, mitigations: [...a.mitigations, mid] }).residualRisk;
      setApplied((all) => ({ ...all, [id]: [...(all[id] ?? []), mid] }));
      setFeedback((f) => ({ ...f, [id]: { ok: true, text: `${res.reason} Risk ${was} → ${now}.` } }));
      log(`${where}: applied “${m.text}”. Risk ${was} → ${now}.`, "ok");
    } else {
      setRefused((n) => n + 1);
      setFeedback((f) => ({ ...f, [id]: { ok: false, text: `“${m.text}”: ${res.reason}` } }));
      log(`${where}: refused “${m.text}”. ${res.reason}`, "bad");
    }
    setPicks((p) => ({ ...p, [id]: "" }));
  };

  const remove = (a: Assessment, mid: string) => {
    setApplied((all) => ({ ...all, [a.threat.id]: (all[a.threat.id] ?? []).filter((x) => x !== mid) }));
    setFeedback((f) => {
      const rest = { ...f };
      delete rest[a.threat.id];
      return rest;
    });
    log(`${STRIDE[a.threat.category].name} of ${getElement(a.threat.element).name}: removed “${getMitigation(mid).text}”.`, "warn");
  };

  const record = () => {
    const ts = topScore ? topScore.residualRisk : 0;
    const row: ObservationRow = {
      elements: elementsLabel(selected),
      threats: threats.length,
      highBefore,
      highAfter,
      mitigations: mitigationCount,
      top: top ? `${SHORT_NAME[top.threat.element]} ${CAT_SHORT[top.threat.category]}, ${ts} ${BAND_WORD[band(ts)]}` : "–",
      elementsN: selected.length,
      refusedN: refused,
      sumBeforeN: sumBefore,
      sumAfterN: sumAfter,
      topText: top ? top.threat.text : "",
      topCat: top ? STRIDE[top.threat.category].name.toLowerCase() : "",
      topEl: top ? getElement(top.threat.element).name : "",
      topRisk: ts,
      topBand: BAND_WORD[band(ts)].toLowerCase(),
    };
    addRow(row);
    const auto = summarise([...rows, row]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  // Threat list: filter on the starting (inherent) risk and sort on it, so cards don't jump away after a mitigation.
  const shown = list.filter((a) => show === "all" || ["high", "critical"].includes(scoreAssessment(a).band));
  const groups =
    order === "risk"
      ? [{ id: "ranked", items: ranked(shown) }]
      : ELEMENTS.filter((e) => selected.includes(e.id)).map((e) => ({ id: e.id, items: shown.filter((a) => a.threat.element === e.id) }));

  const card = (a: Assessment, showElement: boolean) => (
    <ThreatCard
      key={a.threat.id}
      a={a}
      showElement={showElement}
      pick={picks[a.threat.id] ?? ""}
      feedback={feedback[a.threat.id]}
      onPick={(id) => setPicks((p) => ({ ...p, [a.threat.id]: id }))}
      onApply={() => apply(a)}
      onRemove={(mid) => remove(a, mid)}
      onRate={(r) => rate(a, r)}
    />
  );

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordDisabled={selected.length === 0}
      recordHint={selected.length === 0 ? "Add at least one element to the model first." : "Adds the model size, the high and critical counts and the top risk to the table."}
      controls={
        <>
          <p className="text-sm text-ink-2">Tap shapes in the diagram to add them to the threat model, or remove them. Each one brings the STRIDE threats for its kind.</p>
          <section className="grid gap-1.5" aria-labelledby="l28-key">
            <h4 id="l28-key" className="text-[0.95rem] font-semibold text-ink">
              STRIDE: what each threat attacks
            </h4>
            <ul className="grid gap-1 text-sm">
              {STRIDE_ORDER.map((c) => (
                <li key={c} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
                  <Letter c={c} />
                  <span className="text-ink-2">
                    <strong className="text-ink">{STRIDE[c].name}</strong> attacks {STRIDE[c].property}. <span className="text-ink-3">{STRIDE[c].question}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="grid gap-1.5" aria-labelledby="l28-per">
            <h4 id="l28-per" className="text-[0.95rem] font-semibold text-ink">
              STRIDE per element
            </h4>
            <ul className="grid gap-0.5 text-sm text-ink-2">
              {(["external", "process", "store", "flow"] as const).map((k) => (
                <li key={k} className="flex flex-wrap justify-between gap-x-2">
                  <span>{KIND_LABEL[k]}</span>
                  <span className="font-mono font-semibold text-ink">
                    {PER_ELEMENT[k].join(" ")}
                    {k === "store" && <span className="font-sans font-normal text-ink-3"> (+R for logs)</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="grid gap-1.5" aria-labelledby="l28-bands">
            <h4 id="l28-bands" className="text-[0.95rem] font-semibold text-ink">
              Risk = likelihood × impact
            </h4>
            <p className="text-sm text-ink-2">Each is rated 1 to 5. A matching control lowers likelihood by 2, and each extra one by 1 more.</p>
            <ul className="flex flex-wrap gap-1.5 text-sm">
              {BANDS.map((b) => (
                <li key={b} className={cn("rounded-md border px-1.5 py-0.5 font-semibold", CHIP[b])}>
                  {BAND_WORD[b]} {BAND_RANGE[b]}
                </li>
              ))}
            </ul>
          </section>
          <Button size="sm" onClick={reset} icon={<RotateCcw size={14} aria-hidden />} className="justify-self-start">
            Reset ratings and mitigations
          </Button>
        </>
      }
      stage={
        <div className="@container grid min-w-0 grid-cols-1 gap-5 p-3 sm:p-4">
          <section className="grid min-w-0 gap-3" aria-labelledby="l28-dfd">
            <div className="flex flex-wrap items-center gap-2">
              <h4 id="l28-dfd" className="mr-auto font-bold text-ink">
                Smart door lock: data-flow diagram
              </h4>
              <Button size="sm" onClick={selectAll} disabled={selected.length === ALL.length}>
                Select all
              </Button>
              <Button size="sm" variant="ghost" onClick={clearAll} disabled={selected.length === 0}>
                Clear
              </Button>
            </div>
            <Dfd
              selected={new Set(selected)}
              onToggle={toggle}
              counts={counts}
              label={`Data-flow diagram of a smart door lock system. ${selected.length} of ${ALL.length} elements are in the model, with ${plural(threats.length, "threat")}.`}
              describe={(e, on) => `${e.name}, ${KIND_LABEL[e.kind].toLowerCase()}. ${on ? `In the model, ${plural(counts[e.id] ?? 0, "threat")}. Press to remove.` : "Not in the model. Press to add."}`}
            />
            <DfdLegend />
            <p className="text-sm text-ink-2" aria-live="polite">
              {selected.length === 0 ? "Nothing selected. Tap a shape or press Select all." : `${selected.length} of ${ALL.length} elements selected. The violet badge on each shows its number of threats.`}
            </p>
          </section>

          <div className="grid min-w-0 grid-cols-1 gap-5 border-t border-line pt-4 @2xl:grid-cols-2">
            <div className="grid min-w-0 content-start gap-3">
              <Segmented<"before" | "after">
                label="Show risk"
                size="sm"
                value={view}
                onChange={setView}
                options={[
                  { value: "before", label: "Before mitigations" },
                  { value: "after", label: "After mitigations" },
                ]}
              />
              <HeatMap list={list} residual={view === "after"} />
            </div>
            <TopRisks list={list} residual={view === "after"} />
          </div>
          <p className="text-sm text-ink-2">Rate and mitigate each threat in the threat list below the readouts.</p>
        </div>
      }
      readouts={
        <Readouts
          items={[
            { label: "Elements", value: `${selected.length} / ${ALL.length}` },
            { label: "Threats", value: threats.length },
            { label: "High + critical before", value: highBefore, tone: highBefore ? "bad" : "default" },
            { label: "High + critical after", value: highAfter, tone: highAfter < highBefore ? "ok" : highAfter ? "bad" : "default" },
            { label: "Mitigations applied", value: mitigationCount, tone: mitigationCount ? "ok" : "default" },
            { label: "Refused attempts", value: refused, tone: refused ? "warn" : "default", hint: "Controls from the wrong STRIDE category" },
            { label: "Total risk", value: sumAfter === sumBefore ? sumBefore : `${sumBefore} → ${sumAfter}`, hint: "Sum of likelihood × impact for all threats" },
            { label: "Biggest risk now", value: topScore ? `${topScore.residualRisk} ${BAND_WORD[topScore.residualBand]}` : "–", tone: topScore && topScore.residualRisk >= 10 ? "bad" : "default" },
          ]}
        />
      }
      log={
        <>
          <section className="grid min-w-0 grid-cols-1 gap-3 rounded-lg border border-line bg-surface p-3 sm:p-4" aria-labelledby="l28-threats">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <h3 id="l28-threats" className="mr-auto text-h3 font-bold text-ink">
                Threats ({shown.length === list.length ? list.length : `${shown.length} of ${list.length}`})
              </h3>
              <Segmented<"all" | "high">
                label="Show"
                size="sm"
                value={show}
                onChange={setShow}
                options={[
                  { value: "all", label: "All" },
                  { value: "high", label: "High + critical" },
                ]}
              />
              <Segmented<"element" | "risk">
                label="Order"
                size="sm"
                value={order}
                onChange={setOrder}
                options={[
                  { value: "element", label: "By element" },
                  { value: "risk", label: "Highest risk" },
                ]}
              />
            </div>
            <p className="text-sm text-ink-3">The filter and order use the risk before mitigations, so a card stays in place after you apply a control.</p>
            {list.length === 0 && <p className="rounded-lg border border-dashed border-line-strong p-4 text-center text-ink-3">No elements in the model yet.</p>}
            {groups.map((g) => {
              if (g.items.length === 0) return null;
              if (g.id === "ranked") {
                return (
                  <ul key={g.id} className="grid min-w-0 grid-cols-1 items-start gap-2 lg:grid-cols-2">
                    {g.items.map((a) => card(a, true))}
                  </ul>
                );
              }
              const e = getElement(g.id);
              return (
                <section key={g.id} className="grid min-w-0 gap-2" aria-label={e.name}>
                  <h4 className="flex flex-wrap items-baseline gap-x-2 text-ink">
                    <span className="font-bold">{e.name}</span>
                    <span className="text-sm text-ink-3">
                      {KIND_LABEL[e.kind]} · {plural(g.items.length, "threat")}
                    </span>
                  </h4>
                  <ul className="grid min-w-0 grid-cols-1 items-start gap-2 lg:grid-cols-2">{g.items.map((a) => card(a, false))}</ul>
                </section>
              );
            })}
          </section>
          <EventLog events={events} title="Workshop log" height={160} emptyText="Add an element or apply a mitigation to see it here." formatTime={(t) => `#${t}`} />
        </>
      }
    />
  );
}
