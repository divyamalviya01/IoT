import { describe, expect, it } from "vitest";
import { createRng } from "~/lib/sim/random";
import {
  PERIPHERALS,
  advertising,
  averageRssi,
  decodeHeartRate,
  decodeTemperature,
  estimateDistance,
  expectedRssi,
  getPeripheral,
  heartRateMeasurement,
  hex,
  humidityBytes,
  inRange,
  readValue,
  rssiReading,
  temperatureBytes,
} from "./engine";

describe("GATT value encodings", () => {
  it("encodes Heart Rate Measurement with the flags byte", () => {
    expect(hex(heartRateMeasurement(72))).toBe("06 48");
    expect(hex(heartRateMeasurement(72, 0.833))).toBe("16 48 55 03");
    expect(decodeHeartRate([0x16, 0x48, 0x55, 0x03])).toBe("72 bpm, sensor touching skin, RR interval 0.833 s");
  });

  it("encodes temperature and humidity as little-endian hundredths", () => {
    expect(hex(temperatureBytes(23.45))).toBe("29 09");
    expect(hex(temperatureBytes(-5))).toBe("0c fe");
    expect(decodeTemperature([0x0c, 0xfe])).toBe("-5.00 °C");
    expect(hex(humidityBytes(55.2))).toBe("90 15");
  });

  it("builds an iBeacon advertisement with big-endian major and minor", () => {
    const data = getPeripheral("beacon").manufacturerData!;
    expect(hex(data.slice(0, 4))).toBe("4c 00 02 15");
    expect(hex(data.slice(20, 25))).toBe("00 01 00 2a c5");
    expect(data).toHaveLength(25);
  });
});

describe("GATT access", () => {
  it("gives every connectable peripheral Generic Access", () => {
    for (const p of PERIPHERALS.filter((x) => x.connectable)) expect(p.services[0].uuid).toBe(0x1800);
  });

  it("reads readable characteristics but not notify-only ones", () => {
    const hr = getPeripheral("hr");
    const loc = readValue(hr, 0x2a38, 0);
    expect(loc).toMatchObject({ ok: true, text: "Wrist" });
    const meas = readValue(hr, 0x2a37, 0);
    expect(meas.ok).toBe(false);
  });

  it("refuses to connect to a beacon", () => {
    expect(readValue(getPeripheral("beacon"), 0x2a00, 0).ok).toBe(false);
  });
});

describe("signal strength and distance", () => {
  it("follows the log-distance model", () => {
    expect(Math.round(expectedRssi(2, 2))).toBe(-65);
    expect(Math.round(expectedRssi(4, 2))).toBe(-71);
    expect(Math.round(expectedRssi(10, 2))).toBe(-79);
    expect(Math.round(expectedRssi(10, 3))).toBe(-89);
  });

  it("estimates the wrong distance when the room's n is not the n the phone assumes", () => {
    // True n = 3 at 4 m, but the phone assumes free space (n = 2).
    expect(estimateDistance(expectedRssi(4, 3), 2)).toBeCloseTo(8, 2);
    expect(estimateDistance(expectedRssi(4, 3), 3)).toBeCloseTo(4, 2);
  });

  it("loses the device below −95 dBm, about 63 m away in free space", () => {
    expect(inRange(Math.round(expectedRssi(60, 2)))).toBe(true);
    expect(inRange(Math.round(expectedRssi(70, 2)))).toBe(false);
  });

  it("averaging ten readings narrows the spread of estimates", () => {
    const rng = createRng(3);
    const single: number[] = [];
    const averaged: number[] = [];
    for (let i = 0; i < 200; i++) {
      single.push(estimateDistance(rssiReading(5, 2, rng), 2));
      averaged.push(estimateDistance(averageRssi(Array.from({ length: 10 }, () => rssiReading(5, 2, rng))), 2));
    }
    const spread = (xs: number[]) => {
      const m = xs.reduce((a, b) => a + b, 0) / xs.length;
      return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
    };
    expect(spread(averaged)).toBeLessThan(spread(single) / 2);
  });
});

describe("advertising", () => {
  it("sends each advertising event on channels 37, 38 and 39", () => {
    const pkts = advertising(getPeripheral("hr"), 0, 1000);
    expect(pkts.slice(0, 3).map((p) => p.channel)).toEqual([37, 38, 39]);
    // About 10 events a second at a 100 ms interval.
    expect(pkts.length / 3).toBeGreaterThanOrEqual(9);
    expect(pkts.length / 3).toBeLessThanOrEqual(10);
  });
});
