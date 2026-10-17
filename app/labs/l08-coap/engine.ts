/**
 * Lab L08: CoAP messages encoded exactly as RFC 7252 specifies, and a
 * confirmable/non-confirmable exchange over a lossy link with the standard
 * retransmission timing (ACK_TIMEOUT 2 s, ACK_RANDOM_FACTOR 1.5,
 * MAX_RETRANSMIT 4).
 */

import { createRng } from "~/lib/sim/random";

export type MsgType = "CON" | "NON" | "ACK" | "RST";
const TYPE_NUM: Record<MsgType, number> = { CON: 0, NON: 1, ACK: 2, RST: 3 };

export interface Code {
  cls: number;
  detail: number;
}

export const CODES = {
  GET: { cls: 0, detail: 1 },
  POST: { cls: 0, detail: 2 },
  PUT: { cls: 0, detail: 3 },
  DELETE: { cls: 0, detail: 4 },
  Created: { cls: 2, detail: 1 },
  Changed: { cls: 2, detail: 4 },
  Content: { cls: 2, detail: 5 },
  NotFound: { cls: 4, detail: 4 },
} satisfies Record<string, Code>;

export const OPTION = { Observe: 6, UriPath: 11, ContentFormat: 12, UriQuery: 15 } as const;

export interface CoapOption {
  number: number;
  value: number[];
}

export interface CoapMessage {
  type: MsgType;
  code: Code;
  mid: number;
  token: number[];
  options: CoapOption[];
  payload?: string;
}

export const codeText = (c: Code) => `${c.cls}.${String(c.detail).padStart(2, "0")}`;

const utf8 = (s: string) => [...new TextEncoder().encode(s)];

/** Smallest unsigned big-endian encoding; 0 encodes as zero bytes. */
export function uintBytes(n: number): number[] {
  const out: number[] = [];
  while (n > 0) {
    out.unshift(n & 0xff);
    n = Math.floor(n / 256);
  }
  return out;
}

export function uriPath(path: string): CoapOption[] {
  return path
    .split("/")
    .filter(Boolean)
    .map((seg) => ({ number: OPTION.UriPath, value: utf8(seg) }));
}

function nibble(v: number): { n: number; ext: number[] } {
  if (v < 13) return { n: v, ext: [] };
  if (v < 269) return { n: 13, ext: [v - 13] };
  const e = v - 269;
  return { n: 14, ext: [e >> 8, e & 0xff] };
}

export function encode(m: CoapMessage): number[] {
  if (m.token.length > 8) throw new Error("Token longer than 8 bytes");
  const bytes = [(1 << 6) | (TYPE_NUM[m.type] << 4) | m.token.length, (m.code.cls << 5) | m.code.detail, (m.mid >> 8) & 0xff, m.mid & 0xff, ...m.token];
  let prev = 0;
  for (const o of [...m.options].sort((a, b) => a.number - b.number)) {
    const d = nibble(o.number - prev);
    const l = nibble(o.value.length);
    bytes.push((d.n << 4) | l.n, ...d.ext, ...l.ext, ...o.value);
    prev = o.number;
  }
  if (m.payload) bytes.push(0xff, ...utf8(m.payload));
  return bytes;
}

/** The example request used across the course: CON GET /temp, token 7d 34, MID 0x1a2b. */
export function exampleRequest(type: "CON" | "NON" = "CON", path = "/temp", mid = 0x1a2b): CoapMessage {
  return { type, code: CODES.GET, mid, token: [0x7d, 0x34], options: uriPath(path) };
}

export function exampleResponse(request: CoapMessage, value: string): CoapMessage {
  return {
    type: request.type === "CON" ? "ACK" : "NON",
    code: CODES.Content,
    mid: request.type === "CON" ? request.mid : (request.mid + 1) & 0xffff,
    token: request.token,
    options: [{ number: OPTION.ContentFormat, value: uintBytes(0) }],
    payload: value,
  };
}

/* ------------------------------------------------------------------ */
/* Exchange over a lossy link                                          */
/* ------------------------------------------------------------------ */

export const ACK_TIMEOUT = 2000;
export const ACK_RANDOM_FACTOR = 1.5;
export const MAX_RETRANSMIT = 4;

export interface Transmission {
  kind: "request" | "response";
  t: number;
  lost: boolean;
  retransmission: boolean;
  /** Timeout started after this request, ms (requests only) */
  timeout?: number;
}

export interface ExchangeResult {
  transmissions: Transmission[];
  success: boolean;
  /** Time the answer arrived, or the time the client gave up, ms */
  timeMs: number;
  requestsSent: number;
  bytesSent: number;
}

export interface ExchangeConfig {
  type: "CON" | "NON";
  lossPct: number;
  /** One-way delay, ms */
  delayMs?: number;
  seed?: number;
}

export function exchange(c: ExchangeConfig): ExchangeResult {
  const rng = createRng(c.seed ?? 1);
  const d = c.delayMs ?? 50;
  const lose = () => rng.chance(c.lossPct / 100);
  const req = exampleRequest(c.type);
  const reqBytes = encode(req).length;
  const resBytes = encode(exampleResponse(req, "28.5")).length;
  const tx: Transmission[] = [];
  let bytes = 0;

  if (c.type === "NON") {
    const lost = lose();
    tx.push({ kind: "request", t: 0, lost, retransmission: false });
    bytes += reqBytes;
    if (lost) return { transmissions: tx, success: false, timeMs: 0, requestsSent: 1, bytesSent: bytes };
    const resLost = lose();
    tx.push({ kind: "response", t: d, lost: resLost, retransmission: false });
    bytes += resBytes;
    return { transmissions: tx, success: !resLost, timeMs: 2 * d, requestsSent: 1, bytesSent: bytes };
  }

  // Initial timeout is random between ACK_TIMEOUT and ACK_TIMEOUT × ACK_RANDOM_FACTOR.
  let timeout = ACK_TIMEOUT * (1 + rng.next() * (ACK_RANDOM_FACTOR - 1));
  let t = 0;
  for (let attempt = 0; attempt <= MAX_RETRANSMIT; attempt++) {
    const lost = lose();
    tx.push({ kind: "request", t, lost, retransmission: attempt > 0, timeout: Math.round(timeout) });
    bytes += reqBytes;
    if (!lost) {
      // The server answers every copy (it recognises duplicates by message ID).
      const resLost = lose();
      tx.push({ kind: "response", t: t + d, lost: resLost, retransmission: attempt > 0 });
      bytes += resBytes;
      if (!resLost) {
        return { transmissions: tx, success: true, timeMs: Math.round(t + 2 * d), requestsSent: attempt + 1, bytesSent: bytes };
      }
    }
    t += timeout;
    timeout *= 2;
  }
  // After the last try, the client waits out its timeout and gives up.
  const lastRequest = [...tx].reverse().find((x) => x.kind === "request")!;
  return {
    transmissions: tx,
    success: false,
    timeMs: Math.round(lastRequest.t + (lastRequest.timeout ?? 0)),
    requestsSent: MAX_RETRANSMIT + 1,
    bytesSent: bytes,
  };
}

/* ------------------------------------------------------------------ */
/* Observe                                                             */
/* ------------------------------------------------------------------ */

/** With Observe, the server sends a notification only when the value changes. */
export function notificationsFor(values: number[]): { seq: number; value: number; index: number }[] {
  const out: { seq: number; value: number; index: number }[] = [];
  let last: number | undefined;
  values.forEach((value, index) => {
    if (value !== last) {
      out.push({ seq: out.length + 1, value, index });
      last = value;
    }
  });
  return out;
}
