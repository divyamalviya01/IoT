import { describe, expect, it } from "vitest";
import { fragment } from "./fragment";

const count = (p: number, compressed: boolean, secure = false) => fragment(p, { compressed, secure }).frames.length;

describe("6LoWPAN fragmentation", () => {
  it("matches the frame counts for common payloads (no security)", () => {
    const sizes = [50, 80, 100, 150, 200, 500, 1232];
    expect(sizes.map((p) => count(p, false))).toEqual([1, 2, 2, 3, 3, 6, 14]);
    expect(sizes.map((p) => count(p, true))).toEqual([1, 1, 2, 2, 3, 6, 13]);
  });

  it("needs more frames when link security takes 21 bytes", () => {
    expect([count(50, false, true), count(50, true, true)]).toEqual([2, 1]);
    expect([count(100, false, true), count(100, true, true)]).toEqual([3, 2]);
    expect([count(500, false, true), count(500, true, true)]).toEqual([8, 8]);
  });

  it("first frames carry 48 or 88 bytes, later frames 96, all multiples of 8", () => {
    const plain = fragment(200, { compressed: false }).frames;
    const squeezed = fragment(200, { compressed: true }).frames;
    expect(plain[0].data).toBe(48);
    expect(squeezed[0].data).toBe(88);
    expect(plain[1].data).toBe(96);
    for (const f of [...plain.slice(0, -1), ...squeezed.slice(0, -1)]) expect(f.data % 8).toBe(0);
    expect(plain.reduce((s, f) => s + f.data, 0)).toBe(200);
  });

  it("counts bytes on air, including 25 MAC bytes per frame", () => {
    expect(fragment(100, { compressed: false }).bytesOnAir).toBe(208);
    expect(fragment(100, { compressed: true }).bytesOnAir).toBe(165);
    expect(fragment(500, { compressed: false }).bytesOnAir).toBe(728);
    expect(fragment(500, { compressed: true }).bytesOnAir).toBe(685);
  });

  it("shows compression turning 80 bytes from two frames into one", () => {
    const plain = fragment(80, { compressed: false });
    const squeezed = fragment(80, { compressed: true });
    expect(plain.frames).toHaveLength(2);
    expect(squeezed.frames).toHaveLength(1);
    expect(squeezed.overheadPct).toBeLessThan(plain.overheadPct);
  });
});
