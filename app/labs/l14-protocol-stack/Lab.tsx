import { Check, CircleAlert, RotateCcw, X } from "lucide-react";
import { useRef, useState } from "react";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { Button } from "~/components/ui/Button";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import { CHALLENGES, check, getChallenge, realTokens, type CheckResult, type Placement, type TokenState } from "./engine";

const lab = getLab("l14-protocol-stack")!;

const steps = [
  "Choose the 3-layer IoT architecture. Select a token in the tray, then select the layer it belongs to (or drag it there).",
  "When every token is placed, press Check my stack. Read the hint for any mistake, move the token and check again.",
  "When the stack is complete, press Record observation.",
  "Do the same for the 5-layer architecture and the IoT protocol stack. Notice the OSI layer numbers beside each layer.",
  "Finally build the IETF stack for a battery sensor: one protocol per layer, and leave the protocols that do not fit in the tray.",
];

const STATE_CLASS: Record<Exclude<TokenState, "tray">, string> = {
  ok: "border-ok bg-ok-soft",
  "ok-alt": "border-warn bg-warn-soft",
  wrong: "border-bad bg-bad-soft",
};

function summarise(rows: ObservationRow[]): string {
  const done = rows.filter((r) => r.result === "Complete");
  if (!done.length) return "";
  const parts: string[] = [];
  const latest = new Map<string, ObservationRow>();
  for (const r of done) latest.set(String(r.challenge), r);
  for (const [challenge, r] of latest) {
    const perfect = Number(r.mistakes) === 0;
    parts.push(
      perfect
        ? `In “${challenge}”, every token was placed correctly the first time.`
        : `In “${challenge}”, ${r.firstTime} of ${r.tokens} tokens were right the first time, and ${r.wrongTokens} had to be moved.`,
    );
  }
  const tricky = new Map<string, number>();
  for (const r of done) {
    for (const t of String(r.wrongTokens).split(", ")) if (t && t !== "None") tricky.set(t, (tricky.get(t) ?? 0) + 1);
  }
  const hardest = [...tricky.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
  if (hardest.length) parts.push(`The tokens that caused mistakes were ${hardest.join(", ")}.`);
  parts.push("Each protocol works at one layer and serves the layer above it, so a sensor's stack is built from the radio upwards.");
  return parts.join(" ");
}

export default function ProtocolStackLab() {
  const [challengeId, setChallengeId] = useState(CHALLENGES[0].id);
  const challenge = getChallenge(challengeId);
  const [placement, setPlacement] = useState<Placement>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [checks, setChecks] = useState(0);
  const [everWrong, setEverWrong] = useState<Set<string>>(new Set());
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");

  const tokenById = (id: string) => challenge.tokens.find((t) => t.id === id)!;
  const real = realTokens(challenge);
  const placedCount = Object.values(placement).filter(Boolean).length;

  const changed = (next: Placement) => {
    setPlacement(next);
    // A moved token makes the old check out of date.
    setResult(null);
  };

  const place = (tokenId: string, layerId: string) => {
    setSelected(null);
    changed({ ...placement, [tokenId]: layerId });
  };

  const returnToTray = (tokenId: string) => {
    const next = { ...placement };
    delete next[tokenId];
    changed(next);
  };

  const chooseChallenge = (id: string) => {
    setChallengeId(id);
    setPlacement({});
    setSelected(null);
    setResult(null);
    setChecks(0);
    setEverWrong(new Set());
  };

  const runCheck = () => {
    const r = check(challenge, placement);
    setResult(r);
    setChecks((c) => c + 1);
    const wrong = Object.entries(r.states)
      .filter(([, s]) => s === "wrong")
      .map(([id]) => id);
    if (wrong.length) setEverWrong((prev) => new Set([...prev, ...wrong]));
  };

  const record = () => {
    const wrongLabels = [...everWrong].map((id) => tokenById(id).label);
    const row: ObservationRow = {
      challenge: challenge.title,
      tokens: real.length,
      firstTime: real.filter((t) => !everWrong.has(t.id)).length,
      mistakes: everWrong.size,
      wrongTokens: wrongLabels.length ? wrongLabels.join(", ") : "None",
      checks,
      result: result?.complete ? "Complete" : "Not finished",
    };
    addRow(row);
    const auto = summarise([...rows, row]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  const stateOf = (id: string): TokenState | null => (result ? result.states[id] : null);

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordDisabled={checks === 0}
      recordHint={checks === 0 ? "Check your stack at least once first." : "Adds this challenge's result to the observation table."}
      controls={
        <>
          <fieldset className="grid min-w-0 gap-2">
            <legend className="mb-1.5 text-[0.95rem] font-semibold">Challenge</legend>
            {CHALLENGES.map((c) => (
              <label
                key={c.id}
                className={cn(
                  "flex cursor-pointer gap-2.5 rounded-lg border px-3 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
                  c.id === challengeId ? "border-brand bg-brand-soft" : "border-line hover:border-line-strong",
                )}
              >
                <input type="radio" name="l14-challenge" className="sr-only" checked={c.id === challengeId} onChange={() => chooseChallenge(c.id)} />
                <span>
                  <span className="block font-semibold">{c.title}</span>
                  <span className="block text-sm text-ink-2">{c.story}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="grid gap-2">
            <p className="text-[0.95rem] font-semibold">Token tray</p>
            <p className="text-sm text-ink-3" aria-live="polite">
              {selected
                ? `${tokenById(selected).label} selected. Now select a layer.`
                : challenge.onePerLayer
                  ? "Select a token, then a layer. Some tokens do not belong in this stack."
                  : "Select a token, then a layer. A layer can hold several tokens."}
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {challenge.tokens.map((t) => {
                const inLayer = placement[t.id];
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                      aria-pressed={selected === t.id}
                      onClick={() => (inLayer ? returnToTray(t.id) : setSelected(selected === t.id ? null : t.id))}
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition-colors",
                        selected === t.id
                          ? "border-brand bg-brand-soft"
                          : inLayer
                            ? "border-line bg-surface-2 text-ink-3 line-through decoration-ink-3/50"
                            : "border-line-strong bg-surface hover:border-brand",
                      )}
                      title={inLayer ? "Placed. Select to return it to the tray." : undefined}
                    >
                      {t.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={runCheck} disabled={placedCount === 0} icon={<Check size={16} aria-hidden />}>
              Check my stack
            </Button>
            <Button variant="ghost" onClick={() => chooseChallenge(challengeId)} icon={<RotateCcw size={16} aria-hidden />}>
              Start again
            </Button>
          </div>
        </>
      }
      stage={
        <div className="grid grid-cols-1 gap-3 p-3 sm:p-4">
          <ol className="grid grid-cols-1 gap-2" aria-label={`${challenge.title}, top layer first`}>
            {challenge.layers.map((layer) => {
              const tokens = challenge.tokens.filter((t) => placement[t.id] === layer.id);
              return (
                <li
                  key={layer.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain");
                    if (challenge.tokens.some((t) => t.id === id)) place(id, layer.id);
                  }}
                  className={cn(
                    "grid gap-2 rounded-lg border-2 p-2.5 transition-colors",
                    selected ? "border-dashed border-brand bg-brand-soft/40" : "border-line-strong bg-surface-2",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => selected && place(selected, layer.id)}
                    disabled={!selected}
                    className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded text-left disabled:cursor-default"
                    aria-label={selected ? `Place ${tokenById(selected).label} in the ${layer.name} layer` : `${layer.name} layer: ${tokens.length} tokens`}
                  >
                    <span className="font-bold">{layer.name}</span>
                    {layer.osi && <span className="rounded bg-surface px-1.5 font-mono text-xs text-ink-3">{layer.osi}</span>}
                    <span className="w-full text-sm text-ink-3 sm:w-auto">{layer.job}</span>
                  </button>
                  <ul className="flex min-h-9 flex-wrap gap-1.5">
                    {tokens.map((t) => {
                      const st = stateOf(t.id);
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => returnToTray(t.id)}
                            className={cn(
                              "flex items-center gap-1 rounded-md border px-2 py-1 text-sm font-semibold",
                              st && st !== "tray" ? STATE_CLASS[st] : "border-line-strong bg-surface",
                            )}
                            aria-label={`${t.label}${st === "ok" ? ", correct" : st === "ok-alt" ? ", accepted" : st === "wrong" ? ", wrong" : ""}. Select to return it to the tray.`}
                          >
                            {st === "ok" && <Check size={14} className="text-ok" aria-hidden />}
                            {st === "ok-alt" && <CircleAlert size={14} className="text-warn" aria-hidden />}
                            {st === "wrong" && <X size={14} className="text-bad" aria-hidden />}
                            {t.label}
                          </button>
                        </li>
                      );
                    })}
                    {tokens.length === 0 && <li className="self-center text-sm text-ink-3">Empty</li>}
                  </ul>
                </li>
              );
            })}
          </ol>

          <div aria-live="polite">
            {result && (
              <div
                className={cn(
                  "grid gap-1.5 rounded-lg border-2 p-3",
                  result.complete ? "border-ok bg-ok-soft" : "border-bad bg-bad-soft",
                )}
              >
                <p className="font-bold">
                  {result.complete
                    ? "Correct! Every token is in the right layer."
                    : result.firstMistake
                      ? "Not yet. Here is the first mistake:"
                      : `So far so good. ${result.remaining} token${result.remaining === 1 ? "" : "s"} still to place.`}
                </p>
                {result.firstMistake && <p>{result.firstMistake.message}</p>}
                {result.notes.map((n) => (
                  <p key={n} className="text-sm">
                    <span className="font-semibold">Note: </span>
                    {n}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      }
      readouts={
        <Readouts
          items={[
            { label: "Placed", value: `${placedCount} / ${real.length}` },
            { label: "Correct", value: result ? `${result.correct} / ${real.length}` : "—", tone: result?.complete ? "ok" : "default" },
            { label: "Checks", value: checks },
            { label: "Mistakes", value: everWrong.size, tone: everWrong.size ? "warn" : "default", hint: "Tokens that were in a wrong layer at least once" },
          ]}
        />
      }
    />
  );
}
