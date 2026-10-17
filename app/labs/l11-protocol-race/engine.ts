/**
 * Lab L11: the same sensor readings sent with different protocols over the
 * same lossy link, compared on bytes, delivery, delay and energy.
 *
 * Sizes count IP and above (IPv4 20, TCP 20, UDP 8) plus each protocol's own
 * bytes. Every packet is lost with probability lossPct. TCP-based protocols
 * resend lost segments (so even MQTT QoS 0 gets through, just later); CoAP
 * CON resends with its own timers; CoAP NON does not resend at all.
 * Energy is in illustrative units: 1 per byte plus 30 per packet (each
 * packet wakes the radio).
 */

import { createRng, type Rng } from "~/lib/sim/random";

export type RaceProtocol = "coapNon" | "coapCon" | "mqtt0" | "mqtt1" | "xmpp" | "httpKeep" | "httpNew";

export const RACE_PROTOCOLS: RaceProtocol[] = ["coapNon", "coapCon", "mqtt0", "mqtt1", "xmpp", "httpKeep", "httpNew"];

export const PROTOCOL_LABEL: Record<RaceProtocol, string> = {
  coapNon: "CoAP NON",
  coapCon: "CoAP CON",
  mqtt0: "MQTT QoS 0",
  mqtt1: "MQTT QoS 1",
  xmpp: "XMPP",
  httpKeep: "HTTP (kept open)",
  httpNew: "HTTP (new connection)",
};

export const PROTOCOL_NOTE: Record<RaceProtocol, string> = {
  coapNon: "One UDP datagram per reading; nothing is resent.",
  coapCon: "UDP request and a small ACK; resent after 2–3 s, doubling.",
  mqtt0: "One PUBLISH over an open TCP connection; TCP resends lost segments.",
  mqtt1: "PUBLISH plus PUBACK over TCP.",
  xmpp: "An XML message stanza over an open TCP connection.",
  httpKeep: "A POST request and response over a connection that stays open.",
  httpNew: "A new TCP connection (handshake and close) for every reading.",
};

const IP = 20;
const TCP = 20;
const UDP = 8;
const ENERGY_PER_PACKET = 30;
const MAX_TRIES = 8;

const utf8 = (s: string) => new TextEncoder().encode(s).length;
const seg = (appBytes: number) => IP + TCP + appBytes;
const dgram = (appBytes: number) => IP + UDP + appBytes;

export interface RaceConfig {
  messages: number;
  payload: string;
  lossPct: number;
  /** One-way delay, ms */
  delayMs: number;
  seed?: number;
}

export interface RaceResult {
  protocol: RaceProtocol;
  totalBytes: number;
  bytesPerReading: number;
  packets: number;
  deliveredPct: number;
  /** Average time until the server has the reading, delivered readings only, ms */
  avgDelayMs: number;
  energyPerReading: number;
  /** One-time connection setup included in the totals */
  setupBytes: number;
}

/** Application-layer sizes for one reading, used by the model and shown in the lab. */
export function appSizes(payload: string) {
  const p = utf8(payload);
  const topic = "home/temp";
  const httpRequest = `POST /readings HTTP/1.1\r\nHost: api.example.com\r\nContent-Type: text/plain\r\nContent-Length: ${p}\r\n\r\n${payload}`;
  const httpResponse = "HTTP/1.1 204 No Content\r\nServer: lab\r\n\r\n";
  const xmppStanza = `<message from="sensor1@home.example/kitchen" to="dashboard@home.example" type="chat"><body>${payload}</body></message>`;
  return {
    coapRequest: 4 + 2 + 1 + 8 + 1 + p, // header, token, Uri-Path "readings", marker, payload
    coapAck: 4 + 2, // ACK 2.04 Changed with the token
    mqttPublish0: 2 + 2 + utf8(topic) + p,
    mqttPublish1: 2 + 2 + utf8(topic) + 2 + p, // plus packet ID
    mqttPuback: 4,
    httpRequest: utf8(httpRequest),
    httpResponse: utf8(httpResponse),
    xmppStanza: utf8(xmppStanza),
  };
}

