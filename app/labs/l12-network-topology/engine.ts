/**
 * Lab L12: the topology maths lives in ~/lib/sim/graph (shared with the 2.1
 * 3D scene and lab L16). This file adds the words students see.
 */

import type { FailureItem, Topology, TopologyKind } from "~/lib/sim/graph";

export * from "~/lib/sim/graph";

export const TOPOLOGY_INFO: Record<TopologyKind, { label: string; text: string }> = {
  star: {
    label: "Star",
    text: "Every device has its own link to the gateway in the middle. Simple and short, but the hub is a single point of failure.",
  },
  tree: {
    label: "Tree",
    text: "Devices hang off parents in branches. Easy to grow, but losing a branch cuts off everything below it.",
  },
  bus: {
    label: "Bus",
    text: "All devices share one cable. Cheap to wire, but one break splits the network in two.",
  },
  ring: {
    label: "Ring",
    text: "Each device links to the next in a loop. One break is survived by going the other way round; a second break splits it.",
  },
  mesh: {
    label: "Mesh",
    text: "Devices link to several neighbours, so there are other routes when one fails. Strong, but needs more links.",
  },
};

/** "Node 4", "Gateway", "Link 0–3", "Cable segment 3–4", "Drop cable to node 5" */
export function describeItem(topo: Topology, item: FailureItem): string {
  if (item.kind === "node") return item.id === 0 ? "Gateway" : `Node ${item.id}`;
  const l = topo.links[item.id];
  if (l.kind === "segment") return `Cable segment ${l.a - topo.n}–${l.b - topo.n}`;
  if (l.kind === "drop") return l.a === 0 ? "Gateway's drop cable" : `Drop cable to node ${l.a}`;
  const name = (id: number) => (id === 0 ? "G" : String(id));
  return `Link ${name(l.a)}–${name(l.b)}`;
}

/** How the cabling reads: a bus is one shared cable, however many segments it has. */
export function cableSummary(topo: Topology): string {
  if (topo.kind === "bus") {
    const drops = topo.links.filter((l) => l.kind === "drop").length;
    return `1 shared cable + ${drops} drop cables`;
  }
  return `${topo.links.length} links`;
}
