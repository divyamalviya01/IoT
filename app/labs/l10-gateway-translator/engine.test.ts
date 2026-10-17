import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULES,
  DEVICES,
  Gateway,
  GatewaySim,
  convert,
  crc16Modbus,
  decodeFrame,
  encodeFrame,
  toHex,
  toMqtt,
} from "./engine";

const zigbee = DEVICES.find((d) => d.kind === "zigbee")!;
const ble = DEVICES.find((d) => d.kind === "ble")!;
const modbus = DEVICES.find((d) => d.kind === "modbus")!;

describe("frames", () => {
  it("computes the standard Modbus CRC", () => {
    // Well-known request: read 10 registers from slave 1 → CRC bytes C5 CD.
    const crc = crc16Modbus([0x01, 0x03, 0x00, 0x00, 0x00, 0x0a]);
    expect(crc & 0xff).toBe(0xc5);
    expect(crc >> 8).toBe(0xcd);
  });

  it("encodes and decodes a Zigbee temperature report", () => {
    const frame = encodeFrame("zigbee", { temperature: 28.5 });
    expect(toHex(frame)).toBe("18 2a 0a 00 00 29 22 0b");
    expect(decodeFrame("zigbee", frame).readings).toEqual([{ quantity: "temperature", value: 28.5, unit: "C" }]);
  });

  it("handles negative Zigbee temperatures (signed 16-bit)", () => {
    const frame = encodeFrame("zigbee", { temperature: -5.25 });
    expect(decodeFrame("zigbee", frame).readings[0].value).toBe(-5.25);
  });

  it("decodes BLE manufacturer data into two readings", () => {
    const frame = encodeFrame("ble", { temperature: 26.2, humidity: 62 });
    expect(frame).toHaveLength(7);
    const r = decodeFrame("ble", frame).readings;
    expect(r).toEqual([
      { quantity: "temperature", value: 26.2, unit: "C" },
      { quantity: "humidity", value: 62, unit: "%" },
    ]);
  });

  it("decodes Modbus registers and rejects a bad CRC", () => {
    const frame = encodeFrame("modbus", { voltage: 230.5, power: 1520 });
    expect(toHex(frame.slice(0, 7))).toBe("01 03 04 09 01 05 f0");
    expect(decodeFrame("modbus", frame).readings).toEqual([
      { quantity: "voltage", value: 230.5, unit: "V" },
      { quantity: "power", value: 1520, unit: "W" },
    ]);
    const corrupt = [...frame];
    corrupt[4] ^= 0x01;
    expect(() => decodeFrame("modbus", corrupt)).toThrow(/CRC/);
  });
});

describe("gateway rules", () => {
  it("builds topics from the template and JSON payloads", () => {
    const m = toMqtt(zigbee, { quantity: "temperature", value: 28.5, unit: "C" }, DEFAULT_RULES);
    expect(m.topic).toBe("site/kitchen/temperature");
    expect(m.payload).toBe('{"value":28.5,"unit":"C"}');
    expect(m.bytes).toBe(2 + 2 + m.topic.length + m.payload.length);
  });

  it("converts Celsius to Fahrenheit when asked", () => {
    expect(convert({ quantity: "temperature", value: 28.5, unit: "C" }, { ...DEFAULT_RULES, fahrenheit: true })).toEqual({
      quantity: "temperature",
      value: 83.3,
      unit: "F",
    });
    // Other units pass through unchanged.
    expect(convert({ quantity: "power", value: 100, unit: "W" }, { ...DEFAULT_RULES, fahrenheit: true }).unit).toBe("W");
  });

  it("drops readings inside the deadband", () => {
    const gw = new Gateway({ ...DEFAULT_RULES, deadbandPct: 1 });
    expect(gw.process(zigbee, encodeFrame("zigbee", { temperature: 28.5 })).out).toHaveLength(1);
    expect(gw.process(zigbee, encodeFrame("zigbee", { temperature: 28.7 })).dropped).toBe(1);
    expect(gw.process(zigbee, encodeFrame("zigbee", { temperature: 29.1 })).out).toHaveLength(1);
  });
});

describe("simulation", () => {
  it("sends frames at each device's rate", () => {
    const sim = new GatewaySim(DEFAULT_RULES);
    sim.advance(10);
    const count = (id: string) => sim.events.filter((e) => e.device.id === id).length;
    expect(count("zb1")).toBe(5); // every 2 s
    expect(count("ble1")).toBe(10);
    expect(count("mb1")).toBe(10);
  });

  it("publishes far fewer messages with a deadband", () => {
    const all = new GatewaySim(DEFAULT_RULES);
    const filtered = new GatewaySim({ ...DEFAULT_RULES, deadbandPct: 1 });
    all.advance(60);
    filtered.advance(60);
    expect(filtered.totals.messagesOut).toBeLessThan(all.totals.messagesOut / 2);
    expect(filtered.totals.frames).toBe(all.totals.frames);
  });

  it("sends fewer messages at each wider deadband over a one-minute run", () => {
    for (const seed of [3, 7, 11, 21]) {
      const out = [0, 1, 5, 10].map((deadbandPct) => {
        const sim = new GatewaySim({ ...DEFAULT_RULES, deadbandPct }, undefined, seed);
        sim.advance(60);
        return sim.totals.messagesOut;
      });
      for (let i = 1; i < out.length; i++) expect(out[i]).toBeLessThan(out[i - 1]);
    }
  });

  it("is repeatable with the same seed", () => {
    const a = new GatewaySim(DEFAULT_RULES, undefined, 3);
    const b = new GatewaySim(DEFAULT_RULES, undefined, 3);
    a.advance(30);
    b.advance(30);
    expect(a.totals).toEqual(b.totals);
  });

  it("skips devices that are switched off", () => {
    const sim = new GatewaySim(DEFAULT_RULES, new Set(["zb1"]));
    sim.advance(10);
    expect(sim.events.every((e) => e.device.id === "zb1")).toBe(true);
    void ble;
    void modbus;
  });
});
