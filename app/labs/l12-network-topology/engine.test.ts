import { describe, expect, it } from "vitest";
import { TOPOLOGIES, TOPOLOGY_INFO, buildTopology, cableSummary, describeItem } from "./engine";

describe("L12 wording", () => {
  it("has a label and a description for every topology", () => {
    for (const k of TOPOLOGIES) expect(TOPOLOGY_INFO[k].label.length).toBeGreaterThan(0);
  });

  it("names nodes and links the way students see them", () => {
    const star = buildTopology("star", 6);
    expect(describeItem(star, { kind: "node", id: 0 })).toBe("Gateway");
    expect(describeItem(star, { kind: "node", id: 3 })).toBe("Node 3");
    expect(describeItem(star, { kind: "link", id: 2 })).toBe("Link G–3");
    const bus = buildTopology("bus", 6);
    const seg = bus.links.find((l) => l.kind === "segment" && l.a === 6 + 2)!;
    expect(describeItem(bus, { kind: "link", id: seg.id })).toBe("Cable segment 2–3");
    const drop = bus.links.find((l) => l.kind === "drop" && l.a === 4)!;
    expect(describeItem(bus, { kind: "link", id: drop.id })).toBe("Drop cable to node 4");
  });

  it("counts a bus as one shared cable", () => {
    expect(cableSummary(buildTopology("bus", 8))).toBe("1 shared cable + 8 drop cables");
    expect(cableSummary(buildTopology("ring", 8))).toBe("8 links");
  });
});
