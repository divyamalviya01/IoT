import { describe, expect, it } from "vitest";
import { fieldStrength, fits, hex, readChance, taps, textRecord, tlv, uriRecord } from "./engine";

describe("NDEF encoding", () => {
  it("encodes a URI record with the https:// prefix code", () => {
    const r = uriRecord("https://example.com");
    expect(hex(r.bytes)).toBe("D1 01 0C 55 04 65 78 61 6D 70 6C 65 2E 63 6F 6D");
    expect(r.bytes).toHaveLength(16);
    expect(tlv(r.bytes).bytes).toHaveLength(19);
    expect(hex(tlv(r.bytes).bytes.slice(0, 2))).toBe("03 10");
    expect(tlv(r.bytes).bytes.at(-1)).toBe(0xfe);
  });

  it("picks the longest matching prefix", () => {
    expect(uriRecord("https://www.iitkgp.ac.in").bytes[4]).toBe(0x02);
    expect(uriRecord("http://example.com").bytes[4]).toBe(0x03);
    expect(uriRecord("ftp://x").bytes[4]).toBe(0x00);
  });

  it("encodes a Text record with a status byte and language code", () => {
    expect(hex(textRecord("Hello").bytes)).toBe("D1 01 08 54 02 65 6E 48 65 6C 6C 6F");
  });

  it("counts UTF-8 bytes, not characters", () => {
    const r = textRecord("नमस्ते");
    expect(r.parts.at(-1)!.bytes).toHaveLength(18);
    expect(r.bytes).toHaveLength(25);
  });

  it("switches to long records and 3-byte TLV lengths for big payloads", () => {
    const r = uriRecord(`https://${"a".repeat(255)}`); // payload = 1 + 255 = 256 bytes
    expect(r.short).toBe(false);
    expect(hex(r.bytes.slice(0, 7))).toBe("C1 01 00 00 01 00 55");
    const t = tlv(r.bytes);
    expect(hex(t.bytes.slice(0, 4))).toBe("03 FF 01 07");
    expect(t.bytes).toHaveLength(268);
    expect(fits("ntag215", t.bytes.length)).toBe(true);
    expect(fits("ntag213", t.bytes.length)).toBe(false);
  });
});

describe("reading distance", () => {
  it("weakens the field steeply with distance", () => {
    expect(fieldStrength(0)).toBe(1);
    expect(fieldStrength(4)).toBeCloseTo(0.149, 3);
    expect(fieldStrength(8)).toBeCloseTo(0.0265, 4);
  });

  it("reads reliably close up, about half the time at 6 cm, never at 8 cm", () => {
    expect(readChance(2)).toBe(1);
    expect(readChance(4)).toBe(1);
    expect(readChance(6)).toBeGreaterThan(0.35);
    expect(readChance(6)).toBeLessThan(0.65);
    expect(readChance(8)).toBe(0);
    expect(readChance(12)).toBe(0);
    expect(readChance(5)).toBeGreaterThan(readChance(7));
  });

  it("gives repeatable taps", () => {
    expect(taps(6, 20, 9)).toEqual(taps(6, 20, 9));
    expect(taps(3, 20, 9).every(Boolean)).toBe(true);
    expect(taps(9, 20, 9).some(Boolean)).toBe(false);
  });
});
