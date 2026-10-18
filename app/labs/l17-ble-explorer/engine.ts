/**
 * Lab L17: simulated Bluetooth Low Energy peripherals.
 *
 * Services, characteristics and value encodings follow the Bluetooth SIG
 * assigned numbers and GATT specifications (multi-byte values are
 * little-endian; iBeacon major/minor are big-endian). Signal strength uses
 * the log-distance model RSSI = P1m − 10·n·log10(d) plus random noise, where
 * P1m is the signal at 1 m. A phone estimates distance by inverting the same
 * formula with the n it assumes, which may not be the room's real n.
 */

import { createRng, type Rng } from "~/lib/sim/random";

export type Property = "read" | "notify";

export interface Characteristic {
  uuid: number;
  name: string;
  properties: Property[];
  /** Current value as bytes, given the simulated time */
  value: (t: number) => number[];
  /** Plain-English reading of the bytes */
  decode: (bytes: number[]) => string;
}

export interface Service {
  uuid: number;
  name: string;
  characteristics: Characteristic[];
}

export type PeripheralKind = "heart" | "environment" | "beacon";

export interface Peripheral {
  id: string;
  kind: PeripheralKind;
  name: string;
  connectable: boolean;
  /** Advertising interval, ms */
  advIntervalMs: number;
  /** Signal strength at 1 m, dBm */
  power1m: number;
  /** Position in the room, metres */
  x: number;
  y: number;
  services: Service[];
  /** Manufacturer data in the advertisement (iBeacon), if any */
  manufacturerData?: number[];
}

export const ADVERTISING_CHANNELS = [
  { channel: 37, mhz: 2402 },
  { channel: 38, mhz: 2426 },
  { channel: 39, mhz: 2480 },
] as const;

export const CCCD_UUID = 0x2902;
export const SUBSCRIBE = [0x01, 0x00];
export const RSSI_FLOOR = -95;

export const hex = (bytes: number[]) => bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ");
export const uuidText = (u: number) => `0x${u.toString(16).toUpperCase().padStart(4, "0")}`;
const le16 = (v: number) => [v & 0xff, (v >> 8) & 0xff];
const be16 = (v: number) => [(v >> 8) & 0xff, v & 0xff];
const utf8 = (s: string) => [...new TextEncoder().encode(s)];

/* ------------------------------------------------------------------ */
/* Value encodings                                                     */
/* ------------------------------------------------------------------ */

/**
 * Heart Rate Measurement (0x2A37). Flags byte: bit 0 = 16-bit value, bits 1–2
 * = sensor contact supported and detected (0x06), bit 4 = RR interval present
 * (in 1/1024 s units).
 */
export function heartRateMeasurement(bpm: number, rrSeconds?: number): number[] {
  const flags = 0x06 | (rrSeconds !== undefined ? 0x10 : 0);
  const bytes = [flags, Math.round(bpm) & 0xff];
  if (rrSeconds !== undefined) bytes.push(...le16(Math.round(rrSeconds * 1024)));
  return bytes;
}

export function decodeHeartRate(b: number[]): string {
  const sixteen = (b[0] & 0x01) !== 0;
  const bpm = sixteen ? b[1] | (b[2] << 8) : b[1];
  const contact = (b[0] & 0x06) === 0x06 ? "sensor touching skin" : "no skin contact";
  const rrAt = sixteen ? 3 : 2;
  const rr = b[0] & 0x10 ? ((b[rrAt] | (b[rrAt + 1] << 8)) / 1024).toFixed(3) : null;
  return `${bpm} bpm, ${contact}${rr ? `, RR interval ${rr} s` : ""}`;
}

/** Temperature (0x2A6E): signed 16-bit, 0.01 °C. */
export function temperatureBytes(celsius: number): number[] {
  const raw = Math.round(celsius * 100);
  return le16(raw < 0 ? raw + 0x10000 : raw);
}
export function decodeTemperature(b: number[]): string {
  let raw = b[0] | (b[1] << 8);
  if (raw & 0x8000) raw -= 0x10000;
  return `${(raw / 100).toFixed(2)} °C`;
}

/** Humidity (0x2A6F): unsigned 16-bit, 0.01 %. */
export function humidityBytes(pct: number): number[] {
  return le16(Math.round(pct * 100));
}
export const decodeHumidity = (b: number[]) => `${((b[0] | (b[1] << 8)) / 100).toFixed(2)} %`;

/** iBeacon advertisement data: Apple company ID, type, length, UUID, major, minor, measured power. */
export function iBeaconData(uuid: number[], major: number, minor: number, measuredPower: number): number[] {
  return [0x4c, 0x00, 0x02, 0x15, ...uuid, ...be16(major), ...be16(minor), measuredPower & 0xff];
}

/* ------------------------------------------------------------------ */
/* The three peripherals                                               */
/* ------------------------------------------------------------------ */

function genericAccess(name: string): Service {
  return {
    uuid: 0x1800,
    name: "Generic Access",
    characteristics: [
      { uuid: 0x2a00, name: "Device Name", properties: ["read"], value: () => utf8(name), decode: (b) => `“${new TextDecoder().decode(new Uint8Array(b))}”` },
    ],
  };
}

/** Smooth, repeatable wobble for live values. */
const wobble = (t: number, period: number, amount: number) => amount * Math.sin((2 * Math.PI * t) / period);

