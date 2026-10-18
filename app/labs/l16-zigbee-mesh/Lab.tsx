import { motion, useReducedMotion } from "motion/react";
import { Plus, RotateCcw, Wrench } from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { Button } from "~/components/ui/Button";
import { Slider } from "~/components/ui/Slider";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import { DEFAULT_NODES, DEFAULT_RANGE, FLOOR, buildMesh, compare, nodeLabel, routerImpacts, type Mesh, type Role, type ZNode } from "./engine";

const lab = getLab("l16-zigbee-mesh")!;

const steps = [
  "Look at the healthy mesh: every device reaches the coordinator C0 through the routers. Press Record observation.",
  "Click router R1 (or choose Fail R1 under Fail or repair a router). Traffic re-routes round it and nobody is orphaned. Record.",
  "Click R1 again to repair it, then fail R3. E7 has no other router in range, so it is orphaned. Record.",
  "Press Repair all routers, set Radio range to 15 m and fail R4. The longer range gives extra links, so E8 re-joins R3. Record.",
  "Set the range back to 12 m and fail R3 again. Drag R4 towards E7, or press Add router and drag the new router near E7, until E7 re-joins. Record, then open the lab record.",
];

/* Floor plan: metres → SVG units */
const S = 11;
const PAD = 14;
const FOOT = 14;
const W = FLOOR.width * S + 2 * PAD;
const H = FLOOR.height * S + 2 * PAD + FOOT;
const X = (m: number) => PAD + m * S;
const Y = (m: number) => PAD + m * S;
const MAX_NODES = 16;

/** Interior walls, for orientation only: the radio model uses distance alone. */
const WALLS: [number, number, number, number][] = [
  [9, 0, 9, 8],
  [9, 12, 9, 20],
  [19, 0, 19, 4],
  [19, 6.5, 19, 13.5],
  [19, 16, 19, 20],
  [9, 10, 11.5, 10],
  [14.5, 10, 19, 10],
  [19, 10, 24, 10],
  [26.5, 10, 34, 10],
];
const ROOMS = [
  { name: "Living room", x: 0.6, y: 1.5 },
  { name: "Kitchen", x: 9.6, y: 1.5 },
  { name: "Bedroom", x: 19.6, y: 1.5 },
  { name: "Dining", x: 9.6, y: 19.4 },
  { name: "Study", x: 19.6, y: 19.4 },
];

/** Free spots for new nodes, tried in order. */
const SPOTS = [
  { x: 17, y: 10 },
  { x: 17, y: 7.5 },
  { x: 17, y: 12.5 },
  { x: 21, y: 10 },
  { x: 15, y: 10 },
  { x: 27, y: 7 },
  { x: 27, y: 13 },
  { x: 8, y: 4 },
  { x: 8, y: 16 },
  { x: 31, y: 10 },
  { x: 2, y: 4 },
  { x: 2, y: 15 },
];

interface Net {
  nodes: ZNode[];
  range: number;
  failed: Set<number>;
}
const freshNet = (): Net => ({ nodes: DEFAULT_NODES.map((n) => ({ ...n })), range: DEFAULT_RANGE, failed: new Set() });

const isDefaultLayout = (nodes: ZNode[]) =>
  nodes.length === DEFAULT_NODES.length && nodes.every((n, i) => n.id === DEFAULT_NODES[i].id && n.x === DEFAULT_NODES[i].x && n.y === DEFAULT_NODES[i].y);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const snap = (v: number) => Math.round(v * 2) / 2;
const fmtHops = (v: number | null) => (v === null ? "—" : v.toFixed(2));
const hopsText = (v: string | number) => (v === "—" ? "no hops" : `${v} hop${Number(v) === 1 ? "" : "s"}`);
const joinAnd = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function labelOf(nodes: ZNode[], id: number) {
  const n = nodes.find((x) => x.id === id);
  return n ? nodeLabel(n) : `#${id}`;
}
const pathText = (nodes: ZNode[], path: number[] | undefined) => (path ? path.map((id) => labelOf(nodes, id)).join(" → ") : "");

