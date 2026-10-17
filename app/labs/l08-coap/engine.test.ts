import { describe, expect, it } from "vitest";
import {
  ACK_TIMEOUT,
  MAX_RETRANSMIT,
  OPTION,
  encode,
  exampleRequest,
  exampleResponse,
  exchange,
  notificationsFor,
  uintBytes,
} from "./engine";

const hex = (b: number[]) => b.map((x) => x.toString(16).padStart(2, "0")).join(" ");

describe("encoding (RFC 7252)", () => {
  it("encodes CON GET /temp exactly", () => {
    expect(hex(encode(exampleRequest()))).toBe("42 01 1a 2b 7d 34 b4 74 65 6d 70");
  });

  it("encodes the piggybacked 2.05 response with a payload marker", () => {
    const res = exampleResponse(exampleRequest(), "28.5");
    expect(hex(encode(res))).toBe("62 45 1a 2b 7d 34 c0 ff 32 38 2e 35");
  });

  it("uses an extended delta byte for option numbers 13 and above", () => {
    const m = { ...exampleRequest(), options: [{ number: OPTION.UriQuery, value: [0x61] }] };
    // delta 15 → nibble 13 with extension byte 2; length 1.
    expect(hex(encode(m).slice(6))).toBe("d1 02 61");
  });

  it("encodes several path segments as repeated options with delta 0", () => {
    const m = exampleRequest("CON", "/sensors/temp");
    expect(hex(encode(m).slice(6))).toBe("b7 73 65 6e 73 6f 72 73 04 74 65 6d 70");
  });

  it("encodes unsigned option values minimally", () => {
    expect(uintBytes(0)).toEqual([]);
    expect(uintBytes(60)).toEqual([60]);
    expect(uintBytes(300)).toEqual([1, 44]);
  });
});

describe("exchange", () => {
  it("succeeds in one round trip on a perfect link", () => {
    const r = exchange({ type: "CON", lossPct: 0, delayMs: 50 });
    expect(r).toMatchObject({ success: true, requestsSent: 1, timeMs: 100 });
  });

  it("starts with a timeout between 2 and 3 s and doubles it each retry", () => {
    const r = exchange({ type: "CON", lossPct: 100, seed: 5 });
    const timeouts = r.transmissions.filter((t) => t.kind === "request").map((t) => t.timeout!);
    expect(timeouts).toHaveLength(MAX_RETRANSMIT + 1);
    expect(timeouts[0]).toBeGreaterThanOrEqual(ACK_TIMEOUT);
    expect(timeouts[0]).toBeLessThanOrEqual(ACK_TIMEOUT * 1.5);
    for (let i = 1; i < timeouts.length; i++) expect(timeouts[i] / timeouts[i - 1]).toBeCloseTo(2, 1);
    expect(r.success).toBe(false);
  });

  it("gives up after 4 retransmissions: last try within 45 s, give-up within 93 s", () => {
    const r = exchange({ type: "CON", lossPct: 100, seed: 2 });
    expect(r.requestsSent).toBe(5);
    const lastTry = r.transmissions.filter((t) => t.kind === "request").at(-1)!.t;
    expect(lastTry).toBeLessThanOrEqual(45_000); // MAX_TRANSMIT_SPAN
    expect(r.timeMs).toBeGreaterThanOrEqual(62_000);
    expect(r.timeMs).toBeLessThanOrEqual(93_000); // MAX_TRANSMIT_WAIT
  });

  it("never retransmits NON messages", () => {
    const r = exchange({ type: "NON", lossPct: 100, seed: 1 });
    expect(r.requestsSent).toBe(1);
    expect(r.success).toBe(false);
  });

  it("CON gets through far more often than NON on a bad link", () => {
    let con = 0;
    let non = 0;
    for (let seed = 1; seed <= 200; seed++) {
      if (exchange({ type: "CON", lossPct: 40, seed }).success) con++;
      if (exchange({ type: "NON", lossPct: 40, seed }).success) non++;
    }
    expect(con).toBeGreaterThan(non);
    // Each try needs request and reply to survive: 0.6 × 0.6 = 0.36.
    // Five tries succeed with probability 1 − 0.64⁵ ≈ 0.89, so expect about 178 of 200.
    expect(con).toBeGreaterThan(165);
    expect(con).toBeLessThan(192);
  });
});

describe("observe", () => {
  it("notifies only when the value changes", () => {
    const n = notificationsFor([28.5, 28.5, 29, 29, 29, 30.5]);
    expect(n.map((x) => [x.seq, x.value])).toEqual([
      [1, 28.5],
      [2, 29],
      [3, 30.5],
    ]);
  });
});
