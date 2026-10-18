import { describe, expect, it } from "vitest";
import { SCENARIOS, TECHS, rank, type Battery, type CostNeed } from "./engine";

describe("wireless selector", () => {
  it("picks the technology each scenario is built to teach", () => {
    for (const s of SCENARIOS) expect(rank(s.needs)[0].tech.id).toBe(s.expected);
  });

  it("gives sensible runners-up", () => {
    const wearable = rank(SCENARIOS.find((s) => s.id === "wearable")!.needs).filter((r) => !r.excluded);
    expect(wearable.map((r) => r.tech.id).slice(0, 3)).toEqual(["ble", "classic", "wifi"]);
    const lighting = rank(SCENARIOS.find((s) => s.id === "lighting")!.needs).filter((r) => !r.excluded);
    expect(lighting.map((r) => r.tech.id).slice(0, 3)).toEqual(["zigbee", "ble", "wifi"]);
  });

  it("rules out technologies that cannot meet a hard need, with a reason", () => {
    const farm = rank(SCENARIOS.find((s) => s.id === "farm")!.needs);
    expect(farm.filter((r) => !r.excluded).map((r) => r.tech.id)).toEqual(["lorawan"]);
    const nfc = farm.find((r) => r.tech.id === "nfc")!;
    expect(nfc.reasons[0]).toMatch(/Reaches at most/);
    const cctv = rank(SCENARIOS.find((s) => s.id === "cctv")!.needs);
    expect(cctv.filter((r) => !r.excluded).map((r) => r.tech.id)).toEqual(["wifi"]);
  });

  it("keeps the right winner when range and data rate are halved or doubled, and battery and cost change", () => {
    const batteries: Battery[] = ["mains", "months", "years"];
    const costs: CostNeed[] = ["normal", "veryLow"];
    for (const s of SCENARIOS) {
      for (const rf of [0.5, 1, 2]) {
        for (const df of [0.5, 1, 2]) {
          for (const battery of batteries) {
            for (const cost of costs) {
              // A wearable plugged into the mains may sensibly pick Bluetooth Classic.
              if (s.id === "wearable" && battery === "mains") continue;
              const needs = { ...s.needs, rangeM: s.needs.rangeM * rf, rateKbps: s.needs.rateKbps * df, battery: s.id === "pay" || s.id === "cctv" || s.id === "lighting" ? s.needs.battery : battery, cost };
              expect(rank(needs)[0].tech.id, `${s.id} ×${rf} ×${df} ${battery} ${cost}`).toBe(s.expected);
            }
          }
        }
      }
    }
  });

  it("has one entry per technology with a band", () => {
    expect(new Set(TECHS.map((t) => t.id)).size).toBe(TECHS.length);
    for (const t of TECHS) expect(t.band.length).toBeGreaterThan(0);
  });
});
