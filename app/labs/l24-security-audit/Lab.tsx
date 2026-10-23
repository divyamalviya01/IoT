import { CircleCheck, CircleDot, CircleX, Cctv, Cloud, Lightbulb, Lock, Router, Search, Server, ShieldCheck, ShieldX, Thermometer, Webcam, type LucideIcon } from "lucide-react";
import { useRef, useState } from "react";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { EventLog, type SimEvent } from "~/components/sim/EventLog";
import { Button } from "~/components/ui/Button";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import {
  ATTACKS,
  DEVICES,
  WEAKNESSES,
  applyFix,
  attacks,
  emptyAudit,
  found,
  getWeakness,
  inspect,
  isFixed,
  quality,
  score,
  weaknessesOn,
  type AttackResult,
  type AuditState,
  type DeviceId,
  type Quality,
} from "./engine";

const lab = getLab("l24-security-audit")!;

const steps = [
  "Press Run attack simulation before changing anything, and record the result. This is your starting point.",
  "Tap each device on the floor plan and press Inspect. Read what the check finds.",
  "For every weakness, choose the fix you think is right and read the feedback. Try a partial fix once to see what happens.",
  "Run the attack simulation again after a few fixes and record it. Which attacks are still possible, and through which weakness?",
  "Fix everything properly, run the simulation a last time, record it and open the lab record.",
];

const ICONS: Record<DeviceId, LucideIcon> = {
  router: Router,
  camera: Cctv,
  oldCamera: Webcam,
  lock: Lock,
  thermostat: Thermometer,
  hub: Lightbulb,
  broker: Server,
  cloud: Cloud,
};

const SHORT: Record<DeviceId, string> = {
  router: "Router",
  camera: "Door camera",
  oldCamera: "Old camera",
  lock: "Lock",
  thermostat: "Thermostat",
  hub: "Light hub",
  broker: "MQTT Pi",
  cloud: "Cloud (internet)",
};

const QUALITY: Record<Quality, { icon: LucideIcon; word: string; tone: string }> = {
  right: { icon: CircleCheck, word: "Right fix", tone: "text-ok" },
  partial: { icon: CircleDot, word: "Partial fix", tone: "text-warn" },
  wrong: { icon: CircleX, word: "Does not help", tone: "text-bad" },
};

const SEVERITY_WORD = { high: "High", medium: "Medium", low: "Low" };

function deviceStatus(s: AuditState, id: DeviceId): "unchecked" | "open" | "fixed" | "clean" {
  if (!s.inspected.includes(id)) return "unchecked";
  const ws = weaknessesOn(id);
  if (!ws.length) return "clean";
  return ws.every((w) => isFixed(s, w.id)) ? "fixed" : "open";
}

function summarise(rows: ObservationRow[]): string {
  if (rows.length < 2) return "";
  const first = rows[0];
  const last = rows.at(-1)!;
  const parts = [`The security score went from ${first.score} to ${last.score}, and the blocked attacks from ${first.blocked} to ${last.blocked}.`];
  if (rows.some((r) => Number(r.partials) > 0)) parts.push("Partial fixes earned half marks but left their attacks possible, so half-measures did not make the home safe.");
  if (rows.some((r) => r.botnetVia === "I1+I9")) parts.push("Closing Telnet alone did not stop the botnet: it could still reach the camera through UPnP and log in with the default password.");
  if (Number(last.score) === 100) parts.push("With every weakness fixed properly, all eight simulated attacks were blocked.");
  else parts.push(`Still possible at the end: ${last.possible}.`);
  return parts.join(" ");
}

