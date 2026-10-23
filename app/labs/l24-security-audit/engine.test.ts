import { describe, expect, it } from "vitest";
import { ATTACKS, DEVICES, TOTAL_WEIGHT, WEAKNESSES, applyFix, attacks, blockedCount, emptyAudit, found, inspect, isFixed, score, type AuditState } from "./engine";

const fixAll = (quality: "right" | "partial"): AuditState => {
  let s = DEVICES.reduce((acc, d) => inspect(acc, d.id), emptyAudit());
  for (const w of WEAKNESSES) s = applyFix(s, w.id, w.fixes.find((f) => f.quality === quality)!.id);
  return s;
};

describe("the home", () => {
  it("has one weakness for each OWASP IoT Top 10 item", () => {
    expect(WEAKNESSES.map((w) => w.owasp)).toEqual(["I1", "I2", "I3", "I4", "I5", "I6", "I7", "I8", "I9", "I10"]);
    expect(TOTAL_WEIGHT).toBe(22);
    for (const w of WEAKNESSES) expect(w.fixes.map((f) => f.quality).sort()).toEqual(["partial", "right", "wrong"]);
  });

  it("starts at 0 with every attack possible and nothing found", () => {
    const s = emptyAudit();
    expect(score(s)).toBe(0);
    expect(found(s)).toEqual([]);
    expect(blockedCount(s)).toBe(0);
    expect(ATTACKS).toHaveLength(8);
  });
});

describe("inspecting and fixing", () => {
  it("reveals a device's weaknesses only after inspecting it", () => {
    const s = inspect(emptyAudit(), "router");
    expect(found(s).map((w) => w.id)).toEqual(["I2", "I9"]);
    expect(() => applyFix(emptyAudit(), "I7", "a")).toThrow(/Inspect/);
  });

  it("keeps the botnet path through the camera when only Telnet is fixed", () => {
    let s = inspect(inspect(emptyAudit(), "router"), "camera");
    s = applyFix(s, "I2", "a");
    const botnet = attacks(s).find((a) => a.attack.id === "botnet")!;
    expect(botnet.possible).toBe(true);
    expect(botnet.via).toEqual(["I1", "I9"]);
    s = applyFix(s, "I9", "a");
    expect(attacks(s).find((a) => a.attack.id === "botnet")!.possible).toBe(false);
  });

  it("gives half marks for a partial fix but leaves the attack possible", () => {
    const s = applyFix(inspect(emptyAudit(), "broker"), "I7", "b");
    expect(score(s)).toBe(7); // 3 × 0.5 ÷ 22
    expect(isFixed(s, "I7")).toBe(false);
    expect(attacks(s).find((a) => a.attack.id === "sniff")!.possible).toBe(true);
  });

  it("reaches 100 with every attack blocked when everything is fixed properly", () => {
    const s = fixAll("right");
    expect(score(s)).toBe(100);
    expect(blockedCount(s)).toBe(8);
  });

  it("reaches only 50 with partial fixes, and nothing is blocked", () => {
    const s = fixAll("partial");
    expect(score(s)).toBe(50);
    expect(blockedCount(s)).toBe(0);
  });
});
