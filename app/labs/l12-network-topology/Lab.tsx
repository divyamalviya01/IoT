import { RotateCcw } from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { Button } from "~/components/ui/Button";
import { Slider } from "~/components/ui/Slider";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import {
  MAX_NODES,
  MIN_NODES,
  TOPOLOGIES,
  TOPOLOGY_INFO,
  analyse,
  buildTopology,
  cableSummary,
  describeItem,
  type Analysis,
  type FailureItem,
  type Topology,
  type TopologyKind,
} from "./engine";

const lab = getLab("l12-network-topology")!;

const steps = [
  "Choose Star with 8 nodes. Read the hops and the weakest point, then press Record observation.",
  "Click one link to break it and record. Then click the gateway (G) and see everyone cut off. Press Repair everything.",
  "Tick Highlight the weakest point. Do the same for Tree, Bus, Ring and Mesh: record each with nothing broken, then break the weakest point and record again.",
  "On the Ring, break one link, then a second one, and watch the network split.",
  "Change the number of nodes and compare the average hops of each topology. Then open the lab record.",
];

/** SVG coordinates: graph positions in [-1, 1] mapped onto a 400 × 400 box */
const SIZE = 400;
const SCALE = 165;
const px = (v: number) => SIZE / 2 + v * SCALE;
const NODE_R = 14;

interface Failed {
  nodes: Set<number>;
  links: Set<number>;
}
const NONE = (): Failed => ({ nodes: new Set(), links: new Set() });
const key = (i: FailureItem) => `${i.kind}:${i.id}`;

function fmtHops(v: number | null) {
  return v === null ? "—" : Number.isInteger(v) ? String(v) : v.toFixed(2);
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const joinAnd = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);
const hopsText = (v: string | number) => `${v} hop${Number(v) === 1 ? "" : "s"}`;

function summarise(rows: ObservationRow[]): string {
  if (rows.length === 0) return "";
  const parts: string[] = [];
  const intact = rows.filter((r) => r.failed === "None");
  // Latest intact row per topology and size
  const byTopo = new Map<string, ObservationRow>();
  for (const r of intact) byTopo.set(`${r.topology}`, r);
  const list = [...byTopo.values()];

  if (list.length >= 2) {
    const withHops = list.filter((r) => r.avgHops !== "—");
    const shortest = [...withHops].sort((a, b) => Number(a.avgHops) - Number(b.avgHops))[0];
    const longest = [...withHops].sort((a, b) => Number(b.avgHops) - Number(a.avgHops))[0];
    if (shortest && longest && shortest !== longest) {
      parts.push(
        `With nothing broken, the ${String(shortest.topology).toLowerCase()} had the shortest routes (${hopsText(shortest.avgHops)} on average) and the ${String(longest.topology).toLowerCase()} the longest (${hopsText(longest.avgHops)}).`,
      );
    }
    const fragile = list.filter((r) => Number(r.weakest) > 0).map((r) => String(r.topology).toLowerCase());
    const strong = list.filter((r) => Number(r.weakest) === 0).map((r) => String(r.topology).toLowerCase());
    if (fragile.length && strong.length) {
      parts.push(
        `The ${joinAnd(strong)} survived any single failure, because every device had a backup path, while the ${joinAnd(fragile)} each had a single point of failure.`,
      );
    } else if (fragile.length) {
      parts.push(`Every topology recorded (${joinAnd(fragile)}) had a single point of failure.`);
    }
  } else if (list.length === 1) {
    const r = list[0];
    parts.push(
      `The ${String(r.topology).toLowerCase()} of ${r.nodes} nodes used ${r.cables}, with ${hopsText(r.avgHops)} on average; its weakest point cut off ${r.weakest} devices.`,
    );
  }

  const broken = rows.filter((r) => r.failed !== "None");
  for (const r of broken.slice(-3)) {
    parts.push(
      `In the ${String(r.topology).toLowerCase()}, when ${joinAnd(String(r.failed).split(", ").map(lowerFirst))} failed, ${r.cutOff} device${Number(r.cutOff) === 1 ? " was" : "s were"} cut off.`,
    );
  }
  return parts.join(" ");
}

