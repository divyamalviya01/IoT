import { describe, expect, it } from "vitest";
import { ALGORITHMS, KEY_EXCHANGE_MS, KEY_SIZES, cost, daily, radioEnergy } from "./engine";

describe("cost per message", () => {
  it("works out AES-128-GCM on an Arduino Uno for 64 bytes", () => {
    const c = cost("aesgcm", "avr", 64);
    expect(c.cycles).toBe(32_800);
    expect(c.ms).toBeCloseTo(2.05, 6);
    expect(c.mJ).toBeCloseTo(0.09225, 6);
  });

  it("makes ChaCha20 faster than AES on the Pi 4, but not on the ESP32 with AES hardware", () => {
    expect(cost("chacha", "pi4", 64).ms).toBeLessThan(cost("aesgcm", "pi4", 64).ms);
    expect(cost("aesgcm", "esp32", 64).ms).toBeLessThan(cost("chacha", "esp32", 64).ms);
  });

  it("makes the lightweight ciphers the cheapest on the 8-bit Uno", () => {
    const uno = ALGORITHMS.map((a) => ({ id: a.id, ms: cost(a.id, "avr", 64).ms })).sort((a, b) => a.ms - b.ms);
    expect(uno[0].id).toBe("speck");
    expect(cost("ascon", "avr", 64).ms).toBeLessThan(cost("aesgcm", "avr", 64).ms);
  });

  it("shows PRESENT is slow in software (it was designed for chips)", () => {
    for (const d of ["avr", "esp32", "pi4"] as const) {
      expect(cost("present", d, 64).ms).toBeGreaterThan(cost("speck", d, 64).ms);
    }
  });

  it("costs more per byte for tiny messages, because of the fixed setup", () => {
    const perByte = (n: number) => cost("aesgcm", "esp32", n).cycles / n;
    expect(perByte(16)).toBeGreaterThan(2 * perByte(256));
  });
});

describe("energy", () => {
  it("adds up over a day and a year", () => {
    const d = daily("aesgcm", "avr", 64, 96);
    expect(d.mJPerDay).toBeCloseTo(8.856, 6);
    expect(d.batterySharePerYear).toBeCloseTo((8.856 * 365) / 1000 / 27_000, 9);
    expect(d.batterySharePerYear).toBeLessThan(0.001);
  });

  it("is tiny next to sending the same message by radio", () => {
    const radio = radioEnergy(64, 7);
    expect(radio.mJ).toBeGreaterThan(50 * cost("aesgcm", "avr", 64).mJ);
    expect(radioEnergy(64, 12).mJ).toBeGreaterThan(radio.mJ * 10);
  });
});

describe("public keys", () => {
  it("makes ECC key exchange far cheaper than RSA on small devices", () => {
    expect(KEY_EXCHANGE_MS.rsa.avr / KEY_EXCHANGE_MS.ecdh.avr).toBeGreaterThan(20);
  });

  it("lists equal-strength key sizes from NIST SP 800-57", () => {
    expect(KEY_SIZES.find((k) => k.bits === 128)).toMatchObject({ rsa: 3072, ecc: 256 });
    expect(KEY_SIZES.find((k) => k.bits === 112)).toMatchObject({ rsa: 2048, ecc: 224 });
  });
});
