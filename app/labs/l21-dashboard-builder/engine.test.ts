import { describe, expect, it } from "vitest";
import {
  ROUTE,
  alertValues,
  bulbStatus,
  canBind,
  createBulb,
  evaluateAlert,
  generateStreams,
  makeWidget,
  preset,
  reviewDashboard,
  sendCommand,
  tickBulb,
  updateCost,
  type Bulb,
} from "./engine";

describe("streams", () => {
  const s = generateStreams(300, 1);

  it("repeats exactly with the same seed", () => {
    expect(generateStreams(50, 3)).toEqual(generateStreams(50, 3));
  });

  it("stays in believable ranges", () => {
    expect(Math.min(...s.temperature)).toBeGreaterThan(25);
    expect(Math.max(...s.temperature)).toBeLessThan(40);
    expect(Math.max(...s.power)).toBeGreaterThan(1500);
    expect(s.door.some(Boolean)).toBe(true);
    expect(s.door.filter(Boolean).length).toBeLessThan(150);
  });

  it("drives the van out along the route and back", () => {
    expect(s.van[0]).toEqual(ROUTE[0]);
    expect(s.van[120].x).toBeCloseTo(ROUTE.at(-1)!.x, 6);
    expect(s.van[240].x).toBeCloseTo(ROUTE[0].x, 6);
  });
});

describe("binding widgets to streams", () => {
  it("lets a gauge show a number but not a location", () => {
    expect(canBind("gauge", "temperature").ok).toBe(true);
    const r = canBind("gauge", "van");
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("Map");
  });

  it("only lets a switch control the bulb", () => {
    expect(canBind("switch", "bulb").ok).toBe(true);
    expect(canBind("switch", "power").ok).toBe(false);
    expect(canBind("line", "bulb").ok).toBe(false);
  });

  it("lets an alert watch a number or the door", () => {
    expect(canBind("alert", "power").ok).toBe(true);
    expect(canBind("alert", "door").ok).toBe(true);
    expect(canBind("alert", "van").reason).toMatch(/^An alert cannot/);
  });

  it("raises a door alert while the door is open", () => {
    const s = generateStreams(300, 1);
    const w = makeWidget("d", "alert", "door");
    const run = evaluateAlert(alertValues(s, "door"), w.threshold!, w.dir, w.hysteresis);
    expect(run.raised).toBe(s.door.filter((open, i) => open && !s.door[i - 1]).length);
    expect(run.raised).toBeGreaterThan(0);
  });
});

describe("alerts", () => {
  const wobble = [34.8, 35.2, 34.9, 35.3, 34.8, 35.1, 34.9, 35.2, 33.9];

  it("flashes on and off without hysteresis", () => {
    expect(evaluateAlert(wobble, 35, "above", 0).raised).toBe(4);
  });

  it("goes off once with 0.5 °C hysteresis, and clears below 34.5 °C", () => {
    const r = evaluateAlert(wobble, 35, "above", 0.5);
    expect(r.raised).toBe(1);
    expect(r.states.at(-1)).toBe(false);
    expect(r.states.at(-2)).toBe(true);
  });

  it("works for a value that must not fall too low", () => {
    expect(evaluateAlert([60, 40, 45, 60], 50, "below", 5).raised).toBe(1);
  });
});

describe("polling vs push", () => {
  it("polls every interval even when nothing changes", () => {
    const flat = Array.from({ length: 60 }, () => 1);
    expect(updateCost(flat, "poll5")).toEqual({ messages: 12, avgAgeS: 2 });
    expect(updateCost(flat, "push").messages).toBe(1);
  });

  it("shows older values the longer the poll interval", () => {
    const s = generateStreams(120, 1);
    expect(updateCost(s.temperature, "poll30").avgAgeS).toBeGreaterThan(updateCost(s.temperature, "poll5").avgAgeS);
    expect(updateCost(s.door, "push").messages).toBeLessThan(updateCost(s.door, "poll1").messages);
  });
});

describe("the bulb, through a device shadow", () => {
  const run = (b: Bulb, from: number, to: number, online: boolean) => {
    for (let t = from; t <= to; t++) b = tickBulb(b, t, { online, latency: 2 });
    return b;
  };

  it("is pending until the device confirms, then on", () => {
    let b = sendCommand(createBulb(), "on", 10);
    expect(bulbStatus(b)).toBe("turning on");
    b = run(b, 10, 11, true);
    expect(bulbStatus(b)).toBe("turning on");
    b = run(b, 12, 12, true);
    expect(bulbStatus(b)).toBe("on");
    expect(b.confirmTimes).toEqual([2]);
  });

  it("waits while the device is offline, then catches up", () => {
    let b = run(sendCommand(createBulb(), "on", 0), 0, 20, false);
    expect(bulbStatus(b)).toBe("turning on");
    b = run(b, 21, 21, true);
    expect(bulbStatus(b)).toBe("on");
    expect(b.confirmTimes).toEqual([21]);
  });

  it("counts every command but confirms only real changes", () => {
    let b = sendCommand(createBulb(), "off", 0);
    expect(b.commands).toBe(1);
    expect(b.sentAt).toBeUndefined();
    b = run(sendCommand(b, "on", 1), 1, 5, true);
    expect(b.commands).toBe(2);
    expect(b.confirmTimes).toEqual([2]);
  });
});

describe("design review", () => {
  it("finds nothing to fix in the clean dashboard", () => {
    expect(reviewDashboard(preset("clean"))).toEqual([]);
  });

  it("finds every problem in the cluttered dashboard", () => {
    const ids = reviewDashboard(preset("cluttered")).map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining(["clutter", "range-w4", "title-w7", "dup-w3", "alert-top"]));
  });

  it("spots an unbound switch and an alert with no threshold", () => {
    const alert = { ...makeWidget("a", "alert", "temperature"), threshold: undefined };
    const ids = reviewDashboard([alert, makeWidget("s", "switch")]).map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining(["unbound-s", "threshold-a"]));
  });

  it("asks for an alert when numbers are shown but nothing warns", () => {
    expect(reviewDashboard([makeWidget("g", "gauge", "temperature")]).map((t) => t.id)).toEqual(["no-alert"]);
  });
});
