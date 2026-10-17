/**
 * Network topologies and what happens to them when parts fail.
 *
 * Node 0 is always the gateway (the sink every device reports to). Positions
 * are normalised to [-1, 1] on both axes (y grows downwards), so a 2D lab can
 * map them to SVG and a 3D scene can map (x, y) to (x, z).
 *
 * A bus is a shared cable: its backbone is made of segments between tap
 * points, and every device hangs off its tap on a short drop cable. Devices
 * on the same unbroken piece of backbone hear each other directly, so they
 * are one hop apart however long the cable is.
 */

export type TopologyKind = "star" | "tree" | "bus" | "ring" | "mesh";
export const TOPOLOGIES: TopologyKind[] = ["star", "tree", "bus", "ring", "mesh"];

export type NodeRole = "gateway" | "device" | "tap";

export interface GraphNode {
  id: number;
  x: number;
  y: number;
  role: NodeRole;
}

export type LinkKind = "link" | "segment" | "drop";

export interface GraphLink {
  id: number;
  a: number;
  b: number;
  kind: LinkKind;
}

export interface Topology {
  kind: TopologyKind;
  /** Gateway and devices first (ids 0..n-1), then any bus taps */
  nodes: GraphNode[];
  links: GraphLink[];
  /** Number of gateway + device nodes */
  n: number;
}

export interface Failures {
  nodes: ReadonlySet<number>;
  links: ReadonlySet<number>;
}

export const NO_FAILURES: Failures = { nodes: new Set(), links: new Set() };

export const MIN_NODES = 4;
export const MAX_NODES = 16;

const round = (v: number) => Math.round(v * 1000) / 1000;

/* ------------------------------------------------------------------ */
/* Building                                                            */
/* ------------------------------------------------------------------ */

function circle(n: number, i: number, r: number) {
  const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
  return { x: round(r * Math.cos(a)), y: round(r * Math.sin(a)) };
}

export function buildTopology(kind: TopologyKind, n: number): Topology {
  if (!Number.isInteger(n) || n < MIN_NODES || n > MAX_NODES) {
    throw new RangeError(`Node count must be ${MIN_NODES}–${MAX_NODES}`);
  }
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const link = (a: number, b: number, k: LinkKind = "link") => links.push({ id: links.length, a, b, kind: k });
  const role = (i: number): NodeRole => (i === 0 ? "gateway" : "device");

  switch (kind) {
    case "star": {
      nodes.push({ id: 0, x: 0, y: 0, role: "gateway" });
      for (let i = 1; i < n; i++) nodes.push({ id: i, ...circle(n - 1, i - 1, 0.8), role: "device" });
      for (let i = 1; i < n; i++) link(0, i);
      break;
    }
    case "ring": {
      for (let i = 0; i < n; i++) nodes.push({ id: i, ...circle(n, i, 0.8), role: role(i) });
      for (let i = 0; i < n; i++) link(i, (i + 1) % n);
      break;
    }
    case "tree": {
      // Binary tree in heap order: the parent of node i is (i - 1) >> 1.
      const depth = (i: number) => Math.floor(Math.log2(i + 1));
      const maxDepth = depth(n - 1);
      for (let i = 0; i < n; i++) {
        const d = depth(i);
        const slots = 2 ** d;
        const slot = i - (slots - 1);
        const x = -0.9 + ((slot + 0.5) * 1.8) / slots;
        const y = maxDepth === 0 ? 0 : -0.8 + (1.6 * d) / maxDepth;
        nodes.push({ id: i, x: round(x), y: round(y), role: role(i) });
      }
      for (let i = 1; i < n; i++) link((i - 1) >> 1, i);
      break;
    }
    case "bus": {
      // Gateway at the left end; devices alternate above and below the cable.
      for (let i = 0; i < n; i++) {
        const x = -0.9 + (1.8 * i) / (n - 1);
        nodes.push({ id: i, x: round(x), y: i % 2 === 0 ? -0.5 : 0.5, role: role(i) });
      }
      for (let i = 0; i < n; i++) nodes.push({ id: n + i, x: nodes[i].x, y: 0, role: "tap" });
      for (let i = 0; i < n - 1; i++) link(n + i, n + i + 1, "segment");
      for (let i = 0; i < n; i++) link(i, n + i, "drop");
      break;
    }
    case "mesh": {
      // Golden-angle spiral: even spacing, gateway near the centre.
      for (let i = 0; i < n; i++) {
        const r = 0.88 * Math.sqrt((i + 0.5) / n);
        const a = 2.39996 * i;
        nodes.push({ id: i, x: round(r * Math.cos(a)), y: round(r * Math.sin(a)), role: role(i) });
      }
      const dist = (a: number, b: number) => Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y);
      const has = (a: number, b: number) => links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
      // Each node joins its 3 nearest neighbours (ties broken by id).
      for (let i = 0; i < n; i++) {
        const nearest = nodes
          .filter((o) => o.id !== i)
          .map((o) => o.id)
          .sort((p, q) => dist(i, p) - dist(i, q) || p - q)
          .slice(0, 3);
        for (const j of nearest) if (!has(i, j)) link(Math.min(i, j), Math.max(i, j));
      }
      // Then remove every single point of failure: while some single failure
      // (other than the gateway) cuts a node off, add the shortest link across.
      for (let guard = 0; guard < 200; guard++) {
        const topo: Topology = { kind, nodes, links, n };
        const cut = firstCriticalFailure(topo);
        if (!cut) break;
        let best: [number, number] | null = null;
        for (const a of cut.cutOff) {
          for (const b of cut.reachable) {
            if (has(a, b)) continue;
            if (!best || dist(a, b) < dist(best[0], best[1])) best = [a, b];
          }
        }
        if (!best) break;
        link(Math.min(...best), Math.max(...best));
      }
      break;
    }
  }
  return { kind, nodes, links, n };
}

