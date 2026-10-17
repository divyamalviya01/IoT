import { describe, expect, it } from "vitest";
import { isSendable, uartFrame } from "./uart";

const values = (char: string, parity: "none" | "even" | "odd" = "none") => uartFrame(char, parity, 9600)!.bits.map((b) => b.value);

describe("UART frames", () => {
  it("sends 'A' (0x41) least significant bit first between a start and a stop bit", () => {
    const f = uartFrame("A", "none", 9600)!;
    expect(f.code).toBe(0x41);
    expect(f.binary).toBe("01000001");
    expect(f.bits.filter((b) => b.kind === "data").map((b) => b.value)).toEqual([1, 0, 0, 0, 0, 0, 1, 0]);
    expect(values("A")).toEqual([0, 1, 0, 0, 0, 0, 0, 1, 0, 1]);
  });

  it("adds a parity bit that makes the count of 1s even or odd", () => {
    expect(uartFrame("A", "even", 9600)!.parityBit).toBe(0); // two 1s already
    expect(uartFrame("A", "odd", 9600)!.parityBit).toBe(1);
    expect(uartFrame("C", "even", 9600)!.parityBit).toBe(1); // 0x43 has three 1s
    expect(values("A", "even")).toHaveLength(11);
  });

  it("works out bit and frame times from the baud rate", () => {
    const f = uartFrame("A", "none", 9600)!;
    expect(f.bitTimeUs).toBeCloseTo(104.17, 2);
    expect(f.frameTimeMs).toBeCloseTo(1.042, 3);
    expect(f.charsPerSecond).toBe(960);
    expect(uartFrame("A", "none", 115200)!.charsPerSecond).toBe(11520);
  });

  it("accepts printable ASCII only", () => {
    expect(isSendable(" ")).toBe(true);
    expect(isSendable("~")).toBe(true);
    expect(isSendable("é")).toBe(false);
    expect(isSendable("AB")).toBe(false);
    expect(uartFrame("", "none", 9600)).toBeNull();
  });
});
