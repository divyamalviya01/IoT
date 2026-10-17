import { describe, expect, it } from "vitest";
import { appSizes, race, type RaceProtocol } from "./engine";

const cfg = { messages: 20, payload: "28.5", lossPct: 0, delayMs: 50, seed: 1 };
const by = (results: ReturnType<typeof race>) =>
  Object.fromEntries(results.map((r) => [r.protocol, r])) as Record<RaceProtocol, ReturnType<typeof race>[number]>;

describe("L11 protocol race", () => {
  it("ranks bytes per reading from CoAP NON to HTTP with a new connection", () => {
    const r = by(race(cfg));
    expect(r.coapNon.bytesPerReading).toBeLessThan(r.coapCon.bytesPerReading);
    expect(r.coapCon.bytesPerReading).toBeLessThan(r.mqtt0.bytesPerReading);
    expect(r.mqtt0.bytesPerReading).toBeLessThan(r.mqtt1.bytesPerReading);
    expect(r.mqtt1.bytesPerReading).toBeLessThan(r.httpKeep.bytesPerReading);
    expect(r.httpKeep.bytesPerReading).toBeLessThan(r.httpNew.bytesPerReading);
  });

  it("computes exact CoAP NON size: 48 bytes for a 4-byte reading", () => {
    // header 4 + token 2 + option byte 1 + "readings" 8 + marker 1 + payload 4
    expect(appSizes("28.5").coapRequest).toBe(20);
    expect(by(race(cfg)).coapNon.bytesPerReading).toBe(20 + 28);
  });

  it("delivers everything on a perfect link, with one-way delay except HTTP's handshake", () => {
    const r = by(race(cfg));
    for (const x of Object.values(r)) expect(x.deliveredPct).toBe(100);
    expect(r.coapNon.avgDelayMs).toBe(50);
    expect(r.mqtt0.avgDelayMs).toBe(50);
    expect(r.httpNew.avgDelayMs).toBe(150);
  });

  it("only CoAP NON loses readings on a lossy link; TCP resends even MQTT QoS 0", () => {
    const r = by(race({ ...cfg, messages: 200, lossPct: 30 }));
    expect(r.coapNon.deliveredPct).toBeLessThan(80);
    for (const p of ["coapCon", "mqtt0", "mqtt1", "xmpp", "httpKeep", "httpNew"] as const) {
      expect(r[p].deliveredPct).toBeGreaterThan(99);
    }
    expect(r.mqtt0.avgDelayMs).toBeGreaterThan(50);
  });

  it("spreads setup cost over more readings", () => {
    const few = by(race({ ...cfg, messages: 2 }));
    const many = by(race({ ...cfg, messages: 200 }));
    expect(few.xmpp.bytesPerReading).toBeGreaterThan(many.xmpp.bytesPerReading * 2);
    expect(few.coapNon.bytesPerReading).toBe(many.coapNon.bytesPerReading);
  });

  it("uses more energy for chattier protocols", () => {
    const r = by(race(cfg));
    expect(r.httpNew.energyPerReading).toBeGreaterThan(r.mqtt0.energyPerReading * 3);
  });

  it("is repeatable", () => {
    expect(race({ ...cfg, lossPct: 20 })).toEqual(race({ ...cfg, lossPct: 20 }));
  });
});
