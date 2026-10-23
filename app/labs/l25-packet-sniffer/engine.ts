/**
 * L25 Packet sniffer: a smart door lock and a phone app talk to an MQTT broker
 * on the home Wi-Fi. A sniffer on the same network captures every packet.
 *
 * Plain mode sends real MQTT 3.1.1 bytes on port 1883. TLS mode wraps the
 * same bytes in TLS 1.3-style records on port 8883, encrypted with real
 * AES-GCM (Web Crypto) under a fixed demo key, so every run looks the same.
 * Everything here is a simulation for learning; nothing touches a network.
 */
import { aesGcmDecrypt, aesGcmEncrypt, bytesText, flipBit, fromHex, textBytes, toHex, type Bytes } from "~/labs/l26-crypto-workbench/engine";

export type Mode = "plain" | "tls";

/* ------------------------------------------------------------------ */
/* MQTT 3.1.1 encoding                                                 */
/* ------------------------------------------------------------------ */

/** MQTT "remaining length": 7 bits per byte, high bit = more bytes follow. */
export function remainingLength(n: number): number[] {
  const out: number[] = [];
  do {
    let byte = n % 128;
    n = Math.floor(n / 128);
    if (n > 0) byte |= 0x80;
    out.push(byte);
  } while (n > 0);
  return out;
}

/** A UTF-8 string with its 2-byte length in front. */
function str(s: string): number[] {
  const b = textBytes(s);
  return [b.length >> 8, b.length & 0xff, ...b];
}

const packet = (header: number, body: number[]): Bytes => Uint8Array.from([header, ...remainingLength(body.length), ...body]);

export function mqttConnect(clientId: string, username: string, password: string, keepAlive = 60): Bytes {
  const flags = 0x80 | 0x40 | 0x02; // username, password, clean session
  return packet(0x10, [...str("MQTT"), 0x04, flags, keepAlive >> 8, keepAlive & 0xff, ...str(clientId), ...str(username), ...str(password)]);
}

export const mqttConnack = (): Bytes => Uint8Array.from([0x20, 0x02, 0x00, 0x00]);

export function mqttPublish(topic: string, payload: string): Bytes {
  return packet(0x30, [...str(topic), ...textBytes(payload)]);
}

export type Decoded =
  | { type: "CONNECT"; clientId: string; username: string; password: string }
  | { type: "CONNACK" }
  | { type: "PUBLISH"; topic: string; payload: string };

