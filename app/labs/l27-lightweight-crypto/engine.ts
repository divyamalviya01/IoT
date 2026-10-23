/**
 * L27 Lightweight crypto cost estimator. Estimates how long, and how much
 * energy, it takes to protect one sensor message with different ciphers on
 * three kinds of device, and compares that with the energy of sending it by
 * radio.
 *
 * The cycle counts are ILLUSTRATIVE: rounded figures of the right size, based
 * on published benchmarks, chosen to show the real trends. Real numbers
 * depend on the library, compiler and message.
 */
import { LORAWAN_OVERHEAD, airtime, type SF } from "~/labs/l19-lora-airtime/engine";

export type DeviceId = "avr" | "esp32" | "pi4";
export type AlgoId = "aesgcm" | "chacha" | "ascon" | "speck" | "present";

export interface Device {
  id: DeviceId;
  name: string;
  mhz: number;
  /** Power while the CPU is busy, in milliwatts */
  mw: number;
  note: string;
}

export const DEVICES: Device[] = [
  { id: "avr", name: "Arduino Uno (ATmega328P, 8-bit)", mhz: 16, mw: 45, note: "No crypto hardware" },
  { id: "esp32", name: "ESP32 (32-bit)", mhz: 240, mw: 150, note: "Has an AES hardware accelerator" },
  { id: "pi4", name: "Raspberry Pi 4 (64-bit)", mhz: 1500, mw: 3000, note: "No AES instructions in its CPU" },
];

export interface Algorithm {
  id: AlgoId;
  name: string;
  /** Authenticated encryption (encrypts and detects changes), or a block cipher only */
  kind: "aead" | "cipher";
  keyBits: number;
  blockBits?: number;
  rounds: string;
  standard: string;
  /** Fixed cycles per message (key setup, nonce, tag) and cycles per byte, per device */
  cycles: Record<DeviceId, { setup: number; perByte: number }>;
}

export const ALGORITHMS: Algorithm[] = [
  {
    id: "aesgcm",
    name: "AES-128-GCM",
    kind: "aead",
    keyBits: 128,
    blockBits: 128,
    rounds: "10",
    standard: "FIPS 197 + SP 800-38D",
    cycles: { avr: { setup: 4000, perByte: 450 }, esp32: { setup: 300, perByte: 12 }, pi4: { setup: 400, perByte: 30 } },
  },
  {
    id: "chacha",
    name: "ChaCha20-Poly1305",
    kind: "aead",
    keyBits: 256,
    rounds: "20",
    standard: "RFC 8439 (used in TLS 1.3)",
    cycles: { avr: { setup: 1500, perByte: 300 }, esp32: { setup: 200, perByte: 25 }, pi4: { setup: 150, perByte: 6 } },
  },
  {
    id: "ascon",
    name: "Ascon-AEAD128",
    kind: "aead",
    keyBits: 128,
    rounds: "12 / 8",
    standard: "NIST SP 800-232 (2025)",
    cycles: { avr: { setup: 1200, perByte: 250 }, esp32: { setup: 150, perByte: 30 }, pi4: { setup: 120, perByte: 10 } },
  },
  {
    id: "speck",
    name: "SPECK-64/128",
    kind: "cipher",
    keyBits: 128,
    blockBits: 64,
    rounds: "27",
    standard: "NSA, 2013 (not adopted by ISO)",
    cycles: { avr: { setup: 800, perByte: 110 }, esp32: { setup: 100, perByte: 10 }, pi4: { setup: 50, perByte: 4 } },
  },
  {
    id: "present",
    name: "PRESENT-80",
    kind: "cipher",
    keyBits: 80,
    blockBits: 64,
    rounds: "31",
    standard: "ISO/IEC 29192-2",
    cycles: { avr: { setup: 2000, perByte: 650 }, esp32: { setup: 300, perByte: 120 }, pi4: { setup: 200, perByte: 60 } },
  },
];

export const getDevice = (id: DeviceId) => DEVICES.find((d) => d.id === id)!;
export const getAlgorithm = (id: AlgoId) => ALGORITHMS.find((a) => a.id === id)!;

export interface Cost {
  cycles: number;
  ms: number;
  /** Millijoules */
  mJ: number;
}

export function cost(algo: AlgoId, device: DeviceId, bytes: number): Cost {
  const c = getAlgorithm(algo).cycles[device];
  const d = getDevice(device);
  const cycles = c.setup + c.perByte * bytes;
  const ms = cycles / (d.mhz * 1000);
  return { cycles, ms, mJ: (ms * d.mw) / 1000 };
}

/** Two AA cells: about 2.5 Ah at 3 V = 7.5 Wh = 27,000 J */
export const BATTERY_J = 27_000;

export function daily(algo: AlgoId, device: DeviceId, bytes: number, perDay: number) {
  const mJ = cost(algo, device, bytes).mJ * perDay;
  return { mJPerDay: mJ, batterySharePerYear: (mJ * 365) / 1000 / BATTERY_J };
}

/** Radio current while sending, in mA, at 3.3 V (a typical LoRa module at 14 dBm) */
export const RADIO_MA = 40;

/** Energy to send the same message once by LoRaWAN, in millijoules. */
export function radioEnergy(bytes: number, sf: SF = 7): { ms: number; mJ: number } {
  const ms = airtime(sf, 125, bytes + LORAWAN_OVERHEAD).totalMs;
  return { ms, mJ: (ms / 1000) * RADIO_MA * 3.3 };
}

/* ------------------------------------------------------------------ */
/* Public-key operations and key sizes                                 */
/* ------------------------------------------------------------------ */

/** One-off cost when a session starts (ILLUSTRATIVE, in milliseconds). */
export const KEY_EXCHANGE_MS: Record<"ecdh" | "rsa", Record<DeviceId, number>> = {
  ecdh: { avr: 1800, esp32: 60, pi4: 1 },
  rsa: { avr: 90_000, esp32: 1500, pi4: 8 },
};

/** Key sizes giving the same security strength (NIST SP 800-57 Part 1). */
export const KEY_SIZES = [
  { bits: 80, rsa: 1024, ecc: 160, note: "No longer allowed" },
  { bits: 112, rsa: 2048, ecc: 224, note: "Minimum today" },
  { bits: 128, rsa: 3072, ecc: 256, note: "Common choice" },
  { bits: 192, rsa: 7680, ecc: 384, note: "" },
  { bits: 256, rsa: 15360, ecc: 512, note: "" },
];
