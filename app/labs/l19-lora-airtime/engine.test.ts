import { describe, expect, it } from "vitest";
import { acrossSF, airtime, bitRate, evaluate, lowDataRateOptimise, messagesPerDay, rangeKm, sensitivity } from "./engine";

describe("time on air (Semtech AN1200.13)", () => {
  it("matches reference values for a 23-byte PHY payload", () => {
    const ms = (sf: 7 | 10 | 11 | 12, bw: number) => airtime(sf, bw, 23).totalMs;
    expect(ms(7, 125)).toBeCloseTo(61.696, 3);
    expect(ms(10, 125)).toBeCloseTo(370.688, 3);
    expect(ms(11, 125)).toBeCloseTo(823.296, 3);
    expect(ms(12, 125)).toBeCloseTo(1482.752, 3);
    expect(ms(12, 250)).toBeCloseTo(741.376, 3);
    expect(ms(12, 500)).toBeCloseTo(329.728, 3);
    expect(ms(7, 500)).toBeCloseTo(15.424, 3);
  });

  it("turns on low data rate optimisation only for symbols longer than 16 ms", () => {
    expect(lowDataRateOptimise(10, 125)).toBe(false);
    expect(lowDataRateOptimise(11, 125)).toBe(true);
    expect(lowDataRateOptimise(12, 125)).toBe(true);
    expect(lowDataRateOptimise(12, 250)).toBe(true);
    expect(lowDataRateOptimise(11, 250)).toBe(false);
    expect(lowDataRateOptimise(12, 500)).toBe(false);
  });

  it("grows with spreading factor and payload", () => {
    const all = acrossSF(125, 10, "rural", "eu1pct");
    for (let i = 1; i < all.length; i++) expect(all[i].airtime.totalMs).toBeGreaterThan(all[i - 1].airtime.totalMs);
    expect(airtime(9, 125, 40).totalMs).toBeGreaterThan(airtime(9, 125, 20).totalMs);
  });
});

describe("data rate, sensitivity and range", () => {
  it("gives the standard bit rates", () => {
    expect(bitRate(7, 125)).toBeCloseTo(5468.75, 2);
    expect(bitRate(12, 125)).toBeCloseTo(292.97, 2);
  });

  it("needs about 3 dB more signal for each doubling of bandwidth", () => {
    expect(sensitivity(7, 125)).toBeCloseTo(-124.53, 2);
    expect(sensitivity(12, 125)).toBeCloseTo(-137.03, 2);
    expect(sensitivity(12, 250) - sensitivity(12, 125)).toBeCloseTo(3.01, 2);
  });

  it("reaches farther at higher SF and narrower bandwidth (illustrative)", () => {
    expect(rangeKm(7, 125, "rural")).toBeCloseTo(4.03, 1);
    expect(rangeKm(12, 125, "rural")).toBeCloseTo(11.69, 1);
    expect(rangeKm(7, 125, "urban")).toBeCloseTo(1.1, 1);
    expect(rangeKm(12, 125, "urban")).toBeCloseTo(2.71, 1);
    expect(rangeKm(12, 500, "rural")).toBeCloseTo(7.0, 1);
    expect(rangeKm(12, 500, "rural")).toBeLessThan(rangeKm(12, 125, "rural"));
  });
});

describe("airtime budgets", () => {
  it("allows 14004 SF7 messages but only 582 at SF12 under the 1 % rule", () => {
    expect(messagesPerDay(airtime(7, 125, 23).totalMs, "eu1pct")).toBe(14004);
    expect(messagesPerDay(airtime(12, 125, 23).totalMs, "eu1pct")).toBe(582);
  });

  it("allows far fewer under The Things Network's 30 s per day", () => {
    expect(messagesPerDay(airtime(7, 125, 23).totalMs, "ttn30s")).toBe(486);
    expect(messagesPerDay(airtime(12, 125, 23).totalMs, "ttn30s")).toBe(20);
  });

  it("adds 13 bytes of LoRaWAN overhead and warns about limits", () => {
    const r = evaluate(12, 125, 10, "rural", "eu1pct");
    expect(r.phyBytes).toBe(23);
    expect(r.waitAfterS).toBeCloseTo(146.8, 1);
    expect(r.warnings).toHaveLength(0);
    expect(evaluate(12, 125, 60, "rural", "eu1pct").warnings[0]).toMatch(/51 bytes/);
    expect(evaluate(7, 500, 10, "rural", "eu1pct").warnings[0]).toMatch(/125 kHz/);
  });
});
