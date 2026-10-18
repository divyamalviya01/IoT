/**
 * Lab L16: a Zigbee mesh on a floor plan, and how it heals when routers fail.
 *
 * - The coordinator (which is also the gateway here) and routers are
 *   mains-powered and route for others. Two of them link when they are
 *   within radio range.
 * - End devices run on batteries and never route. Each joins the nearest
 *   router or coordinator in range that is itself connected to the
 *   coordinator (ties go to the lower id). With none in range, it is
 *   orphaned.
 *
 * The whole mesh is rebuilt from scratch for every set of failures, which is
 * what self-healing looks like from outside: routes re-form and end devices
 * re-join another parent. Hop counts come from the shared BFS in
 * ~/lib/sim/graph. Positions are in metres.
 */

import { analyse, routeToGateway, type GraphLink, type GraphNode, type Topology } from "~/lib/sim/graph";

export type Role = "coordinator" | "router" | "end";

export interface ZNode {
  id: number;
  role: Role;
  x: number;
  y: number;
}

export const FLOOR = { width: 34, height: 20 };
export const DEFAULT_RANGE = 12;

export const DEFAULT_NODES: ZNode[] = [
  { id: 0, role: "coordinator", x: 5, y: 10 },
  { id: 1, role: "router", x: 13, y: 5 },
  { id: 2, role: "router", x: 13, y: 15 },
  { id: 3, role: "router", x: 23, y: 5 },
  { id: 4, role: "router", x: 23, y: 15 },
  { id: 5, role: "end", x: 17, y: 1 },
  { id: 6, role: "end", x: 12, y: 11 },
  { id: 7, role: "end", x: 31, y: 1 },
  { id: 8, role: "end", x: 28, y: 19 },
  { id: 9, role: "end", x: 5, y: 18 },
  { id: 10, role: "end", x: 23, y: 9 },
];

export const nodeLabel = (n: ZNode) => (n.role === "coordinator" ? `C${n.id}` : n.role === "router" ? `R${n.id}` : `E${n.id}`);

const dist = (a: ZNode, b: ZNode) => Math.hypot(a.x - b.x, a.y - b.y);
const inRange = (a: ZNode, b: ZNode, range: number) => dist(a, b) <= range + 1e-9;
const routes = (n: ZNode) => n.role !== "end";

export interface Mesh {
  /** Router-to-router (and coordinator) links that are up */
  routerLinks: [number, number][];
  /** End device → the parent it joined */
  parent: Record<number, number>;
  /** Hops to the coordinator for every connected node */
  hops: Record<number, number>;
  /** Path to the coordinator for every connected node */
  paths: Record<number, number[]>;
  orphans: number[];
  /** Working routers that cannot reach the coordinator */
  cutOffRouters: number[];
  /** Average hops over every connected router and end device */
  avgHops: number | null;
  maxHops: number | null;
}

export function buildMesh(nodes: ZNode[], range: number, failed: ReadonlySet<number> = new Set()): Mesh {
  const alive = nodes.filter((n) => !failed.has(n.id));
  const routers = alive.filter(routes);
  const routerLinks: [number, number][] = [];
  for (let i = 0; i < routers.length; i++) {
    for (let j = i + 1; j < routers.length; j++) {
      if (inRange(routers[i], routers[j], range)) routerLinks.push([routers[i].id, routers[j].id]);
    }
  }

  // Which routers reach the coordinator, using the shared BFS.
  const graphNodes: GraphNode[] = nodes.map((n) => ({ id: n.id, x: n.x, y: n.y, role: n.role === "coordinator" ? "gateway" : "device" }));
  const asTopology = (links: [number, number][]): Topology => ({
    kind: "mesh",
    nodes: graphNodes,
    links: links.map(([a, b], i): GraphLink => ({ id: i, a, b, kind: "link" })),
    n: nodes.length,
  });
  const failedSet = { nodes: failed, links: new Set<number>() };
  const routerHops = analyse(asTopology(routerLinks), failedSet).hops;
  const connected = (n: ZNode) => n.role === "coordinator" || routerHops[n.id] !== undefined;

  // Each end device joins the nearest connected parent in range.
  const parent: Record<number, number> = {};
  const orphans: number[] = [];
  for (const e of alive.filter((n) => n.role === "end")) {
    const choice = routers
      .filter((r) => connected(r) && inRange(e, r, range))
      .sort((a, b) => dist(e, a) - dist(e, b) || a.id - b.id)[0];
    if (choice) parent[e.id] = choice.id;
    else orphans.push(e.id);
  }

  const allLinks: [number, number][] = [...routerLinks, ...Object.entries(parent).map(([e, p]) => [Number(e), p] as [number, number])];
  const topo = asTopology(allLinks);
  const hops = analyse(topo, failedSet).hops;
  const paths: Record<number, number[]> = {};
  for (const id of Object.keys(hops).map(Number)) {
    const path = routeToGateway(topo, id, failedSet);
    if (path) paths[id] = path;
  }
  const values = Object.values(hops);
  return {
    routerLinks,
    parent,
    hops,
    paths,
    orphans,
    cutOffRouters: routers.filter((r) => r.role === "router" && !connected(r)).map((r) => r.id),
    avgHops: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    maxHops: values.length ? Math.max(...values) : null,
  };
}

export interface FailureImpact {
  router: number;
  /** End devices orphaned plus routers cut off (not counting the failed router) */
  lost: number;
  avgHops: number | null;
}

/** What losing each working router would do, worst first. Rebuilds the mesh for each one. */
export function routerImpacts(nodes: ZNode[], range: number, failed: ReadonlySet<number> = new Set()): FailureImpact[] {
  const before = buildMesh(nodes, range, failed);
  const already = before.orphans.length + before.cutOffRouters.length;
  return nodes
    .filter((n) => n.role === "router" && !failed.has(n.id))
    .map((r) => {
      const after = buildMesh(nodes, range, new Set([...failed, r.id]));
      return {
        router: r.id,
        lost: after.orphans.length + after.cutOffRouters.length - already,
        avgHops: after.avgHops,
      };
    })
    .sort((a, b) => b.lost - a.lost || (b.avgHops ?? 0) - (a.avgHops ?? 0) || a.router - b.router);
}

export interface Healing {
  /** End devices that moved to a different parent */
  rejoined: number[];
  /** End devices that lost their parent and found none */
  orphaned: number[];
  /** Nodes whose hop count changed: [id, before, after] */
  hopChanges: [number, number, number][];
}

/** How the mesh changed between two states. */
export function compare(before: Mesh, after: Mesh): Healing {
  const rejoined = Object.keys(after.parent)
    .map(Number)
    .filter((e) => before.parent[e] !== undefined && before.parent[e] !== after.parent[e]);
  const orphaned = after.orphans.filter((e) => !before.orphans.includes(e));
  const hopChanges: [number, number, number][] = Object.keys(after.hops)
    .map(Number)
    .filter((id) => before.hops[id] !== undefined && before.hops[id] !== after.hops[id])
    .map((id) => [id, before.hops[id], after.hops[id]]);
  return { rejoined, orphaned, hopChanges };
}