/** Plain-English account of what one change did to the mesh. */
function explain(action: string, before: Mesh, after: Mesh, nodes: ZNode[], showLinks = false): { text: string; rejoined: number[] } {
  const L = (id: number) => labelOf(nodes, id);
  const list = (ids: number[]) => joinAnd(ids.map(L));
  const h = compare(before, after);
  const bits: string[] = [];

  // After a range change or a move, say which router links appeared or went.
  if (showLinks) {
    const linkKey = ([a, b]: [number, number]) => `${a}-${b}`;
    const linkText = (ls: [number, number][]) => joinAnd(ls.map(([a, b]) => `${L(a)}–${L(b)}`));
    const had = new Set(before.routerLinks.map(linkKey));
    const has = new Set(after.routerLinks.map(linkKey));
    const added = after.routerLinks.filter((l) => !had.has(linkKey(l)));
    const lost = before.routerLinks.filter((l) => !has.has(linkKey(l)));
    if (added.length) bits.push(`new router link${added.length === 1 ? "" : "s"}: ${linkText(added)}`);
    if (lost.length) bits.push(`router link${lost.length === 1 ? "" : "s"} lost: ${linkText(lost)}`);
  }

  const routerChange = h.hopChanges.find(([id]) => nodes.find((n) => n.id === id)?.role === "router");
  if (routerChange) {
    const [id, , hops] = routerChange;
    bits.push(`traffic from ${L(id)} now goes ${pathText(nodes, after.paths[id])} (${hopsText(hops)})`);
  }
  for (const e of h.rejoined.slice(0, 2)) {
    bits.push(`${L(e)} re-joined ${L(after.parent[e])}; its route is now ${hopsText(after.hops[e])} (${pathText(nodes, after.paths[e])})`);
  }
  if (h.rejoined.length > 2) bits.push(`${h.rejoined.length - 2} more device${h.rejoined.length === 3 ? "" : "s"} re-joined other routers`);
  const rescued = before.orphans.filter((e) => after.parent[e] !== undefined);
  for (const e of rescued) bits.push(`${L(e)} joined ${L(after.parent[e])} and is connected again`);
  if (h.orphaned.length) bits.push(`${list(h.orphaned)} ${h.orphaned.length === 1 ? "is" : "are"} orphaned: no connected router is in range`);
  const newlyCut = after.cutOffRouters.filter((r) => !before.cutOffRouters.includes(r));
  if (newlyCut.length) bits.push(`${list(newlyCut)} ${newlyCut.length === 1 ? "is" : "are"} cut off from the coordinator`);
  const back = before.cutOffRouters.filter((r) => !after.cutOffRouters.includes(r) && after.hops[r] !== undefined);
  if (back.length) bits.push(`${list(back)} ${back.length === 1 ? "reaches" : "reach"} the coordinator again`);

  const avgBefore = fmtHops(before.avgHops);
  const avgAfter = fmtHops(after.avgHops);
  let text = action;
  if (bits.length) text += ` ${bits.slice(0, 5).map(capitalise).join(". ")}.`;
  if (avgBefore !== avgAfter) {
    const note = h.orphaned.length && Number(avgAfter) < Number(avgBefore) ? " (orphans are not counted)" : "";
    text += ` Average hops ${avgBefore} → ${avgAfter}${note}.`;
  }
  else if (!bits.length) text += " No route changed.";
  return { text, rejoined: [...h.rejoined, ...rescued] };
}