/** What anyone can read from plain MQTT bytes, without any key. */
export function decodeMqtt(bytes: Uint8Array): Decoded | null {
  const type = bytes[0] >> 4;
  let i = 1;
  while (bytes[i] & 0x80) i++;
  i++;
  const readStr = () => {
    const len = (bytes[i] << 8) | bytes[i + 1];
    const s = bytesText(bytes.slice(i + 2, i + 2 + len));
    i += 2 + len;
    return s;
  };
  if (type === 2) return { type: "CONNACK" };
  if (type === 3) {
    const topic = readStr();
    return { type: "PUBLISH", topic, payload: bytesText(bytes.slice(i)) };
  }
  if (type === 1) {
    readStr(); // "MQTT"
    i += 4; // level, flags, keep alive
    return { type: "CONNECT", clientId: readStr(), username: readStr(), password: readStr() };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* TLS 1.3-style records                                               */
/* ------------------------------------------------------------------ */

export const TLS_HEADER_BYTES = 5;
export const TLS_TAG_BYTES = 16;
/** Demo session key and IV. A real session derives fresh ones in every handshake. */
const DEMO_KEY = fromHex("8f2a6c11d05b4e7398a1c3e5f7092b4d");
const DEMO_IV = fromHex("a1b2c3d4e5f60718293a4b5c");

/** TLS 1.3 nonce: the IV with the record sequence number mixed into its last bytes. */
function nonce(seq: number): Bytes {
  const n = DEMO_IV.slice();
  for (let k = 0; k < 4; k++) n[11 - k] ^= (seq >> (8 * k)) & 0xff;
  return n;
}

/** Record = 17 03 03 + length + AES-GCM(data + content type 0x17) + 16-byte tag. */
export async function sealRecord(data: Bytes, seq: number): Promise<Bytes> {
  const inner = new Uint8Array(data.length + 1);
  inner.set(data);
  inner[data.length] = 0x17;
  const { ciphertext, tag } = await aesGcmEncrypt(DEMO_KEY, nonce(seq), inner);
  const len = ciphertext.length + tag.length;
  const out = new Uint8Array(TLS_HEADER_BYTES + len);
  out.set([0x17, 0x03, 0x03, len >> 8, len & 0xff]);
  out.set(ciphertext, TLS_HEADER_BYTES);
  out.set(tag, TLS_HEADER_BYTES + ciphertext.length);
  return out;
}

/** What the receiver does. Throws if any byte was changed on the way. */
export async function openRecord(record: Bytes, seq: number): Promise<Bytes> {
  const body = record.slice(TLS_HEADER_BYTES);
  const inner = await aesGcmDecrypt(DEMO_KEY, nonce(seq), { ciphertext: body.slice(0, body.length - TLS_TAG_BYTES), tag: body.slice(body.length - TLS_TAG_BYTES) });
  return inner.slice(0, inner.length - 1);
}

export const recordSize = (dataBytes: number) => TLS_HEADER_BYTES + dataBytes + 1 + TLS_TAG_BYTES;

/* ------------------------------------------------------------------ */
/* The captured conversation                                           */
/* ------------------------------------------------------------------ */

export const HOSTS = {
  lock: { name: "Door lock", ip: "192.168.1.23", port: 52144 },
  phone: { name: "Phone app", ip: "192.168.1.42", port: 50311 },
  broker: { name: "MQTT broker", ip: "192.168.1.10" },
} as const;

type Host = "lock" | "phone" | "broker";

interface Step {
  t: number;
  from: Host;
  to: Host;
  mqtt: Bytes;
  /** Which client connection carries it */
  conn: "lock" | "phone";
}

const STEPS: Step[] = [
  { t: 0.0, from: "lock", to: "broker", conn: "lock", mqtt: mqttConnect("door-1", "home", "secret123") },
  { t: 0.02, from: "broker", to: "lock", conn: "lock", mqtt: mqttConnack() },
  { t: 1.0, from: "lock", to: "broker", conn: "lock", mqtt: mqttPublish("home/door/state", "closed") },
  { t: 2.0, from: "phone", to: "broker", conn: "phone", mqtt: mqttConnect("phone-app", "priya", "sunflower7") },
  { t: 2.02, from: "broker", to: "phone", conn: "phone", mqtt: mqttConnack() },
  { t: 3.0, from: "phone", to: "broker", conn: "phone", mqtt: mqttPublish("home/door/cmd", "lock") },
  { t: 3.01, from: "broker", to: "lock", conn: "lock", mqtt: mqttPublish("home/door/cmd", "lock") },
  { t: 3.4, from: "lock", to: "broker", conn: "lock", mqtt: mqttPublish("home/door/state", "locked") },
  { t: 4.0, from: "lock", to: "broker", conn: "lock", mqtt: mqttPublish("home/door/battery", "87") },
];

/** IP (20) and TCP (20) headers carried by every packet */
export const IP_TCP_BYTES = 40;

/** Illustrative TLS 1.3 handshake sizes (a real certificate chain varies a lot). */
export const HANDSHAKE = [
  { info: "Client Hello (key share)", fromClient: true, bytes: 290 },
  { info: "Server Hello, Certificate, Finished (encrypted)", fromClient: false, bytes: 2350 },
  { info: "Client Finished (encrypted)", fromClient: true, bytes: 80 },
];

export interface Packet {
  no: number;
  t: number;
  src: string;
  dst: string;
  srcPort: number;
  dstPort: number;
  protocol: "MQTT" | "TLS";
  info: string;
  /** Bytes above TCP: the MQTT packet or the TLS record */
  data: Bytes;
  /** Total bytes on the wire, including IP and TCP headers */
  wireBytes: number;
  /** Plain MQTT only: what it says */
  decoded?: Decoded;
  /** TLS application data only: record sequence number on its connection */
  seq?: number;
  conn?: "lock" | "phone";
}

const describe = (d: Decoded | null) =>
  !d ? "?" : d.type === "CONNECT" ? `CONNECT client=${d.clientId} user=${d.username}` : d.type === "CONNACK" ? "CONNACK accepted" : `PUBLISH ${d.topic} = ${d.payload}`;

export async function capture(mode: Mode): Promise<Packet[]> {
  const port = mode === "plain" ? 1883 : 8883;
  const packets: Packet[] = [];
  const seq: Record<string, number> = { "lock>": 0, "lock<": 0, "phone>": 0, "phone<": 0 };
  const done = new Set<string>();
  const ends = (s: Step) => {
    const client = HOSTS[s.conn];
    const up = s.from !== "broker";
    return { src: up ? client.ip : HOSTS.broker.ip, dst: up ? HOSTS.broker.ip : client.ip, srcPort: up ? client.port : port, dstPort: up ? port : client.port };
  };

  for (const s of STEPS) {
    if (mode === "tls" && !done.has(s.conn)) {
      done.add(s.conn);
      const client = HOSTS[s.conn];
      HANDSHAKE.forEach((h, k) => {
        packets.push({
          no: 0,
          t: Math.max(0, s.t - 0.03 + k * 0.01),
          src: h.fromClient ? client.ip : HOSTS.broker.ip,
          dst: h.fromClient ? HOSTS.broker.ip : client.ip,
          srcPort: h.fromClient ? client.port : port,
          dstPort: h.fromClient ? port : client.port,
          protocol: "TLS",
          info: `Handshake: ${h.info}`,
          data: new Uint8Array(h.bytes),
          wireBytes: h.bytes + IP_TCP_BYTES,
        });
      });
    }
    const e = ends(s);
    if (mode === "plain") {
      const decoded = decodeMqtt(s.mqtt) ?? undefined;
      packets.push({ no: 0, t: s.t, ...e, protocol: "MQTT", info: describe(decoded ?? null), data: s.mqtt, wireBytes: s.mqtt.length + IP_TCP_BYTES, decoded });
    } else {
      const key = `${s.conn}${s.from === "broker" ? "<" : ">"}`;
      const n = seq[key]++;
      const record = await sealRecord(s.mqtt, n);
      packets.push({ no: 0, t: s.t, ...e, protocol: "TLS", info: `Application Data (${record.length} bytes)`, data: record, wireBytes: record.length + IP_TCP_BYTES, seq: n, conn: s.conn });
    }
  }
  packets.sort((a, b) => a.t - b.t);
  packets.forEach((p, i) => (p.no = i + 1));
  return packets;
}

/* ------------------------------------------------------------------ */
/* What the eavesdropper learns                                        */
/* ------------------------------------------------------------------ */

export interface Learned {
  passwords: { user: string; password: string }[];
  topics: string[];
  messages: { topic: string; payload: string }[];
  /** Always visible, even with encryption */
  talkers: string[];
  ports: number[];
  totalWireBytes: number;
}

export function learned(packets: Packet[]): Learned {
  const l: Learned = { passwords: [], topics: [], messages: [], talkers: [], ports: [], totalWireBytes: 0 };
  for (const p of packets) {
    l.totalWireBytes += p.wireBytes;
    for (const ip of [p.src, p.dst]) if (!l.talkers.includes(ip)) l.talkers.push(ip);
    const port = Math.min(p.srcPort, p.dstPort);
    if (!l.ports.includes(port)) l.ports.push(port);
    const d = p.decoded;
    if (d?.type === "CONNECT") l.passwords.push({ user: d.username, password: d.password });
    if (d?.type === "PUBLISH") {
      l.messages.push({ topic: d.topic, payload: d.payload });
      if (!l.topics.includes(d.topic)) l.topics.push(d.topic);
    }
  }
  return l;
}

/** Does any of the secret text appear anywhere in the captured bytes? */
export function visibleText(packets: Packet[], text: string): boolean {
  const needle = toHex(textBytes(text));
  return packets.some((p) => toHex(p.data).includes(needle));
}

/* ------------------------------------------------------------------ */
/* Tampering in transit (simulated)                                    */
/* ------------------------------------------------------------------ */

export interface TamperResult {
  accepted: boolean;
  /** What the door lock ends up doing */
  outcome: string;
  detail: string;
}

/**
 * Someone on the network changes the phone's "lock" command on its way to the
 * door. Plain MQTT has no integrity check, so the changed command is obeyed.
 * With TLS, any changed byte makes the AES-GCM tag check fail.
 */
export async function tamper(mode: Mode): Promise<TamperResult> {
  const packets = await capture(mode);
  const target = packets.find((p) => p.dst === HOSTS.lock.ip && (mode === "tls" ? p.info.startsWith("Application") && p.seq === 1 : p.decoded?.type === "PUBLISH"));
  if (!target) throw new Error("No command to the lock was captured.");
  if (mode === "plain") {
    const changed = mqttPublish("home/door/cmd", "unlock");
    const d = decodeMqtt(changed);
    return { accepted: true, outcome: "The door UNLOCKS", detail: `The broker forwarded "${d?.type === "PUBLISH" ? d.payload : "?"}" instead of "lock". Plain MQTT cannot tell that the bytes were changed.` };
  }
  try {
    await openRecord(flipBit(target.data, TLS_HEADER_BYTES + 12, 3), target.seq ?? 0);
    return { accepted: true, outcome: "The door obeys", detail: "The change went unnoticed." };
  } catch {
    return { accepted: false, outcome: "The door stays locked", detail: "The AES-GCM authentication tag did not match, so the lock threw the record away and closed the connection." };
  }
}
