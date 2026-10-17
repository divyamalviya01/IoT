/**
 * Lab L05: send the same readings over TCP and UDP through a lossy link and
 * compare delivery, retransmissions, time and bytes on the wire.
 *
 * Model (simplified, but faithful to the main ideas):
 * - Every packet in either direction is lost with probability lossPct.
 * - UDP: one datagram per reading, no replies.
 * - TCP: three-way handshake first; each data segment is acknowledged; a
 *   segment without an ACK is resent after a timeout (RTO) that doubles per
 *   retry. Duplicate arrivals are discarded by the receiver.
 * - Sizes count IPv4 (20) + transport header (UDP 8, TCP 20) + payload.
 */

import { createRng, type Rng } from "~/lib/sim/random";

export type Protocol = "tcp" | "udp";

export interface TransferConfig {
  protocol: Protocol;
  packets: number;
  lossPct: number;
  /** One-way delay, ms */
  delayMs: number;
  /** Gap between readings, ms */
  intervalMs: number;
  payloadBytes?: number;
  seed?: number;
}

export interface Flight {
  kind: "data" | "ack" | "handshake";
  label: string;
  /** Data packet number, if any */
  packet?: number;
  dir: "up" | "down";
  t0: number;
  t1: number;
  lost: boolean;
  retransmission?: boolean;
}

export interface TransferResult {
  delivered: number;
  lost: number;
  retransmissions: number;
  /** Handshake messages and ACKs */
  controlMessages: number;
  duplicates: number;
  bytesOnWire: number;
  /** When the transfer finished: last arrival (UDP) or last ACK received (TCP), ms */
  completionMs: number;
  /** Gave up (TCP only), e.g. could not connect */
  failed: boolean;
  flights: Flight[];
}

export const IP_HEADER = 20;
export const UDP_HEADER = 8;
export const TCP_HEADER = 20;
const MAX_RETRIES = 8;

export function udpDatagramBytes(payload: number) {
  return IP_HEADER + UDP_HEADER + payload;
}
export function tcpSegmentBytes(payload: number) {
  return IP_HEADER + TCP_HEADER + payload;
}

export function runTransfer(config: TransferConfig): TransferResult {
  const rng = createRng(config.seed ?? 1);
  return config.protocol === "udp" ? runUdp(config, rng) : runTcp(config, rng);
}

function runUdp(c: TransferConfig, rng: Rng): TransferResult {
  const payload = c.payloadBytes ?? 20;
  const flights: Flight[] = [];
  let delivered = 0;
  let completion = 0;
  for (let i = 0; i < c.packets; i++) {
    const t0 = i * c.intervalMs;
    const lost = rng.chance(c.lossPct / 100);
    flights.push({ kind: "data", label: `${i + 1}`, packet: i + 1, dir: "up", t0, t1: t0 + c.delayMs, lost });
    if (!lost) delivered++;
    completion = Math.max(completion, t0 + c.delayMs);
  }
  return {
    delivered,
    lost: c.packets - delivered,
    retransmissions: 0,
    controlMessages: 0,
    duplicates: 0,
    bytesOnWire: c.packets * udpDatagramBytes(payload),
    completionMs: completion,
    failed: false,
    flights,
  };
}

