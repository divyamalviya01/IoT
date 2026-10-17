import { describe, expect, it } from "vitest";
import {
  MAX_NODES,
  MIN_NODES,
  TOPOLOGIES,
  analyse,
  buildTopology,
  cablePath,
  failureCandidates,
  routeToGateway,
  type Failures,
  type TopologyKind,
} from "./graph";

const fail = (nodes: number[] = [], links: number[] = []): Failures => ({ nodes: new Set(nodes), links: new Set(links) });
const linkBetween = (kind: TopologyKind, n: number, a: number, b: number) =>
  buildTopology(kind, n).links.find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a))!.id;

describe("reference values at 8 nodes", () => {
  it("star: 7 links, everyone 1 hop, any spoke cuts off 1, no backup paths", () => {
    const a = analyse(buildTopology("star", 8));
    expect(a.linkCount).toBe(7);
    expect([a.avgHops, a.maxHops]).toEqual([1, 1]);
    expect(a.worst?.cutOff).toBe(1);
    expect(a.backup).toHaveLength(0);
  });

  it("tree: 7 links, 1.86 / 3 hops, losing the link to node 1 cuts off 4", () => {
    const t = buildTopology("tree", 8);
    const a = analyse(t);
    expect(a.linkCount).toBe(7);
    expect(a.avgHops).toBeCloseTo(13 / 7, 5);
    expect(a.maxHops).toBe(3);
    expect(a.worst).toMatchObject({ kind: "link", id: linkBetween("tree", 8, 0, 1), cutOff: 4 });
    expect(a.backup).toHaveLength(0);
  });

  it("bus: everyone on the shared cable is 1 hop away; the first segment cuts off all 7", () => {
    const t = buildTopology("bus", 8);
    const a = analyse(t);
    expect(t.links.filter((l) => l.kind === "segment")).toHaveLength(7);
    expect(t.links.filter((l) => l.kind === "drop")).toHaveLength(8);
    expect([a.avgHops, a.maxHops]).toEqual([1, 1]);
    expect(a.worst?.cutOff).toBe(7);
    expect(a.backup).toHaveLength(0);
  });

  it("bus: a failed device cuts off nobody else, a broken segment splits the cable", () => {
    const t = buildTopology("bus", 8);
    expect(analyse(t, fail([3])).cutOff).toHaveLength(0);
    const seg34 = t.links.find((l) => l.kind === "segment" && l.a === 8 + 3 && l.b === 8 + 4)!.id;
    expect(analyse(t, fail([], [seg34])).cutOff).toEqual([4, 5, 6, 7]);
  });

  it("ring: safe after one break, fragile after two", () => {
    const t = buildTopology("ring", 8);
    const intact = analyse(t);
    expect(intact.linkCount).toBe(8);
    expect(intact.avgHops).toBeCloseTo(16 / 7, 5);
    expect(intact.maxHops).toBe(4);
    expect(intact.worst?.cutOff).toBe(0);
    expect(intact.backup).toHaveLength(7);

    const oneCut = analyse(t, fail([], [linkBetween("ring", 8, 0, 1)]));
    expect(oneCut.cutOff).toHaveLength(0);
    expect(oneCut.avgHops).toBeCloseTo(4, 5);
    expect(oneCut.maxHops).toBe(7);
    expect(oneCut.worst?.cutOff).toBe(7);
    expect(oneCut.backup).toHaveLength(0);
  });

  it("ring: a failed device breaks both of its links", () => {
    const a = analyse(buildTopology("ring", 8), fail([2]));
    expect(a.cutOff).toHaveLength(0);
    expect(a.hops[3]).toBe(5); // the long way round
  });

  it("mesh: at least 12 links, short routes, no single point of failure", () => {
    const a = analyse(buildTopology("mesh", 8));
    expect(a.linkCount).toBeGreaterThanOrEqual(12);
    expect(a.avgHops!).toBeLessThan(2);
    expect(a.worst?.cutOff).toBe(0);
    expect(a.backup).toHaveLength(7);
  });
});

