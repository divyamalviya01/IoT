import { describe, expect, it } from "vitest";
import { buildUdp, runTransfer, tcpSegmentBytes, udpDatagramBytes, verifyUdp } from "./engine";

const base = { packets: 10, lossPct: 0, delayMs: 100, intervalMs: 200, payloadBytes: 20 };

describe("L05 with no loss", () => {
  it("UDP delivers everything with no control messages", () => {
    const r = runTransfer({ ...base, protocol: "udp" });
    expect(r).toMatchObject({ delivered: 10, lost: 0, retransmissions: 0, controlMessages: 0 });
    expect(r.bytesOnWire).toBe(10 * udpDatagramBytes(20));
    expect(r.completionMs).toBe(9 * 200 + 100);
  });

  it("TCP needs a handshake and one ACK per segment", () => {
    const r = runTransfer({ ...base, protocol: "tcp" });
    expect(r).toMatchObject({ delivered: 10, retransmissions: 0, controlMessages: 3 + 10, failed: false });
    expect(r.bytesOnWire).toBe(3 * tcpSegmentBytes(0) + 10 * tcpSegmentBytes(20) + 10 * tcpSegmentBytes(0));
    // Handshake (one round trip) then the last segment's round trip.
    expect(r.completionMs).toBe(200 + 9 * 200 + 200);
  });
});

describe("L05 with loss", () => {
  it("UDP loses roughly the configured share", () => {
    const r = runTransfer({ ...base, packets: 1000, lossPct: 20, protocol: "udp", seed: 4 });
    expect(r.delivered / 1000).toBeGreaterThan(0.76);
    expect(r.delivered / 1000).toBeLessThan(0.84);
    expect(r.retransmissions).toBe(0);
  });

  it("TCP still delivers everything, with retransmissions and more bytes", () => {
    const tcp = runTransfer({ ...base, packets: 50, lossPct: 20, protocol: "tcp", seed: 4 });
    const udp = runTransfer({ ...base, packets: 50, lossPct: 20, protocol: "udp", seed: 4 });
    expect(tcp.delivered).toBe(50);
    expect(tcp.failed).toBe(false);
    expect(tcp.retransmissions).toBeGreaterThan(0);
    expect(tcp.bytesOnWire).toBeGreaterThan(udp.bytesOnWire);
    expect(tcp.completionMs).toBeGreaterThan(udp.completionMs);
  });

  it("TCP gives up when nothing can get through", () => {
    const r = runTransfer({ ...base, lossPct: 100, protocol: "tcp" });
    expect(r.failed).toBe(true);
    expect(r.delivered).toBe(0);
  });

  it("counts duplicates when an ACK is lost but the data arrived", () => {
    let dupes = 0;
    for (let seed = 1; seed < 40; seed++) {
      dupes += runTransfer({ ...base, packets: 20, lossPct: 30, protocol: "tcp", seed }).duplicates;
    }
    expect(dupes).toBeGreaterThan(0);
  });

  it("is repeatable with the same seed", () => {
    const a = runTransfer({ ...base, lossPct: 25, protocol: "tcp", seed: 9 });
    const b = runTransfer({ ...base, lossPct: 25, protocol: "tcp", seed: 9 });
    expect(a).toEqual(b);
  });
});

describe("UDP header", () => {
  it("fills the four header fields correctly", () => {
    const u = buildUdp("192.168.1.20", "192.168.1.10", 50000, 5683, "28.5");
    expect(u.length).toBe(12);
    expect(u.bytes.slice(0, 6)).toEqual([0xc3, 0x50, 0x16, 0x33, 0x00, 0x0c]);
    expect(u.bytes).toHaveLength(12);
  });

  it("produces a checksum that verifies, and detects corruption", () => {
    const u = buildUdp("10.0.0.5", "10.0.0.9", 1234, 5683, "temp=28.5");
    expect(verifyUdp("10.0.0.5", "10.0.0.9", u.bytes)).toBe(true);
    const corrupt = [...u.bytes];
    corrupt[10] ^= 0x01;
    expect(verifyUdp("10.0.0.5", "10.0.0.9", corrupt)).toBe(false);
  });
});