export default function NetworkTopologyLab() {
  const [kind, setKind] = useState<TopologyKind>("star");
  const [n, setN] = useState(8);
  const [failed, setFailed] = useState<Failed>(NONE);
  const [showWeakest, setShowWeakest] = useState(false);
  const [status, setStatus] = useState("Click a node or a link to break it. Click it again to repair it.");
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");

  const topo = useMemo(() => buildTopology(kind, n), [kind, n]);
  const a = useMemo(() => analyse(topo, failed), [topo, failed]);

  const change = (k: TopologyKind, size: number) => {
    setKind(k);
    setN(size);
    // A new network starts with nothing broken.
    setFailed(NONE());
    setStatus(`${TOPOLOGY_INFO[k].label} with ${size} nodes. Nothing is broken.`);
  };

  const toggle = (item: FailureItem) => {
    const next: Failed = { nodes: new Set(failed.nodes), links: new Set(failed.links) };
    const set = item.kind === "node" ? next.nodes : next.links;
    const was = set.has(item.id);
    if (was) set.delete(item.id);
    else set.add(item.id);
    const after = analyse(topo, next);
    const lost = after.cutOff.length - a.cutOff.length;
    const what = describeItem(topo, item);
    setFailed(next);
    setStatus(
      was
        ? `${what} repaired. ${after.cutOff.length ? `${after.cutOff.length} still cut off.` : "Every working device reaches the gateway."}`
        : item.kind === "node" && item.id === 0
          ? "The gateway failed, so every device lost its way out."
          : `${what} failed. ${lost > 0 ? `${lost} more device${lost === 1 ? " is" : "s are"} cut off.` : "Nobody was cut off: the others found another route."}`,
    );
  };

  const repairAll = () => {
    setFailed(NONE());
    setStatus("Everything repaired.");
  };

  const failedList = [
    ...[...failed.nodes].map((id) => describeItem(topo, { kind: "node", id })),
    ...[...failed.links].map((id) => describeItem(topo, { kind: "link", id })),
  ];

  const record = () => {
    const row: ObservationRow = {
      topology: TOPOLOGY_INFO[kind].label,
      nodes: n,
      cables: cableSummary(topo),
      failed: failedList.length ? failedList.join(", ") : "None",
      cutOff: a.cutOff.length,
      avgHops: fmtHops(a.avgHops),
      weakest: a.worst?.cutOff ?? "—",
      backup: a.backup.length,
    };
    addRow(row);
    const auto = summarise([...rows, row]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  const candidates: FailureItem[] = [
    ...topo.nodes.filter((nd) => nd.role !== "tap").map((nd) => ({ kind: "node" as const, id: nd.id })),
    ...topo.links.map((l) => ({ kind: "link" as const, id: l.id })),
  ];

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordHint="Adds the current network and its failures to the observation table."
      controls={
        <>
          <fieldset className="grid min-w-0 gap-2">
            <legend className="mb-1.5 text-[0.95rem] font-semibold">Topology</legend>
            {TOPOLOGIES.map((k) => (
              <label
                key={k}
                className={cn(
                  "flex cursor-pointer gap-2.5 rounded-lg border px-3 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
                  k === kind ? "border-brand bg-brand-soft" : "border-line hover:border-line-strong",
                )}
              >
                <input type="radio" name="l12-topology" className="sr-only" checked={k === kind} onChange={() => change(k, n)} />
                <span>
                  <span className="block font-semibold">{TOPOLOGY_INFO[k].label}</span>
                  <span className="block text-sm text-ink-2">{TOPOLOGY_INFO[k].text}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <Slider label="Number of nodes" value={n} min={MIN_NODES} max={MAX_NODES} step={1} onChange={(v) => change(kind, v)} hint="Including the gateway. Changing it repairs everything." />
          <label className="grid gap-1.5">
            <span className="text-[0.95rem] font-semibold">Fail or repair a part</span>
            <select
              className="h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3"
              value=""
              onChange={(e) => {
                const item = candidates.find((c) => key(c) === e.target.value);
                if (item) toggle(item);
              }}
            >
              <option value="">Choose a node or link…</option>
              {candidates.map((c) => {
                const isFailed = c.kind === "node" ? failed.nodes.has(c.id) : failed.links.has(c.id);
                return (
                  <option key={key(c)} value={key(c)}>
                    {isFailed ? "Repair " : "Fail "}
                    {describeItem(topo, c)}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={showWeakest} onChange={(e) => setShowWeakest(e.target.checked)} />
            <span>Highlight the weakest point</span>
          </label>
          <Button onClick={repairAll} icon={<RotateCcw size={16} aria-hidden />} disabled={failed.nodes.size + failed.links.size === 0}>
            Repair everything
          </Button>
        </>
      }
      stage={
        <div className="grid grid-cols-1 gap-2 p-3 sm:p-4">
          <NetworkMap topo={topo} a={a} failed={failed} weakest={showWeakest ? a.worst : null} onToggle={toggle} />
          <p className="min-h-6 text-sm text-ink-2" aria-live="polite">
            {status}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-3" aria-hidden>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-full border-2 border-ok bg-surface" /> Reaches the gateway (number inside = hops; N3 = node 3)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-full border-2 border-bad bg-bad-soft" /> Cut off
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-full border-2 border-dashed border-ink-3" /> Failed
            </span>
            {showWeakest && (
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-full border-2 border-warn bg-warn-soft" /> Weakest point
              </span>
            )}
          </div>
        </div>
      }
      readouts={
        <Readouts
          items={[
            { label: "Reach the gateway", value: `${a.reachable.length} / ${n - 1}`, tone: a.cutOff.length || a.gatewayFailed ? "bad" : "ok" },
            { label: "Cut off", value: a.cutOff.length, tone: a.cutOff.length ? "bad" : "default" },
            { label: "Average hops", value: fmtHops(a.avgHops) },
            { label: "Longest route", value: a.maxHops === null ? "—" : a.maxHops, unit: a.maxHops === null ? undefined : "hops" },
            { label: "Cables", value: topo.kind === "bus" ? "1 shared" : a.linkCount, hint: cableSummary(topo) },
            {
              label: "Weakest point cuts off",
              value: a.gatewayFailed ? "—" : (a.worst?.cutOff ?? 0),
              tone: a.worst && a.worst.cutOff > 0 ? "warn" : "ok",
              hint: a.worst ? describeItem(topo, a.worst) : undefined,
            },
            { label: "With a backup path", value: `${a.backup.length} / ${a.reachable.length}`, hint: "Devices that still reach the gateway after any one more failure" },
            { label: "Failed parts", value: failedList.length },
          ]}
        />
      }
      log={
        <p className="max-w-[70ch] text-sm text-ink-3">
          The gateway is left out of "weakest point": if the gateway itself fails, every topology loses everything. On a bus, all devices on
          the same unbroken piece of cable hear each other directly, so each is one hop from the gateway.
        </p>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* The map                                                             */
/* ------------------------------------------------------------------ */

function NetworkMap({
  topo,
  a,
  failed,
  weakest,
  onToggle,
}: {
  topo: Topology;
  a: Analysis;
  failed: Failed;
  weakest: Analysis["worst"];
  onToggle: (item: FailureItem) => void;
}) {
  const reachable = new Set(a.reachable);
  // Smaller circles when the network is crowded.
  const r = topo.n >= 14 ? NODE_R - 2 : NODE_R;
  const isWeak = (item: FailureItem) => weakest !== null && weakest.cutOff > 0 && weakest.kind === item.kind && weakest.id === item.id;

  const onKey = (e: KeyboardEvent, item: FailureItem) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle(item);
    }
  };

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="mx-auto block w-full max-w-[30rem]"
      role="group"
      aria-label={`${TOPOLOGY_INFO[topo.kind].label} network of ${topo.n} nodes. ${a.reachable.length} devices reach the gateway, ${a.cutOff.length} are cut off.`}
    >
      {topo.links.map((l) => {
        const A = topo.nodes[l.a];
        const B = topo.nodes[l.b];
        const broken = failed.links.has(l.id);
        const downByNode = failed.nodes.has(l.a) || failed.nodes.has(l.b);
        const weak = isWeak({ kind: "link", id: l.id });
        const item: FailureItem = { kind: "link", id: l.id };
        return (
          <g key={l.id} className="cursor-pointer" onClick={() => onToggle(item)}>
            <line
              x1={px(A.x)}
              y1={px(A.y)}
              x2={px(B.x)}
              y2={px(B.y)}
              stroke={broken ? "var(--bad)" : weak ? "var(--warn)" : "var(--line-strong)"}
              strokeWidth={l.kind === "segment" ? 6 : weak ? 4 : 2.5}
              strokeDasharray={broken ? "6 5" : undefined}
              opacity={downByNode && !broken ? 0.3 : 1}
              strokeLinecap="round"
            />
            {/* Wide invisible target so thin links are easy to click */}
            <line x1={px(A.x)} y1={px(A.y)} x2={px(B.x)} y2={px(B.y)} stroke="transparent" strokeWidth={16}>
              <title>{`${describeItem(topo, item)}: click to ${broken ? "repair" : "break"}`}</title>
            </line>
          </g>
        );
      })}

      {topo.nodes.map((nd) => {
        if (nd.role === "tap") return <circle key={nd.id} cx={px(nd.x)} cy={px(nd.y)} r={3} fill="var(--line-strong)" aria-hidden />;
        const item: FailureItem = { kind: "node", id: nd.id };
        const isFailed = failed.nodes.has(nd.id);
        const gateway = nd.role === "gateway";
        const ok = gateway ? !isFailed : reachable.has(nd.id);
        const weak = isWeak(item);
        const hops = a.hops[nd.id];
        const label = gateway ? "G" : isFailed ? "×" : ok ? String(hops) : "–";
        const desc = gateway
          ? `Gateway${isFailed ? ", failed" : ""}`
          : `Node ${nd.id}, ${isFailed ? "failed" : ok ? `${hops} hop${hops === 1 ? "" : "s"} from the gateway` : "cut off"}`;
        return (
          <g
            key={nd.id}
            role="button"
            tabIndex={0}
            aria-label={`${desc}. Press to ${isFailed ? "repair" : "fail"}.`}
            className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-[var(--focus)]"
            onClick={() => onToggle(item)}
            onKeyDown={(e) => onKey(e, item)}
          >
            <circle
              cx={px(nd.x)}
              cy={px(nd.y)}
              r={gateway ? r + 4 : r}
              fill={isFailed ? "var(--surface-2)" : gateway ? "var(--brand-soft)" : weak ? "var(--warn-soft)" : ok ? "var(--surface)" : "var(--bad-soft)"}
              stroke={isFailed ? "var(--ink-3)" : gateway ? "var(--brand)" : weak ? "var(--warn)" : ok ? "var(--ok)" : "var(--bad)"}
              strokeWidth={3}
              strokeDasharray={isFailed ? "4 3" : undefined}
            />
            <text
              x={px(nd.x)}
              y={px(nd.y)}
              textAnchor="middle"
              dominantBaseline="central"
              className={cn("pointer-events-none font-mono text-[13px] font-bold", isFailed ? "fill-ink-3" : ok ? "fill-ink" : "fill-bad")}
            >
              {label}
            </text>
            {/* Node number, matching the names in the "Fail or repair" list */}
            {!gateway && (
              <text
                x={px(nd.x)}
                y={px(nd.y) + r + 11}
                textAnchor="middle"
                className="pointer-events-none fill-ink-3 text-[10px] font-semibold"
              >
                N{nd.id}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
