/**
 * Lab L10: an IoT gateway that decodes frames from three local protocols and
 * republishes the values as MQTT JSON, applying mapping and filtering rules.
 *
 * Frame formats (simplified but byte-accurate):
 * - Zigbee ZCL "Report Attributes" for the Temperature Measurement cluster:
 *   frame control, sequence, command 0x0A, attribute 0x0000 (LE), type 0x29
 *   (int16), value in 0.01 °C (LE).
 * - BLE advertising data, manufacturer-specific AD structure: length, type
 *   0xFF, company ID 0xFFFF (test), temperature int16 in 0.01 °C (LE),
 *   humidity uint8 in %.
 * - Modbus RTU response to function 0x03 (read holding registers) for two
 *   registers: voltage in 0.1 V and power in W (big-endian), plus CRC-16.
 */

import { createRng, type Rng } from "~/lib/sim/random";

export type DeviceKind = "zigbee" | "ble" | "modbus";

export interface Device {
  id: string;
  kind: DeviceKind;
  name: string;
  location: string;
  /** Seconds between frames */
  every: number;
}

export const DEVICES: Device[] = [
  { id: "zb1", kind: "zigbee", name: "Zigbee temperature sensor", location: "kitchen", every: 2 },
  { id: "ble1", kind: "ble", name: "BLE climate sensor", location: "livingroom", every: 1 },
  { id: "mb1", kind: "modbus", name: "Modbus energy meter", location: "mainpanel", every: 1 },
];

export interface Reading {
  quantity: string;
  value: number;
  unit: string;
}

export interface DecodedField {
  name: string;
  /** Indexes of the bytes this field came from */
  bytes: number[];
  raw: string;
  meaning: string;
}

export interface Decoded {
  fields: DecodedField[];
  readings: Reading[];
}

const hex = (n: number) => n.toString(16).padStart(2, "0");
export const toHex = (bytes: number[]) => bytes.map(hex).join(" ");

/** CRC-16/MODBUS (polynomial 0xA001 reflected, initial 0xFFFF). */
export function crc16Modbus(bytes: number[]): number {
  let crc = 0xffff;
  for (const b of bytes) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
  }
  return crc;
}

const le16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
const be16 = (n: number) => [(n >> 8) & 0xff, n & 0xff];
const int16 = (lo: number, hi: number) => {
  const v = lo | (hi << 8);
  return v & 0x8000 ? v - 0x10000 : v;
};

export interface DeviceValues {
  temperature?: number;
  humidity?: number;
  voltage?: number;
  power?: number;
}

/** Builds the raw frame a device would send. */
export function encodeFrame(kind: DeviceKind, v: DeviceValues, seq = 0x2a): number[] {
  if (kind === "zigbee") {
    const raw = Math.round((v.temperature ?? 0) * 100) & 0xffff;
    return [0x18, seq & 0xff, 0x0a, 0x00, 0x00, 0x29, ...le16(raw)];
  }
  if (kind === "ble") {
    const raw = Math.round((v.temperature ?? 0) * 100) & 0xffff;
    const hum = Math.max(0, Math.min(100, Math.round(v.humidity ?? 0)));
    return [0x06, 0xff, 0xff, 0xff, ...le16(raw), hum];
  }
  const body = [0x01, 0x03, 0x04, ...be16(Math.round((v.voltage ?? 0) * 10)), ...be16(Math.round(v.power ?? 0))];
  const crc = crc16Modbus(body);
  return [...body, crc & 0xff, (crc >> 8) & 0xff];
}

