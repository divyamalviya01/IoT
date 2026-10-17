/**
 * Lab L06: an MQTT broker. Topic matching follows the MQTT 3.1.1 rules;
 * delivery over a lossy link models the QoS 0, 1 and 2 packet exchanges.
 */

import { createRng, type Rng } from "~/lib/sim/random";

export type QoS = 0 | 1 | 2;

/* ------------------------------------------------------------------ */
/* Topics                                                              */
/* ------------------------------------------------------------------ */

/** A topic name to publish to: no wildcards, not empty. */
export function validTopic(topic: string): boolean {
  return topic.length > 0 && !topic.includes("+") && !topic.includes("#");
}

/** A subscription filter: + fills a whole level; # fills the last level only. */
export function validFilter(filter: string): boolean {
  if (filter.length === 0) return false;
  const levels = filter.split("/");
  return levels.every((level, i) => {
    if (level.includes("#")) return level === "#" && i === levels.length - 1;
    if (level.includes("+")) return level === "+";
    return true;
  });
}

/** Does `filter` match `topic`? (MQTT 3.1.1 section 4.7) */
export function topicMatches(filter: string, topic: string): boolean {
  if (!validFilter(filter) || !validTopic(topic)) return false;
  // Wildcards at the first level never match topics that start with $.
  if (topic.startsWith("$") && (filter.startsWith("+") || filter.startsWith("#"))) return false;
  const f = filter.split("/");
  const t = topic.split("/");
  for (let i = 0; i < f.length; i++) {
    if (f[i] === "#") return true; // also matches the parent level: home/# matches home
    if (i >= t.length) return false;
    if (f[i] !== "+" && f[i] !== t[i]) return false;
  }
  return f.length === t.length;
}

/* ------------------------------------------------------------------ */
/* Broker                                                              */
/* ------------------------------------------------------------------ */

export interface Message {
  topic: string;
  payload: string;
  qos: QoS;
  retain: boolean;
}

export interface Will {
  topic: string;
  payload: string;
  qos: QoS;
  retain: boolean;
}

export interface Delivery {
  to: string;
  message: Message;
  /** QoS used to this subscriber: the lower of publish and subscription QoS */
  qos: QoS;
  /** Sent because it was retained (on subscribe) */
  fromRetained: boolean;
  /** Held while the client was offline and sent on reconnect */
  fromQueue: boolean;
}

interface ClientState {
  id: string;
  connected: boolean;
  cleanSession: boolean;
  subscriptions: Map<string, QoS>;
  will?: Will;
  queue: Delivery[];
}

export class Broker {
  private clients = new Map<string, ClientState>();
  readonly retained = new Map<string, Message>();

  connect(id: string, opts: { cleanSession?: boolean; will?: Will } = {}): Delivery[] {
    const existing = this.clients.get(id);
    const clean = opts.cleanSession ?? true;
    if (!existing || clean) {
      this.clients.set(id, { id, connected: true, cleanSession: clean, subscriptions: new Map(), will: opts.will, queue: [] });
      return [];
    }
    existing.connected = true;
    existing.cleanSession = clean;
    existing.will = opts.will;
    const queued = existing.queue.map((d) => ({ ...d, fromQueue: true }));
    existing.queue = [];
    return queued;
  }

  /** graceful = sent DISCONNECT. Otherwise the Last Will is published. */
  disconnect(id: string, graceful: boolean): Delivery[] {
    const c = this.clients.get(id);
    if (!c || !c.connected) return [];
    c.connected = false;
    const will = c.will;
    if (c.cleanSession) this.clients.delete(id);
    if (!graceful && will) return this.publish(id, will.topic, will.payload, will.qos, will.retain);
    return [];
  }

  subscribe(id: string, filter: string, qos: QoS): Delivery[] {
    const c = this.clients.get(id);
    if (!c || !validFilter(filter)) return [];
    c.subscriptions.set(filter, qos);
    // New subscribers immediately receive matching retained messages.
    return [...this.retained.values()]
      .filter((m) => topicMatches(filter, m.topic))
      .map((m) => ({ to: id, message: m, qos: Math.min(m.qos, qos) as QoS, fromRetained: true, fromQueue: false }));
  }

