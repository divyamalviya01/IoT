import { describe, expect, it } from "vitest";
import { DEFAULT_NODES, DEFAULT_RANGE, buildMesh, compare, routerImpacts } from "./engine";

const mesh = (failed: number[] = [], range = DEFAULT_RANGE) => buildMesh(DEFAULT_NODES, range, new Set(failed));

describe("default mesh", () => {
  it("routes through the routers: 2.00 hops on average", () => {
    const m = mesh();
    expect(m.hops).toMatchObject({ 1: 1, 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 7: 3, 8: 3, 9: 1, 10: 3 });
    expect(m.parent).toEqual({ 5: 1, 6: 2, 7: 3, 8: 4, 9: 0, 10: 3 });
    expect(m.avgHops).toBeCloseTo(2, 5);
    expect(m.orphans).toEqual([]);
  });

  it("never lets an end device route for anyone", () => {
    const m = mesh();
    for (const path of Object.values(m.paths)) {
      for (const id of path.slice(1)) expect(DEFAULT_NODES[id].role).not.toBe("end");
    }
  });
});

describe("self-healing", () => {
  it("re-routes round R1 with no orphans", () => {
    const before = mesh();
    const after = mesh([1]);
    expect(after.hops[3]).toBe(3);
    expect(after.parent[5]).toBe(3);
    expect(after.hops[5]).toBe(4);
    expect(after.avgHops).toBeCloseTo(24 / 9, 5);
    expect(after.orphans).toEqual([]);
    expect(compare(before, after).rejoined).toEqual([5]);
  });

  it("orphans E7 when R3 fails, and E10 re-joins R4", () => {
    const after = mesh([3]);
    expect(after.orphans).toEqual([7]);
    expect(after.parent[10]).toBe(4);
    expect(compare(mesh(), after).orphaned).toEqual([7]);
  });

  it("orphans E8 when R4 fails", () => {
    expect(mesh([4]).orphans).toEqual([8]);
  });

  it("cuts R3 off when R1 and R4 both fail", () => {
    const m = mesh([1, 4]);
    expect(m.cutOffRouters).toEqual([3]);
    expect(m.orphans).toEqual([5, 7, 8]);
    expect(m.parent[10]).toBe(2);
  });

  it("ranks the routers by how much losing each would hurt", () => {
    const impacts = routerImpacts(DEFAULT_NODES, DEFAULT_RANGE);
    expect(impacts.map((i) => i.lost)).toEqual([1, 1, 0, 0]);
    expect(impacts.slice(0, 2).map((i) => i.router).sort()).toEqual([3, 4]);
  });
});

describe("radio range", () => {
  it("adds diagonal links at 15 m, so losing R1 or R4 hurts less", () => {
    const wide = mesh([], 15);
    expect(wide.routerLinks).toContainEqual([1, 4]);
    expect(wide.routerLinks).toContainEqual([2, 3]);
    expect(mesh([1], 15).hops[3]).toBe(2);
    expect(mesh([4], 15).orphans).toEqual([]);
  });

  it("leaves more devices orphaned when the range is short", () => {
    expect(mesh([], 8).orphans.length).toBeGreaterThan(0);
  });
});
