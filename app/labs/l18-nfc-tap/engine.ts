/**
 * Lab L18: NDEF records on an NFC tag, and how close a phone must be.
 *
 * Records are encoded as NFC Forum NDEF: a header byte (MB, ME, CF, SR, IL,
 * TNF), type length, payload length (1 byte for a short record, 4 bytes
 * otherwise), the type ("U" or "T") and the payload. On a Type 2 tag such as
 * an NTAG the message sits in a TLV: 03, its length (1 byte up to 254,
 * otherwise FF + 2 bytes), the message, then FE.
 *
 * The phone reads the tag through a magnetic field that falls off steeply:
 * H/H0 = (r² / (r² + d²))^1.5 for a reader coil of radius r. Reads are
 * reliable up to about 4 cm and fail by about 8 cm (10 cm is the
 * theoretical limit).
 */

import { createRng } from "~/lib/sim/random";

export const URI_PREFIXES: { code: number; prefix: string }[] = [
  { code: 0x01, prefix: "http://www." },
  { code: 0x02, prefix: "https://www." },
  { code: 0x03, prefix: "http://" },
  { code: 0x04, prefix: "https://" },
  { code: 0x05, prefix: "tel:" },
  { code: 0x06, prefix: "mailto:" },
];

export const TAGS = [
  { id: "ntag213", name: "NTAG213", capacity: 144 },
  { id: "ntag215", name: "NTAG215", capacity: 504 },
  { id: "ntag216", name: "NTAG216", capacity: 888 },
] as const;
export type TagId = (typeof TAGS)[number]["id"];

const TNF_WELL_KNOWN = 0x01;
const utf8 = (s: string) => [...new TextEncoder().encode(s)];
export const hex = (bytes: number[]) => bytes.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");

export interface RecordPart {
  name: string;
  bytes: number[];
  meaning: string;
}

export interface NdefRecord {
  kind: "uri" | "text";
  parts: RecordPart[];
  bytes: number[];
  payloadLength: number;
  short: boolean;
}

function record(type: string, payload: number[], kind: NdefRecord["kind"], payloadParts: RecordPart[]): NdefRecord {
  const short = payload.length <= 255;
  // MB and ME (only record in the message), SR if short, TNF well-known.
  const header = 0x80 | 0x40 | (short ? 0x10 : 0) | TNF_WELL_KNOWN;
  const typeBytes = utf8(type);
  const length = short
    ? [payload.length]
    : [(payload.length >>> 24) & 0xff, (payload.length >>> 16) & 0xff, (payload.length >>> 8) & 0xff, payload.length & 0xff];
  const parts: RecordPart[] = [
    { name: "Header", bytes: [header], meaning: `First and last record, ${short ? "short record (1-byte length)" : "long record (4-byte length)"}, well-known type` },
    { name: "Type length", bytes: [typeBytes.length], meaning: `${typeBytes.length} byte type` },
    { name: "Payload length", bytes: length, meaning: `${payload.length} bytes of payload` },
    { name: "Type", bytes: typeBytes, meaning: `"${type}" = ${kind === "uri" ? "URI" : "Text"} record` },
    ...payloadParts,
  ];
  return { kind, parts, bytes: parts.flatMap((p) => p.bytes), payloadLength: payload.length, short };
}

/** A URI record, using the longest matching prefix code. */
export function uriRecord(uri: string): NdefRecord {
  const match = [...URI_PREFIXES].sort((a, b) => b.prefix.length - a.prefix.length).find((p) => uri.startsWith(p.prefix));
  const code = match?.code ?? 0x00;
  const rest = utf8(match ? uri.slice(match.prefix.length) : uri);
  return record("U", [code, ...rest], "uri", [
    { name: "URI prefix", bytes: [code], meaning: match ? `Code ${code} = "${match.prefix}" (saves ${match.prefix.length - 1} bytes)` : "No prefix" },
    { name: "Rest of URI", bytes: rest, meaning: `"${match ? uri.slice(match.prefix.length) : uri}" in UTF-8` },
  ]);
}

/** A Text record: status byte (UTF-8, language-code length), language code, then the text in UTF-8. */
export function textRecord(text: string, lang = "en"): NdefRecord {
  const langBytes = utf8(lang);
  const textBytes = utf8(text);
  return record("T", [langBytes.length, ...langBytes, ...textBytes], "text", [
    { name: "Status", bytes: [langBytes.length], meaning: `UTF-8, language code is ${langBytes.length} bytes` },
    { name: "Language", bytes: langBytes, meaning: `"${lang}"` },
    { name: "Text", bytes: textBytes, meaning: `${[...text].length} characters = ${textBytes.length} bytes in UTF-8` },
  ]);
}

/** The NDEF message wrapped for a Type 2 tag. */
export function tlv(message: number[]): { bytes: number[]; parts: RecordPart[] } {
  const length = message.length <= 254 ? [message.length] : [0xff, (message.length >> 8) & 0xff, message.length & 0xff];
  const parts: RecordPart[] = [
    { name: "TLV type", bytes: [0x03], meaning: "An NDEF message follows" },
    { name: "TLV length", bytes: length, meaning: `${message.length} bytes${length.length > 1 ? " (FF means a 2-byte length follows)" : ""}` },
    { name: "NDEF message", bytes: message, meaning: "The record above" },
    { name: "Terminator", bytes: [0xfe], meaning: "End of the data on the tag" },
  ];
  return { bytes: parts.flatMap((p) => p.bytes), parts };
}

export function fits(tag: TagId, bytes: number): boolean {
  return bytes <= TAGS.find((t) => t.id === tag)!.capacity;
}

/* ------------------------------------------------------------------ */
/* Distance                                                            */
/* ------------------------------------------------------------------ */

const COIL_RADIUS_CM = 2.5;

/** Field strength at distance d, as a share of the strength at the coil (1 at d = 0). */
export function fieldStrength(dCm: number): number {
  const r2 = COIL_RADIUS_CM ** 2;
  return (r2 / (r2 + dCm ** 2)) ** 1.5;
}

/**
 * Chance that one tap reads the tag: certain up to 4 cm, about half at 6 cm,
 * none from 8 cm. Interpolated on the field strength so it falls smoothly.
 */
export function readChance(dCm: number): number {
  const strong = fieldStrength(4);
  const weak = fieldStrength(8);
  const h = fieldStrength(dCm);
  if (h >= strong) return 1;
  if (h <= weak) return 0;
  // Logarithmic interpolation between the two field strengths.
  return Math.log(h / weak) / Math.log(strong / weak);
}

/** Simulated taps at one distance; repeatable for a given seed. */
export function taps(dCm: number, count: number, seed: number): boolean[] {
  const rng = createRng(seed);
  const p = readChance(dCm);
  return Array.from({ length: count }, () => rng.next() < p);
}