/* ------------------------------------------------------------------ */
/* Analysis                                                            */
/* ------------------------------------------------------------------ */

/** Who can talk to whom in one hop, given the failures. Bus taps are folded away. */
function hopGraph(topo: Topology, failed: Failures): Map<number, Set<number>> {
  const adj = new Map<number, Set<number>>();
  for (let i = 0; i < topo.n; i++) if (!failed.nodes.has(i)) adj.set(i, new Set());
  const up = (l: GraphLink) => !failed.links.has(l.id) && !failed.nodes.has(l.a) && !failed.nodes.has(l.b);

  // Union-find over bus taps joined by intact segments.
  const parent = new Map<number, number>();
  const find = (x: number): number => {
    let p = parent.get(x) ?? x;
    while (p !== (parent.get(p) ?? p)) p = parent.get(p) ?? p;
    parent.set(x, p);
    return p;
  };
  for (const l of topo.links) {
    if (l.kind === "segment" && up(l)) parent.set(find(l.a), find(l.b));
  }
  const pieces = new Map<number, number[]>();
  for (const l of topo.links) {
    if (!up(l)) continue;
    if (l.kind === "link") {
      adj.get(l.a)?.add(l.b);
      adj.get(l.b)?.add(l.a);
    } else if (l.kind === "drop") {
      const piece = find(l.b);
      pieces.set(piece, [...(pieces.get(piece) ?? []), l.a]);
    }
  }
  // Everyone on the same piece of cable hears everyone else directly.
  for (const members of pieces.values()) {
    for (const a of members) for (const b of members) if (a !== b) adj.get(a)?.add(b);
  }
  return adj;
}

/** Hop count from the gateway to every node it can reach (gateway itself is 0). */
function bfs(topo: Topology, failed: Failures): Map<number, number> {
  const hops = new Map<number, number>();
  if (failed.nodes.has(0)) return hops;
  const adj = hopGraph(topo, failed);
  hops.set(0, 0);
  const queue = [0];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const next of adj.get(cur) ?? []) {
      if (!hops.has(next)) {
        hops.set(next, hops.get(cur)! + 1);
        queue.push(next);
      }
    }
  }
  return hops;
}

const devicesOf = (topo: Topology) => topo.nodes.filter((nd) => nd.role === "device").map((nd) => nd.id);

function withExtra(failed: Failures, item: FailureItem): Failures {
  return item.kind === "node"
    ? { nodes: new Set([...failed.nodes, item.id]), links: failed.links }
    : { nodes: failed.nodes, links: new Set([...failed.links, item.id]) };
}

export interface FailureItem {
  kind: "node" | "link";
  id: number;
}

