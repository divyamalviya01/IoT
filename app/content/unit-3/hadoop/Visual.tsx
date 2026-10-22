import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { CircleCheck, CircleX, TriangleAlert, type LucideIcon } from "lucide-react";
import { Readouts, type Readout } from "~/components/lab/Readouts";
import { seriesColor } from "~/components/theory/ChartCard";
import { ExploreLayout, type ExploreItem } from "~/components/theory/ExploreLayout";
import { Segmented } from "~/components/ui/Segmented";
import {
  CLUSTER,
  DEFAULT_BLOCK_MB,
  failNode,
  rackName,
  reReplicate,
  status,
  writeFile,
  type HdfsStatus,
} from "~/labs/l23-hadoop/engine";
import HadoopScene, { blockName, nodeName, type HadoopPart, type Phase } from "./HadoopScene";

const FILE_MB = 500;
/** How long the NameNode waits for heartbeats here. A real cluster waits about 10 minutes. */
const DETECT_MS = 1500;
/** With reduced motion the copies are shown parked mid-way for this long, then land. */
const STILL_COPY_MS = 1800;

type RfChoice = "1" | "2" | "3";
type FailChoice = "none" | `${number}`;

const rfOptions: { value: RfChoice; label: string }[] = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3 (default)" },
];

const failOptions: { value: FailChoice; label: string }[] = [
  { value: "none", label: "None" },
  ...CLUSTER.map((n) => ({ value: String(n.id + 1) as FailChoice, label: n.name })),
];

