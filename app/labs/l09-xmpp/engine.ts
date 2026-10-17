/**
 * Lab L09: two devices on one XMPP server. Stanzas are built as real XML so
 * their sizes can be compared with the equivalent MQTT messages.
 */

export const SENSOR = "sensor1@home.example/kitchen";
export const PHONE = "phone@home.example/app";

export const bare = (jid: string) => jid.split("/")[0];

export function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const utf8 = (s: string) => new TextEncoder().encode(s).length;

export type Availability = "online" | "away" | "offline";

export function presenceXml(from: string, to: string | null, availability: Availability): string {
  const toAttr = to ? ` to="${escapeXml(to)}"` : "";
  if (availability === "offline") return `<presence from="${escapeXml(from)}"${toAttr} type="unavailable"/>`;
  if (availability === "away") return `<presence from="${escapeXml(from)}"${toAttr}><show>away</show></presence>`;
  return `<presence from="${escapeXml(from)}"${toAttr}/>`;
}

export function messageXml(from: string, to: string, body: string): string {
  return `<message from="${escapeXml(from)}" to="${escapeXml(to)}" type="chat"><body>${escapeXml(body)}</body></message>`;
}

export function iqGetXml(from: string, to: string, id: string): string {
  return `<iq type="get" id="${escapeXml(id)}" from="${escapeXml(from)}" to="${escapeXml(to)}"><query xmlns="urn:example:sensor"/></iq>`;
}

export function iqResultXml(from: string, to: string, id: string, value: number): string {
  return `<iq type="result" id="${escapeXml(id)}" from="${escapeXml(from)}" to="${escapeXml(to)}"><reading unit="C">${value}</reading></iq>`;
}

export function iqErrorXml(from: string, to: string, id: string): string {
  return `<iq type="error" id="${escapeXml(id)}" from="${escapeXml(from)}" to="${escapeXml(to)}"><error type="cancel"><service-unavailable xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/></error></iq>`;
}

/** MQTT PUBLISH at QoS 0: fixed header (2) + topic length (2) + topic + payload. */
export function mqttPublishBytes(topic: string, payload: string): number {
  return 2 + 2 + utf8(topic) + utf8(payload);
}

export type StanzaKind = "presence" | "message" | "iq";

export interface StanzaEvent {
  kind: StanzaKind;
  from: string;
  to: string;
  xml: string;
  bytes: number;
  outcome: "delivered" | "stored offline" | "error" | "dropped";
  /** The closest MQTT equivalent, for size comparison */
  mqtt: { topic: string; payload: string; bytes: number };
  explanation: string;
}

interface Account {
  availability: Availability;
  /** Bare JIDs that receive this account's presence */
  presenceSubscribers: Set<string>;
  offlineStore: StanzaEvent[];
}

export class XmppServer {
  private accounts = new Map<string, Account>();
  private iqCounter = 0;
  temperature = 28.5;

  constructor() {
    for (const jid of [SENSOR, PHONE]) {
      this.accounts.set(bare(jid), { availability: "offline", presenceSubscribers: new Set(), offlineStore: [] });
    }
    // The phone has subscribed to the sensor's presence (it is on the phone's roster).
    this.account(SENSOR).presenceSubscribers.add(bare(PHONE));
  }

  private account(jid: string) {
    return this.accounts.get(bare(jid))!;
  }

  availability(jid: string): Availability {
    return this.account(jid).availability;
  }

  storedFor(jid: string): number {
    return this.account(jid).offlineStore.length;
  }

  private ev(e: Omit<StanzaEvent, "bytes">): StanzaEvent {
    return { ...e, bytes: utf8(e.xml) };
  }