export default function SecurityAuditLab() {
  const [state, setState] = useState<AuditState>(emptyAudit);
  const [selected, setSelected] = useState<DeviceId>("router");
  const [sim, setSim] = useState<{ results: AttackResult[]; key: string } | null>(null);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const id = useRef(0);
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");

  const stateKey = JSON.stringify(state);
  const simFresh = sim?.key === stateKey;
  const log = (text: string, tone: SimEvent["tone"] = "info") => setEvents((e) => [...e, { id: id.current++, t: id.current * 1000, text, tone }]);

  const device = DEVICES.find((d) => d.id === selected)!;
  const inspected = state.inspected.includes(selected);
  const fixedCount = WEAKNESSES.filter((w) => isFixed(state, w.id)).length;
  const s = score(state);

  const doInspect = () => {
    setState((st) => inspect(st, selected));
    const ws = weaknessesOn(selected);
    log(`Inspected ${device.name}: ${ws.length ? `${ws.length} weakness${ws.length > 1 ? "es" : ""} found` : "no weaknesses"}.`, ws.length ? "warn" : "ok");
  };

  const choose = (weaknessId: string, optionId: string) => {
    setState((st) => applyFix(st, weaknessId, optionId));
    const w = getWeakness(weaknessId);
    const q = w.fixes.find((f) => f.id === optionId)!.quality;
    log(`${w.owasp}: ${QUALITY[q].word.toLowerCase()} chosen for ${SHORT[w.device]}.`, q === "right" ? "ok" : q === "partial" ? "warn" : "bad");
  };

  const runSim = () => {
    const results = attacks(state);
    setSim({ results, key: stateKey });
    const open = results.filter((r) => r.possible).length;
    log(`Attack simulation: ${results.length - open} of ${results.length} attacks blocked.`, open ? "warn" : "ok");
  };

  const record = () => {
    if (!sim || !simFresh) return;
    const blocked = sim.results.filter((r) => !r.possible).length;
    const possible = sim.results.filter((r) => r.possible).map((r) => r.attack.name);
    const botnet = sim.results.find((r) => r.attack.id === "botnet")!;
    const row: ObservationRow = {
      check: rows.length + 1,
      found: found(state).length,
      fixed: fixedCount,
      score: s,
      blocked: `${blocked} / ${ATTACKS.length}`,
      possible: possible.length ? (possible.length > 3 ? `${possible.slice(0, 3).join(", ")} +${possible.length - 3} more` : possible.join(", ")) : "None",
      partials: WEAKNESSES.filter((w) => quality(state, w.id) === "partial").length,
      botnetVia: botnet.possible ? botnet.via.join("+") : "",
    };
    addRow(row);
    const auto = summarise([...rows, row]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordDisabled={!simFresh}
      recordHint={simFresh ? "Adds this check to the observation table." : "Run the attack simulation for the current settings first."}
      controls={
        <>
          <p className="text-sm text-ink-2">
            You are auditing a family's smart home, with their permission. Find the weaknesses, choose fixes and check which simulated attacks would still work.
          </p>
          <div className="grid gap-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold text-ink">Security score</span>
              <span className="font-mono text-ink">{s} / 100</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface-2" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s} aria-label="Security score">
              <div className={cn("h-full rounded-full transition-[width] duration-500", s >= 80 ? "bg-ok" : s >= 40 ? "bg-warn" : "bg-bad")} style={{ width: `${s}%` }} />
            </div>
            <p className="text-xs text-ink-3">High-severity fixes count 3, medium 2, low 1. A partial fix counts half.</p>
          </div>
          <Button variant="primary" onClick={runSim} icon={<ShieldCheck size={16} aria-hidden />}>
            Run attack simulation
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setState(emptyAudit());
              setSim(null);
              log("Audit reset: the home is back to how you found it.", "info");
            }}
          >
            Reset the home
          </Button>
        </>
      }
      stage={
        <div className="grid grid-cols-1 gap-4 p-3 sm:p-4">
          <div className="relative aspect-[100/64] w-full overflow-hidden rounded-lg border border-line bg-surface-2">
            <svg viewBox="0 0 100 64" className="absolute inset-0 h-full w-full" aria-hidden>
              <rect x="2" y="4" width="84" height="56" rx="1.5" fill="var(--surface)" stroke="var(--line-strong)" strokeWidth="0.6" />
              <line x1="30" y1="4" x2="30" y2="40" stroke="var(--line-strong)" strokeWidth="0.5" />
              <line x1="2" y1="40" x2="72" y2="40" stroke="var(--line-strong)" strokeWidth="0.5" />
              <line x1="72" y1="4" x2="72" y2="60" stroke="var(--line-strong)" strokeWidth="0.5" />
              <line x1="56" y1="4" x2="56" y2="40" stroke="var(--line-strong)" strokeWidth="0.5" strokeDasharray="1 1" />
              {[
                ["Living room", 6, 9],
                ["Hall", 34, 9],
                ["Study", 75, 37],
                ["Entrance", 36, 46],
                ["Garage", 75, 46],
              ].map(([label, x, y]) => (
                <text key={label as string} x={x as number} y={y as number} className="fill-ink-3" style={{ fontSize: 2.6 }}>
                  {label}
                </text>
              ))}
            </svg>
            {DEVICES.map((d) => {
              const Icon = ICONS[d.id];
              const st = deviceStatus(state, d.id);
              const open = weaknessesOn(d.id).filter((w) => !isFixed(state, w.id)).length;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelected(d.id)}
                  aria-pressed={d.id === selected}
                  aria-label={`${d.name}: ${st === "unchecked" ? "not inspected yet" : st === "open" ? `${open} weakness${open > 1 ? "es" : ""} still open` : "all fixed"}`}
                  className="absolute grid -translate-x-1/2 -translate-y-1/2 justify-items-center gap-0.5"
                  style={{ left: `${d.x}%`, top: `${(d.y / 64) * 100}%` }}
                >
                  <span
                    className={cn(
                      "relative grid size-9 place-items-center rounded-full border-2 bg-surface shadow-sm sm:size-11",
                      d.id === selected && "ring-2 ring-brand ring-offset-2 ring-offset-surface-2",
                      st === "unchecked" ? "border-dashed border-line-strong" : st === "open" ? "border-bad" : "border-ok",
                    )}
                  >
                    <Icon size={18} aria-hidden className="text-ink-2" />
                    {st === "open" && <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-bad text-[10px] font-bold text-white">{open}</span>}
                    {(st === "fixed" || st === "clean") && <CircleCheck size={14} aria-hidden className="absolute -right-1 -top-1 rounded-full bg-surface text-ok" />}
                  </span>
                  <span className="whitespace-nowrap rounded bg-surface/90 px-1 text-[9px] font-medium text-ink sm:text-xs">{SHORT[d.id]}</span>
                </button>
              );
            })}
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
            <span>Dashed ring: not inspected</span>
            <span>Red ring with a number: weaknesses still open</span>
            <span>Green tick: all fixed</span>
          </p>

          <section className="grid min-w-0 gap-3 rounded-lg border border-line bg-surface p-3" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-ink">{device.name}</h3>
              {!inspected && (
                <Button size="sm" onClick={doInspect} icon={<Search size={14} aria-hidden />}>
                  Inspect
                </Button>
              )}
            </div>
            {!inspected ? (
              <p className="text-sm text-ink-3">Not inspected yet. Press Inspect to check its ports, firmware and settings.</p>
            ) : (
              <>
                <ul className="grid gap-0.5 font-mono text-xs text-ink-2">
                  {device.facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                {weaknessesOn(selected).map((w) => {
                  const q = quality(state, w.id);
                  const chosen = w.fixes.find((f) => f.id === state.chosen[w.id]);
                  return (
                    <div key={w.id} className="grid min-w-0 gap-2 rounded-md border border-line p-2.5">
                      <p className="text-sm text-ink">
                        <span className="font-mono font-semibold">{w.owasp}</span> {w.title}
                      </p>
                      <p className="text-xs text-ink-3">
                        OWASP: {w.owaspName} · Severity: {SEVERITY_WORD[w.severity]} · Breaks: {w.cia.map((c) => ({ C: "confidentiality", I: "integrity", A: "availability" })[c]).join(", ")}
                      </p>
                      <fieldset className="grid min-w-0 gap-1.5">
                        <legend className="sr-only">Choose a fix for {w.owasp}</legend>
                        {w.fixes.map((f) => (
                          <label key={f.id} className={cn("flex cursor-pointer items-start gap-2 rounded-md border px-2.5 py-1.5 text-sm", state.chosen[w.id] === f.id ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-2")}>
                            <input type="radio" name={`fix-${w.id}`} className="mt-1 accent-[var(--brand)]" checked={state.chosen[w.id] === f.id} onChange={() => choose(w.id, f.id)} />
                            <span className="text-ink">{f.text}</span>
                          </label>
                        ))}
                      </fieldset>
                      {q && chosen && (
                        <p className={cn("flex items-start gap-1.5 text-sm", QUALITY[q].tone)}>
                          {(() => {
                            const QIcon = QUALITY[q].icon;
                            return <QIcon size={16} aria-hidden className="mt-0.5 shrink-0" />;
                          })()}
                          <span className="text-ink">
                            <strong>{QUALITY[q].word}.</strong> {chosen.feedback}
                          </span>
                        </p>
                      )}
                    </div>
                  );
                })}
                {!weaknessesOn(selected).length && <p className="text-sm text-ok">No weaknesses found on this device.</p>}
              </>
            )}
          </section>

          {sim && (
            <section className="grid min-w-0 gap-2" aria-live="polite">
              <h3 className="font-bold text-ink">
                Attack simulation {simFresh ? "" : <span className="font-normal text-warn">(out of date: run it again)</span>}
              </h3>
              <ul className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                {sim.results.map((r) => (
                  <li key={r.attack.id} className={cn("grid gap-0.5 rounded-md border p-2.5 text-sm", r.possible ? "border-bad bg-bad-soft" : "border-ok bg-ok-soft")}>
                    <span className="flex items-center gap-1.5 font-semibold text-ink">
                      {r.possible ? <ShieldX size={15} aria-hidden className="text-bad" /> : <ShieldCheck size={15} aria-hidden className="text-ok" />}
                      {r.attack.name}: {r.possible ? "still possible" : "blocked"}
                    </span>
                    <span className="text-ink-2">{r.possible ? `${r.attack.impact} Open through: ${r.via.map((v) => `${v} (${SHORT[getWeakness(v).device]})`).join(" + ")}.` : "Every way in for this attack is closed."}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      }
      readouts={
        <Readouts
          items={[
            { label: "Devices inspected", value: `${state.inspected.length} / ${DEVICES.length}` },
            { label: "Weaknesses found", value: `${found(state).length} / ${WEAKNESSES.length}` },
            { label: "Fixed properly", value: fixedCount, tone: fixedCount === WEAKNESSES.length ? "ok" : "default" },
            { label: "Security score", value: s, unit: "/ 100", tone: s >= 80 ? "ok" : s >= 40 ? "warn" : "bad" },
          ]}
        />
      }
      log={<EventLog events={events} title="Audit log" emptyText="Tap a device and inspect it to start." height={160} formatTime={(t) => `#${Math.round(t / 1000)}`} />}
    />
  );
}
