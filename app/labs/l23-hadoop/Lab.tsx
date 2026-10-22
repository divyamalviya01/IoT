import { CheckCircle2, CircleAlert, HardDrive, Play, Server, ServerCrash, XCircle } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { EventLog, type SimEvent } from "~/components/sim/EventLog";
import { seriesColor } from "~/components/theory/ChartCard";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { Slider } from "~/components/ui/Slider";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import {
  BLOCK_SIZES_MB,
  CLUSTER,
  RACKS,
  failNode,
  formatLine,
  liveCopies,
  makeLogs,
  mapReduce,
  rackName,
  reReplicate,
  restoreNode,
  status,
  writeFile,
  type Hdfs,
} from "./engine";

const lab = getLab("l23-hadoop")!;

const steps = [
  "HDFS part: keep a 500 MB file, 128 MB blocks and replication factor 3. Count the blocks and copies, then tap DataNode D4 to fail it. Watch the NameNode re-copy its blocks, then press Record observation.",
  "Set the replication factor to 1 and fail a DataNode again. Record what is lost.",
  "Change the block size to 64 MB and note how many blocks the same file needs.",
  "MapReduce part: keep 1,200 log lines, 4 mappers and 2 reducers with the combiner off. Press Run job and record. Then turn the combiner on, run and record again.",
  "Try 3 reducers and look at how many keys each one gets. Then open the lab record.",
];

const FILE_SIZES = [128, 300, 500, 1024, 1500];
const LINE_COUNTS = [400, 1200, 6000];
const SENSORS = 4;
/** How long the NameNode "waits for missing heartbeats" in the lab; about 10 minutes in real HDFS */
const DETECT_MS = 1800;

const mb = (n: number) => (n >= 1024 && n % 1024 === 0 ? `${n / 1024} GB` : `${n} MB`);
const nodeName = (id: number) => CLUSTER[id].name;
const blockName = (id: number) => `B${id + 1}`;

function BlockChip({ block, fresh, faded }: { block: number; fresh?: boolean; faded?: boolean }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <motion.span
      layout={!reduced}
      initial={fresh && !reduced ? { scale: 0.2, opacity: 0 } : false}
      animate={{ scale: 1, opacity: faded ? 0.4 : 1 }}
      className={cn("inline-flex h-5 items-center gap-1 rounded border bg-surface px-1 font-mono text-[0.7rem] font-bold text-ink", fresh ? "border-ok" : "border-line-strong")}
      title={`Copy of block ${block + 1}`}
    >
      <span className="size-2 rounded-sm" style={{ backgroundColor: seriesColor(block % 8) }} aria-hidden />
      {blockName(block)}
    </motion.span>
  );
}

function summarise(rows: ObservationRow[]): string {
  const parts: string[] = [];
  const repaired = rows.find((r) => r.part === "HDFS" && Number(r.rfN) >= 2 && Number(r.copiesN) > 0 && Number(r.lostN) === 0);
  if (repaired) {
    parts.push(`With replication factor ${repaired.rfN}, a failed DataNode left blocks with too few copies; the NameNode made ${repaired.copiesN} new copies from the survivors and no data was lost.`);
  }
  const lost = rows.find((r) => r.part === "HDFS" && Number(r.lostN) > 0);
  if (lost) parts.push(`With replication factor ${lost.rfN}, failing a DataNode lost ${lost.lostN} block${Number(lost.lostN) === 1 ? "" : "s"} for good, because there was no other copy.`);
  const off = rows.find((r) => r.part === "MapReduce" && r.combinerOn === "no");
  const on = rows.find((r) => r.part === "MapReduce" && r.combinerOn === "yes" && r.input === off?.input && r.splitsN === off?.splitsN);
  if (off && on) {
    parts.push(`The combiner cut the records crossing the network in the shuffle from ${Number(off.shuffledN).toLocaleString("en-IN")} to ${Number(on.shuffledN).toLocaleString("en-IN")}, and the averages stayed the same.`);
  }
  const skew = rows.find((r) => r.part === "MapReduce" && r.skew);
  if (skew) parts.push(`With ${skew.reducersN} reducers the keys were shared ${skew.skew}, so one reducer had more work than the others.`);
  if (parts.length < 2) return "";
  parts.push("HDFS survives failures by keeping copies on different racks, and MapReduce scales by running mappers and reducers in parallel.");
  return parts.join(" ");
}

