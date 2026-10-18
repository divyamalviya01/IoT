import { AlertTriangle } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { ChartCard, ChartTooltip, chartStyle, seriesColor } from "~/components/theory/ChartCard";
import { Segmented } from "~/components/ui/Segmented";
import { Slider } from "~/components/ui/Slider";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { useObservations } from "~/lib/observations";
import {
  BANDWIDTHS_KHZ,
  LORAWAN_OVERHEAD,
  SPREADING_FACTORS,
  acrossSF,
  evaluate,
  type AirtimeRule,
  type Environment,
  type SF,
} from "./engine";

const lab = getLab("l19-lora-airtime")!;

const steps = [
  "Keep SF7, 125 kHz and 10 bytes of data. Read the time on air, messages per day and range, then press Record observation.",
  "Change the spreading factor to SF10 and then SF12, recording each. Watch the time on air double at every step.",
  "At SF12, raise the data to 60 bytes and read the warning. Set it back to 10 bytes.",
  "At SF12, change the bandwidth to 500 kHz and record. Compare the time on air and the range.",
  "Switch the airtime rule to The Things Network's 30 s per day and see how many messages are left. Then open the lab record.",
];

const RULE_LABEL: Record<AirtimeRule, string> = { eu1pct: "EU868 1 %", ttn30s: "TTN 30 s/day" };
const ENV_LABEL: Record<Environment, string> = { rural: "Open land", urban: "City" };

const fmtMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(1)} ms`);
const fmtBps = (bps: number) => (bps >= 1000 ? `${(bps / 1000).toFixed(2)} kbps` : `${Math.round(bps)} bps`);

function summarise(rows: ObservationRow[]): string {
  if (rows.length < 2) return "";
  const parts: string[] = [];
  const at125 = rows.filter((r) => Number(r.bw) === 125 && Number(r.app) === Number(rows[0].app));
  const bySf = [...at125].sort((a, b) => Number(a.sf) - Number(b.sf));
  const low = bySf[0];
  const high = bySf[bySf.length - 1];
  if (low && high && Number(high.sf) > Number(low.sf)) {
    const ratio = Number(high.airtimeMs) / Number(low.airtimeMs);
    parts.push(
      `Going from SF${low.sf} to SF${high.sf} at 125 kHz, the time on air grew from ${low.airtime} to ${high.airtime} (about ${ratio.toFixed(0)} times longer), while the indicative range grew from ${low.range} to ${high.range} km.`,
      `So the number of messages allowed per day fell from ${low.perDay} to ${high.perDay}.`,
    );
  }
  const wide = rows.find((r) => Number(r.bw) === 500);
  const narrow = wide && rows.find((r) => Number(r.bw) === 125 && r.sf === wide.sf && r.app === wide.app);
  if (wide && narrow) {
    parts.push(
      `At SF${wide.sf}, widening the bandwidth from 125 to 500 kHz cut the time on air from ${narrow.airtime} to ${wide.airtime} but shortened the range from ${narrow.range} to ${wide.range} km.`,
    );
  }
  if (parts.length) parts.push("Higher spreading factors reach farther but use far more airtime and battery for the same data.");
  return parts.join(" ");
}

export default function LoraAirtimeLab() {
  const [sf, setSf] = useState<SF>(7);
  const [bw, setBw] = useState<number>(125);
  const [appBytes, setAppBytes] = useState(10);
  const [env, setEnv] = useState<Environment>("rural");
  const [rule, setRule] = useState<AirtimeRule>("eu1pct");
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");

  const r = evaluate(sf, bw, appBytes, env, rule);
  const all = useMemo(() => acrossSF(bw, appBytes, env, rule), [bw, appBytes, env, rule]);
  const maxMs = acrossSF(125, appBytes, env, rule).at(-1)!.airtime.totalMs;

  const airtimeData = all.map((x) => ({ sf: `SF${x.sf}`, ms: Math.round(x.airtime.totalMs * 10) / 10 }));
  const rangeData = all.map((x) => ({ sf: `SF${x.sf}`, km: Math.round(x.rangeKm * 10) / 10 }));

  const record = () => {
    const row: ObservationRow = {
      sf,
      bw,
      app: appBytes,
      airtime: fmtMs(r.airtime.totalMs),
      airtimeMs: Math.round(r.airtime.totalMs * 10) / 10,
      perDay: r.messagesPerDay,
      rule: RULE_LABEL[rule],
      range: r.rangeKm.toFixed(1),
    };
    addRow(row);
    const auto = summarise([...rows, row]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  const preambleShare = r.airtime.preambleMs / r.airtime.totalMs;
  const barWidth = Math.min(100, (r.airtime.totalMs / maxMs) * 100);

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordHint="Adds these settings and results to the observation table below."
      controls={
        <>
          <Segmented<string>
            label="Spreading factor"
            size="sm"
            value={String(sf)}
            onChange={(v) => setSf(Number(v) as SF)}
            options={SPREADING_FACTORS.map((s) => ({ value: String(s), label: `SF${s}` }))}
          />
          <Segmented<string>
            label="Bandwidth"
            value={String(bw)}
            onChange={(v) => setBw(Number(v))}
            options={BANDWIDTHS_KHZ.map((b) => ({ value: String(b), label: `${b} kHz` }))}
          />
          <Slider
            label="Application data"
            value={appBytes}
            min={1}
            max={100}
            step={1}
            unit="bytes"
            onChange={setAppBytes}
            hint={`LoRaWAN adds ${LORAWAN_OVERHEAD} bytes, so ${appBytes + LORAWAN_OVERHEAD} bytes go on air.`}
          />
          <Segmented<Environment> label="Where" value={env} onChange={setEnv} options={(Object.keys(ENV_LABEL) as Environment[]).map((e) => ({ value: e, label: ENV_LABEL[e] }))} />
          <Segmented<AirtimeRule>
            label="Airtime rule"
            value={rule}
            onChange={setRule}
            options={[
              { value: "eu1pct", label: "EU868 1 %" },
              { value: "ttn30s", label: "TTN 30 s/day" },
            ]}
          />
          <p className="text-sm text-ink-3">
            India's IN865 band has no duty-cycle limit (power is limited instead), but shared networks such as The Things Network ask for at most
            30 s of airtime a day. Ranges are illustrative.
          </p>
        </>
      }
      stage={
        <div className="grid grid-cols-1 gap-4 p-3 sm:p-4">
          <div className="grid gap-1.5">
            <p className="text-sm font-semibold text-ink-2">One message on air (bar length compared with SF12 at 125 kHz)</p>
            <div className="h-9 w-full rounded-md bg-surface-2" role="img" aria-label={`Time on air ${fmtMs(r.airtime.totalMs)}: preamble ${fmtMs(r.airtime.preambleMs)}, payload ${fmtMs(r.airtime.payloadMs)}.`}>
              <div className="flex h-full overflow-hidden rounded-md transition-[width] duration-500" style={{ width: `${barWidth}%` }}>
                <span className="h-full border-r-2 border-r-surface bg-u2" style={{ width: `${preambleShare * 100}%` }} />
                <span className="h-full flex-1 bg-brand" />
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-3" aria-hidden>
              <span className="flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm bg-u2" /> Preamble: 12.25 chirps ({fmtMs(r.airtime.preambleMs)})</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm bg-brand" /> Header and data: {r.airtime.payloadSymbols} chirps ({fmtMs(r.airtime.payloadMs)})</span>
            </div>
          </div>
          <p className="text-sm text-ink-2" aria-live="polite">
            At SF{sf} each chirp lasts {r.airtime.symbolMs.toFixed(2)} ms{r.airtime.lowDataRate ? ", long enough that low data rate optimisation switches on" : ""}. The
            receiver can hear signals down to {r.sensitivity.toFixed(1)} dBm.
          </p>
          {r.warnings.length > 0 && (
            <ul className="grid gap-1.5">
              {r.warnings.map((w) => (
                <li key={w} className="flex items-start gap-2 rounded-md bg-warn-soft px-3 py-2 text-sm">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden />
                  {w}
                </li>
              ))}
            </ul>
          )}
        </div>
      }
      readouts={
        <>
          <Readouts
            items={[
              { label: "Time on air", value: fmtMs(r.airtime.totalMs) },
              { label: "Bit rate", value: fmtBps(r.bitRate) },
              { label: `Messages per day (${RULE_LABEL[rule]})`, value: r.messagesPerDay.toLocaleString("en-IN") },
              { label: `Range, ${ENV_LABEL[env].toLowerCase()}`, value: r.rangeKm.toFixed(1), unit: "km", hint: "Illustrative" },
              { label: "Bytes on air", value: r.phyBytes },
              { label: "Wait after each message (1 % rule)", value: r.waitAfterS < 10 ? r.waitAfterS.toFixed(1) : Math.round(r.waitAfterS), unit: "s" },
              { label: "Weakest signal heard", value: r.sensitivity.toFixed(1), unit: "dBm" },
              { label: "Chirp time", value: r.airtime.symbolMs.toFixed(2), unit: "ms" },
            ]}
          />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <ChartCard
              title="Time on air at each spreading factor"
              description={`${appBytes} bytes of data at ${bw} kHz. Each step up doubles it.`}
              data={airtimeData}
              xKey="sf"
              xLabel="Spreading factor"
              series={[{ key: "ms", label: "Time on air", unit: "ms" }]}
              height={210}
            >
              <BarChart data={airtimeData} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
                <CartesianGrid {...chartStyle.grid} />
                <XAxis dataKey="sf" {...chartStyle.axis} />
                <YAxis {...chartStyle.axis} unit=" ms" width={72} />
                <Tooltip cursor={chartStyle.barCursor} content={<ChartTooltip units={{ ms: "ms" }} />} />
                <Bar dataKey="ms" name="Time on air" radius={chartStyle.bar.radius} maxBarSize={chartStyle.bar.maxBarSize} isAnimationActive={false}>
                  {all.map((x) => (
                    <Cell key={x.sf} fill={x.sf === sf ? seriesColor(0) : "var(--line-strong)"} />
                  ))}
                </Bar>
              </BarChart>
            </ChartCard>
            <ChartCard
              title="Indicative range at each spreading factor"
              description={`${ENV_LABEL[env]}, ${bw} kHz. Illustrative link-budget model.`}
              data={rangeData}
              xKey="sf"
              xLabel="Spreading factor"
              series={[{ key: "km", label: "Range", unit: "km" }]}
              height={210}
            >
              <BarChart data={rangeData} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
                <CartesianGrid {...chartStyle.grid} />
                <XAxis dataKey="sf" {...chartStyle.axis} />
                <YAxis {...chartStyle.axis} unit=" km" width={64} />
                <Tooltip cursor={chartStyle.barCursor} content={<ChartTooltip units={{ km: "km" }} />} />
                <Bar dataKey="km" name="Range" radius={chartStyle.bar.radius} maxBarSize={chartStyle.bar.maxBarSize} isAnimationActive={false}>
                  {all.map((x) => (
                    <Cell key={x.sf} fill={x.sf === sf ? seriesColor(1) : "var(--line-strong)"} />
                  ))}
                </Bar>
              </BarChart>
            </ChartCard>
          </div>
        </>
      }
    />
  );
}