/** Decodes a frame into labelled fields and physical readings. Throws on a bad frame. */
export function decodeFrame(kind: DeviceKind, b: number[]): Decoded {
  if (kind === "zigbee") {
    if (b.length !== 8 || b[2] !== 0x0a || b[5] !== 0x29) throw new Error("Not a ZCL temperature report");
    const raw = int16(b[6], b[7]);
    return {
      fields: [
        { name: "Frame control", bytes: [0], raw: hex(b[0]), meaning: "Server to client, no manufacturer code" },
        { name: "Sequence number", bytes: [1], raw: hex(b[1]), meaning: `Message ${b[1]}` },
        { name: "Command", bytes: [2], raw: hex(b[2]), meaning: "0x0A: Report Attributes" },
        { name: "Attribute ID", bytes: [3, 4], raw: `${hex(b[3])} ${hex(b[4])}`, meaning: "0x0000: MeasuredValue (temperature cluster)" },
        { name: "Data type", bytes: [5], raw: hex(b[5]), meaning: "0x29: signed 16-bit integer" },
        { name: "Value", bytes: [6, 7], raw: `${hex(b[6])} ${hex(b[7])}`, meaning: `${raw} (little-endian), in hundredths of a degree` },
      ],
      readings: [{ quantity: "temperature", value: raw / 100, unit: "C" }],
    };
  }
  if (kind === "ble") {
    if (b.length !== 7 || b[1] !== 0xff) throw new Error("Not a manufacturer data structure");
    const raw = int16(b[4], b[5]);
    return {
      fields: [
        { name: "Length", bytes: [0], raw: hex(b[0]), meaning: "6 bytes follow" },
        { name: "AD type", bytes: [1], raw: hex(b[1]), meaning: "0xFF: manufacturer-specific data" },
        { name: "Company ID", bytes: [2, 3], raw: `${hex(b[2])} ${hex(b[3])}`, meaning: "0xFFFF: reserved for testing" },
        { name: "Temperature", bytes: [4, 5], raw: `${hex(b[4])} ${hex(b[5])}`, meaning: `${raw} (little-endian), in hundredths of a degree` },
        { name: "Humidity", bytes: [6], raw: hex(b[6]), meaning: `${b[6]}%` },
      ],
      readings: [
        { quantity: "temperature", value: raw / 100, unit: "C" },
        { quantity: "humidity", value: b[6], unit: "%" },
      ],
    };
  }
  if (b.length !== 9 || b[1] !== 0x03 || b[2] !== 0x04) throw new Error("Not a Modbus read-registers response");
  const crc = crc16Modbus(b.slice(0, 7));
  if ((crc & 0xff) !== b[7] || ((crc >> 8) & 0xff) !== b[8]) throw new Error("Modbus CRC check failed");
  const volts = ((b[3] << 8) | b[4]) / 10;
  const watts = (b[5] << 8) | b[6];
  return {
    fields: [
      { name: "Slave address", bytes: [0], raw: hex(b[0]), meaning: "Meter number 1" },
      { name: "Function", bytes: [1], raw: hex(b[1]), meaning: "0x03: read holding registers" },
      { name: "Byte count", bytes: [2], raw: hex(b[2]), meaning: "4 data bytes (two registers)" },
      { name: "Register 1", bytes: [3, 4], raw: `${hex(b[3])} ${hex(b[4])}`, meaning: `${(b[3] << 8) | b[4]} (big-endian), in tenths of a volt` },
      { name: "Register 2", bytes: [5, 6], raw: `${hex(b[5])} ${hex(b[6])}`, meaning: `${watts} watts` },
      { name: "CRC", bytes: [7, 8], raw: `${hex(b[7])} ${hex(b[8])}`, meaning: "Error check: matches the data" },
    ],
    readings: [
      { quantity: "voltage", value: volts, unit: "V" },
      { quantity: "power", value: watts, unit: "W" },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Gateway rules                                                       */
/* ------------------------------------------------------------------ */

export interface Rules {
  /** Placeholders: {location}, {quantity}, {device} */
  topicTemplate: string;
  fahrenheit: boolean;
  /** Publish only if the value changed by at least this percentage since the last publish (0 = always) */
  deadbandPct: number;
}

export const DEFAULT_RULES: Rules = { topicTemplate: "site/{location}/{quantity}", fahrenheit: false, deadbandPct: 0 };

export interface MqttOut {
  topic: string;
  payload: string;
  /** PUBLISH size at QoS 0: fixed header 2 + topic length 2 + topic + payload */
  bytes: number;
}

const utf8 = (s: string) => new TextEncoder().encode(s).length;

export function topicFor(template: string, device: Device, quantity: string): string {
  return template
    .replaceAll("{location}", device.location)
    .replaceAll("{quantity}", quantity)
    .replaceAll("{device}", device.id);
}

export function convert(reading: Reading, rules: Rules): Reading {
  if (rules.fahrenheit && reading.unit === "C") {
    return { ...reading, value: Math.round((reading.value * 9) / 5 * 100 + 3200) / 100, unit: "F" };
  }
  return reading;
}

export function toMqtt(device: Device, reading: Reading, rules: Rules): MqttOut {
  const r = convert(reading, rules);
  const topic = topicFor(rules.topicTemplate, device, r.quantity);
  const payload = JSON.stringify({ value: r.value, unit: r.unit });
  return { topic, payload, bytes: 2 + 2 + utf8(topic) + utf8(payload) };
}

/** Remembers the last published value per device and quantity, to apply the deadband. */
export class Gateway {
  private last = new Map<string, number>();

  constructor(public rules: Rules) {}

  process(device: Device, frame: number[]): { decoded: Decoded; out: MqttOut[]; dropped: number } {
    const decoded = decodeFrame(device.kind, frame);
    const out: MqttOut[] = [];
    let dropped = 0;
    for (const reading of decoded.readings) {
      const key = `${device.id}/${reading.quantity}`;
      const prev = this.last.get(key);
      if (
        prev !== undefined &&
        this.rules.deadbandPct > 0 &&
        Math.abs(reading.value - prev) < (Math.abs(prev) * this.rules.deadbandPct) / 100
      ) {
        dropped++;
        continue;
      }
      this.last.set(key, reading.value);
      out.push(toMqtt(device, reading, this.rules));
    }
    return { decoded, out, dropped };
  }
}

/* ------------------------------------------------------------------ */
/* Simulation over time                                                */
/* ------------------------------------------------------------------ */

export interface FrameEvent {
  t: number;
  device: Device;
  frame: number[];
  out: MqttOut[];
  dropped: number;
}

export interface Totals {
  frames: number;
  bytesIn: number;
  messagesOut: number;
  bytesOut: number;
  dropped: number;
}

/** Always-on load behind the energy meter (router, standby devices), watts. */
const BASE_LOAD_W = 380;
/** Appliances that switch on and off behind the energy meter. */
export const APPLIANCES = [
  { name: "phone charger", watts: 12 },
  { name: "LED lights", watts: 30 },
  { name: "television", watts: 100 },
  { name: "fridge", watts: 150 },
  { name: "kettle", watts: 1500 },
];
/** Chance per meter frame (1 s) that one appliance switches */
const APPLIANCE_SWITCH_CHANCE = 0.3;

/**
 * Steady values with small random changes, like real sensors. The energy
 * meter also sees appliances switching, so its power jumps now and then.
 */
export class GatewaySim {
  time = 0;
  events: FrameEvent[] = [];
  totals: Totals = { frames: 0, bytesIn: 0, messagesOut: 0, bytesOut: 0, dropped: 0 };
  private rng: Rng;
  private gateway: Gateway;
  private next = new Map<string, number>();
  private values: Record<string, DeviceValues> = {
    zb1: { temperature: 28.5 },
    ble1: { temperature: 26.2, humidity: 62 },
    mb1: { voltage: 230.5, power: BASE_LOAD_W },
  };
  private appliancesOn = new Set<number>();
  private seq = 0;

  constructor(
    rules: Rules,
    public enabled: Set<string> = new Set(DEVICES.map((d) => d.id)),
    seed = 11,
  ) {
    this.rng = createRng(seed);
    this.gateway = new Gateway(rules);
    DEVICES.forEach((d, i) => this.next.set(d.id, 0.1 + i * 0.3));
  }

  private drift(id: string) {
    const v = this.values[id];
    if (v.temperature !== undefined) v.temperature = Math.round((v.temperature + this.rng.normal(0, 0.08)) * 100) / 100;
    if (v.humidity !== undefined) v.humidity = Math.max(0, Math.min(100, v.humidity + (this.rng.chance(0.15) ? this.rng.pick([-1, 1]) : 0)));
    if (v.voltage !== undefined) v.voltage = Math.round((v.voltage + this.rng.normal(0, 0.3)) * 10) / 10;
    if (v.power !== undefined) {
      // Now and then an appliance switches on or off: a real change the deadband should pass.
      if (this.rng.chance(APPLIANCE_SWITCH_CHANCE)) {
        const a = this.rng.int(0, APPLIANCES.length - 1);
        if (!this.appliancesOn.delete(a)) this.appliancesOn.add(a);
      }
      const load = BASE_LOAD_W + [...this.appliancesOn].reduce((s, a) => s + APPLIANCES[a].watts, 0);
      v.power = Math.max(0, Math.round(load + this.rng.normal(0, 5)));
    }
  }

  /** Advances by dt seconds and returns the new frame events. */
  advance(dt: number): FrameEvent[] {
    const end = this.time + dt;
    const fresh: FrameEvent[] = [];
    for (const device of DEVICES) {
      let at = this.next.get(device.id)!;
      while (at <= end) {
        if (this.enabled.has(device.id)) {
          this.drift(device.id);
          const frame = encodeFrame(device.kind, this.values[device.id], this.seq++ & 0xff);
          const { out, dropped } = this.gateway.process(device, frame);
          const ev: FrameEvent = { t: at, device, frame, out, dropped };
          fresh.push(ev);
          this.totals.frames++;
          this.totals.bytesIn += frame.length;
          this.totals.messagesOut += out.length;
          this.totals.bytesOut += out.reduce((s, m) => s + m.bytes, 0);
          this.totals.dropped += dropped;
        }
        at += device.every;
      }
      this.next.set(device.id, at);
    }
    fresh.sort((a, b) => a.t - b.t);
    this.events.push(...fresh);
    if (this.events.length > 300) this.events.splice(0, this.events.length - 300);
    this.time = end;
    return fresh;
  }
}