/* ------------------------------------------------------------------ */
/* HDFS part                                                           */
/* ------------------------------------------------------------------ */

interface HdfsRun {
  hdfs: Hdfs;
  /** "block-node" keys of copies made by re-replication, for the pop-in animation */
  fresh: Set<string>;
  copiesMade: number;
  failedEver: number[];
}

const newRun = (fileMB: number, blockMB: number, rf: number): HdfsRun => ({ hdfs: writeFile(fileMB, blockMB, rf), fresh: new Set(), copiesMade: 0, failedEver: [] });

function HdfsPart({ onRecord, recordRef }: { onRecord: (row: ObservationRow) => void; recordRef: RefObject<() => void> }) {
  const reduced = useReducedMotion() ?? false;
  const [fileMB, setFileMB] = useState(500);
  const [blockMB, setBlockMB] = useState(128);
  const [rf, setRf] = useState(3);
  const [run, setRun] = useState<HdfsRun>(() => newRun(500, 128, 3));
  const [events, setEvents] = useState<SimEvent[]>([]);
  const eventId = useRef(0);
  const started = useRef(0);
  const st = status(run.hdfs);
  const waiting = st.underReplicated.length > 0;

  const log = (text: string, tone: SimEvent["tone"] = "info") => setEvents((e) => [...e, { id: eventId.current++, t: Date.now() - started.current, text, tone }]);

  // Re-write the file whenever the settings change.
  useEffect(() => {
    setRun(newRun(fileMB, blockMB, rf));
    started.current = Date.now();
    const blocks = Math.ceil(fileMB / blockMB);
    setEvents([{ id: eventId.current++, t: 0, text: `Wrote a ${mb(fileMB)} file: ${blocks} block${blocks === 1 ? "" : "s"} × ${rf} cop${rf === 1 ? "y" : "ies"} = ${blocks * rf} block copies.`, tone: "info" }]);
  }, [fileMB, blockMB, rf]);

  // The NameNode notices the missing heartbeats, then re-replicates.
  useEffect(() => {
    if (!waiting) return;
    const id = window.setTimeout(() => {
      const { hdfs, copies } = reReplicate(run.hdfs);
      setRun((r) => ({ ...r, hdfs, fresh: new Set(copies.map((c) => `${c.block}-${c.to}`)), copiesMade: r.copiesMade + copies.length }));
      for (const c of copies) log(`NameNode copies ${blockName(c.block)} from ${nodeName(c.from)} to ${nodeName(c.to)}.`, "ok");
      if (!copies.length) log("No live DataNode can take another copy.", "warn");
    }, reduced ? 300 : DETECT_MS);
    return () => window.clearTimeout(id);
  }, [waiting, run.hdfs, reduced]);

  const toggleNode = (id: number) => {
    if (run.hdfs.failed.has(id)) {
      setRun((r) => ({ ...r, hdfs: restoreNode(r.hdfs, id), fresh: new Set() }));
      log(`${nodeName(id)} is repaired and rejoins the cluster.`, "info");
      return;
    }
    const next = failNode(run.hdfs, id);
    const held = run.hdfs.blocks.filter((b) => run.hdfs.replicas[b.id].includes(id)).map((b) => b.id);
    const s = status(next);
    setRun((r) => ({ ...r, hdfs: next, fresh: new Set(), failedEver: [...new Set([...r.failedEver, id])] }));
    log(`${nodeName(id)} fails. It held ${held.length ? held.map(blockName).join(", ") : "no blocks"}.`, "bad");
    for (const b of s.lost.filter((b) => held.includes(b))) log(`${blockName(b)} is lost: no copy is left anywhere.`, "bad");
    if (s.underReplicated.length) log(`Heartbeats from ${nodeName(id)} stop. The NameNode waits before calling it dead (about 10 minutes in real HDFS).`, "warn");
  };

  recordRef.current = () =>
    onRecord({
      part: "HDFS",
      input: mb(fileMB),
      blocks: `${run.hdfs.blocks.length} × ${blockMB} MB`,
      rf: `rf ${rf}`,
      failure: run.failedEver.length ? `${run.failedEver.map(nodeName).join(", ")} failed` : "None",
      stored: mb(st.storedMB),
      result: st.lost.length ? `${st.lost.length} block${st.lost.length === 1 ? "" : "s"} lost` : run.copiesMade ? `${run.copiesMade} re-copied, none lost` : "All blocks healthy",
      rfN: rf,
      copiesN: run.copiesMade,
      lostN: st.lost.length,
    });

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
        <Segmented<string> label="File size" size="sm" value={String(fileMB)} onChange={(v) => setFileMB(Number(v))} options={FILE_SIZES.map((s) => ({ value: String(s), label: mb(s) }))} />
        <Segmented<string> label="Block size" size="sm" value={String(blockMB)} onChange={(v) => setBlockMB(Number(v))} options={BLOCK_SIZES_MB.map((s) => ({ value: String(s), label: `${s} MB` }))} />
        <Segmented<string> label="Replication factor" size="sm" value={String(rf)} onChange={(v) => setRf(Number(v))} options={[1, 2, 3].map((n) => ({ value: String(n), label: String(n) }))} />
      </div>

      <p className="text-sm text-ink-2">Tap a DataNode to make it fail; tap it again to repair it.</p>

      <div className="grid min-w-0 grid-cols-3 gap-2 sm:gap-3">
        {Array.from({ length: RACKS }, (_, rack) => (
          <section key={rack} className="grid min-w-0 content-start gap-2 rounded-lg border border-line bg-surface-2 p-1.5 sm:p-2" aria-label={rackName(rack)}>
            <h4 className="text-center text-xs font-bold text-ink-2 sm:text-sm">{rackName(rack)}</h4>
            {CLUSTER.filter((n) => n.rack === rack).map((n) => {
              const dead = run.hdfs.failed.has(n.id);
              const held = run.hdfs.blocks.filter((b) => run.hdfs.replicas[b.id].includes(n.id));
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => toggleNode(n.id)}
                  aria-pressed={dead}
                  aria-label={`${n.name}, ${dead ? "failed" : "running"}, holds ${held.length} block copies. Tap to ${dead ? "repair" : "fail"} it.`}
                  className={cn(
                    "grid min-h-20 min-w-0 content-start gap-1.5 rounded-md border p-1.5 text-left transition-colors sm:p-2",
                    dead ? "border-bad border-dashed bg-surface" : "border-line-strong bg-surface hover:border-u3",
                  )}
                >
                  <span className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1 font-mono text-xs font-bold text-ink sm:text-sm">
                      {dead ? <ServerCrash size={14} aria-hidden className="text-bad" /> : <HardDrive size={14} aria-hidden className="text-ink-3" />}
                      {n.name}
                    </span>
                    <span className={cn("text-[0.65rem] sm:text-xs", dead ? "font-semibold text-bad" : "text-ink-3")}>{dead ? "Failed" : `${held.length}`}</span>
                  </span>
                  <span className="flex flex-wrap gap-1">
                    <AnimatePresence initial={false}>
                      {held.map((b) => (
                        <BlockChip key={`${b.id}-${n.id}`} block={b.id} fresh={run.fresh.has(`${b.id}-${n.id}`)} faded={dead} />
                      ))}
                    </AnimatePresence>
                  </span>
                </button>
              );
            })}
          </section>
        ))}
      </div>

      <section className="grid min-w-0 gap-2 rounded-lg border border-line bg-surface p-3" aria-label="NameNode block map" aria-live="polite">
        <h4 className="flex flex-wrap items-center gap-2 font-bold text-ink">
          <Server size={16} aria-hidden className="text-u3" /> NameNode: where each block lives
          {waiting && <span className="text-sm font-normal text-warn">Waiting for missing heartbeats…</span>}
        </h4>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[20rem] border-collapse text-sm">
            <thead>
              <tr className="text-left text-ink-3">
                <th scope="col" className="py-1 pr-3 font-semibold">Block</th>
                <th scope="col" className="py-1 pr-3 font-semibold">Size</th>
                <th scope="col" className="py-1 pr-3 font-semibold">Live copies on</th>
                <th scope="col" className="py-1 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {run.hdfs.blocks.map((b) => {
                const live = liveCopies(run.hdfs, b.id);
                const state = live.length === 0 ? "lost" : live.length < rf ? "under" : "ok";
                return (
                  <tr key={b.id} className="border-t border-line">
                    <td className="py-1 pr-3">
                      <BlockChip block={b.id} />
                    </td>
                    <td className="py-1 pr-3 tabular-nums text-ink-2">{b.sizeMB} MB</td>
                    <td className="py-1 pr-3 font-mono text-ink">{live.length ? live.map(nodeName).join(", ") : "none"}</td>
                    <td className="py-1">
                      <span className={cn("inline-flex items-center gap-1", state === "ok" ? "text-ink-2" : state === "under" ? "text-warn" : "font-semibold text-bad")}>
                        {state === "ok" ? <CheckCircle2 size={14} aria-hidden className="text-ok" /> : state === "under" ? <CircleAlert size={14} aria-hidden /> : <XCircle size={14} aria-hidden />}
                        {state === "ok" ? `${live.length} copies` : state === "under" ? `Only ${live.length} of ${rf}` : "Lost"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Readouts
        items={[
          { label: "Blocks", value: run.hdfs.blocks.length },
          { label: "Block copies", value: st.perNode.reduce((a, b) => a + b, 0) },
          { label: "Disk used", value: mb(st.storedMB), hint: `${rf} × ${mb(fileMB)}` },
          { label: "Failed DataNodes", value: run.hdfs.failed.size, tone: run.hdfs.failed.size ? "warn" : "default" },
          { label: "Under-replicated", value: st.underReplicated.length, tone: st.underReplicated.length ? "warn" : "default" },
          { label: "Re-copied", value: run.copiesMade, tone: run.copiesMade ? "ok" : "default" },
          { label: "Lost blocks", value: st.lost.length, tone: st.lost.length ? "bad" : "ok" },
          { label: "Healthy blocks", value: `${st.healthy.length} / ${run.hdfs.blocks.length}` },
        ]}
      />
      <EventLog events={events} title="NameNode log" height={160} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MapReduce part                                                      */
/* ------------------------------------------------------------------ */

function MapReducePart({ onRecord, recordRef, setReady }: { onRecord: (row: ObservationRow) => void; recordRef: RefObject<() => void>; setReady: (ready: boolean) => void }) {
  const reduced = useReducedMotion() ?? false;
  const [lines, setLines] = useState(1200);
  const [mappers, setMappers] = useState(4);
  const [reducers, setReducers] = useState(2);
  const [combiner, setCombiner] = useState(false);
  const [stage, setStage] = useState(0); // 0 = not run, 1 map, 2 shuffle, 3 reduce, 4 done
  const logs = useMemo(() => makeLogs(lines, SENSORS, 1), [lines]);
  const job = useMemo(() => mapReduce(logs, { mappers, reducers, combiner }), [logs, mappers, reducers, combiner]);

  useEffect(() => setStage(0), [lines, mappers, reducers, combiner]);
  useEffect(() => setReady(stage === 4), [stage, setReady]);
  useEffect(() => {
    if (stage === 0 || stage === 4) return;
    const id = window.setTimeout(() => setStage((s) => s + 1), reduced ? 0 : 900);
    return () => window.clearTimeout(id);
  }, [stage, reduced]);

  const skew = reducers > 1 && new Set(job.reducerKeys.map((k) => k.length)).size > 1 ? job.reducerKeys.map((k) => k.length).join("/") : "";

  recordRef.current = () =>
    onRecord({
      part: "MapReduce",
      input: `${lines.toLocaleString("en-IN")} lines`,
      blocks: `${mappers} mapper${mappers === 1 ? "" : "s"}`,
      rf: `${reducers} reducer${reducers === 1 ? "" : "s"}`,
      failure: combiner ? "Combiner on" : "Combiner off",
      stored: `${job.shuffledRecords.toLocaleString("en-IN")} shuffled`,
      result: job.results.map((r) => `${r.sensor} ${r.avg.toFixed(1)}`).join(", "),
      splitsN: mappers,
      reducersN: reducers,
      shuffledN: job.shuffledRecords,
      combinerOn: combiner ? "yes" : "no",
      skew,
    });

  const col = "grid min-w-0 content-start gap-1.5";
  const card = "rounded-md border border-line bg-surface px-2 py-1.5 text-xs sm:text-sm";
  const show = (n: number) => stage >= n;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <Segmented<string> label="Log lines" size="sm" value={String(lines)} onChange={(v) => setLines(Number(v))} options={LINE_COUNTS.map((n) => ({ value: String(n), label: n.toLocaleString("en-IN") }))} />
        <Slider label="Mappers" value={mappers} min={1} max={8} step={1} onChange={setMappers} hint="One mapper per input split (usually one per HDFS block)." />
        <Segmented<string> label="Reducers" size="sm" value={String(reducers)} onChange={(v) => setReducers(Number(v))} options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))} />
        <Segmented<"off" | "on">
          label="Combiner"
          size="sm"
          value={combiner ? "on" : "off"}
          onChange={(v) => setCombiner(v === "on")}
          options={[
            { value: "off", label: "Off" },
            { value: "on", label: "On" },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={() => setStage(1)} icon={<Play size={16} aria-hidden />} disabled={stage > 0 && stage < 4}>
          {stage === 4 ? "Run again" : "Run job"}
        </Button>
        <span className="text-sm text-ink-3">Job: average temperature per sensor.</span>
      </div>

      <div className="rounded-md border border-line bg-surface-2 p-2 font-mono text-xs text-ink-2">
        <p className="mb-1 font-sans font-semibold text-ink-3">First lines of the log (sensor, seconds, °C)</p>
        {logs.slice(0, 3).map((l) => (
          <p key={l.t}>{formatLine(l)}</p>
        ))}
        <p>…</p>
      </div>

      <div className="relative overflow-x-auto">
        <div className="grid min-w-[40rem] grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.3fr)] gap-3" aria-live="polite">
          <div className={col}>
            <p className="text-sm font-bold text-ink">1. Map</p>
            {job.splits.map((s, m) => (
              <motion.div key={m} className={card} initial={false} animate={{ opacity: show(1) ? 1 : 0.35 }}>
                <p className="font-semibold text-ink">Mapper {m + 1}</p>
                <p className="text-ink-2">{s.length} lines → {job.mapOutput[m]} pairs</p>
                {show(1) && m === 0 && s[0] && <p className="font-mono text-ink-3">({s[0].sensor}, {s[0].temp.toFixed(1)})</p>}
              </motion.div>
            ))}
          </div>
          <div className={col}>
            <p className="text-sm font-bold text-ink">2. {combiner ? "Combine and shuffle" : "Shuffle"}</p>
            {job.splits.map((_, m) => (
              <motion.div key={m} className={card} initial={false} animate={{ opacity: show(2) ? 1 : 0.35 }}>
                <p className="text-ink-2">
                  Mapper {m + 1} sends <strong className="text-ink">{job.shuffled[m]}</strong> record{job.shuffled[m] === 1 ? "" : "s"}
                </p>
                {combiner && show(2) && m === 0 && <p className="font-mono text-ink-3">(S1, sum, count)</p>}
              </motion.div>
            ))}
            <p className="text-xs text-ink-3">Total over the network: {job.shuffledRecords.toLocaleString("en-IN")} records.</p>
          </div>
          <div className={col}>
            <p className="text-sm font-bold text-ink">3. Reduce</p>
            {job.reducerKeys.map((keys, r) => (
              <motion.div key={r} className={card} initial={false} animate={{ opacity: show(3) ? 1 : 0.35 }}>
                <p className="font-semibold text-ink">Reducer {r + 1}</p>
                <p className="text-ink-2">Keys: {keys.length ? keys.join(", ") : "none"}</p>
                <p className="text-ink-3">{job.reducerRecords[r].toLocaleString("en-IN")} records in</p>
              </motion.div>
            ))}
          </div>
          <div className={col}>
            <p className="text-sm font-bold text-ink">4. Output</p>
            <motion.table initial={false} animate={{ opacity: show(4) ? 1 : 0.35 }} className="w-full border-collapse rounded-md bg-surface text-xs sm:text-sm">
              <thead>
                <tr className="text-left text-ink-3">
                  <th scope="col" className="px-2 py-1 font-semibold">Sensor</th>
                  <th scope="col" className="px-2 py-1 font-semibold">Lines</th>
                  <th scope="col" className="px-2 py-1 font-semibold">Average</th>
                </tr>
              </thead>
              <tbody>
                {job.results.map((r) => (
                  <tr key={r.sensor} className="border-t border-line">
                    <td className="px-2 py-1 font-mono text-ink">{r.sensor}</td>
                    <td className="px-2 py-1 tabular-nums text-ink-2">{r.count}</td>
                    <td className="px-2 py-1 tabular-nums text-ink">{show(4) ? `${r.avg.toFixed(1)} °C` : "…"}</td>
                  </tr>
                ))}
              </tbody>
            </motion.table>
          </div>
        </div>
      </div>

      <Readouts
        items={[
          { label: "Map output pairs", value: job.mapOutputRecords.toLocaleString("en-IN") },
          { label: "Records shuffled", value: job.shuffledRecords.toLocaleString("en-IN"), tone: combiner ? "ok" : "default" },
          { label: "Shuffle saved by combiner", value: combiner ? `${Math.round((1 - job.shuffledRecords / job.mapOutputRecords) * 100)} %` : "–" },
          { label: "Keys per reducer", value: job.reducerKeys.map((k) => k.length).join(" / "), tone: skew ? "warn" : "default", hint: skew ? "Uneven: one reducer works harder" : undefined },
        ]}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function HadoopLab() {
  const [part, setPart] = useState<"hdfs" | "mapreduce">("hdfs");
  const [mrReady, setMrReady] = useState(false);
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");
  const hdfsRecord = useRef<() => void>(() => {});
  const mrRecord = useRef<() => void>(() => {});

  const add = (row: ObservationRow) => {
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
      onRecord={() => (part === "hdfs" ? hdfsRecord.current() : mrRecord.current())}
      recordDisabled={part === "mapreduce" && !mrReady}
      recordHint={part === "mapreduce" && !mrReady ? "Run the job to the end first." : "Adds the current part's settings and results to the observation table."}
      controls={
        <>
          <Segmented<"hdfs" | "mapreduce">
            label="Part of the experiment"
            value={part}
            onChange={setPart}
            options={[
              { value: "hdfs", label: "HDFS storage" },
              { value: "mapreduce", label: "MapReduce" },
            ]}
          />
          <p className="text-sm text-ink-2">
            {part === "hdfs"
              ? "A file is cut into blocks, and each block is stored on several DataNodes. Copy 2 goes to another rack and copy 3 to another node in that rack."
              : "Mappers turn log lines into (sensor, temperature) pairs, the shuffle brings each sensor's pairs to one reducer, and reducers average them."}
          </p>
        </>
      }
      stage={
        <div className="p-3 sm:p-4">
          {part === "hdfs" ? <HdfsPart onRecord={add} recordRef={hdfsRecord} /> : <MapReducePart onRecord={add} recordRef={mrRecord} setReady={setMrReady} />}
        </div>
      }
    />
  );
}