  /** A device changes availability. Subscribers who are online get its presence. */
  setAvailability(jid: string, availability: Availability): StanzaEvent[] {
    const acc = this.account(jid);
    acc.availability = availability;
    const name = bare(jid).split("@")[0];
    const events: StanzaEvent[] = [];
    const statusTopic = `home/${name}/status`;
    for (const sub of acc.presenceSubscribers) {
      const subAcc = this.accounts.get(sub)!;
      const online = subAcc.availability !== "offline";
      events.push(
        this.ev({
          kind: "presence",
          from: jid,
          to: sub,
          xml: presenceXml(jid, sub, availability),
          outcome: online ? "delivered" : "dropped",
          mqtt: { topic: statusTopic, payload: availability, bytes: mqttPublishBytes(statusTopic, availability) },
          explanation: online
            ? `The server tells ${sub} that ${name} is now ${availability}.`
            : `${sub} is offline, so the presence update is not delivered. It will see the current status when it logs in.`,
        }),
      );
    }
    // Coming online delivers anything stored while away.
    if (availability !== "offline" && acc.offlineStore.length) {
      events.push(...acc.offlineStore.map((e) => ({ ...e, outcome: "delivered" as const, explanation: `Stored while ${name} was offline, delivered now.` })));
      acc.offlineStore = [];
    }
    return events;
  }

  /** The sensor sends a reading to the phone as a chat message. */
  sendReading(value: number): StanzaEvent {
    this.temperature = value;
    const body = `Temperature is ${value} C`;
    const topic = "home/kitchen/temperature";
    const phoneAcc = this.account(PHONE);
    const event = this.ev({
      kind: "message",
      from: SENSOR,
      to: PHONE,
      xml: messageXml(SENSOR, PHONE, body),
      outcome: phoneAcc.availability === "offline" ? "stored offline" : "delivered",
      mqtt: { topic, payload: String(value), bytes: mqttPublishBytes(topic, String(value)) },
      explanation:
        phoneAcc.availability === "offline"
          ? "The phone is offline, so the server stores the message and delivers it when the phone comes back."
          : "The server routes the message straight to the phone.",
    });
    if (this.availability(SENSOR) === "offline") {
      return { ...event, outcome: "error", explanation: "The sensor must be online (logged in) to send anything." };
    }
    if (event.outcome === "stored offline") phoneAcc.offlineStore.push(event);
    return event;
  }

  /**
   * The phone asks the sensor for its reading with an iq get; returns request
   * and reply, or only the refused request if the phone itself is offline.
   */
  askReading(): StanzaEvent[] {
    const id = `r${++this.iqCounter}`;
    const topic = "home/kitchen/temperature/get";
    const request = this.ev({
      kind: "iq",
      from: PHONE,
      to: SENSOR,
      xml: iqGetXml(PHONE, SENSOR, id),
      outcome: "delivered",
      mqtt: { topic, payload: "", bytes: mqttPublishBytes(topic, "") },
      explanation: `The phone sends an iq get with id ${id}. It will wait for a reply with the same id.`,
    });
    if (this.availability(PHONE) === "offline") {
      return [{ ...request, outcome: "error", explanation: "The phone must be online (logged in) to send anything." }];
    }
    if (this.availability(SENSOR) === "offline") {
      return [
        { ...request, outcome: "error" },
        this.ev({
          kind: "iq",
          from: SENSOR,
          to: PHONE,
          xml: iqErrorXml(SENSOR, PHONE, id),
          outcome: "delivered",
          mqtt: { topic: "home/kitchen/temperature", payload: "", bytes: 0 },
          explanation: `The sensor is offline, so the server answers with an iq error (service-unavailable) for id ${id}.`,
        }),
      ];
    }
    const replyTopic = "home/kitchen/temperature";
    return [
      request,
      this.ev({
        kind: "iq",
        from: SENSOR,
        to: PHONE,
        xml: iqResultXml(SENSOR, PHONE, id, this.temperature),
        outcome: "delivered",
        mqtt: { topic: replyTopic, payload: String(this.temperature), bytes: mqttPublishBytes(replyTopic, String(this.temperature)) },
        explanation: `The sensor replies with iq result, id ${id}, so the phone knows which question it answers.`,
      }),
    ];
  }
}