const BEACON_UUID = [0xe2, 0xc5, 0x6d, 0xb5, 0xdf, 0xfb, 0x48, 0xd2, 0xb0, 0x60, 0xd0, 0xf5, 0xa7, 0x10, 0x96, 0xe0];

export const PERIPHERALS: Peripheral[] = [
  {
    id: "hr",
    kind: "heart",
    name: "HR Band",
    connectable: true,
    advIntervalMs: 100,
    power1m: -59,
    x: 2,
    y: 2,
    services: [
      genericAccess("HR Band"),
      {
        uuid: 0x180d,
        name: "Heart Rate",
        characteristics: [
          {
            uuid: 0x2a37,
            name: "Heart Rate Measurement",
            properties: ["notify"],
            value: (t) => {
              const bpm = 72 + wobble(t, 20_000, 6);
              return heartRateMeasurement(bpm, 60 / bpm);
            },
            decode: decodeHeartRate,
          },
          { uuid: 0x2a38, name: "Body Sensor Location", properties: ["read"], value: () => [0x02], decode: (b) => (b[0] === 0x02 ? "Wrist" : `Code ${b[0]}`) },
        ],
      },
      {
        uuid: 0x180f,
        name: "Battery",
        characteristics: [{ uuid: 0x2a19, name: "Battery Level", properties: ["read", "notify"], value: () => [87], decode: (b) => `${b[0]} %` }],
      },
    ],
  },
  {
    id: "env",
    kind: "environment",
    name: "Room Sensor",
    connectable: true,
    advIntervalMs: 1000,
    power1m: -59,
    x: 9,
    y: 3,
    services: [
      genericAccess("Room Sensor"),
      {
        uuid: 0x181a,
        name: "Environmental Sensing",
        characteristics: [
          { uuid: 0x2a6e, name: "Temperature", properties: ["read", "notify"], value: (t) => temperatureBytes(28.5 + wobble(t, 60_000, 0.4)), decode: decodeTemperature },
          { uuid: 0x2a6f, name: "Humidity", properties: ["read", "notify"], value: (t) => humidityBytes(55.2 + wobble(t, 45_000, 2)), decode: decodeHumidity },
        ],
      },
    ],
  },
  {
    id: "beacon",
    kind: "beacon",
    name: "Shop Beacon",
    connectable: false,
    advIntervalMs: 100,
    power1m: -59,
    x: 6,
    y: 8,
    services: [],
    manufacturerData: iBeaconData(BEACON_UUID, 1, 42, -59),
  },
];

export function getPeripheral(id: string): Peripheral {
  return PERIPHERALS.find((p) => p.id === id)!;
}

export function findCharacteristic(p: Peripheral, uuid: number): Characteristic | undefined {
  return p.services.flatMap((s) => s.characteristics).find((c) => c.uuid === uuid);
}

/** Reading a characteristic; notify-only characteristics cannot be read. */
export function readValue(p: Peripheral, uuid: number, t: number): { ok: true; bytes: number[]; text: string } | { ok: false; reason: string } {
  if (!p.connectable) return { ok: false, reason: `${p.name} only advertises; it does not accept connections.` };
  const c = findCharacteristic(p, uuid);
  if (!c) return { ok: false, reason: "No such characteristic." };
  if (!c.properties.includes("read")) return { ok: false, reason: `${c.name} can only be notified, not read. Subscribe to it instead.` };
  const bytes = c.value(t);
  return { ok: true, bytes, text: c.decode(bytes) };
}

/* ------------------------------------------------------------------ */
/* Signal strength and distance                                        */
/* ------------------------------------------------------------------ */

/** Expected RSSI with no noise, dBm. */
export function expectedRssi(distanceM: number, n: number, power1m = -59): number {
  return power1m - 10 * n * Math.log10(Math.max(distanceM, 0.1));
}

/** One noisy RSSI reading, rounded to a whole dBm as phones report it. */
export function rssiReading(distanceM: number, n: number, rng: Rng, sigma = 3, power1m = -59): number {
  return Math.round(expectedRssi(distanceM, n, power1m) + rng.normal(0, sigma));
}

/** Distance the phone estimates from an RSSI, using the n it assumes. */
export function estimateDistance(rssi: number, nAssumed: number, power1m = -59): number {
  return 10 ** ((power1m - rssi) / (10 * nAssumed));
}

/** Average readings in dB first, then convert once. */
export function averageRssi(readings: number[]): number {
  return readings.reduce((a, b) => a + b, 0) / readings.length;
}

export const inRange = (rssi: number) => rssi >= RSSI_FLOOR;

/* ------------------------------------------------------------------ */
/* Advertising                                                         */
/* ------------------------------------------------------------------ */

export interface AdvPacket {
  t: number;
  peripheral: string;
  channel: 37 | 38 | 39;
}

/**
 * Advertising packets between `from` and `to` ms. Each advertising event
 * sends the same packet on channels 37, 38 and 39, about 0.5 ms apart; the
 * spec adds a random 0–10 ms delay to each event so devices do not collide
 * forever.
 */
export function advertising(p: Peripheral, from: number, to: number, seed = 1): AdvPacket[] {
  const rng = createRng(seed + p.id.length * 97);
  const out: AdvPacket[] = [];
  for (let t = 0; t < to; t += p.advIntervalMs + rng.next() * 10) {
    if (t < from) continue;
    ADVERTISING_CHANNELS.forEach((c, i) => out.push({ t: t + i * 0.5, peripheral: p.id, channel: c.channel }));
  }
  return out;
}
