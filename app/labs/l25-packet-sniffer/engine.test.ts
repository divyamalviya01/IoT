import { describe, expect, it } from "vitest";
import { toHex } from "~/labs/l26-crypto-workbench/engine";
import { capture, decodeMqtt, learned, mqttConnect, mqttPublish, openRecord, recordSize, remainingLength, sealRecord, tamper, visibleText } from "./engine";

describe("MQTT bytes", () => {
  it("encodes CONNECT with a username and password", () => {
    const b = mqttConnect("door-1", "home", "secret123");
    expect(b.length).toBe(37);
    // 10 = CONNECT, 23 = 35 bytes follow, "MQTT", level 4, flags C2, keep-alive 60 s
    expect(toHex(b.slice(0, 12))).toBe("102300044d51545404c2003c");
    expect(b[9]).toBe(0xc2);
    expect(decodeMqtt(b)).toEqual({ type: "CONNECT", clientId: "door-1", username: "home", password: "secret123" });
  });

  it("encodes PUBLISH at QoS 0", () => {
    const b = mqttPublish("home/door/lock", "unlock");
    expect(b.length).toBe(24);
    expect(toHex(b.slice(0, 4))).toBe("3016000e");
    expect(decodeMqtt(b)).toEqual({ type: "PUBLISH", topic: "home/door/lock", payload: "unlock" });
  });

  it("uses more length bytes for big packets", () => {
    expect(remainingLength(127)).toEqual([127]);
    expect(remainingLength(128)).toEqual([0x80, 0x01]);
    expect(remainingLength(321)).toEqual([0xc1, 0x02]);
  });
});

describe("TLS records", () => {
  it("adds a 5-byte header, 1 type byte and a 16-byte tag", async () => {
    const data = mqttPublish("home/door/lock", "unlock");
    const r = await sealRecord(data, 0);
    expect(r.length).toBe(recordSize(24));
    expect(r.length).toBe(46);
    // 17 = application data, 0303 = TLS 1.2 on the wire (as TLS 1.3 sends), 0029 = 41 bytes follow
    expect(toHex(r.slice(0, 5))).toBe("1703030029");
    expect(await openRecord(r, 0)).toEqual(data);
  });

  it("refuses a record with one changed byte, or the wrong sequence number", async () => {
    const r = await sealRecord(mqttPublish("home/door/cmd", "lock"), 3);
    const bad = r.slice();
    bad[10] ^= 0x01;
    await expect(openRecord(bad, 3)).rejects.toThrow();
    await expect(openRecord(r, 4)).rejects.toThrow();
  });
});

describe("what the sniffer sees", () => {
  it("reads passwords, topics and commands from plain MQTT", async () => {
    const p = await capture("plain");
    const l = learned(p);
    expect(p).toHaveLength(9);
    expect(l.passwords).toEqual([
      { user: "home", password: "secret123" },
      { user: "priya", password: "sunflower7" },
    ]);
    expect(l.topics).toEqual(["home/door/state", "home/door/cmd", "home/door/battery"]);
    expect(l.messages).toContainEqual({ topic: "home/door/cmd", payload: "lock" });
    expect(visibleText(p, "secret123")).toBe(true);
    expect(l.ports).toEqual([1883]);
  });

  it("sees only who talks to whom with TLS", async () => {
    const p = await capture("tls");
    const l = learned(p);
    expect(p).toHaveLength(15);
    expect(l.passwords).toEqual([]);
    expect(l.messages).toEqual([]);
    for (const secret of ["secret123", "sunflower7", "home/door", "lock"]) expect(visibleText(p, secret)).toBe(false);
    expect(l.talkers).toEqual(["192.168.1.23", "192.168.1.10", "192.168.1.42"]);
    expect(l.ports).toEqual([8883]);
    expect(l.totalWireBytes).toBeGreaterThan(learned(await capture("plain")).totalWireBytes * 5);
  });

  it("repeats exactly", async () => {
    expect(toHex((await capture("tls"))[5].data)).toBe(toHex((await capture("tls"))[5].data));
  });
});

describe("tampering in transit", () => {
  it("is obeyed with plain MQTT", async () => {
    expect(await tamper("plain")).toMatchObject({ accepted: true, outcome: "The door UNLOCKS" });
  });

  it("is caught by the TLS integrity check", async () => {
    expect(await tamper("tls")).toMatchObject({ accepted: false, outcome: "The door stays locked" });
  });
});
