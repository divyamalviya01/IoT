import { useId, useState } from "react";
import { Readouts } from "~/components/lab/Readouts";
import { seriesColor } from "~/components/theory/ChartCard";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { cn } from "~/lib/cn";
import { CHANNELS, bestPlan, centreMHz, interference, type Width } from "./channels";

/** Spectrum view: 2400–2490 MHz mapped onto the SVG width */
const F0 = 2398;
const F1 = 2488;
const W = 600;
const H = 150;
const BASE = 118;
const x = (mhz: number) => ((mhz - F0) / (F1 - F0)) * W;

/** Access point positions for the layout sketch, % of its box */
const SPOTS: Record<number, { x: number; y: number }[]> = {
  3: [
    { x: 50, y: 18 },
    { x: 18, y: 80 },
    { x: 82, y: 80 },
  ],
  4: [
    { x: 22, y: 22 },
    { x: 78, y: 22 },
    { x: 22, y: 78 },
    { x: 78, y: 78 },
  ],
};

const KIND_STYLE = {
  clear: { stroke: "var(--ok)", dash: "4 4", label: "No overlap" },
  sharing: { stroke: "var(--warn)", dash: undefined, label: "Same channel: they share" },
  clashing: { stroke: "var(--bad)", dash: undefined, label: "Overlapping: they clash" },
} as const;

