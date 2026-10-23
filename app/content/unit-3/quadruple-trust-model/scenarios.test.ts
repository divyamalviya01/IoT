import { describe, expect, it } from "vitest";
import { PILLARS, SCENARIOS } from "./scenarios";

describe("quadruple trust scenarios", () => {
  it("names the four pillars of IEEE 2413", () => {
    expect(PILLARS.map((p) => p.id)).toEqual(["protection", "security", "privacy", "safety"]);
  });

  it("has unique scenarios, with at least two for every pillar", () => {
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
    for (const p of PILLARS) expect(SCENARIOS.filter((s) => s.answer === p.id).length).toBeGreaterThanOrEqual(2);
  });
});
