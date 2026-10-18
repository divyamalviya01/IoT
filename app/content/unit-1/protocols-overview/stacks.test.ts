import { describe, expect, it } from "vitest";
import { buildStack } from "./stacks";

const total = (parts: { bytes: number }[], payload = 4) => parts.reduce((s, p) => s + p.bytes, 0) + payload;

describe("protocol stacks", () => {
  it("MQTT over Wi-Fi wraps a 4-byte reading into 93 bytes, as the theory says", () => {
    const parts = buildStack("mqtt", "28.5", false);
    expect(parts.map((p) => p.bytes)).toEqual([13, 20, 20, 36]);
    expect(total(parts)).toBe(93);
  });

  it("6LoWPAN shrinks CoAP's IPv6 and UDP headers from 48 to 6 bytes", () => {
    const plain = buildStack("coap", "28.5", false);
    const squeezed = buildStack("coap", "28.5", true);
    expect(plain.map((p) => p.layer)).toEqual(["Application", "Transport", "Network", "Link"]);
    expect(plain[1].bytes + plain[2].bytes).toBe(48);
    expect(squeezed[1].bytes).toBe(6);
    expect(total(plain) - total(squeezed)).toBe(42);
  });

  it("HTTP headers grow with the payload length field", () => {
    const short = buildStack("http", "1", false)[0].bytes;
    const long = buildStack("http", "1234567890", false)[0].bytes;
    expect(long - short).toBe(1); // Content-Length goes from 1 digit to 2
  });
});
