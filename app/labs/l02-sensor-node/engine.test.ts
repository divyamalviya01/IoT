import { describe, expect, it } from "vitest";
import { SENSORS, batteryLife, envValue, measure, quantize, resolutionAt } from "./engine";

describe("quantize", () => {
  it("matches the Arduino Uno's 10-bit ADC at 5 V", () => {
    const q = quantize(2.5, 5, 10);
    expect(q.levels).toBe(1024);
    expect(q.step).toBeCloseTo(0.0048828, 6);
    expect(q.code).toBe(512);
  });

  it("clamps to the top code at or above the reference", () => {
    expect(quantize(5, 5, 10).code).toBe(1023);
    expect(quantize(7, 5, 8).code).toBe(255);
    expect(quantize(-1, 5, 8).code).toBe(0);
  });

  it("rounds down, so the represented voltage never exceeds the input", () => {
    for (const v of [0.12, 1.23, 3.33, 4.99]) {
      const q = quantize(v, 5, 8);
      expect(q.volts).toBeLessThanOrEqual(v);
      expect(v - q.volts).toBeLessThan(q.step);
    }
  });

  it("gives smaller steps with more bits", () => {
    expect(quantize(1, 5, 12).step).toBeLessThan(quantize(1, 5, 10).step);
    expect(quantize(1, 5, 10).step).toBeLessThan(quantize(1, 5, 8).step);
  });
});

describe("sensor models", () => {
  it("LM35 gives 10 mV per °C", () => {
    expect(SENSORS.lm35.toVolts(25, 5)).toBeCloseTo(0.25);
    expect(SENSORS.lm35.fromVolts(0.25, 5)).toBeCloseTo(25);
  });

  it("each sensor's conversion round-trips", () => {
    for (const s of Object.values(SENSORS)) {
      for (const vref of [3.3, 5]) {
        const value = (s.min + s.max) / 3;
        expect(s.fromVolts(s.toVolts(value, vref), vref)).toBeCloseTo(value, 6);
      }
    }
  });

  it("LM35 resolution on a 10-bit, 5 V ADC is about 0.49 °C", () => {
    expect(resolutionAt(SENSORS.lm35, 25, 5, 10)).toBeCloseTo(0.488, 2);
    // 8 bits is four times coarser.
    expect(resolutionAt(SENSORS.lm35, 25, 5, 8)).toBeCloseTo(1.953, 2);
  });

  it("keeps the environment inside the sensor's range", () => {
    for (let t = 0; t < 60; t++) {
      const v = envValue(SENSORS.lm35, 98, t);
      expect(v).toBeLessThanOrEqual(100);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("measure", () => {
  it("switches the fan when the measured temperature passes the threshold", () => {
    expect(measure(SENSORS.lm35, 32, 5, 10, 30).actuatorOn).toBe(true);
    expect(measure(SENSORS.lm35, 28, 5, 10, 30).actuatorOn).toBe(false);
  });

  it("switches below-threshold actuators on in the dark or in dry soil", () => {
    expect(measure(SENSORS.ldr, 40, 5, 10, 100).actuatorOn).toBe(true);
    expect(measure(SENSORS.soil, 20, 3.3, 12, 30).actuatorOn).toBe(true);
    expect(measure(SENSORS.soil, 50, 3.3, 12, 30).actuatorOn).toBe(false);
  });

  it("keeps the error below one step's worth of the quantity", () => {
    const m = measure(SENSORS.lm35, 27.3, 5, 10, 30);
    expect(m.error).toBeLessThan(resolutionAt(SENSORS.lm35, 27.3, 5, 10));
  });
});

describe("batteryLife", () => {
  it("matches the worked example in the theory (1% duty cycle)", () => {
    const r = batteryLife({ capacityMah: 2000, awakeMa: 20, awakeSeconds: 1, sleepMa: 0.01, intervalSeconds: 100 });
    expect(r.duty).toBeCloseTo(0.01);
    expect(r.averageMa).toBeCloseTo(0.2099, 4);
    expect(r.days).toBeGreaterThan(390);
    expect(r.days).toBeLessThan(400);
  });

  it("caps the duty cycle at 100% when awake longer than the interval", () => {
    const r = batteryLife({ capacityMah: 2000, awakeMa: 20, awakeSeconds: 5, sleepMa: 0.01, intervalSeconds: 2 });
    expect(r.duty).toBe(1);
    expect(r.hours).toBeCloseTo(100);
  });

  it("lasts longer with longer reporting intervals", () => {
    const base = { capacityMah: 2000, awakeMa: 80, awakeSeconds: 2, sleepMa: 0.01 };
    const often = batteryLife({ ...base, intervalSeconds: 60 }).days;
    const rarely = batteryLife({ ...base, intervalSeconds: 900 }).days;
    expect(rarely).toBeGreaterThan(often * 5);
  });
});
