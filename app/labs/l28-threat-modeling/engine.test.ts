import { describe, expect, it } from "vitest";
import { ELEMENTS, band, countBands, ranked, scoreAssessment, suggestedAssessment, threatsFor, tryMitigate } from "./engine";

const all = ELEMENTS.map((e) => e.id);

describe("STRIDE per element", () => {
  it("gives each kind of element its categories", () => {
    expect(threatsFor(["resident"]).map((t) => t.category)).toEqual(["S", "R"]);
    expect(threatsFor(["app"]).map((t) => t.category)).toEqual(["S", "T", "R", "I", "D", "E"]);
    expect(threatsFor(["registry"]).map((t) => t.category)).toEqual(["T", "I", "D"]);
    expect(threatsFor(["log"]).map((t) => t.category)).toEqual(["T", "R", "I", "D"]);
    expect(threatsFor(["f-hub-lock"]).map((t) => t.category)).toEqual(["T", "I", "D"]);
  });

  it("finds 42 threats in the whole system", () => {
    // 2 (external) + 4 × 6 (processes) + 3 + 4 (stores) + 3 × 3 (flows)
    const ts = threatsFor(all);
    expect(ts).toHaveLength(42);
    expect(new Set(ts.map((t) => t.id)).size).toBe(42);
    expect(ts.every((t) => t.text.length > 10)).toBe(true);
  });
});

describe("risk matrix", () => {
  it("bands likelihood × impact", () => {
    expect([1, 4, 5, 9, 10, 16, 20, 25].map(band)).toEqual(["low", "low", "medium", "medium", "high", "high", "critical", "critical"]);
  });

  it("starts with the stolen-password threat as the top risk", () => {
    const list = threatsFor(all).map(suggestedAssessment);
    expect(ranked(list)[0].threat.id).toBe("resident:S");
    expect(countBands(list)).toEqual({ low: 0, medium: 15, high: 26, critical: 1 });
  });
});

describe("mitigations", () => {
  const spoof = threatsFor(["resident"])[0];

  it("refuses a control from the wrong category, and says why", () => {
    const r = tryMitigate(spoof, "encrypt");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/authentication/);
    expect(tryMitigate(spoof, "mfa").ok).toBe(true);
  });

  it("lowers the residual risk only for matching controls", () => {
    const a = { ...suggestedAssessment(spoof), mitigations: ["mfa"] };
    expect(scoreAssessment(a)).toMatchObject({ risk: 20, band: "critical", residualLikelihood: 2, residualRisk: 10, residualBand: "high" });
    expect(scoreAssessment({ ...a, mitigations: ["mfa", "cert"] }).residualRisk).toBe(5);
    expect(scoreAssessment({ ...a, mitigations: ["encrypt"] }).residualRisk).toBe(20);
  });

  it("never lowers likelihood below 1", () => {
    const t = threatsFor(["app"])[1]; // tampering, likelihood 2
    expect(scoreAssessment({ ...suggestedAssessment(t), mitigations: ["sign", "replay"] }).residualLikelihood).toBe(1);
  });
});