function list(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const where = (node: number) => `${nodeName(node)} (${rackName(CLUSTER[node].rack)})`;

export default function HadoopVisual() {
  const [active, setActive] = useState<HadoopPart>("namenode");
  const [rfChoice, setRfChoice] = useState<RfChoice>("3");
  const [choice, setChoice] = useState<FailChoice>("none");
  const rf = Number(rfChoice);
  const failed = choice === "none" ? null : Number(choice) - 1;
  const runKey = `${rf}-${choice}`;
  const still = useReducedMotion() ?? false;

  const model = useMemo(() => {
    const base = writeFile(FILE_MB, DEFAULT_BLOCK_MB, rf);
    if (failed === null) return { base, broken: base, fixed: base, copies: [] };
    const broken = failNode(base, failed);
    const { hdfs: fixed, copies } = reReplicate(broken);
    return { base, broken, fixed, copies };
  }, [rf, failed]);

  /* Phase of the story, tied to the setup it belongs to so a change never shows a stale phase */
  const [stage, setStage] = useState<{ key: string; phase: Phase }>({ key: runKey, phase: "healthy" });
  const phase: Phase = stage.key === runKey ? stage.phase : failed === null ? "healthy" : "detecting";
  const arrived = useRef(0);

  useEffect(() => {
    arrived.current = 0;
    if (failed === null) {
      setStage({ key: runKey, phase: "healthy" });
      return;
    }
    setStage({ key: runKey, phase: "detecting" });
    const timer = window.setTimeout(
      () => setStage({ key: runKey, phase: model.copies.length > 0 ? "repairing" : "repaired" }),
      DETECT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [runKey, failed, model]);

  // Reduced motion: the scene holds still, so the copies cannot fly. Land them after a pause instead.
  useEffect(() => {
    if (!still || phase !== "repairing") return;
    const timer = window.setTimeout(() => setStage({ key: runKey, phase: "repaired" }), STILL_COPY_MS);
    return () => window.clearTimeout(timer);
  }, [still, phase, runKey]);

  const onCopyArrive = useCallback(() => {
    arrived.current += 1;
    if (arrived.current >= model.copies.length) {
      setStage((s) => (s.key === runKey && s.phase === "repairing" ? { key: runKey, phase: "repaired" } : s));
    }
  }, [model, runKey]);

  const onToggleNode = useCallback((id: number) => {
    setChoice((c) => (c === String(id + 1) ? "none" : (String(id + 1) as FailChoice)));
  }, []);

  const shown = phase === "repaired" ? model.fixed : model.broken;
  const s: HdfsStatus = status(shown);
  const brokenStatus = status(model.broken);
  const blocks = model.base.blocks.length;
  const copiesStored = s.perNode.reduce((a, b) => a + b, 0);

  const readouts: Readout[] = [
    { label: "Blocks", value: blocks, unit: `in ${FILE_MB} MB`, hint: "3 blocks of 128 MB and one of 116 MB" },
    { label: "Copies stored", value: copiesStored, unit: `of ${blocks * rf}`, hint: "Live copies on working DataNodes" },
    { label: "MB stored", value: s.storedMB.toLocaleString("en-IN"), unit: "MB", hint: "Disk used on working DataNodes" },
    {
      label: "Under-replicated",
      value: s.underReplicated.length,
      unit: s.underReplicated.length === 1 ? "block" : "blocks",
      tone: s.underReplicated.length > 0 ? "warn" : "ok",
      hint: `Blocks with fewer than ${rf} live copies`,
    },
    {
      label: "Lost",
      value: s.lost.length,
      unit: s.lost.length === 1 ? "block" : "blocks",
      tone: s.lost.length > 0 ? "bad" : "ok",
      hint: "Blocks with no live copy left",
    },
  ];

  /* What is happening now, in words */
  let tone: "ok" | "warn" | "bad" = "ok";
  const story: string[] = [];
  if (failed === null) {
    story.push(`All 9 DataNodes send heartbeats. The ${FILE_MB} MB file is ${blocks} blocks.`);
    if (rf === 1) story.push("Each block is stored only once, so one failure will lose data.");
    else if (rf === 2) story.push("Each block has 2 copies, on two different racks.");
    else story.push("Each block has 3 copies: copy 2 on another rack, copy 3 on another node of that rack.");
  } else {
    const gone = model.base.blocks.filter((b) => model.base.replicas[b.id].includes(failed)).map((b) => b.id);
    if (phase === "detecting") {
      tone = brokenStatus.lost.length > 0 ? "bad" : gone.length > 0 ? "warn" : "ok";
      story.push(
        gone.length > 0
          ? `${nodeName(failed)} has failed, with copies of ${list(gone.map(blockName))} on it.`
          : `${nodeName(failed)} has failed. It held no copies.`,
      );
      if (brokenStatus.underReplicated.length > 0) {
        story.push(`Under-replicated: ${list(brokenStatus.underReplicated.map(blockName))}.`);
      }
      if (brokenStatus.lost.length > 0) story.push(`${list(brokenStatus.lost.map(blockName))} lost: no copy left.`);
      story.push("The NameNode is waiting for its heartbeat (1.5 s here, about 10 minutes in a real cluster).");
    } else if (phase === "repairing") {
      tone = "warn";
      story.push(
        `The NameNode noticed the missing heartbeats. It asks surviving DataNodes to copy: ${list(
          model.copies.map((c) => `${blockName(c.block)} ${nodeName(c.from)} → ${nodeName(c.to)}`),
        )}.`,
      );
    } else if (s.lost.length > 0) {
      tone = "bad";
      story.push(
        `${list(s.lost.map(blockName))} lost: no copy left. No DataNode has it, so HDFS cannot repair it. With replication factor 3 this failure loses nothing.`,
      );
    } else if (model.copies.length > 0) {
      story.push(
        `Every block has ${rf} copies again: ${list(model.copies.map((c) => `${blockName(c.block)} on ${nodeName(c.to)}`))}. Nothing was lost.`,
      );
    } else {
      story.push(`${nodeName(failed)} held no copies, so nothing had to be repaired.`);
    }
  }
  const StoryIcon: LucideIcon = tone === "ok" ? CircleCheck : tone === "warn" ? TriangleAlert : CircleX;

  const firstCopies = model.base.replicas[0];
  const items: (ExploreItem & { id: HadoopPart })[] = [
    {
      id: "namenode",
      group: "Master, one per cluster",
      name: "NameNode",
      text: "Keeps the map of the file system: which blocks make up each file, and which DataNodes hold each copy. It stores no file data itself.",
    },
    {
      id: "datanode",
      group: "Workers, many per cluster",
      name: "DataNode",
      text: "A machine that stores blocks on its own disks and sends them to whoever reads the file. Click a DataNode in the scene to make it fail.",
    },
    {
      id: "block",
      group: `${DEFAULT_BLOCK_MB} MB by default`,
      name: "Block",
      text: `HDFS cuts every file into fixed-size blocks, 128 MB by default. This ${FILE_MB} MB file becomes 3 blocks of 128 MB and one of 116 MB. Each colour is one block.`,
    },
    {
      id: "replica",
      group: "3 copies by default",
      name: "Replica (copy)",
      text: `Each block is stored on several DataNodes. The number of copies is the replication factor, 3 by default. ${
        firstCopies.length === 1
          ? `With factor 1 the large cube is the only copy of Block 1, on ${where(firstCopies[0])}.`
          : `The large cubes are the ${firstCopies.length} copies of Block 1: ${list(firstCopies.map(where))}.`
      }`,
    },
    {
      id: "rack",
      group: "Machines sharing one switch",
      name: "Rack",
      text: "A cabinet of machines that share a network switch and power. HDFS puts copy 2 on another rack and copy 3 on another node of that rack, so a whole rack can fail without losing data.",
    },
    {
      id: "heartbeat",
      group: "Every 3 seconds",
      name: "Heartbeat",
      text: "Each DataNode tells the NameNode “I am alive” every 3 seconds. After about 10 minutes of silence it is treated as dead and its blocks are copied again. Here that wait is sped up to 1.5 seconds.",
    },
  ];

  return (
    <ExploreLayout
      scene={
        <div className="grid min-w-0 grid-cols-1 gap-3">
          <div className="flex min-w-0 flex-wrap items-start gap-x-6 gap-y-3">
            <Segmented label="Replication factor" options={rfOptions} value={rfChoice} onChange={setRfChoice} size="sm" />
            <Segmented label="Fail a DataNode" options={failOptions} value={choice} onChange={setChoice} size="sm" />
          </div>
          <HadoopScene
            hdfs={model.base}
            failed={failed}
            phase={phase}
            copies={model.copies}
            lost={s.lost}
            runKey={runKey}
            active={active}
            onSelect={setActive}
            onToggleNode={onToggleNode}
            onCopyArrive={onCopyArrive}
          />
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-2" aria-label="Block colours">
            {model.base.blocks.map((b) => (
              <li key={b.id} className="flex items-center gap-1.5">
                <span aria-hidden className="block size-3 rounded-sm" style={{ backgroundColor: seriesColor(b.id) }} />
                {blockName(b.id)} ({b.sizeMB} MB)
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="block size-3 rounded-sm border border-line-strong bg-surface-2" />
              Copy on a failed node
            </li>
          </ul>
          <Readouts items={readouts} columns={2} className="sm:grid-cols-5 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1" />
          <p className="flex items-start gap-2 text-sm text-ink-2" aria-live="polite">
            <StoryIcon
              size={18}
              aria-hidden
              className={`mt-0.5 shrink-0 ${tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : "text-bad"}`}
            />
            <span>{story.join(" ")}</span>
          </p>
        </div>
      }
      listTitle="Parts of an HDFS cluster"
      items={items}
      active={active}
      onSelect={(id) => setActive(id as HadoopPart)}
      notice={[
        "Every block has copies on two racks, so even a whole rack can fail without losing data.",
        `Fail a DataNode with replication factor 3. Blocks become under-replicated, then new copies are made and the readout returns to ${(FILE_MB * 3).toLocaleString("en-IN")} MB.`,
        "With replication factor 1, one failure loses a block for good. That is why HDFS keeps 3 copies.",
        `Copies cost disk space: a ${FILE_MB} MB file with 3 copies uses ${(FILE_MB * 3).toLocaleString("en-IN")} MB.`,
        "The NameNode never carries file data. It only gives orders; the DataNodes copy blocks to each other.",
        "The timing is sped up. A real NameNode waits about 10 minutes before it treats a silent DataNode as dead.",
        "Choose a part in the list or click the scene. Click a DataNode to fail it, and click it again to bring it back. Drag to turn the view.",
      ]}
    />
  );
}
