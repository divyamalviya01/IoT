import { describe, expect, it } from "vitest";
import { bestPlan, centreMHz, interference, overlap } from "./channels";

describe("2.4 GHz Wi-Fi channels", () => {
  it("places channel centres 5 MHz apart, with channel 14 on its own", () => {
    expect(centreMHz(1)).toBe(2412);
    expect(centreMHz(6)).toBe(2437);
    expect(centreMHz(11)).toBe(2462);
    expect(centreMHz(13)).toBe(2472);
    expect(centreMHz(14)).toBe(2484);
  });

  it("overlaps channels closer than 5 apart at 22 MHz, and closer than 4 at 20 MHz", () => {
    expect([1, 2, 3, 4, 5].map((d) => Number(overlap(1, 1 + d, 22).toFixed(3)))).toEqual([0.773, 0.545, 0.318, 0.091, 0]);
    expect([1, 2, 3, 4].map((d) => overlap(1, 1 + d, 20))).toEqual([0.75, 0.5, 0.25, 0]);
  });

  it("scores partial overlap as worse than sharing one channel", () => {
    expect(interference([1, 2, 3], 22).total).toBeCloseTo(4.18, 2);
    expect(interference([1, 1, 1], 22).total).toBe(3);
    expect(interference([1, 3, 6], 22).total).toBeCloseTo(1.73, 2);
    expect(interference([1, 6, 11], 22).total).toBe(0);
    const pairs = interference([1, 1, 3], 22).pairs.map((p) => p.kind);
    expect(pairs).toEqual(["sharing", "clashing", "clashing"]);
  });

  it("finds 1, 6 and 11 for three access points", () => {
    const best = bestPlan(3, 22);
    expect(best.total).toBe(0);
    expect(interference([1, 6, 11], 22).total).toBe(best.total);
  });

  it("with four access points no plan is perfect: the best re-use or slightly overlap the far diagonal", () => {
    const best = bestPlan(4, 22);
    expect(best.total).toBeGreaterThan(0);
    expect(best.total).toBeLessThanOrEqual(0.3);
    // Re-using channel 1 on the diagonal is almost as good.
    expect(interference([1, 6, 11, 1], 22).total).toBe(0.3);
    // Side neighbours in the best plan never share or overlap.
    const sides = interference(best.channels, 22).pairs.filter((p) => !(p.a === 0 && p.b === 3) && !(p.a === 1 && p.b === 2));
    expect(sides.every((p) => p.penalty === 0)).toBe(true);
  });

  it("allows 1, 5, 9 and 13 only with 20 MHz channels", () => {
    expect(interference([1, 5, 9, 13], 20).total).toBe(0);
    expect(interference([1, 5, 9, 13], 22).total).toBeGreaterThan(0);
  });
});