function runTcp(c: TransferConfig, rng: Rng): TransferResult {
  const payload = c.payloadBytes ?? 20;
  const d = c.delayMs;
  const rto0 = Math.max(4 * d, 200);
  const flights: Flight[] = [];
  const lose = () => rng.chance(c.lossPct / 100);
  let bytes = 0;
  let control = 0;
  let retransmissions = 0;

  // Three-way handshake. SYN is resent until a SYN-ACK comes back.
  let t = 0;
  let rto = rto0;
  let connected = false;
  for (let attempt = 0; attempt <= MAX_RETRIES && !connected; attempt++) {
    const synLost = lose();
    flights.push({ kind: "handshake", label: "SYN", dir: "up", t0: t, t1: t + d, lost: synLost, retransmission: attempt > 0 });
    bytes += tcpSegmentBytes(0);
    control++;
    if (attempt > 0) retransmissions++;
    if (!synLost) {
      const synAckLost = lose();
      flights.push({ kind: "handshake", label: "SYN-ACK", dir: "down", t0: t + d, t1: t + 2 * d, lost: synAckLost });
      bytes += tcpSegmentBytes(0);
      control++;
      if (!synAckLost) {
        // The final ACK travels with (or just before) the first data; count it.
        flights.push({ kind: "handshake", label: "ACK", dir: "up", t0: t + 2 * d, t1: t + 3 * d, lost: false });
        bytes += tcpSegmentBytes(0);
        control++;
        connected = true;
        t += 2 * d;
        break;
      }
    }
    t += rto;
    rto *= 2;
  }
  if (!connected) {
    return {
      delivered: 0,
      lost: c.packets,
      retransmissions,
      controlMessages: control,
      duplicates: 0,
      bytesOnWire: bytes,
      completionMs: t,
      failed: true,
      flights,
    };
  }

  let delivered = 0;
  let duplicates = 0;
  let completion = t;
  let failed = false;
  for (let i = 0; i < c.packets; i++) {
    let send = t + i * c.intervalMs;
    let rtoI = rto0;
    let received = false;
    let acked = false;
    for (let attempt = 0; attempt <= MAX_RETRIES && !acked; attempt++) {
      const dataLost = lose();
      flights.push({
        kind: "data",
        label: `${i + 1}`,
        packet: i + 1,
        dir: "up",
        t0: send,
        t1: send + d,
        lost: dataLost,
        retransmission: attempt > 0,
      });
      bytes += tcpSegmentBytes(payload);
      if (attempt > 0) retransmissions++;
      if (!dataLost) {
        if (received) duplicates++;
        received = true;
        const ackLost = lose();
        flights.push({ kind: "ack", label: `ACK ${i + 1}`, packet: i + 1, dir: "down", t0: send + d, t1: send + 2 * d, lost: ackLost });
        bytes += tcpSegmentBytes(0);
        control++;
        if (!ackLost) {
          acked = true;
          completion = Math.max(completion, send + 2 * d);
          break;
        }
      }
      send += rtoI;
      rtoI *= 2;
    }
    if (received) delivered++;
    if (!acked) failed = true;
  }

  return {
    delivered,
    lost: c.packets - delivered,
    retransmissions,
    controlMessages: control,
    duplicates,
    bytesOnWire: bytes,
    completionMs: completion,
    failed,
    flights: flights.sort((a, b) => a.t0 - b.t0),
  };
}

/* ------------------------------------------------------------------ */
/* UDP header inspector                                                */
/* ------------------------------------------------------------------ */

export interface UdpHeader {
  srcPort: number;
  dstPort: number;
  length: number;
  checksum: number;
  /** The whole datagram: 8 header bytes then the payload */
  bytes: number[];
}

const ip4 = (ip: string) => ip.split(".").map(Number);

/** One's-complement sum of 16-bit words, as used by the Internet checksum. */
function onesSum(words: number[]): number {
  let sum = 0;
  for (const w of words) {
    sum += w;
    sum = (sum & 0xffff) + (sum >>> 16);
  }
  return sum;
}

function toWords(bytes: number[]): number[] {
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i += 2) words.push((bytes[i] << 8) | (bytes[i + 1] ?? 0));
  return words;
}

function pseudoHeader(srcIp: string, dstIp: string, udpLength: number): number[] {
  return [...ip4(srcIp), ...ip4(dstIp), 0, 17, udpLength >> 8, udpLength & 0xff];
}

/** Builds a UDP datagram with a correct checksum (RFC 768, IPv4 pseudo-header). */
export function buildUdp(srcIp: string, dstIp: string, srcPort: number, dstPort: number, payload: string): UdpHeader {
  const data = [...new TextEncoder().encode(payload)];
  const length = UDP_HEADER + data.length;
  const header = [srcPort >> 8, srcPort & 0xff, dstPort >> 8, dstPort & 0xff, length >> 8, length & 0xff, 0, 0];
  const sum = onesSum(toWords([...pseudoHeader(srcIp, dstIp, length), ...header, ...data]));
  let checksum = ~sum & 0xffff;
  if (checksum === 0) checksum = 0xffff; // 0 means "no checksum" in UDP
  header[6] = checksum >> 8;
  header[7] = checksum & 0xff;
  return { srcPort, dstPort, length, checksum, bytes: [...header, ...data] };
}

/** True when the datagram's checksum is correct for these addresses. */
export function verifyUdp(srcIp: string, dstIp: string, datagram: number[]): boolean {
  const length = (datagram[4] << 8) | datagram[5];
  return onesSum(toWords([...pseudoHeader(srcIp, dstIp, length), ...datagram])) === 0xffff;
}
