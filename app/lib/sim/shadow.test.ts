import { describe, expect, it } from "vitest";
import { createShadow, delta, deviceSync, inSync, report, setDesired } from "./shadow";

describe("device shadow", () => {
  it("starts in sync", () => {
    const s = createShadow({ power: "off", brightness: 50 });
    expect(delta(s)).toEqual({});
    expect(inSync(s)).toBe(true);
    expect(s.version).toBe(1);
  });

  it("shows only the changed keys in the delta", () => {
    const s = setDesired(createShadow({ power: "off", brightness: 50 }), { power: "on" });
    expect(delta(s)).toEqual({ power: "on" });
    expect(s.version).toBe(2);
  });

  it("keeps the delta while the device is offline", () => {
    const s = setDesired(createShadow({ power: "off" }), { power: "on" });
    const { shadow, applied } = deviceSync(s, false);
    expect(applied).toEqual({});
    expect(delta(shadow)).toEqual({ power: "on" });
    expect(shadow.version).toBe(2);
  });

  it("applies the delta and reports back when the device comes online", () => {
    const s = setDesired(createShadow({ power: "off" }), { power: "on" });
    const { shadow, applied } = deviceSync(s, true);
    expect(applied).toEqual({ power: "on" });
    expect(shadow.reported.power).toBe("on");
    expect(inSync(shadow)).toBe(true);
    expect(shadow.version).toBe(3);
  });

  it("clears the delta when the device reaches the state by itself", () => {
    const s = report(setDesired(createShadow({ power: "off" }), { power: "on" }), { power: "on" });
    expect(delta(s)).toEqual({});
  });
});