describe("every topology and size", () => {
  for (const kind of TOPOLOGIES) {
    it(`${kind}: builds ${MIN_NODES}–${MAX_NODES} nodes with valid links and a connected network`, () => {
      for (let n = MIN_NODES; n <= MAX_NODES; n++) {
        const t = buildTopology(kind, n);
        expect(t.nodes.filter((nd) => nd.role !== "tap")).toHaveLength(n);
        expect(t.nodes[0].role).toBe("gateway");
        for (const nd of t.nodes) {
          expect(Math.abs(nd.x)).toBeLessThanOrEqual(1);
          expect(Math.abs(nd.y)).toBeLessThanOrEqual(1);
        }
        for (const l of t.links) {
          expect(t.nodes[l.a]).toBeDefined();
          expect(t.nodes[l.b]).toBeDefined();
        }
        expect(analyse(t).reachable).toHaveLength(n - 1);
      }
    });
  }

  it("mesh never has a single point of failure and every node has at least 3 links", () => {
    for (let n = MIN_NODES; n <= MAX_NODES; n++) {
      const t = buildTopology("mesh", n);
      expect(analyse(t).worst?.cutOff).toBe(0);
      for (let i = 0; i < n; i++) {
        expect(t.links.filter((l) => l.a === i || l.b === i).length).toBeGreaterThanOrEqual(Math.min(3, n - 1));
      }
    }
    expect(buildTopology("mesh", 4).links).toHaveLength(6); // full mesh
  });

  it("star, tree and bus are trees, so nobody has a backup path", () => {
    for (const kind of ["star", "tree", "bus"] as const) {
      for (let n = MIN_NODES; n <= MAX_NODES; n++) {
        const t = buildTopology(kind, n);
        expect(t.links.length).toBe(t.nodes.length - 1);
        expect(analyse(t).backup).toHaveLength(0);
      }
    }
  });

  it("an intact ring's longest route is half way round", () => {
    for (let n = MIN_NODES; n <= MAX_NODES; n++) expect(analyse(buildTopology("ring", n)).maxHops).toBe(Math.floor(n / 2));
  });

  it("reachable, cut-off and failed nodes split the devices, and more failures never help", () => {
    for (const kind of TOPOLOGIES) {
      const t = buildTopology(kind, 10);
      const devices = t.nodes.filter((nd) => nd.role === "device").map((nd) => nd.id);
      let failed = fail();
      let prevReachable = Infinity;
      for (const item of failureCandidates(t).filter((_, i) => i % 3 === 0)) {
        failed = item.kind === "node" ? fail([...failed.nodes, item.id], [...failed.links]) : fail([...failed.nodes], [...failed.links, item.id]);
        const a = analyse(t, failed);
        const all = [...a.reachable, ...a.cutOff, ...a.failedNodes].sort((x, y) => x - y);
        expect(all).toEqual(devices);
        expect(a.reachable.length).toBeLessThanOrEqual(prevReachable);
        prevReachable = a.reachable.length;
      }
    }
  });

  it("a failed gateway cuts everyone off and leaves nothing to compare", () => {
    const a = analyse(buildTopology("mesh", 8), fail([0]));
    expect(a.gatewayFailed).toBe(true);
    expect(a.reachable).toHaveLength(0);
    expect(a.cutOff).toHaveLength(7);
    expect(a.avgHops).toBeNull();
    expect(a.worst).toBeNull();
  });

  it("is repeatable", () => {
    expect(buildTopology("mesh", 12)).toEqual(buildTopology("mesh", 12));
    expect(() => buildTopology("star", 3)).toThrow();
    expect(() => buildTopology("star", 17)).toThrow();
  });
});

describe("routes", () => {
  it("follows the shortest route to the gateway", () => {
    expect(routeToGateway(buildTopology("tree", 8), 7)).toEqual([7, 3, 1, 0]);
    expect(routeToGateway(buildTopology("ring", 8), 5)).toEqual([5, 6, 7, 0]);
    expect(routeToGateway(buildTopology("star", 8), 4, fail([], [3]))).toBeNull();
  });

  it("draws a bus route along the drops and the backbone taps", () => {
    const t = buildTopology("bus", 6);
    const route = routeToGateway(t, 3)!;
    expect(route).toEqual([3, 0]);
    expect(cablePath(t, route)).toEqual([3, 9, 8, 7, 6, 0]);
  });
});