/** One-time setup packets for protocols that keep a connection open. */
function setupFor(protocol: RaceProtocol): number[] {
  const handshake = [seg(0), seg(0), seg(0)];
  switch (protocol) {
    case "mqtt0":
    case "mqtt1":
      // TCP handshake, CONNECT (client ID "sensor1"), CONNACK, TCP ACK.
      return [...handshake, seg(2 + 10 + 2 + 7), seg(4), seg(0)];
    case "xmpp":
      // TCP handshake, stream headers, authentication and resource binding (approximate).
      return [...handshake, seg(160), seg(220), seg(120), seg(110), seg(150), seg(140), seg(0)];
    case "httpKeep":
      return handshake;
    default:
      return [];
  }
}

interface Tally {
  bytes: number;
  packets: number;
}

/**
 * Request–reply with retries: resend the request after `timer(attempt)` until a
 * reply comes back. Returns when the request first arrived, or null if never.
 */
function roundTrip(
  req: number,
  res: number,
  start: number,
  d: number,
  timer: (attempt: number) => number,
  lose: () => boolean,
  t: Tally,
): { arrived: number | null; done: number } {
  let now = start;
  let arrived: number | null = null;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    t.bytes += req;
    t.packets++;
    if (!lose()) {
      arrived ??= now + d;
      t.bytes += res;
      t.packets++;
      if (!lose()) return { arrived, done: now + 2 * d };
    }
    now += timer(attempt);
  }
  return { arrived, done: now };
}

function runOne(protocol: RaceProtocol, c: RaceConfig, rng: Rng): RaceResult {
  const lose = () => rng.chance(c.lossPct / 100);
  const d = c.delayMs;
  const s = appSizes(c.payload);
  const tcpTimer = (a: number) => Math.max(200, 4 * d) * 2 ** a;
  const coapBase = 2000 * (1 + rng.next() * 0.5);
  const coapTimer = (a: number) => coapBase * 2 ** a;

  const setup = setupFor(protocol);
  const tally: Tally = { bytes: setup.reduce((a, b) => a + b, 0), packets: setup.length };
  const setupBytes = tally.bytes;
  let delivered = 0;
  let delaySum = 0;

  for (let i = 0; i < c.messages; i++) {
    let arrived: number | null = null;
    switch (protocol) {
      case "coapNon":
        tally.bytes += dgram(s.coapRequest);
        tally.packets++;
        arrived = lose() ? null : d;
        break;
      case "coapCon":
        arrived = roundTrip(dgram(s.coapRequest), dgram(s.coapAck), 0, d, coapTimer, lose, tally).arrived;
        break;
      case "mqtt0":
        arrived = roundTrip(seg(s.mqttPublish0), seg(0), 0, d, tcpTimer, lose, tally).arrived;
        break;
      case "mqtt1":
        arrived = roundTrip(seg(s.mqttPublish1), seg(s.mqttPuback), 0, d, tcpTimer, lose, tally).arrived;
        tally.bytes += seg(0); // TCP ACK for the PUBACK
        tally.packets++;
        break;
      case "xmpp":
        arrived = roundTrip(seg(s.xmppStanza), seg(0), 0, d, tcpTimer, lose, tally).arrived;
        break;
      case "httpKeep":
        arrived = roundTrip(seg(s.httpRequest), seg(s.httpResponse), 0, d, tcpTimer, lose, tally).arrived;
        tally.bytes += seg(0);
        tally.packets++;
        break;
      case "httpNew": {
        const hs = roundTrip(seg(0), seg(0), 0, d, tcpTimer, lose, tally);
        if (hs.arrived !== null) {
          const req = roundTrip(seg(s.httpRequest), seg(s.httpResponse), hs.done, d, tcpTimer, lose, tally);
          arrived = req.arrived;
        }
        tally.bytes += 4 * seg(0); // close: FIN, ACK, FIN, ACK
        tally.packets += 4;
        break;
      }
    }
    if (arrived !== null) {
      delivered++;
      delaySum += arrived;
    }
  }

  return {
    protocol,
    totalBytes: tally.bytes,
    bytesPerReading: tally.bytes / c.messages,
    packets: tally.packets,
    deliveredPct: (delivered / c.messages) * 100,
    avgDelayMs: delivered ? delaySum / delivered : 0,
    energyPerReading: (tally.bytes + ENERGY_PER_PACKET * tally.packets) / c.messages,
    setupBytes,
  };
}

/** Runs every protocol on its own copy of the same random sequence, so the race is fair. */
export function race(c: RaceConfig, protocols: RaceProtocol[] = RACE_PROTOCOLS): RaceResult[] {
  return protocols.map((p) => runOne(p, c, createRng(c.seed ?? 1)));
}