export default function WifiChannelsVisual() {
  const [count, setCount] = useState<3 | 4>(3);
  const [width, setWidth] = useState<Width>(22);
  const [channels, setChannels] = useState<number[]>([1, 3, 6, 11]);
  const id = useId();
  const plan = channels.slice(0, count);
  const report = interference(plan, width);

  const setChannel = (i: number, ch: number) => setChannels((prev) => prev.map((c, j) => (j === i ? ch : c)));
  const applyPlan = (p: number[]) => setChannels((prev) => [...p, ...prev.slice(p.length)]);

  const verdict =
    report.total === 0
      ? "No interference: every pair is on channels that do not overlap."
      : report.pairs.some((p) => p.kind === "clashing")
        ? "Some access points are on partly overlapping channels, so their signals corrupt each other."
        : "Some access points share a channel. They take turns, which is slower but orderly.";

  return (
    <div className="grid grid-cols-1 gap-6">
      <p className="max-w-[70ch] text-ink-2">
        Give each access point a 2.4 GHz channel and see how their signals overlap. Channel centres are only 5 MHz apart, but each
        channel is about 20–22 MHz wide.
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <Segmented<string> label="Access points" value={String(count)} onChange={(v) => setCount(Number(v) as 3 | 4)} options={[{ value: "3", label: "3" }, { value: "4", label: "4" }]} />
        <Segmented<string> label="Channel width" value={String(width)} onChange={(v) => setWidth(Number(v) as Width)} options={[{ value: "22", label: "22 MHz (802.11b)" }, { value: "20", label: "20 MHz (802.11g/n)" }]} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => applyPlan(count === 3 ? [1, 6, 11] : [1, 6, 11, 1])}>
            Try {count === 3 ? "1, 6, 11" : "1, 6, 11, 1"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => applyPlan(bestPlan(count, width).channels)}>
            Find the best plan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {plan.map((ch, i) => (
          <label key={i} className="grid min-w-0 gap-1.5">
            <span className="flex items-center gap-2 text-[0.95rem] font-semibold">
              <span className="size-3 rounded-full" style={{ backgroundColor: seriesColor(i) }} aria-hidden />
              Access point {i + 1}
            </span>
            <select className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3" value={ch} onChange={(e) => setChannel(i, Number(e.target.value))}>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  Channel {c} ({centreMHz(c)} MHz)
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <figure className="grid grid-cols-1 gap-2 rounded-lg border border-line bg-surface p-3 sm:p-4">
        <figcaption className="font-bold">The 2.4 GHz band</figcaption>
        <div className="relative overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="block w-full min-w-[32rem]" role="img" aria-labelledby={`${id}-desc`}>
            <desc id={`${id}-desc`}>
              {plan.map((ch, i) => `Access point ${i + 1} on channel ${ch}`).join(", ")}. {verdict}
            </desc>
            <line x1={0} x2={W} y1={BASE} y2={BASE} stroke="var(--line-strong)" />
            {CHANNELS.map((c) => (
              <g key={c}>
                <line x1={x(centreMHz(c))} x2={x(centreMHz(c))} y1={BASE} y2={BASE + 5} stroke="var(--line-strong)" />
                <text x={x(centreMHz(c))} y={BASE + 17} textAnchor="middle" className="fill-ink-3 text-[10px]">
                  {c}
                </text>
              </g>
            ))}
            <text x={W / 2} y={H - 2} textAnchor="middle" className="fill-ink-3 text-[10px]">
              Channel number
            </text>
            {plan.map((ch, i) => {
              const c = x(centreMHz(ch));
              const half = (x(centreMHz(ch) + width / 2) - x(centreMHz(ch) - width / 2)) / 2;
              const top = 22 + i * 6;
              const shoulder = half * 0.35;
              const d = `M ${c - half} ${BASE} C ${c - half + shoulder} ${top}, ${c + half - shoulder} ${top}, ${c + half} ${BASE}`;
              return (
                <g key={i}>
                  <path d={d} fill={seriesColor(i)} fillOpacity={0.18} stroke={seriesColor(i)} strokeWidth={2} />
                  <text x={c} y={top + 12} textAnchor="middle" className="fill-ink text-[11px] font-semibold">
                    AP {i + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </figure>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
        <figure className="grid gap-2 rounded-lg border border-line bg-surface p-3">
          <figcaption className="font-bold">Who hears whom</figcaption>
          <div className="relative mx-auto aspect-square w-full max-w-60" role="img" aria-label={report.pairs.map((p) => `Access points ${p.a + 1} and ${p.b + 1}: ${KIND_STYLE[p.kind].label}`).join(". ")}>
            <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
              {report.pairs.map((p) => {
                const a = SPOTS[count][p.a];
                const b = SPOTS[count][p.b];
                const s = KIND_STYLE[p.kind];
                const diagonal = count === 4 && ((p.a === 0 && p.b === 3) || (p.a === 1 && p.b === 2));
                return <line key={`${p.a}-${p.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={s.stroke} strokeWidth={diagonal ? 1.5 : 3} strokeDasharray={s.dash} opacity={diagonal ? 0.6 : 1} />;
              })}
            </svg>
            {plan.map((ch, i) => (
              <span
                key={i}
                className="absolute flex size-11 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 bg-surface text-center text-[0.65rem] font-bold leading-tight"
                style={{ left: `${SPOTS[count][i].x}%`, top: `${SPOTS[count][i].y}%`, borderColor: seriesColor(i) }}
                aria-hidden
              >
                AP {i + 1}
                <span className="font-mono font-normal">ch {ch}</span>
              </span>
            ))}
          </div>
          <ul className="grid gap-1 text-xs text-ink-3" aria-hidden>
            {(Object.keys(KIND_STYLE) as (keyof typeof KIND_STYLE)[]).map((k) => (
              <li key={k} className="flex items-center gap-2">
                <svg width="22" height="6" aria-hidden>
                  <line x1="0" x2="22" y1="3" y2="3" stroke={KIND_STYLE[k].stroke} strokeWidth="3" strokeDasharray={KIND_STYLE[k].dash} />
                </svg>
                {KIND_STYLE[k].label}
              </li>
            ))}
            {count === 4 && <li>Thin lines: diagonal neighbours are farther apart, so they matter less.</li>}
          </ul>
        </figure>

        <div className="grid content-start gap-3">
          <Readouts
            columns={2}
            items={[
              { label: "Interference score", value: report.total, tone: report.total === 0 ? "ok" : report.pairs.some((p) => p.kind === "clashing") ? "bad" : "warn", hint: "0 is best" },
              { label: "Pairs clashing", value: report.pairs.filter((p) => p.kind === "clashing").length, tone: report.pairs.some((p) => p.kind === "clashing") ? "bad" : "default" },
              { label: "Pairs sharing", value: report.pairs.filter((p) => p.kind === "sharing").length },
              { label: "Pairs clear", value: report.pairs.filter((p) => p.kind === "clear").length, tone: "ok" },
            ]}
          />
          <p className={cn("rounded-md px-3 py-2 text-sm font-semibold", report.total === 0 ? "bg-ok-soft text-ok" : "bg-warn-soft text-ink")} aria-live="polite">
            {verdict}
          </p>
          <p className="text-sm text-ink-3">
            Score: 1 for each pair sharing a channel, and 2 × the overlap for each pair on partly overlapping channels, because clashing is
            worse than sharing. With 4 access points, no plan in 2.4 GHz is perfect.
          </p>
        </div>
      </div>

      <section aria-labelledby={`${id}-notice`} className="max-w-[70ch]">
        <h2 id={`${id}-notice`} className="text-h3 font-bold">
          What to notice
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2 marker:text-ink-3">
          <li>Channels 1, 6 and 11 are the only three that do not overlap at all.</li>
          <li>Channels 1 and 3 score worse than putting both access points on channel 1: partly overlapping signals clash instead of taking turns.</li>
          <li>Switching between 22 and 20 MHz changes little; 1, 6 and 11 stay the safe choice.</li>
          <li>With a fourth access point, the best plans re-use a channel (or slightly overlap) on the pair that is farthest apart.</li>
        </ul>
      </section>
    </div>
  );
}
