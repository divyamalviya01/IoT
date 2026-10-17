import { describe, expect, it } from "vitest";
import { PHONE, SENSOR, XmppServer, escapeXml, messageXml, mqttPublishBytes, presenceXml } from "./engine";

describe("stanzas", () => {
  it("escapes XML special characters", () => {
    expect(escapeXml(`a<b & "c">`)).toBe("a&lt;b &amp; &quot;c&quot;&gt;");
    expect(messageXml(SENSOR, PHONE, "5 < 6")).toContain("<body>5 &lt; 6</body>");
  });

  it("writes presence for each availability", () => {
    expect(presenceXml(SENSOR, null, "online")).toBe(`<presence from="${SENSOR}"/>`);
    expect(presenceXml(SENSOR, null, "away")).toContain("<show>away</show>");
    expect(presenceXml(SENSOR, null, "offline")).toContain('type="unavailable"');
  });

  it("computes MQTT sizes", () => {
    expect(mqttPublishBytes("home/kitchen/temperature", "28.5")).toBe(2 + 2 + 24 + 4);
  });
});

describe("server", () => {
  it("sends the sensor's presence to the phone when the phone is online", () => {
    const s = new XmppServer();
    s.setAvailability(PHONE, "online");
    const [ev] = s.setAvailability(SENSOR, "online");
    expect(ev).toMatchObject({ kind: "presence", outcome: "delivered", to: "phone@home.example" });
  });

  it("stores messages for an offline phone and delivers them on login", () => {
    const s = new XmppServer();
    s.setAvailability(SENSOR, "online");
    expect(s.sendReading(29).outcome).toBe("stored offline");
    expect(s.storedFor(PHONE)).toBe(1);
    const events = s.setAvailability(PHONE, "online");
    expect(events.some((e) => e.kind === "message" && e.outcome === "delivered")).toBe(true);
    expect(s.storedFor(PHONE)).toBe(0);
  });

  it("matches an iq result to its request id", () => {
    const s = new XmppServer();
    s.setAvailability(SENSOR, "online");
    s.setAvailability(PHONE, "online");
    const [req, res] = s.askReading();
    const id = req.xml.match(/id="(\w+)"/)![1];
    expect(res.xml).toContain(`type="result" id="${id}"`);
    expect(res.xml).toContain(">28.5</reading>");
  });

  it("refuses to send from an offline sensor and stores nothing", () => {
    const s = new XmppServer();
    expect(s.sendReading(30).outcome).toBe("error");
    expect(s.storedFor(PHONE)).toBe(0);
  });

  it("refuses an iq get from an offline phone", () => {
    const s = new XmppServer();
    s.setAvailability(SENSOR, "online");
    const events = s.askReading();
    expect(events).toHaveLength(1);
    expect(events[0].outcome).toBe("error");
  });

  it("answers with an iq error when the sensor is offline", () => {
    const s = new XmppServer();
    s.setAvailability(PHONE, "online");
    const [, res] = s.askReading();
    expect(res.xml).toContain('type="error"');
    expect(res.xml).toContain("service-unavailable");
  });

  it("XML stanzas are much larger than the MQTT equivalent", () => {
    const s = new XmppServer();
    s.setAvailability(SENSOR, "online");
    s.setAvailability(PHONE, "online");
    const ev = s.sendReading(28.5);
    expect(ev.bytes).toBeGreaterThan(ev.mqtt.bytes * 3);
  });
});