  unsubscribe(id: string, filter: string) {
    this.clients.get(id)?.subscriptions.delete(filter);
  }

  publish(_from: string, topic: string, payload: string, qos: QoS, retain: boolean): Delivery[] {
    if (!validTopic(topic)) return [];
    const message: Message = { topic, payload, qos, retain };
    if (retain) {
      // An empty retained message clears the retained value.
      if (payload === "") this.retained.delete(topic);
      else this.retained.set(topic, message);
    }
    const out: Delivery[] = [];
    for (const c of this.clients.values()) {
      // A client gets one copy, at the highest QoS of its matching subscriptions.
      let best: QoS | -1 = -1;
      for (const [filter, subQos] of c.subscriptions) {
        if (topicMatches(filter, topic)) best = Math.max(best, subQos) as QoS;
      }
      if (best === -1) continue;
      const delivery: Delivery = {
        to: c.id,
        message: { ...message, retain: false },
        qos: Math.min(qos, best) as QoS,
        fromRetained: false,
        fromQueue: false,
      };
      if (c.connected) out.push(delivery);
      else if (!c.cleanSession && delivery.qos > 0) c.queue.push(delivery);
    }
    return out;
  }

  isConnected(id: string) {
    return this.clients.get(id)?.connected ?? false;
  }

  subscriptionsOf(id: string): [string, QoS][] {
    return [...(this.clients.get(id)?.subscriptions ?? new Map())];
  }

  queuedFor(id: string): number {
    return this.clients.get(id)?.queue.length ?? 0;
  }
}

/* ------------------------------------------------------------------ */
/* QoS over a lossy link                                               */
/* ------------------------------------------------------------------ */

export interface LinkPacket {
  name: string;
  dir: "out" | "back";
  lost: boolean;
}

export interface LinkResult {
  packets: LinkPacket[];
  /** How many times the receiving application got the message (0, 1, or more for duplicates) */
  deliveries: number;
  /** The sender knows the exchange finished */
  completed: boolean;
}

const MAX_TRIES = 6;

/** Sends one message over a link that loses each packet with probability lossPct. */
export function sendOverLink(qos: QoS, lossPct: number, rng: Rng): LinkResult {
  const lose = () => rng.chance(lossPct / 100);
  const packets: LinkPacket[] = [];
  const send = (name: string, dir: "out" | "back") => {
    const lost = lose();
    packets.push({ name, dir, lost });
    return !lost;
  };

  if (qos === 0) {
    const ok = send("PUBLISH", "out");
    return { packets, deliveries: ok ? 1 : 0, completed: true };
  }

  if (qos === 1) {
    let deliveries = 0;
    for (let i = 0; i < MAX_TRIES; i++) {
      if (send(i === 0 ? "PUBLISH" : "PUBLISH (DUP)", "out")) {
        deliveries++; // the receiver passes on every copy it gets
        if (send("PUBACK", "back")) return { packets, deliveries, completed: true };
      }
    }
    return { packets, deliveries, completed: false };
  }

  // QoS 2: the receiver remembers the packet ID, so copies are delivered once.
  let delivered = false;
  let gotPubrec = false;
  for (let i = 0; i < MAX_TRIES && !gotPubrec; i++) {
    if (send(i === 0 ? "PUBLISH" : "PUBLISH (DUP)", "out")) {
      delivered = true;
      gotPubrec = send("PUBREC", "back");
    }
  }
  if (!gotPubrec) return { packets, deliveries: delivered ? 1 : 0, completed: false };
  for (let i = 0; i < MAX_TRIES; i++) {
    if (send("PUBREL", "out") && send("PUBCOMP", "back")) {
      return { packets, deliveries: 1, completed: true };
    }
  }
  return { packets, deliveries: 1, completed: false };
}

export function linkRng(seed: number): Rng {
  return createRng(seed);
}
