import { motion, useReducedMotion } from "motion/react";
import { Check, Nfc, PenLine, Smartphone, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceDot, Tooltip, XAxis, YAxis } from "recharts";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { ChartCard, ChartTooltip, chartStyle, seriesColor } from "~/components/theory/ChartCard";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { Slider } from "~/components/ui/Slider";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import { TAGS, fieldStrength, fits, hex, readChance, taps, textRecord, tlv, uriRecord, type RecordPart, type TagId } from "./engine";

const lab = getLab("l18-nfc-tap")!;
const TAPS_PER_TEST = 10;

const steps = [
  "Keep the URI record https://example.com. Read its bytes, then press Write to tag.",
  "Set the distance to 2 cm and press Tap 10 times. Press Record observation.",
  "Repeat the taps at 4, 6 and 8 cm, recording each. Watch the success rate fall.",
  "Make a Text record in Hindi and compare its bytes with the number of characters. Write it and tap it close up.",
  "Write a very long web address and see which tag is big enough. Then open the lab record.",
];

type Kind = "uri" | "text";

function PartsTable({ caption, parts }: { caption: string; parts: RecordPart[] }) {
  return (
    <div className="relative overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-[0.9rem]">
        <caption className="border-b border-line px-3 py-2 text-left font-bold">{caption}</caption>
        <thead className="bg-surface-2">
          <tr>
            {["Part", "Bytes (hex)", "Meaning"].map((h) => (
              <th key={h} scope="col" className="border-b border-line-strong px-3 py-1.5 text-left font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parts.map((p) => (
            <tr key={p.name} className="border-b border-line last:border-0">
              <th scope="row" className="whitespace-nowrap px-3 py-1.5 text-left font-semibold">
                {p.name}
              </th>
              <td className="max-w-[18rem] break-all px-3 py-1.5 font-mono text-xs">{p.bytes.length > 24 ? `${hex(p.bytes.slice(0, 24))} …` : hex(p.bytes)}</td>
              <td className="min-w-48 px-3 py-1.5 text-ink-2">{p.meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function summarise(rows: ObservationRow[]): string {
  const tapped = rows.filter((r) => r.reads !== "—");
  if (tapped.length === 0) return "";
  const byDist = [...tapped].sort((a, b) => Number(a.distance) - Number(b.distance));
  const parts: string[] = [];
  const close = byDist[0];
  const far = byDist[byDist.length - 1];
  parts.push(
    `At ${close.distance} cm, ${close.reads} taps read the tag; at ${far.distance} cm, ${far.reads} did, because the magnetic field fades very quickly with distance.`,
  );
  const mid = byDist.find((r) => Number(r.distance) > 4 && Number(r.distance) < 8);
  if (mid) parts.push(`Between 4 and 8 cm the result was unreliable (${mid.reads} at ${mid.distance} cm).`);
  const sizes = [...new Set(rows.map((r) => `${r.record} (${r.bytes} bytes on the tag)`))];
  parts.push(`Records written: ${sizes.slice(0, 3).join("; ")}.`);
  return parts.join(" ");
}

export default function NfcTapLab() {
  const [kind, setKind] = useState<Kind>("uri");
  const [uri, setUri] = useState("https://example.com");
  const [text, setText] = useState("Room 204, Computer Lab");
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [tag, setTag] = useState<TagId>("ntag213");
  const [written, setWritten] = useState<{ label: string; bytes: number; tagBytes: number[] } | null>(null);
  const [distance, setDistance] = useState(2);
  const [results, setResults] = useState<boolean[] | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const seed = useRef(1);
  const reduced = useReducedMotion() ?? false;
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");

  const rec = useMemo(() => (kind === "uri" ? uriRecord(uri) : textRecord(text, lang)), [kind, uri, text, lang]);
  const onTag = tlv(rec.bytes);
  const capacity = TAGS.find((t) => t.id === tag)!.capacity;
  const fitsTag = fits(tag, onTag.bytes.length);
  const label = kind === "uri" ? uri : `"${text}" (${lang})`;
  const chance = readChance(distance);
  const field = fieldStrength(distance);
  const okCount = results?.filter(Boolean).length ?? 0;

  const write = () => {
    if (!fitsTag) {
      setWriteError(`Too big: ${onTag.bytes.length} bytes do not fit in ${capacity} bytes. Choose a bigger tag or a shorter record.`);
      return;
    }
    setWriteError(null);
    setWritten({ label, bytes: rec.bytes.length, tagBytes: onTag.bytes });
    setResults(null);
  };

  const tapTest = () => {
    setResults(taps(distance, TAPS_PER_TEST, seed.current++));
  };

  const record = () => {
    if (!written || !results) return;
    const row: ObservationRow = {
      record: written.label.length > 32 ? `${written.label.slice(0, 31)}…` : written.label,
      bytes: written.tagBytes.length,
      tag: TAGS.find((t) => t.id === tag)!.name,
      distance,
      reads: `${okCount} / ${TAPS_PER_TEST}`,
    };
    addRow(row);
    const auto = summarise([...rows, row]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  const chartData = Array.from({ length: 25 }, (_, i) => {
    const d = i * 0.5;
    return { d, pct: Math.round(readChance(d) * 100) };
  });

  const input = "h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3 font-mono";
  // Side view geometry (px): the tag top sits at TAG_TOP; the phone hovers `gap` px above it.
  const TAG_TOP = 200;
  const gap = distance * 7;
  const phoneBottom = TAG_TOP - gap;

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordDisabled={!written || !results}
      recordHint={!written ? "Write a record to the tag first." : !results ? "Tap the tag first." : "Adds the record, the distance and the reads to the observation table."}
      controls={
        <>
          <Segmented<Kind> label="Record type" value={kind} onChange={setKind} options={[{ value: "uri", label: "URI (web address)" }, { value: "text", label: "Text" }]} />
          {kind === "uri" ? (
            <label className="grid gap-1.5">
              <span className="text-[0.95rem] font-semibold">Web address</span>
              <input className={input} value={uri} maxLength={600} onChange={(e) => setUri(e.target.value)} spellCheck={false} />
            </label>
          ) : (
            <>
              <label className="grid gap-1.5">
                <span className="text-[0.95rem] font-semibold">Text</span>
                <input className={input} value={text} maxLength={300} onChange={(e) => setText(e.target.value)} />
              </label>
              <Segmented<"en" | "hi">
                label="Language"
                size="sm"
                value={lang}
                onChange={(l) => {
                  setLang(l);
                  if (l === "hi" && text === "Room 204, Computer Lab") setText("नमस्ते");
                }}
                options={[{ value: "en", label: "English (en)" }, { value: "hi", label: "Hindi (hi)" }]}
              />
            </>
          )}
          <Segmented<TagId> label="Tag" value={tag} onChange={setTag} options={TAGS.map((t) => ({ value: t.id, label: `${t.name} (${t.capacity} B)` }))} />
          <Button variant="primary" onClick={write} icon={<PenLine size={16} aria-hidden />}>
            Write to tag
          </Button>
          {writeError && <p className="text-sm text-bad">{writeError}</p>}
          <div className="border-t border-line pt-4">
            <Slider label="Distance from the tag" value={distance} min={0} max={12} step={0.5} unit="cm" onChange={(d) => { setDistance(d); setResults(null); }} />
          </div>
          <Button onClick={tapTest} disabled={!written} icon={<Smartphone size={16} aria-hidden />}>
            Tap {TAPS_PER_TEST} times
          </Button>
          {!written && <p className="text-sm text-ink-3">Write a record first, then tap.</p>}
        </>
      }
      stage={
        <div className="grid grid-cols-1 gap-4 p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[14rem_minmax(0,1fr)]">
            <div className="relative mx-auto h-64 w-48" role="img" aria-label={`Phone ${distance} cm above the tag. Field strength ${Math.round(field * 100)} %. Each tap reads with a ${Math.round(chance * 100)} % chance.`}>
              {/* Field loops: fade with the field strength at the tag */}
              {[0, 1, 2].map((k) => (
                <motion.span
                  key={k}
                  className="absolute left-1/2 -translate-x-1/2 rounded-full border-2 border-u2"
                  style={{ width: 60 + k * 36, height: 30 + k * 22, top: phoneBottom - (30 + k * 22) / 2 }}
                  animate={reduced ? { opacity: Math.max(0.08, field) } : { opacity: [Math.max(0.05, field * 0.4), Math.max(0.1, field), Math.max(0.05, field * 0.4)] }}
                  transition={{ duration: 1.6, repeat: reduced ? 0 : Infinity, delay: k * 0.3 }}
                  aria-hidden
                />
              ))}
              <span className="absolute left-1/2 flex h-24 w-14 -translate-x-1/2 items-center justify-center rounded-xl border-2 border-line-strong bg-surface transition-[top] duration-300" style={{ top: phoneBottom - 96 }} aria-hidden>
                <Smartphone size={26} className="text-ink-2" />
              </span>
              <span
                className={cn(
                  "absolute bottom-6 left-1/2 flex h-8 w-28 -translate-x-1/2 items-center justify-center gap-1.5 rounded-md border-2 text-xs font-semibold",
                  written ? "border-brand bg-brand-soft" : "border-dashed border-line-strong bg-surface-2 text-ink-3",
                )}
                aria-hidden
              >
                <Nfc size={14} /> {written ? "Tag (written)" : "Empty tag"}
              </span>
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 font-mono text-xs text-ink-3" aria-hidden>
                {distance} cm
              </span>
            </div>

            <div className="grid content-start gap-3">
              {results ? (
                <div className="grid gap-2" aria-live="polite">
                  <p className="font-semibold">
                    {okCount} of {TAPS_PER_TEST} taps read the tag at {distance} cm.
                  </p>
                  <ol className="flex flex-wrap gap-1.5" aria-label="Tap results">
                    {results.map((ok, i) => (
                      <li key={i} className={cn("flex size-8 items-center justify-center rounded-md", ok ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad")}>
                        {ok ? <Check size={16} aria-label="read" /> : <X size={16} aria-label="failed" />}
                      </li>
                    ))}
                  </ol>
                  {okCount > 0 && written && (
                    <p className="rounded-md bg-surface-2 px-3 py-2 text-sm">
                      The phone read: <span className="break-all font-semibold">{written.label}</span>
                    </p>
                  )}
                  {okCount === 0 && <p className="text-sm text-ink-2">The field is too weak this far away to power the tag's chip.</p>}
                </div>
              ) : (
                <p className="text-sm text-ink-3" aria-live="polite">
                  {written ? "Choose a distance and press Tap to try reading the tag." : "Build a record and write it to the tag."}
                </p>
              )}
              <div className="grid gap-1">
                <p className="text-sm font-semibold text-ink-2">
                  Tag memory: {onTag.bytes.length} of {capacity} bytes
                </p>
                <div className="h-3 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden>
                  <div className={cn("h-full rounded-full", fitsTag ? "bg-brand" : "bg-bad")} style={{ width: `${Math.min(100, (onTag.bytes.length / capacity) * 100)}%` }} />
                </div>
                {!fitsTag && <p className="text-sm text-bad">This record does not fit this tag.</p>}
              </div>
            </div>
          </div>
          <PartsTable caption={`NDEF ${kind === "uri" ? "URI" : "Text"} record: ${rec.bytes.length} bytes${rec.short ? "" : " (long record)"}`} parts={rec.parts} />
          <PartsTable caption={`On the tag (TLV wrapper): ${onTag.bytes.length} bytes`} parts={onTag.parts.filter((p) => p.name !== "NDEF message").concat([{ name: "NDEF message", bytes: rec.bytes, meaning: "The record above" }])} />
        </div>
      }
      readouts={
        <>
          <Readouts
            items={[
              { label: "Record", value: rec.bytes.length, unit: "bytes" },
              { label: "On the tag", value: onTag.bytes.length, unit: "bytes", tone: fitsTag ? "default" : "bad" },
              { label: "Field strength", value: `${Math.round(field * 100)}%`, hint: "Compared with touching the tag" },
              { label: "Chance a tap reads", value: `${Math.round(chance * 100)}%`, tone: chance >= 0.99 ? "ok" : chance <= 0.01 ? "bad" : "warn" },
            ]}
          />
          <ChartCard
            title="Chance a tap reads the tag"
            description="Reliable up to about 4 cm, unreliable between 4 and 8 cm, never beyond. The dot is your distance."
            data={chartData}
            xKey="d"
            xLabel="Distance (cm)"
            series={[{ key: "pct", label: "Chance", unit: "%" }]}
            height={200}
          >
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
              <CartesianGrid {...chartStyle.grid} />
              <XAxis dataKey="d" type="number" domain={[0, 12]} ticks={[0, 2, 4, 6, 8, 10, 12]} unit=" cm" {...chartStyle.axis} />
              <YAxis domain={[0, 100]} unit="%" width={52} {...chartStyle.axis} />
              <Tooltip cursor={chartStyle.cursor} content={<ChartTooltip labelPrefix="At " units={{ pct: "%" }} />} />
              <Line dataKey="pct" name="Chance" stroke={seriesColor(0)} {...chartStyle.line} isAnimationActive={false} />
              <ReferenceDot x={distance} y={Math.round(chance * 100)} r={6} fill={seriesColor(0)} stroke="var(--surface)" strokeWidth={2} />
            </LineChart>
          </ChartCard>
        </>
      }
    />
  );
}