function summarise(rows: ObservationRow[]): string {
  if (!rows.length) return "";
  const parts: string[] = [];
  const count = (r: ObservationRow, k: string) => Number(r[k] ?? 0);
  const names = (r: ObservationRow, k: string) => /\((.*)\)/.exec(String(r[k]))?.[1] ?? "";
  const healthy = rows.filter((r) => r.failed === "None");
  const base = healthy.find((r) => r.layout === "Default") ?? healthy[0];

  if (base) {
    const lost = count(base, "orphanCount");
    parts.push(
      `With every router working (range ${base.range} m), the mesh averaged ${base.avgHops} hops and its longest route was ${hopsText(base.longest)}; ${lost ? `${names(base, "orphans")} ${lost === 1 ? "was" : "were"} orphaned` : "no device was orphaned"}.`,
    );
  }

  const failedRows = rows.filter((r) => r.failed !== "None");
  let healed = 0;
  let broke = 0;
  for (const r of failedRows.slice(-4)) {
    const ref = [...healthy].reverse().find((h) => Number(h.range) === Number(r.range) && h.layout === r.layout);
    const where = `${r.range} m range${r.layout === "Changed" ? ", nodes moved" : ""}`;
    const lost = count(r, "orphanCount");
    const cut = count(r, "cutCount");
    if (!lost && !cut) {
      healed++;
      const change =
        ref && ref.avgHops !== r.avgHops && ref.avgHops !== "—" ? ` (${Number(r.avgHops) > Number(ref.avgHops) ? "up" : "down"} from ${ref.avgHops})` : "";
      parts.push(
        `With ${r.failed} failed (${where}), the mesh healed itself: no device was orphaned${r.rejoined !== "None" ? `, ${r.rejoined} re-joined another router` : ""}, and routes averaged ${r.avgHops} hops${change} with the longest ${hopsText(r.longest)}.`,
      );
    } else {
      broke++;
      const what = [
        lost ? `${names(r, "orphans")} ${lost === 1 ? "was" : "were"} orphaned` : "",
        cut ? `${names(r, "cutOff")} ${cut === 1 ? "was" : "were"} cut off` : "",
      ].filter(Boolean);
      parts.push(`With ${r.failed} failed (${where}), ${joinAnd(what)}, because no connected router was in range.`);
    }
  }

  // Effect of range: the same failures and layout recorded at two ranges.
  const groups = new Map<string, ObservationRow[]>();
  for (const r of rows) {
    const k = `${r.failed}|${r.layout}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  for (const g of groups.values()) {
    const sorted = [...g].sort((a, b) => Number(a.range) - Number(b.range));
    const lo = sorted[0];
    const hi = sorted[sorted.length - 1];
    if (Number(lo.range) === Number(hi.range)) continue;
    const better = count(hi, "orphanCount") <= count(lo, "orphanCount") && (hi.avgHops === "—" || lo.avgHops === "—" || Number(hi.avgHops) <= Number(lo.avgHops));
    parts.push(
      `Raising the radio range from ${lo.range} m to ${hi.range} m${lo.failed === "None" ? "" : ` with ${lo.failed} failed`} changed the orphans from ${count(lo, "orphanCount")} to ${count(hi, "orphanCount")} and the average hops from ${lo.avgHops} to ${hi.avgHops}${better ? ": a longer range gives more links, so devices have more backup routes" : ""}.`,
    );
    break;
  }

  if (healed && broke) {
    parts.push("So a mesh re-routes round a failed router by itself whenever another router is in range, usually over more hops; a device is orphaned only when no connected router is within range.");
  } else if (healed) {
    parts.push("So the mesh re-routed round failed routers by itself: no one had to reconfigure it.");
  }
  return parts.join(" ");
}

export default function ZigbeeMeshLab() {
  const [net, setNet] = useState<Net>(freshNet);
  const [status, setStatus] = useState("Every router is working. Click a router to fail it, or drag any node to move it.");
  const [rejoined, setRejoined] = useState<number[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const dragBefore = useRef<Mesh | null>(null);
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");

  const mesh = useMemo(() => buildMesh(net.nodes, net.range, net.failed), [net]);
  const impacts = useMemo(() => routerImpacts(net.nodes, net.range, net.failed), [net]);
  const L = (id: number) => labelOf(net.nodes, id);
  const routers = net.nodes.filter((n) => n.role === "router");
  const defaultLayout = isDefaultLayout(net.nodes);

  const worst = impacts[0];
  const worstText = useMemo(() => {
    if (!worst) return "There are no working routers left, so only devices in range of the coordinator stay connected.";
    if (worst.lost <= 0) return "Weakest point: none. Losing any one working router would leave every device connected.";
    const m = buildMesh(net.nodes, net.range, new Set([...net.failed, worst.router]));
    const orph = m.orphans.filter((e) => !mesh.orphans.includes(e));
    const cut = m.cutOffRouters.filter((r) => !mesh.cutOffRouters.includes(r));
    const what = [orph.length ? `orphan ${joinAnd(orph.map(L))}` : "", cut.length ? `cut off ${joinAnd(cut.map(L))}` : ""].filter(Boolean);
    return `Weakest point: losing ${L(worst.router)} would ${joinAnd(what)}.`;
  }, [worst, net, mesh]);

  /** Applies a change and explains it, comparing with the mesh before it. */
  const commit = (next: Net, action: string, before: Mesh = mesh, showLinks = false) => {
    const after = buildMesh(next.nodes, next.range, next.failed);
    const out = explain(action, before, after, next.nodes, showLinks);
    setNet(next);
    setStatus(out.text);
    setRejoined(out.rejoined);
  };

  const toggleRouter = (id: number) => {
    const failed = new Set(net.failed);
    const was = failed.has(id);
    if (was) failed.delete(id);
    else failed.add(id);
    commit({ ...net, failed }, `${L(id)} ${was ? "repaired" : "failed"}.`);
  };

  const tap = (id: number) => {
    const n = net.nodes.find((x) => x.id === id);
    if (!n) return;
    if (n.role === "router") toggleRouter(id);
    else if (n.role === "coordinator") setStatus("The coordinator starts and runs the network, so it can't fail in this lab. Drag it to move it.");
    else setStatus(`${nodeLabel(n)} is an end device: it runs on a battery and never routes for others, so it can't fail in this lab. Drag it to move it.`);
  };

  const place = (nodes: ZNode[], id: number, x: number, y: number) => nodes.map((n) => (n.id === id ? { ...n, x, y } : n));

  const nudge = (id: number, dx: number, dy: number) => {
    const n = net.nodes.find((x) => x.id === id);
    if (!n) return;
    const x = clamp(n.x + dx, 0, FLOOR.width);
    const y = clamp(n.y + dy, 0, FLOOR.height);
    if (x === n.x && y === n.y) return;
    commit({ ...net, nodes: place(net.nodes, id, x, y) }, `${nodeLabel(n)} moved to ${x} m, ${y} m.`, mesh, true);
  };

  const dragStart = (id: number) => {
    dragBefore.current = mesh;
    setDragging(id);
  };
  const dragMove = (id: number, p: { x: number; y: number }) => setNet((prev) => ({ ...prev, nodes: place(prev.nodes, id, p.x, p.y) }));
  const dragEnd = (id: number, p: { x: number; y: number } | null) => {
    setDragging(null);
    const nodes = p ? place(net.nodes, id, p.x, p.y) : net.nodes;
    commit({ ...net, nodes }, `${L(id)} moved.`, dragBefore.current ?? mesh, true);
    dragBefore.current = null;
  };

  const setRange = (v: number) => commit({ ...net, range: v }, `Radio range set to ${v} m.`, mesh, true);

  const addNode = (role: Role) => {
    if (net.nodes.length >= MAX_NODES) return;
    const id = Math.max(...net.nodes.map((n) => n.id)) + 1;
    const spot = SPOTS.find((s) => net.nodes.every((n) => Math.hypot(n.x - s.x, n.y - s.y) > 1.5)) ?? SPOTS[0];
    const node: ZNode = { id, role, x: spot.x, y: spot.y };
    commit({ ...net, nodes: [...net.nodes, node] }, `Added ${role === "router" ? "router" : "end device"} ${nodeLabel(node)}. Drag it into place.`);
  };

  const repairAll = () => commit({ ...net, failed: new Set() }, "Every router repaired.");

  const reset = () => {
    setNet(freshNet());
    setRejoined([]);
    setStatus(`Layout reset: the default house, ${DEFAULT_RANGE} m range, every router working.`);
  };

  const failedList = [...net.failed].sort((a, b) => a - b).map(L);
  const connected = Object.keys(mesh.hops).length; // hops leave out the coordinator itself
  const devices = net.nodes.filter((n) => n.role !== "coordinator" && !net.failed.has(n.id)).length;
  const longestId = mesh.maxHops === null ? undefined : Number(Object.keys(mesh.hops).find((id) => mesh.hops[Number(id)] === mesh.maxHops));

  const record = () => {
    const row: ObservationRow = {
      failed: failedList.length ? failedList.join(", ") : "None",
      range: net.range,
      avgHops: fmtHops(mesh.avgHops),
      longest: mesh.maxHops ?? "—",
      orphans: mesh.orphans.length ? `${mesh.orphans.length} (${mesh.orphans.map(L).join(", ")})` : 0,
      cutOff: mesh.cutOffRouters.length ? `${mesh.cutOffRouters.length} (${mesh.cutOffRouters.map(L).join(", ")})` : 0,
      rejoined: rejoined.length ? rejoined.map(L).join(", ") : "None",
      layout: defaultLayout ? "Default" : "Changed",
      orphanCount: mesh.orphans.length,
      cutCount: mesh.cutOffRouters.length,
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
      recordHint="Adds the failed routers, the range and the state of the mesh to the observation table."
      controls={
        <>
          <Slider
            label="Radio range"
            value={net.range}
            min={8}
            max={20}
            step={1}
            unit="m"
            onChange={setRange}
            hint="Two routers link, and an end device can join a router, when they are this close."
          />
          <label className="grid min-w-0 gap-1.5">
            <span className="text-[0.95rem] font-semibold">Fail or repair a router</span>
            <select
              className="h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3"
              value=""
              onChange={(e) => {
                const id = Number(e.target.value);
                if (e.target.value !== "") toggleRouter(id);
              }}
            >
              <option value="">Choose a router…</option>
              {routers.map((r) => (
                <option key={r.id} value={r.id}>
                  {net.failed.has(r.id) ? "Repair " : "Fail "}
                  {nodeLabel(r)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => addNode("router")} disabled={net.nodes.length >= MAX_NODES} icon={<Plus size={16} aria-hidden />}>
              Add router
            </Button>
            <Button size="sm" onClick={() => addNode("end")} disabled={net.nodes.length >= MAX_NODES} icon={<Plus size={16} aria-hidden />}>
              Add end device
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={repairAll} disabled={net.failed.size === 0} icon={<Wrench size={16} aria-hidden />}>
              Repair all routers
            </Button>
            <Button variant="ghost" onClick={reset} icon={<RotateCcw size={16} aria-hidden />}>
              Reset layout
            </Button>
          </div>
          <p className="text-sm text-ink-3">
            Click a router to fail or repair it. Drag any node to move it, or focus it with Tab and use the arrow keys (1 m a press, 0.5 m with
            Shift).
          </p>
        </>
      }
      stage={
        <div className="grid grid-cols-1 gap-2 p-3 sm:p-4">
          <MeshMap
            net={net}
            mesh={mesh}
            dragging={dragging}
            onTap={tap}
            onNudge={nudge}
            onDragStart={dragStart}
            onDragMove={dragMove}
            onDragEnd={dragEnd}
          />
          <Legend />
          <p className="min-h-6 text-sm text-ink" aria-live="polite">
            {status}
          </p>
          <p className="text-sm text-ink-2">{worstText}</p>
        </div>
      }
      readouts={
        <Readouts
          items={[
            { label: "Reach the coordinator", value: `${connected} / ${devices}`, tone: connected < devices ? "bad" : "ok" },
            { label: "Average hops", value: fmtHops(mesh.avgHops) },
            {
              label: "Longest route",
              value: mesh.maxHops ?? "—",
              unit: mesh.maxHops === null ? undefined : "hops",
              hint: longestId !== undefined ? pathText(net.nodes, mesh.paths[longestId]) : undefined,
            },
            {
              label: "Orphans",
              value: mesh.orphans.length ? mesh.orphans.map(L).join(", ") : 0,
              tone: mesh.orphans.length ? "bad" : "default",
              hint: "End devices with no connected router or coordinator in range",
            },
            {
              label: "Cut-off routers",
              value: mesh.cutOffRouters.length ? mesh.cutOffRouters.map(L).join(", ") : 0,
              tone: mesh.cutOffRouters.length ? "bad" : "default",
              hint: "Working routers with no path to the coordinator",
            },
            {
              label: "Worst router to lose",
              value: worst && worst.lost > 0 ? L(worst.router) : "None",
              unit: worst && worst.lost > 0 ? `${worst.lost} lost` : undefined,
              tone: worst && worst.lost > 0 ? "warn" : "ok",
              hint: worstText,
            },
            {
              label: "Re-joined (last change)",
              value: rejoined.length ? rejoined.map(L).join(", ") : 0,
              hint: "End devices that found a new parent after the last change",
            },
            { label: "Failed routers", value: failedList.length ? failedList.join(", ") : 0, tone: failedList.length ? "warn" : "default" },
          ]}
        />
      }
      log={
        <p className="max-w-[70ch] text-sm text-ink-3">
          How the model works: the coordinator and routers link when they are within radio range. Each end device joins the nearest
          router (or the coordinator) in range that can itself reach the coordinator. End devices never route for others. Walls are drawn
          only to help you find your way; here only distance matters, while real walls also weaken the signal.
        </p>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Floor plan                                                          */
/* ------------------------------------------------------------------ */

const SIZE: Record<Role, number> = { coordinator: 12, router: 11.5, end: 12 };

function NodeShape({ role, x, y, r, fill, stroke, dashed }: { role: Role; x: number; y: number; r: number; fill: string; stroke: string; dashed?: boolean }) {
  const common = { fill, stroke, strokeWidth: 2.5, strokeDasharray: dashed ? "4 3" : undefined };
  if (role === "coordinator") return <rect x={x - r} y={y - r} width={2 * r} height={2 * r} rx={3} {...common} />;
  if (role === "router") return <circle cx={x} cy={y} r={r} {...common} />;
  return <polygon points={`${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`} strokeLinejoin="round" {...common} />;
}

function MeshMap({
  net,
  mesh,
  dragging,
  onTap,
  onNudge,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  net: Net;
  mesh: Mesh;
  dragging: number | null;
  onTap: (id: number) => void;
  onNudge: (id: number, dx: number, dy: number) => void;
  onDragStart: (id: number) => void;
  onDragMove: (id: number, p: { x: number; y: number }) => void;
  onDragEnd: (id: number, p: { x: number; y: number } | null) => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: number; x0: number; y0: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [focused, setFocused] = useState<number | null>(null);
  const byId = new Map(net.nodes.map((n) => [n.id, n]));
  // Hop counts leave out the coordinator itself (id 0), which is always connected.
  const connected = (id: number) => id === 0 || mesh.hops[id] !== undefined;
  const orphans = new Set(mesh.orphans);
  const cutOff = new Set(mesh.cutOffRouters);

  const toFloor = (clientX: number, clientY: number) => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: snap(clamp((p.x - PAD) / S, 0, FLOOR.width)), y: snap(clamp((p.y - PAD) / S, 0, FLOOR.height)) };
  };

  const down = (e: PointerEvent<SVGGElement>, id: number) => {
    if (e.button !== 0) return;
    suppressClick.current = false;
    drag.current = { id, x0: e.clientX, y0: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<SVGGElement>) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 5) return;
      d.moved = true;
      onDragStart(d.id);
    }
    const p = toFloor(e.clientX, e.clientY);
    if (p) onDragMove(d.id, p);
  };
  const up = (e: PointerEvent<SVGGElement>, cancelled: boolean) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (d.moved) {
      suppressClick.current = true;
      onDragEnd(d.id, cancelled ? null : toFloor(e.clientX, e.clientY));
    }
  };
  const click = (id: number) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onTap(id);
  };
  const key = (e: KeyboardEvent, id: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onTap(id);
      return;
    }
    const step = e.shiftKey ? 0.5 : 1;
    const dir: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (dir[e.key]) {
      e.preventDefault();
      onNudge(id, ...dir[e.key]);
    }
  };

  const ringNode = byId.get(dragging ?? focused ?? -1);
  const packets = reduced || dragging !== null ? [] : net.nodes.filter((n) => n.role === "end" && (mesh.paths[n.id]?.length ?? 0) > 1).slice(0, 6);

  const describe = (n: ZNode) => {
    const at = `at ${n.x} m, ${n.y} m`;
    const moveHint = "Drag it, or use the arrow keys, to move it.";
    if (n.role === "coordinator") return `Coordinator ${nodeLabel(n)} ${at}. It can't fail in this lab. ${moveHint}`;
    if (n.role === "router") {
      const state = net.failed.has(n.id)
        ? "failed"
        : cutOff.has(n.id)
          ? "cut off from the coordinator"
          : `${hopsText(mesh.hops[n.id])} from the coordinator`;
      return `Router ${nodeLabel(n)} ${at}, ${state}. Press Enter to ${net.failed.has(n.id) ? "repair" : "fail"} it. ${moveHint}`;
    }
    const state = orphans.has(n.id)
      ? "orphaned: no router in range"
      : `joined ${labelOf(net.nodes, mesh.parent[n.id])}, ${hopsText(mesh.hops[n.id])} from the coordinator`;
    return `End device ${nodeLabel(n)} ${at}, ${state}. ${moveHint}`;
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto block w-full max-w-[46rem] select-none"
      role="group"
      aria-label={`House floor plan, ${FLOOR.width} by ${FLOOR.height} metres, with a Zigbee mesh. ${Object.keys(mesh.hops).length} devices reach the coordinator, ${mesh.orphans.length} orphaned, ${mesh.cutOffRouters.length} routers cut off.`}
    >
      {/* Floor and walls */}
      <rect x={X(0)} y={Y(0)} width={FLOOR.width * S} height={FLOOR.height * S} fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth={3} rx={2} />
      {WALLS.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={X(x1)} y1={Y(y1)} x2={X(x2)} y2={Y(y2)} stroke="var(--line-strong)" strokeWidth={2} strokeLinecap="round" />
      ))}
      {ROOMS.map((r) => (
        <text key={r.name} x={X(r.x)} y={Y(r.y)} className="pointer-events-none fill-ink-3 text-[8px]">
          {r.name}
        </text>
      ))}
      {/* Scale */}
      <g aria-hidden>
        <line x1={X(0)} x2={X(5)} y1={Y(FLOOR.height) + 9} y2={Y(FLOOR.height) + 9} stroke="var(--ink-3)" strokeWidth={1.5} />
        <line x1={X(0)} x2={X(0)} y1={Y(FLOOR.height) + 6} y2={Y(FLOOR.height) + 12} stroke="var(--ink-3)" strokeWidth={1.5} />
        <line x1={X(5)} x2={X(5)} y1={Y(FLOOR.height) + 6} y2={Y(FLOOR.height) + 12} stroke="var(--ink-3)" strokeWidth={1.5} />
        <text x={X(5) + 4} y={Y(FLOOR.height) + 12} className="fill-ink-3 text-[8px]">
          {`5 m · floor ${FLOOR.width} m × ${FLOOR.height} m · radio range ${net.range} m`}
        </text>
      </g>

      {/* Radio range of the node being moved or focused */}
      {ringNode && (
        <circle
          cx={X(ringNode.x)}
          cy={Y(ringNode.y)}
          r={net.range * S}
          fill="var(--u2-soft)"
          fillOpacity={0.35}
          stroke="var(--u2)"
          strokeOpacity={0.6}
          strokeWidth={1.5}
          strokeDasharray="5 4"
          className="pointer-events-none"
          aria-hidden
        />
      )}

      {/* Router links */}
      {mesh.routerLinks.map(([a, b]) => {
        const A = byId.get(a)!;
        const B = byId.get(b)!;
        const live = connected(a) && connected(b);
        return (
          <line
            key={`${a}-${b}`}
            x1={X(A.x)}
            y1={Y(A.y)}
            x2={X(B.x)}
            y2={Y(B.y)}
            stroke={live ? "var(--u2)" : "var(--bad)"}
            strokeOpacity={live ? 0.65 : 0.8}
            strokeWidth={2.5}
            strokeDasharray={live ? undefined : "6 4"}
            strokeLinecap="round"
            aria-hidden
          />
        );
      })}
      {/* End device → parent */}
      {Object.entries(mesh.parent).map(([e, p]) => {
        const A = byId.get(Number(e))!;
        const B = byId.get(p)!;
        return (
          <line
            key={`p-${e}`}
            x1={X(A.x)}
            y1={Y(A.y)}
            x2={X(B.x)}
            y2={Y(B.y)}
            stroke="var(--ink-3)"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            aria-hidden
          />
        );
      })}

      {/* Packets travelling to the coordinator */}
      {packets.map((n, i) => {
        const pts = mesh.paths[n.id].map((id) => byId.get(id)!);
        const xs = pts.map((p) => X(p.x));
        const ys = pts.map((p) => Y(p.y));
        const seg = pts.slice(1).map((p, k) => Math.hypot(p.x - pts[k].x, p.y - pts[k].y));
        const total = seg.reduce((a, b) => a + b, 0) || 1;
        let run = 0;
        const times = [0, ...seg.map((s) => (run += s) / total)];
        const loop = { duration: 0.75 * (pts.length - 1), ease: "linear" as const, repeat: Infinity, repeatDelay: 0.9, delay: i * 0.5 };
        return (
          <motion.circle
            key={`${n.id}:${pts.map((p) => `${p.id}@${p.x},${p.y}`).join(">")}`}
            r={3.5}
            fill="var(--brand)"
            stroke="var(--surface)"
            strokeWidth={1}
            initial={{ cx: xs[0], cy: ys[0], opacity: 0 }}
            animate={{ cx: xs, cy: ys, opacity: [0, 1, 1, 0] }}
            transition={{
              cx: { ...loop, times },
              cy: { ...loop, times },
              opacity: { ...loop, times: [0, 0.08, 0.92, 1] },
            }}
            className="pointer-events-none"
            aria-hidden
          />
        );
      })}

      {/* Nodes */}
      {net.nodes.map((n) => {
        const r = SIZE[n.role];
        const x = X(n.x);
        const y = Y(n.y);
        const failed = net.failed.has(n.id);
        const lost = orphans.has(n.id) || cutOff.has(n.id);
        const roleStroke = n.role === "coordinator" ? "var(--brand)" : n.role === "router" ? "var(--u2)" : "var(--ok)";
        const roleFill = n.role === "coordinator" ? "var(--brand-soft)" : n.role === "router" ? "var(--u2-soft)" : "var(--surface)";
        const inner = n.role === "coordinator" ? "C" : failed ? "×" : lost ? "!" : String(mesh.hops[n.id] ?? "");
        return (
          <g
            key={n.id}
            role="button"
            tabIndex={0}
            aria-label={describe(n)}
            className={cn("group outline-none", dragging === n.id ? "cursor-grabbing" : "cursor-grab")}
            style={{ touchAction: "none" }}
            onPointerDown={(e) => down(e, n.id)}
            onPointerMove={move}
            onPointerUp={(e) => up(e, false)}
            onPointerCancel={(e) => up(e, true)}
            onClick={() => click(n.id)}
            onKeyDown={(e) => key(e, n.id)}
            onFocus={() => setFocused(n.id)}
            onBlur={() => setFocused((f) => (f === n.id ? null : f))}
          >
            {/* Large invisible target for fingers */}
            <circle cx={x} cy={y} r={19} fill="transparent" />
            <circle cx={x} cy={y} r={r + 5} fill="none" stroke="var(--focus)" strokeWidth={2.5} className="opacity-0 group-focus-visible:opacity-100" />
            {lost && <circle cx={x} cy={y} r={r + 4} fill="none" stroke="var(--bad)" strokeWidth={1.5} strokeDasharray="2 2" />}
            <NodeShape
              role={n.role}
              x={x}
              y={y}
              r={r}
              fill={failed ? "var(--surface-2)" : lost ? "var(--bad-soft)" : roleFill}
              stroke={failed ? "var(--ink-3)" : lost ? "var(--bad)" : roleStroke}
              dashed={failed}
            />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className={cn("pointer-events-none font-mono text-[12px] font-bold", failed ? "fill-ink-3" : lost ? "fill-bad" : "fill-ink")}
            >
              {inner}
            </text>
            <text
              x={x}
              y={y + r + 11}
              textAnchor="middle"
              className={cn("pointer-events-none text-[10.5px] font-semibold", lost ? "fill-bad" : "fill-ink-2")}
              paintOrder="stroke"
              stroke="var(--surface-2)"
              strokeWidth={3}
            >
              {nodeLabel(n)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Legend() {
  const item = "flex items-center gap-1.5";
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-3" aria-label="Legend">
      <li className={item}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <rect x="1.5" y="1.5" width="11" height="11" rx="2" fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth="2" />
        </svg>
        Coordinator
      </li>
      <li className={item}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <circle cx="7" cy="7" r="5.5" fill="var(--u2-soft)" stroke="var(--u2)" strokeWidth="2" />
        </svg>
        Router
      </li>
      <li className={item}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <polygon points="7,1 13,7 7,13 1,7" fill="var(--surface)" stroke="var(--ok)" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        End device
      </li>
      <li>Number inside = hops to the coordinator</li>
      <li className={item}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <circle cx="7" cy="7" r="5.5" fill="var(--bad-soft)" stroke="var(--bad)" strokeWidth="2" />
        </svg>
        ! = orphaned or cut off
      </li>
      <li className={item}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <circle cx="7" cy="7" r="5.5" fill="var(--surface-2)" stroke="var(--ink-3)" strokeWidth="2" strokeDasharray="3 2" />
        </svg>
        × = failed router
      </li>
      <li className={item}>
        <svg width="18" height="8" viewBox="0 0 18 8" aria-hidden>
          <line x1="1" y1="4" x2="17" y2="4" stroke="var(--u2)" strokeWidth="2.5" strokeOpacity="0.65" />
        </svg>
        Router link
      </li>
      <li className={item}>
        <svg width="18" height="8" viewBox="0 0 18 8" aria-hidden>
          <line x1="1" y1="4" x2="17" y2="4" stroke="var(--ink-3)" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
        Joined to parent
      </li>
      <li className={item}>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <circle cx="5" cy="5" r="3.5" fill="var(--brand)" />
        </svg>
        Packet to the coordinator
      </li>
    </ul>
  );
}
