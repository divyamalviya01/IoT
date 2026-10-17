import { describe, expect, it } from "vitest";
import { Broker, linkRng, sendOverLink, topicMatches, validFilter, validTopic } from "./engine";

describe("topic matching", () => {
  it.each([
    ["home/kitchen/temperature", "home/kitchen/temperature", true],
    ["home/+/temperature", "home/kitchen/temperature", true],
    ["home/+/temperature", "home/kitchen/fridge/temperature", false],
    ["home/#", "home/kitchen/temperature", true],
    ["home/#", "home", true],
    ["home/#", "office/kitchen", false],
    ["+/+", "home/door", true],
    ["+", "home/door", false],
    ["#", "anything/at/all", true],
    ["#", "$SYS/broker/uptime", false],
    ["+/broker/uptime", "$SYS/broker/uptime", false],
    ["$SYS/#", "$SYS/broker/uptime", true],
    ["home/kitchen", "Home/kitchen", false],
  ])("%s vs %s → %s", (filter, topic, expected) => {
    expect(topicMatches(filter, topic)).toBe(expected);
  });

  it("validates filters and topics", () => {
    expect(validFilter("home/#")).toBe(true);
    expect(validFilter("home/#/x")).toBe(false);
    expect(validFilter("home/te#")).toBe(false);
    expect(validFilter("home/ki+")).toBe(false);
    expect(validTopic("home/+/x")).toBe(false);
    expect(validTopic("")).toBe(false);
  });
});

describe("broker", () => {
  it("delivers to matching subscribers at the lower QoS", () => {
    const b = new Broker();
    b.connect("sensor");
    b.connect("phone");
    b.connect("dash");
    b.subscribe("phone", "home/#", 1);
    b.subscribe("dash", "home/+/temperature", 0);
    const out = b.publish("sensor", "home/kitchen/temperature", "28.5", 2, false);
    expect(out.map((d) => [d.to, d.qos])).toEqual([
      ["phone", 1],
      ["dash", 0],
    ]);
  });

  it("sends one copy per client even if several subscriptions match", () => {
    const b = new Broker();
    b.connect("a");
    b.subscribe("a", "home/#", 0);
    b.subscribe("a", "home/+/temperature", 1);
    const out = b.publish("x", "home/kitchen/temperature", "1", 2, false);
    expect(out).toHaveLength(1);
    expect(out[0].qos).toBe(1);
  });

  it("keeps the last retained message and clears it with an empty payload", () => {
    const b = new Broker();
    b.connect("sensor");
    b.publish("sensor", "home/door", "open", 1, true);
    b.publish("sensor", "home/door", "closed", 1, true);
    b.connect("late");
    const got = b.subscribe("late", "home/#", 1);
    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({ fromRetained: true, message: { payload: "closed" } });

    b.publish("sensor", "home/door", "", 1, true);
    b.connect("later");
    expect(b.subscribe("later", "home/#", 1)).toHaveLength(0);
  });

  it("publishes the Last Will only on an unexpected disconnect", () => {
    const b = new Broker();
    b.connect("watcher");
    b.subscribe("watcher", "status/#", 1);
    const will = { topic: "status/sensor", payload: "offline", qos: 1 as const, retain: true };
    b.connect("sensor", { will });
    expect(b.disconnect("sensor", true)).toHaveLength(0);
    b.connect("sensor", { will });
    const out = b.disconnect("sensor", false);
    expect(out).toHaveLength(1);
    expect(out[0].message.payload).toBe("offline");
    expect(b.retained.get("status/sensor")?.payload).toBe("offline");
  });

  it("queues QoS 1 messages for an offline persistent session", () => {
    const b = new Broker();
    b.connect("phone", { cleanSession: false });
    b.subscribe("phone", "alerts/#", 1);
    b.disconnect("phone", true);
    b.connect("sensor");
    expect(b.publish("sensor", "alerts/fire", "smoke", 1, false)).toHaveLength(0);
    expect(b.publish("sensor", "alerts/info", "low", 0, false)).toHaveLength(0);
    expect(b.queuedFor("phone")).toBe(1);
    const back = b.connect("phone", { cleanSession: false });
    expect(back).toHaveLength(1);
    expect(back[0]).toMatchObject({ fromQueue: true, message: { payload: "smoke" } });
  });

  it("forgets clean sessions", () => {
    const b = new Broker();
    b.connect("phone");
    b.subscribe("phone", "alerts/#", 1);
    b.disconnect("phone", true);
    b.connect("phone");
    expect(b.subscriptionsOf("phone")).toHaveLength(0);
  });
});

describe("QoS over a lossy link", () => {
  it("uses 1, 2 and 4 packets on a perfect link", () => {
    const rng = linkRng(1);
    expect(sendOverLink(0, 0, rng).packets.map((p) => p.name)).toEqual(["PUBLISH"]);
    expect(sendOverLink(1, 0, rng).packets.map((p) => p.name)).toEqual(["PUBLISH", "PUBACK"]);
    expect(sendOverLink(2, 0, rng).packets.map((p) => p.name)).toEqual(["PUBLISH", "PUBREC", "PUBREL", "PUBCOMP"]);
  });

  it("QoS 0 delivers at most once; QoS 1 can duplicate; QoS 2 never does", () => {
    let q0Max = 0;
    let q1Dupes = 0;
    let q2Max = 0;
    for (let seed = 1; seed <= 300; seed++) {
      q0Max = Math.max(q0Max, sendOverLink(0, 30, linkRng(seed)).deliveries);
      if (sendOverLink(1, 30, linkRng(seed)).deliveries > 1) q1Dupes++;
      q2Max = Math.max(q2Max, sendOverLink(2, 30, linkRng(seed)).deliveries);
    }
    expect(q0Max).toBeLessThanOrEqual(1);
    expect(q1Dupes).toBeGreaterThan(0);
    expect(q2Max).toBe(1);
  });

  it("QoS 1 and 2 almost always get through where QoS 0 often fails", () => {
    let q0 = 0;
    let q1 = 0;
    for (let seed = 1; seed <= 200; seed++) {
      if (sendOverLink(0, 30, linkRng(seed)).deliveries > 0) q0++;
      if (sendOverLink(1, 30, linkRng(seed)).deliveries > 0) q1++;
    }
    expect(q1).toBeGreaterThan(q0);
    expect(q1).toBeGreaterThan(195);
  });
});
