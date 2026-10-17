/**
 * One character sent over a UART link. The line rests high (1). A frame is a
 * start bit (0), 8 data bits with the least significant bit first, an
 * optional parity bit and a stop bit (1).
 */

export type Parity = "none" | "even" | "odd";

export type BitKind = "start" | "data" | "parity" | "stop";

export interface FrameBit {
  kind: BitKind;
  value: 0 | 1;
  /** Data bit number, D0 to D7 */
  index?: number;
}

export interface UartFrame {
  char: string;
  code: number;
  /** The code written most significant bit first, as people usually write it */
  binary: string;
  bits: FrameBit[];
  parityBit: 0 | 1 | null;
  ones: number;
  bitTimeUs: number;
  frameTimeMs: number;
  /** Most characters per second at this baud rate, sending frames back to back */
  charsPerSecond: number;
}

export const BAUD_RATES = [9600, 115200] as const;

/** Printable ASCII only: space (32) to tilde (126). */
export function isSendable(char: string): boolean {
  if (char.length !== 1) return false;
  const c = char.charCodeAt(0);
  return c >= 0x20 && c <= 0x7e;
}

export function uartFrame(char: string, parity: Parity, baud: number): UartFrame | null {
  if (!isSendable(char) || baud <= 0) return null;
  const code = char.charCodeAt(0);
  const data = Array.from({ length: 8 }, (_, i) => ((code >> i) & 1) as 0 | 1);
  const ones = data.filter((b) => b === 1).length;
  // Even parity makes the total number of 1s even; odd parity makes it odd.
  const parityBit: 0 | 1 | null = parity === "none" ? null : parity === "even" ? ((ones % 2) as 0 | 1) : (((ones + 1) % 2) as 0 | 1);
  const bits: FrameBit[] = [
    { kind: "start", value: 0 },
    ...data.map((value, index) => ({ kind: "data" as const, value, index })),
    ...(parityBit === null ? [] : [{ kind: "parity" as const, value: parityBit }]),
    { kind: "stop", value: 1 },
  ];
  const bitTimeUs = 1e6 / baud;
  return {
    char,
    code,
    binary: code.toString(2).padStart(8, "0"),
    bits,
    parityBit,
    ones,
    bitTimeUs,
    frameTimeMs: (bits.length * bitTimeUs) / 1000,
    charsPerSecond: Math.floor(baud / bits.length),
  };
}