/** Every single item that could fail next: devices (not the gateway, not taps) and links. */
export function failureCandidates(topo: Topology, failed: Failures = NO_FAILURES): FailureItem[] {
  return [
    ...devicesOf(topo)
      .filter((id) => !failed.nodes.has(id))
      .map((id) => ({ kind: "node" as const, id })),
    ...topo.links.filter((l) => !failed.links.has(l.id)).map((l) => ({ kind: "link" as const, id: l.id })),
  ];
}

/** The first single failure that cuts off a device that was reachable, if any. */
function firstCriticalFailure(topo: Topology): { reachable: number[]; cutOff: number[] } | null {
  const before = bfs(topo, NO_FAILURES);
  for (const item of failureCandidates(topo)) {
    const after = bfs(topo, withExtra(NO_FAILURES, item));
    const cutOff = devicesOf(topo).filter((d) => before.has(d) && !after.has(d) && !(item.kind === "node" && item.id === d));
    if (cutOff.length) return { reachable: [...after.keys()], cutOff };
  }
  return null;
}

export interface Analysis {
  /** Working devices that can reach the gateway */
  reachable: number[];
  /** Working devices that cannot reach the gateway */
  cutOff: number[];
  /** Failed devices (and the gateway, if it failed) */
  failedNodes: number[];
  gatewayFailed: boolean;
  /** Hops to the gateway for each reachable device */
  hops: Record<number, number>;
  avgHops: number | null;
  maxHops: number | null;
  /** All cables, including bus segments and drops */
  linkCount: number;
  /**
   * The next single failure (not the gateway) that would cut off the most
   * working devices, counted against the current failures.
   */
  worst: (FailureItem & { cutOff: number }) | null;
  /** Reachable devices that survive any one more failure (two separate paths) */
  backup: number[];
}

export function analyse(topo: Topology, failed: Failures = NO_FAILURES): Analysis {
  const hopsMap = bfs(topo, failed);
  const devices = devicesOf(topo);
  const reachable = devices.filter((d) => hopsMap.has(d));
  const failedNodes = [...failed.nodes].filter((id) => id < topo.n).sort((a, b) => a - b);
  const cutOff = devices.filter((d) => !hopsMap.has(d) && !failed.nodes.has(d));
  const hops: Record<number, number> = {};
  for (const d of reachable) hops[d] = hopsMap.get(d)!;
  const values = reachable.map((d) => hops[d]);

  let worst: Analysis["worst"] = null;
  const survivors = new Map(reachable.map((d) => [d, true]));
  if (!failed.nodes.has(0)) {
    for (const item of failureCandidates(topo, failed)) {
      const after = bfs(topo, withExtra(failed, item));
      let lost = 0;
      for (const d of reachable) {
        const isTheFailedNode = item.kind === "node" && item.id === d;
        if (!after.has(d) && !isTheFailedNode) lost++;
        if (!after.has(d) && !isTheFailedNode) survivors.set(d, false);
      }
      if (!worst || lost > worst.cutOff) worst = { ...item, cutOff: lost };
    }
  }

  return {
    reachable,
    cutOff,
    failedNodes,
    gatewayFailed: failed.nodes.has(0),
    hops,
    avgHops: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    maxHops: values.length ? Math.max(...values) : null,
    linkCount: topo.links.length,
    worst,
    backup: reachable.filter((d) => survivors.get(d)),
  };
}

/** Shortest route from a device to the gateway (node ids, device first), or null. */
export function routeToGateway(topo: Topology, from: number, failed: Failures = NO_FAILURES): number[] | null {
  if (failed.nodes.has(0) || failed.nodes.has(from)) return null;
  const adj = hopGraph(topo, failed);
  const prev = new Map<number, number>([[0, -1]]);
  const queue = [0];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const next of adj.get(cur) ?? []) {
      if (!prev.has(next)) {
        prev.set(next, cur);
        queue.push(next);
      }
    }
  }
  if (!prev.has(from)) return null;
  const path = [from];
  while (path[path.length - 1] !== 0) path.push(prev.get(path[path.length - 1])!);
  return path;
}

/**
 * The cable a route actually follows, for drawing packets. On a bus, a hop
 * between two devices runs down one drop, along the backbone taps and up the
 * other drop; elsewhere it is the route itself.
 */
export function cablePath(topo: Topology, route: number[]): number[] {
  if (topo.kind !== "bus") return route;
  const out: number[] = [route[0]];
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    const step = b > a ? 1 : -1;
    for (let t = a; t !== b + step; t += step) out.push(topo.n + t);
    out.push(b);
  }
  return out;
}
