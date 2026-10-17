import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, DoorOpen, LayoutDashboard, Plug, PlugZap, Power, Server, Smartphone, Thermometer, X, type LucideIcon } from "lucide-react";
import { useReducer, useRef, useState } from "react";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { EventLog, type SimEvent } from "~/components/sim/EventLog";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { Slider } from "~/components/ui/Slider";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import {
  Broker,
  linkRng,
  sendOverLink,
  topicMatches,
  validFilter,
  validTopic,
  type Delivery,
  type LinkPacket,
  type QoS,
  type Will,
} from "./engine";

const lab = getLab("l06-mqtt-broker")!;

const steps = [
  "Press Publish to send the kitchen temperature. See which clients receive it, and read why in the event log.",
  "Subscribe the Dashboard to home/+/status. It receives the retained status messages straight away.",
  "Press Lose power on the Door sensor. The broker publishes the sensor's Last Will to everyone subscribed to it.",
  "Disconnect the Phone app, publish again with QoS 1, then connect the phone: the broker kept the message for it.",
  "In QoS over a lossy link, set the loss to 30% and send 20 messages at QoS 0, then 1, then 2. Record each run.",
  "Press Record observation after each interesting result, then open the lab record.",
];

type ClientId = "kitchen" | "door" | "phone" | "dashboard";
const CLIENT_IDS: ClientId[] = ["kitchen", "door", "phone", "dashboard"];

interface ClientSpec {
  name: string;
  icon: LucideIcon;
  /** Position on the stage, % */
  x: number;
  y: number;
  /** Persistent session (false) keeps subscriptions and queued messages while offline */
  cleanSession: boolean;
  will?: Will;
  topic: string;
  payload: string;
}

const CLIENTS: Record<ClientId, ClientSpec> = {
  kitchen: {
    name: "Kitchen sensor",
    icon: Thermometer,
    x: 15,
    y: 24,
    cleanSession: true,
    will: { topic: "home/kitchen/status", payload: "offline", qos: 1, retain: true },
    topic: "home/kitchen/temperature",
    payload: "28.5",
  },
  door: {
    name: "Door sensor",
    icon: DoorOpen,
    x: 15,
    y: 76,
    cleanSession: true,
    will: { topic: "home/door/status", payload: "offline", qos: 1, retain: true },
    topic: "home/door/state",
    payload: "open",
  },
  phone: { name: "Phone app", icon: Smartphone, x: 85, y: 24, cleanSession: false, topic: "home/phone/status", payload: "hello" },
  dashboard: { name: "Dashboard", icon: LayoutDashboard, x: 85, y: 76, cleanSession: true, topic: "home/dashboard/status", payload: "hello" },
};

const BROKER_POS = { x: 50, y: 50 };
const QOS_OPTIONS = [0, 1, 2].map((q) => ({ value: String(q), label: String(q), ariaLabel: `QoS ${q}` }));

/** Sensors announce "online" (retained) when they connect; their Last Will says "offline". */
function birth(broker: Broker, id: ClientId): Delivery[] {
  const will = CLIENTS[id].will;
  return will ? broker.publish(id, will.topic, "online", will.qos, true) : [];
}

function createBroker(): Broker {
  const b = new Broker();
  for (const id of CLIENT_IDS) b.connect(id, { cleanSession: CLIENTS[id].cleanSession, will: CLIENTS[id].will });
  b.subscribe("phone", "home/#", 1);
  b.subscribe("dashboard", "home/+/temperature", 0);
  birth(b, "kitchen");
  birth(b, "door");
  return b;
}

interface InboxItem {
  id: number;
  topic: string;
  payload: string;
  qos: QoS;
  note?: string;
}

interface Flight {
  id: number;
  from: ClientId | "broker";
  to: ClientId[];
  label: string;
  tone: "brand" | "warn" | "u2";
}

/** One recordable result: the last thing the student did. */
type Recordable = ObservationRow & { test: string; settings: string; outcome: string };

const names = (ids: string[]) => {
  const list = ids.map((id) => CLIENTS[id as ClientId].name);
  if (list.length <= 1) return list[0] ?? "nobody";
  return `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;
};

function summarise(rows: ObservationRow[]): string {
  const sentences: string[] = [];
  const publishes = rows.filter((r) => r.test === "Publish");
  if (publishes.length) {
    const reachedNobody = publishes.filter((r) => String(r.outcome).includes("nobody")).length;
    sentences.push(
      `In ${publishes.length} publish test${publishes.length === 1 ? "" : "s"}, the broker forwarded each message only to clients whose subscription matched the topic${reachedNobody ? `; ${reachedNobody} message${reachedNobody === 1 ? "" : "s"} matched no subscription and reached nobody` : ""}.`,
    );
  }
  const will = rows.find((r) => r.test === "Last Will");
  if (will) sentences.push(`When a client lost power without disconnecting, the broker published its Last Will (${will.outcome}).`);
  const retained = rows.find((r) => r.test === "Subscribe" && Number(r.retainedCount) > 0);
  if (retained) sentences.push(`A new subscription received ${retained.retainedCount} retained message${Number(retained.retainedCount) === 1 ? "" : "s"} at once, without waiting for the next publish.`);
  const queued = rows.find((r) => r.test === "Reconnect" && Number(r.queuedCount) > 0);
  if (queued) sentences.push(`The Phone app's persistent session kept ${queued.queuedCount} QoS 1 or 2 message${Number(queued.queuedCount) === 1 ? "" : "s"} while it was offline and received them on reconnect.`);

  const qosRows = rows.filter((r) => r.test === "QoS over lossy link");
  if (qosRows.length) {
    const byQos = new Map<number, ObservationRow>();
    for (const r of qosRows) byQos.set(Number(r.qos), r);
    const parts = [...byQos.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([q, r]) => {
        const bits = [`${r.once} of ${r.sent} exactly once`];
        if (Number(r.dup)) bits.push(`${r.dup} with duplicates`);
        if (Number(r.lostCount)) bits.push(`${r.lostCount} lost`);
        return `QoS ${q} at ${r.loss}% loss delivered ${bits.join(", ")}`;
      });
    sentences.push(`${parts.join("; ")}.`);
    const q0 = byQos.get(0);
    const q1 = byQos.get(1);
    const q2 = byQos.get(2);
    if (q0 && Number(q0.lostCount) > 0 && q2 && Number(q2.lostCount) === 0 && Number(q2.dup) === 0) {
      sentences.push(
        `So QoS 0 can lose messages, ${q1 && Number(q1.dup) > 0 ? "QoS 1 never loses them but can deliver duplicates, " : ""}and QoS 2 delivers each message exactly once at the cost of more packets.`,
      );
    }
  }
  return sentences.join(" ");
}

export default function MqttBrokerLab() {
  const broker = useRef<Broker | null>(null);
  broker.current ??= createBroker();
  const b = broker.current;
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const start = useRef(0);
  const nextId = useRef(0);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [inbox, setInbox] = useState<Record<ClientId, InboxItem[]>>({ kitchen: [], door: [], phone: [], dashboard: [] });
  const [flight, setFlight] = useState<Flight | null>(null);
  const [status, setStatus] = useState("Four clients are connected to the broker. Publish a message to begin.");
  const [last, setLast] = useState<Recordable | null>(null);
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");

  // Publish form
  const [pubClient, setPubClient] = useState<ClientId>("kitchen");
  const [pubTopic, setPubTopic] = useState(CLIENTS.kitchen.topic);
  const [pubPayload, setPubPayload] = useState(CLIENTS.kitchen.payload);
  const [pubQos, setPubQos] = useState<QoS>(1);
  const [pubRetain, setPubRetain] = useState(false);
  // Subscribe form
  const [subClient, setSubClient] = useState<ClientId>("dashboard");
  const [subFilter, setSubFilter] = useState("home/+/status");
  const [subQos, setSubQos] = useState<QoS>(0);

  const now = () => {
    if (!start.current) start.current = performance.now();
    return performance.now() - start.current;
  };

  const log = (entries: { text: string; kind: string; tone?: SimEvent["tone"] }[]) => {
    const t = now();
    setEvents((prev) => [...prev, ...entries.map((e) => ({ ...e, id: ++nextId.current, t }))].slice(-200));
  };

  /** Puts deliveries in the receivers' inboxes and logs one line per copy. */
  const deliver = (deliveries: Delivery[], note?: string) => {
    if (!deliveries.length) return;
    setInbox((prev) => {
      const next = { ...prev };
      for (const d of deliveries) {
        const id = d.to as ClientId;
        const itemNote = d.fromRetained ? "retained" : d.fromQueue ? "kept while offline" : note;
        next[id] = [{ id: ++nextId.current, topic: d.message.topic, payload: d.message.payload, qos: d.qos, note: itemNote }, ...next[id]].slice(0, 4);
      }
      return next;
    });
    log(
      deliveries.map((d) => {
        const matched = b.subscriptionsOf(d.to).find(([f]) => topicMatches(f, d.message.topic))?.[0];
        return {
          kind: "publish",
          tone: "ok" as const,
          text: `Broker → ${CLIENTS[d.to as ClientId].name}: PUBLISH ${d.message.topic} "${d.message.payload}" at QoS ${d.qos}${d.fromRetained ? " (retained)" : d.fromQueue ? " (kept while offline)" : ""}${matched ? `, matches ${matched}` : ""}`,
        };
      }),
    );
  };

  const fly = (from: Flight["from"], to: string[], label: string, tone: Flight["tone"]) =>
    setFlight({ id: ++nextId.current, from, to: to as ClientId[], label, tone });

  const finish = (r: Recordable, statusText: string) => {
    setLast(r);
    setStatus(statusText);
    rerender();
  };

  const queuedSnapshot = () => Object.fromEntries(CLIENT_IDS.map((id) => [id, b.queuedFor(id)])) as Record<ClientId, number>;

  const topicError = validTopic(pubTopic) ? null : "A topic must not be empty and cannot contain + or #. Wildcards are only for subscribing.";
  const filterError = validFilter(subFilter) ? null : "Use + for one whole level and # only as the last level, for example home/+/status or home/#.";

  const publish = () => {
    if (topicError || !b.isConnected(pubClient)) return;
    const before = queuedSnapshot();
    const deliveries = b.publish(pubClient, pubTopic, pubPayload, pubQos, pubRetain);
    const after = queuedSnapshot();
    const queuedFor = CLIENT_IDS.filter((id) => after[id] > before[id]);
    const to = deliveries.map((d) => d.to);
    log([
      {
        kind: "publish",
        text: `${CLIENTS[pubClient].name} → Broker: PUBLISH ${pubTopic} "${pubPayload}" at QoS ${pubQos}${pubRetain ? ", retain flag set" : ""}`,
      },
    ]);
    deliver(deliveries);
    if (queuedFor.length) {
      log([{ kind: "publish", tone: "warn", text: `Broker keeps the message for ${names(queuedFor)}, who is offline with a persistent session.` }]);
    }
    fly(pubClient, to, pubTopic.split("/").at(-1) ?? pubTopic, "brand");
    const outcome = `Received by ${names(to)}${queuedFor.length ? `; kept for ${names(queuedFor)}` : ""}${pubRetain ? "; stored as retained" : ""}`;
    finish(
      { test: "Publish", settings: `${pubTopic} = "${pubPayload}", QoS ${pubQos}${pubRetain ? ", retained" : ""}`, outcome },
      to.length
        ? `The broker sent the message to ${names(to)}, because their subscriptions match ${pubTopic}.`
        : `No subscription matches ${pubTopic}, so the broker forwarded it to nobody${pubRetain ? ", but it keeps it as the retained message for future subscribers" : ""}.`,
    );
  };

  const subscribe = () => {
    if (filterError || !b.isConnected(subClient)) return;
    const deliveries = b.subscribe(subClient, subFilter, subQos);
    log([{ kind: "subscribe", text: `${CLIENTS[subClient].name} → Broker: SUBSCRIBE ${subFilter} at QoS ${subQos}. Broker replies SUBACK.` }]);
    deliver(deliveries);
    if (deliveries.length) fly("broker", [subClient], "retained", "u2");
    finish(
      {
        test: "Subscribe",
        settings: `${CLIENTS[subClient].name}: ${subFilter}, QoS ${subQos}`,
        outcome: deliveries.length ? `Got ${deliveries.length} retained message${deliveries.length === 1 ? "" : "s"} at once` : "No retained messages matched",
        retainedCount: deliveries.length,
      },
      deliveries.length
        ? `${CLIENTS[subClient].name} subscribed and at once received ${deliveries.length} retained message${deliveries.length === 1 ? "" : "s"}: ${deliveries.map((d) => `${d.message.topic} = ${d.message.payload}`).join(", ")}.`
        : `${CLIENTS[subClient].name} subscribed to ${subFilter}. No retained message matches yet, so it waits for the next publish.`,
    );
  };

  const unsubscribe = (id: ClientId, filter: string) => {
    b.unsubscribe(id, filter);
    log([{ kind: "subscribe", text: `${CLIENTS[id].name} → Broker: UNSUBSCRIBE ${filter}` }]);
    setStatus(`${CLIENTS[id].name} no longer receives messages matching ${filter}.`);
    rerender();
  };

  const losePower = (id: ClientId) => {
    const will = CLIENTS[id].will;
    const deliveries = b.disconnect(id, false);
    const to = deliveries.map((d) => d.to);
    log([
      { kind: "will", tone: "bad", text: `${CLIENTS[id].name} stopped responding. The keep-alive timer ran out.` },
      ...(will ? [{ kind: "will", tone: "warn" as const, text: `Broker publishes the Last Will: ${will.topic} "${will.payload}" (retained)` }] : []),
    ]);
    deliver(deliveries, "Last Will");
    if (will) fly("broker", to, "Last Will", "warn");
    finish(
      {
        test: "Last Will",
        settings: `${CLIENTS[id].name} lost power`,
        outcome: will ? `"${will.payload}" on ${will.topic} sent to ${names(to)}` : "No Last Will was set",
      },
      will
        ? `${CLIENTS[id].name} vanished without saying goodbye, so the broker published its Last Will "${will.payload}" to ${names(to)}.`
        : `${CLIENTS[id].name} vanished. It had no Last Will, so nobody was told.`,
    );
  };

  const disconnect = (id: ClientId) => {
    b.disconnect(id, true);
    log([{ kind: "connect", text: `${CLIENTS[id].name} → Broker: DISCONNECT. A clean goodbye, so no Last Will is sent.` }]);
    finish(
      { test: "Disconnect", settings: `${CLIENTS[id].name} disconnected normally`, outcome: "No Last Will sent" },
      CLIENTS[id].cleanSession
        ? `${CLIENTS[id].name} disconnected. It used a clean session, so the broker forgets its subscriptions.`
        : `${CLIENTS[id].name} disconnected. It has a persistent session, so the broker keeps its subscriptions and stores QoS 1 and 2 messages for it.`,
    );
  };

  const connect = (id: ClientId) => {
    const spec = CLIENTS[id];
    const queued = b.connect(id, { cleanSession: spec.cleanSession, will: spec.will });
    log([{ kind: "connect", text: `${spec.name} → Broker: CONNECT (${spec.cleanSession ? "clean session" : "persistent session"}). Broker replies CONNACK.` }]);
    deliver(queued);
    const announced = birth(b, id);
    if (spec.will) {
      log([{ kind: "publish", text: `${spec.name} → Broker: PUBLISH ${spec.will.topic} "online" (retained)` }]);
      deliver(announced);
    }
    if (queued.length) fly("broker", [id], "kept", "u2");
    else if (announced.length) fly(id, announced.map((d) => d.to), "online", "brand");
    finish(
      {
        test: "Reconnect",
        settings: `${spec.name} connected`,
        outcome: queued.length
          ? `${queued.length} message${queued.length === 1 ? "" : "s"} kept while offline delivered`
          : spec.cleanSession
            ? "Clean session: starts with no subscriptions"
            : "Nothing was waiting",
        queuedCount: queued.length,
      },
      queued.length
        ? `${spec.name} is back. The broker delivered ${queued.length} message${queued.length === 1 ? "" : "s"} it kept while the phone was away.`
        : spec.cleanSession
          ? `${spec.name} is back with a clean session${spec.will ? " and announced it is online" : ""}. Its old subscriptions are gone.`
          : `${spec.name} is back. Nothing was waiting for it.`,
    );
  };

  const choosePubClient = (id: ClientId) => {
    setPubClient(id);
    setPubTopic(CLIENTS[id].topic);
    setPubPayload(CLIENTS[id].payload);
  };

  const record = () => {
    if (!last) return;
    addRow(last);
    const auto = summarise([...rows, last]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  const retained = [...b.retained.values()];
  const connected = CLIENT_IDS.filter((id) => b.isConnected(id));
  const inputClass = "h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3";

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordDisabled={!last}
      recordHint={last ? `Records: ${last.test} — ${last.outcome}.` : "Publish, subscribe or run a QoS test first."}
      controls={
        <>
          <fieldset className="grid min-w-0 gap-3">
            <legend className="mb-1 font-semibold">Publish a message</legend>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink-2">From</span>
              <select className={inputClass} value={pubClient} onChange={(e) => choosePubClient(e.target.value as ClientId)}>
                {CLIENT_IDS.map((id) => (
                  <option key={id} value={id}>
                    {CLIENTS[id].name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink-2">Topic</span>
              <input className={cn(inputClass, "font-mono")} value={pubTopic} onChange={(e) => setPubTopic(e.target.value.trim())} aria-invalid={!!topicError} spellCheck={false} />
              {topicError && <span className="text-sm text-bad">{topicError}</span>}
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink-2">Payload</span>
              <input className={cn(inputClass, "font-mono")} value={pubPayload} maxLength={32} onChange={(e) => setPubPayload(e.target.value)} />
            </label>
            <Segmented label="QoS" size="sm" value={String(pubQos)} onChange={(v) => setPubQos(Number(v) as QoS)} options={QOS_OPTIONS} />
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={pubRetain} onChange={(e) => setPubRetain(e.target.checked)} />
              <span>Retain (broker keeps it for future subscribers)</span>
            </label>
            <Button variant="primary" onClick={publish} disabled={!!topicError || !b.isConnected(pubClient)}>
              Publish
            </Button>
            {!b.isConnected(pubClient) && <p className="text-sm text-warn">{CLIENTS[pubClient].name} is offline. Connect it first.</p>}
          </fieldset>

          <div className="border-t border-line pt-4">
          <fieldset className="grid min-w-0 gap-3">
            <legend className="mb-1 font-semibold">Subscribe</legend>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink-2">Client</span>
              <select className={inputClass} value={subClient} onChange={(e) => setSubClient(e.target.value as ClientId)}>
                {CLIENT_IDS.map((id) => (
                  <option key={id} value={id}>
                    {CLIENTS[id].name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-ink-2">Topic filter</span>
              <input className={cn(inputClass, "font-mono")} value={subFilter} onChange={(e) => setSubFilter(e.target.value.trim())} aria-invalid={!!filterError} spellCheck={false} />
              {filterError && <span className="text-sm text-bad">{filterError}</span>}
            </label>
            <Segmented label="QoS" size="sm" value={String(subQos)} onChange={(v) => setSubQos(Number(v) as QoS)} options={QOS_OPTIONS} />
            <Button onClick={subscribe} disabled={!!filterError || !b.isConnected(subClient)}>
              Subscribe
            </Button>
            {!b.isConnected(subClient) && <p className="text-sm text-warn">{CLIENTS[subClient].name} is offline. Connect it first.</p>}
          </fieldset>
          </div>
        </>
      }
      stage={
        <div className="grid grid-cols-1 gap-2 p-3 sm:p-4">
          <BrokerStage flight={flight} connected={connected} retainedCount={retained.length} />
          <p className="min-h-12 text-sm text-ink-2" aria-live="polite">
            {status}
          </p>
        </div>
      }
      readouts={
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CLIENT_IDS.map((id) => (
              <ClientCard
                key={id}
                id={id}
                connected={b.isConnected(id)}
                subscriptions={b.subscriptionsOf(id)}
                queued={b.queuedFor(id)}
                inbox={inbox[id]}
                onConnect={() => connect(id)}
                onDisconnect={() => disconnect(id)}
                onLosePower={() => losePower(id)}
                onUnsubscribe={(f) => unsubscribe(id, f)}
              />
            ))}
          </div>
          <div className="rounded-lg border border-line bg-surface p-3">
            <h4 className="text-sm font-bold">Retained messages at the broker</h4>
            {retained.length ? (
              <ul className="mt-1.5 grid gap-1 font-mono text-sm">
                {retained.map((m) => (
                  <li key={m.topic} className="break-all">
                    {m.topic} = <span className="text-ink-2">"{m.payload}"</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-ink-3">None. Publish with Retain ticked to store one.</p>
            )}
          </div>
        </div>
      }
      log={
        <>
          <EventLog
            title="Packet log"
            events={events}
            filters={[
              { kind: "publish", label: "Publish" },
              { kind: "subscribe", label: "Subscribe" },
              { kind: "connect", label: "Connect" },
              { kind: "will", label: "Last Will" },
            ]}
            emptyText="Publish or subscribe to see the MQTT packets."
          />
          <QosLink onResult={(r, text) => { setLast(r); setStatus(text); }} />
          <TopicTester onResult={(r) => setLast(r)} />
        </>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Stage: broker in the middle, clients around it                      */
/* ------------------------------------------------------------------ */

const toneClass: Record<Flight["tone"], string> = {
  brand: "border-brand bg-brand-soft",
  warn: "border-warn bg-warn-soft",
  u2: "border-u2 bg-u2-soft",
};

function BrokerStage({ flight, connected, retainedCount }: { flight: Flight | null; connected: ClientId[]; retainedCount: number }) {
  const reduced = useReducedMotion() ?? false;
  const pos = (p: ClientId | "broker") => (p === "broker" ? BROKER_POS : CLIENTS[p]);
  const pct = (n: number) => `${n}%`;

  const paths = flight
    ? flight.to.length
      ? flight.to.map((to) => (flight.from === "broker" ? [pos("broker"), pos(to)] : [pos(flight.from), pos("broker"), pos(to)]))
      : [[pos(flight.from), pos("broker")]]
    : [];

  return (
    <div className="relative h-64 sm:h-72" role="img" aria-label={`MQTT broker with four clients. Connected: ${connected.map((id) => CLIENTS[id].name).join(", ") || "none"}.`}>
      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {CLIENT_IDS.map((id) => (
          <line
            key={id}
            x1={CLIENTS[id].x}
            y1={CLIENTS[id].y}
            x2={BROKER_POS.x}
            y2={BROKER_POS.y}
            stroke="var(--line-strong)"
            strokeWidth={2}
            opacity={connected.includes(id) ? 1 : 0.35}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: pct(BROKER_POS.x), top: pct(BROKER_POS.y) }} aria-hidden>
        <span className="flex size-16 items-center justify-center rounded-xl border-2 border-brand bg-surface">
          <Server size={28} className="text-brand" />
        </span>
        <span className="mt-1 text-sm font-bold">Broker</span>
        <span className="text-xs text-ink-3">{retainedCount} retained</span>
      </div>

      {CLIENT_IDS.map((id) => {
        const c = CLIENTS[id];
        const Icon = c.icon;
        const on = connected.includes(id);
        return (
          <div key={id} className="absolute flex w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center" style={{ left: pct(c.x), top: pct(c.y) }} aria-hidden>
            <span className={cn("relative flex size-11 items-center justify-center rounded-full border-2 bg-surface", on ? "border-line-strong" : "border-dashed border-line opacity-60")}>
              <Icon size={20} className="text-ink-2" />
              <span className={cn("absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-surface", on ? "bg-ok" : "bg-bad")} />
            </span>
            <span className="mt-1 rounded bg-surface px-1 text-xs font-semibold leading-tight">{c.name}</span>
          </div>
        );
      })}

      {!reduced &&
        flight &&
        paths.map((path, i) => (
          <motion.span
            key={`${flight.id}-${i}`}
            className={cn("absolute z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border px-1.5 font-mono text-xs leading-5 text-ink", toneClass[flight.tone])}
            initial={{ left: pct(path[0].x), top: pct(path[0].y), opacity: 1 }}
            animate={{ left: path.map((p) => pct(p.x)), top: path.map((p) => pct(p.y)), opacity: [1, 1, 0] }}
            transition={{
              duration: path.length === 3 ? 1.6 : 1,
              ease: "easeInOut",
              times: path.length === 3 ? [0, 0.45, 1] : undefined,
              // Fade out shortly after arriving.
              opacity: { duration: (path.length === 3 ? 1.6 : 1) + 0.5, times: [0, 0.8, 1] },
            }}
            aria-hidden
          >
            {flight.label}
          </motion.span>
        ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Client cards                                                        */
/* ------------------------------------------------------------------ */

function ClientCard({
  id,
  connected,
  subscriptions,
  queued,
  inbox,
  onConnect,
  onDisconnect,
  onLosePower,
  onUnsubscribe,
}: {
  id: ClientId;
  connected: boolean;
  subscriptions: [string, QoS][];
  queued: number;
  inbox: InboxItem[];
  onConnect: () => void;
  onDisconnect: () => void;
  onLosePower: () => void;
  onUnsubscribe: (filter: string) => void;
}) {
  const c = CLIENTS[id];
  const Icon = c.icon;
  return (
    <section aria-label={c.name} className="grid min-w-0 content-start gap-2 rounded-lg border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Icon size={18} className="text-ink-2" aria-hidden />
        <h4 className="font-bold">{c.name}</h4>
        <span className={cn("rounded-full px-2 text-xs font-semibold leading-5", connected ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad")}>
          {connected ? "Connected" : "Offline"}
        </span>
        <span className="text-xs text-ink-3">{c.cleanSession ? "clean session" : "persistent session"}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {connected ? (
          <>
            <Button size="sm" variant="ghost" onClick={onDisconnect} icon={<Plug size={14} aria-hidden />}>
              Disconnect
            </Button>
            <Button size="sm" variant="ghost" onClick={onLosePower} icon={<Power size={14} aria-hidden />}>
              Lose power
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={onConnect} icon={<PlugZap size={14} aria-hidden />}>
            Connect
          </Button>
        )}
      </div>

      <div className="text-sm">
        <p className="font-semibold text-ink-2">Subscriptions</p>
        {subscriptions.length ? (
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {subscriptions.map(([f, q]) => (
              <li key={f} className="flex items-center gap-1 rounded-md border border-line bg-surface-2 py-0.5 pl-2 pr-0.5 font-mono text-xs">
                {f} <span className="text-ink-3">QoS {q}</span>
                <button
                  type="button"
                  className="rounded p-0.5 text-ink-3 hover:bg-surface hover:text-ink"
                  onClick={() => onUnsubscribe(f)}
                  aria-label={`Unsubscribe ${c.name} from ${f}`}
                >
                  <X size={12} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-3">None</p>
        )}
        {willNote(c)}
      </div>

      <div className="text-sm">
        <p className="font-semibold text-ink-2">
          Received{queued > 0 && <span className="ml-2 font-normal text-warn">{queued} waiting at the broker</span>}
        </p>
        {inbox.length ? (
          <ul className="mt-1 grid gap-0.5">
            {inbox.map((m) => (
              <li key={m.id} className="break-all font-mono text-xs">
                {m.topic} = "{m.payload}" <span className="text-ink-3">QoS {m.qos}{m.note ? ` · ${m.note}` : ""}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-3">Nothing yet</p>
        )}
      </div>
    </section>
  );
}

function willNote(c: ClientSpec) {
  if (!c.will) return null;
  return (
    <p className="mt-1.5 text-xs text-ink-3">
      Last Will: <span className="font-mono">{c.will.topic} = "{c.will.payload}"</span>
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* QoS over a lossy link                                               */
/* ------------------------------------------------------------------ */

interface Tally {
  sent: number;
  once: number;
  dup: number;
  lost: number;
  packets: number;
}
const EMPTY_TALLY: Tally = { sent: 0, once: 0, dup: 0, lost: 0, packets: 0 };

function QosLink({ onResult }: { onResult: (r: Recordable, text: string) => void }) {
  const [qos, setQos] = useState<QoS>(1);
  const [loss, setLoss] = useState(30);
  const [tally, setTally] = useState<Tally>(EMPTY_TALLY);
  const [ladder, setLadder] = useState<{ id: number; packets: LinkPacket[]; deliveries: number } | null>(null);
  const rng = useRef(linkRng(6));
  const ladderId = useRef(0);
  const reduced = useReducedMotion() ?? false;

  const reset = () => {
    setTally(EMPTY_TALLY);
    setLadder(null);
    rng.current = linkRng(6);
  };

  const send = (n: number) => {
    const t = { ...tally };
    let lastResult = null;
    for (let i = 0; i < n; i++) {
      const r = sendOverLink(qos, loss, rng.current);
      t.sent++;
      t.packets += r.packets.length;
      if (r.deliveries === 0) t.lost++;
      else if (r.deliveries === 1) t.once++;
      else t.dup++;
      lastResult = r;
    }
    setTally(t);
    if (lastResult) setLadder({ id: ++ladderId.current, packets: lastResult.packets, deliveries: lastResult.deliveries });
    onResult(
      {
        test: "QoS over lossy link",
        settings: `QoS ${qos}, ${loss}% loss, ${t.sent} message${t.sent === 1 ? "" : "s"}`,
        outcome: `Once ${t.once}, duplicates ${t.dup}, lost ${t.lost}; ${t.packets} packets`,
        qos,
        loss,
        sent: t.sent,
        once: t.once,
        dup: t.dup,
        lostCount: t.lost,
      },
      `QoS ${qos} over a link with ${loss}% loss: ${t.once} of ${t.sent} messages arrived exactly once, ${t.dup} arrived more than once and ${t.lost} were lost.`,
    );
  };

  const outcomeText = (d: number) => (d === 0 ? "The subscriber never got it." : d === 1 ? "The subscriber got it exactly once." : `The subscriber got it ${d} times (duplicates).`);

  return (
    <section aria-labelledby="l06-qos" className="grid grid-cols-1 gap-4 rounded-lg border border-line bg-surface p-4">
      <div className="grid gap-1">
        <h3 id="l06-qos" className="text-h3 font-bold">
          QoS over a lossy link
        </h3>
        <p className="max-w-[70ch] text-ink-2">
          Send messages from a sensor to the broker over a bad link and see what each QoS level does when packets are lost.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <Segmented
            label="QoS level"
            value={String(qos)}
            onChange={(v) => {
              setQos(Number(v) as QoS);
              reset();
            }}
            options={QOS_OPTIONS}
          />
          <Slider
            label="Packet loss"
            value={loss}
            min={0}
            max={50}
            step={5}
            unit="%"
            onChange={(v) => {
              setLoss(v);
              reset();
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => send(1)}>Send 1 message</Button>
            <Button variant="primary" onClick={() => send(20)}>
              Send 20 messages
            </Button>
          </div>
          <p className="text-sm text-ink-3">Changing QoS or loss clears the counts.</p>
        </div>

        <div className="grid min-w-0 content-start gap-3">
          <Readouts
            items={[
              { label: "Messages sent", value: tally.sent },
              { label: "Exactly once", value: tally.once, tone: tally.once ? "ok" : "default" },
              { label: "Duplicates", value: tally.dup, tone: tally.dup ? "warn" : "default", hint: "Messages the subscriber received more than once" },
              { label: "Lost", value: tally.lost, tone: tally.lost ? "bad" : "default" },
            ]}
          />
          <div className="rounded-lg border border-line bg-surface-2 p-3">
            <div className="flex justify-between text-sm font-semibold text-ink-2">
              <span>Sensor</span>
              <span>Last message</span>
              <span>Broker</span>
            </div>
            {ladder ? (
              <>
                <ol className="mt-2 grid gap-1">
                  {ladder.packets.map((p, i) => (
                    <motion.li
                      key={`${ladder.id}-${i}`}
                      initial={reduced ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: reduced ? 0 : i * 0.25 }}
                      className="relative h-7"
                    >
                      <LadderArrow packet={p} />
                    </motion.li>
                  ))}
                </ol>
                <p className="mt-2 text-sm" aria-live="polite">
                  {outcomeText(ladder.deliveries)} {ladder.packets.length} packet{ladder.packets.length === 1 ? "" : "s"} on the link.
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-3">Send a message to see its packets.</p>
            )}
          </div>
          <p className="text-sm text-ink-3">
            {qos === 0 && "QoS 0, at most once: one PUBLISH, no reply. If it is lost, it is gone."}
            {qos === 1 && "QoS 1, at least once: PUBLISH until a PUBACK comes back. A lost PUBACK causes a resend, so the subscriber may get a copy twice."}
            {qos === 2 && "QoS 2, exactly once: PUBLISH, PUBREC, PUBREL, PUBCOMP. The broker remembers the packet ID, so a resent copy is not delivered again."}
          </p>
        </div>
      </div>
    </section>
  );
}

function LadderArrow({ packet }: { packet: LinkPacket }) {
  const out = packet.dir === "out";
  const Arrow = out ? ArrowRight : ArrowLeft;
  return (
    <div className="absolute inset-0 flex items-center">
      <span
        className={cn("absolute top-1/2 h-0.5 -translate-y-1/2", packet.lost ? "bg-bad" : out ? "bg-brand" : "bg-ok")}
        style={packet.lost ? (out ? { left: "4%", width: "46%" } : { right: "4%", width: "46%" }) : { left: "4%", right: "4%" }}
        aria-hidden
      />
      {packet.lost ? (
        <X size={16} strokeWidth={3} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-bad" aria-hidden />
      ) : (
        <Arrow size={16} className={cn("absolute top-1/2 -translate-y-1/2", out ? "right-[2%] text-brand" : "left-[2%] text-ok")} aria-hidden />
      )}
      <span
        className={cn(
          "absolute -top-0.5 rounded bg-surface-2 px-1 font-mono text-xs",
          out ? "left-[8%]" : "right-[8%]",
          packet.lost && "text-bad line-through",
        )}
      >
        {packet.name}
        <span className="sr-only">{packet.lost ? " lost" : out ? " sensor to broker" : " broker to sensor"}</span>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Topic matcher                                                       */
/* ------------------------------------------------------------------ */

function explainLevels(filter: string, topic: string) {
  const f = filter.split("/");
  const t = topic.split("/");
  const out: { f: string; t: string; ok: boolean; note: string }[] = [];
  for (let i = 0; i < Math.max(f.length, t.length); i++) {
    const fl = f[i];
    const tl = t[i];
    if (fl === "#") {
      out.push({ f: "#", t: t.slice(i).join("/") || "(nothing)", ok: true, note: "# matches all remaining levels" });
      return out;
    }
    if (fl === undefined) {
      out.push({ f: "(none)", t: tl, ok: false, note: "The topic has more levels than the filter" });
      return out;
    }
    if (tl === undefined) {
      out.push({ f: fl, t: "(none)", ok: false, note: "The topic has fewer levels than the filter" });
      return out;
    }
    const ok = fl === "+" || fl === tl;
    out.push({ f: fl, t: tl, ok, note: fl === "+" ? "+ matches any one level" : ok ? "Same text" : "Different text" });
    if (!ok) return out;
  }
  return out;
}

function TopicTester({ onResult }: { onResult: (r: Recordable) => void }) {
  const [filter, setFilter] = useState("home/+/temperature");
  const [topic, setTopic] = useState("home/kitchen/temperature");
  const fOk = validFilter(filter);
  const tOk = validTopic(topic);
  const match = topicMatches(filter, topic);
  const dollar = fOk && tOk && topic.startsWith("$") && (filter.startsWith("+") || filter.startsWith("#"));
  const levels = fOk && tOk && !dollar ? explainLevels(filter, topic) : [];
  const input = "h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3 font-mono";

  return (
    <section aria-labelledby="l06-tester" className="grid grid-cols-1 gap-4 rounded-lg border border-line bg-surface p-4">
      <div className="grid gap-1">
        <h3 id="l06-tester" className="text-h3 font-bold">
          Topic matcher
        </h3>
        <p className="max-w-[70ch] text-ink-2">Type a subscription filter and a topic to see, level by level, whether the broker would deliver it.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1.5">
          <span className="text-[0.95rem] font-semibold">Subscription filter</span>
          <input className={input} value={filter} onChange={(e) => setFilter(e.target.value.trim())} spellCheck={false} aria-invalid={!fOk} />
          {!fOk && <span className="text-sm text-bad">Not a valid filter: + must fill a whole level and # must be the last level.</span>}
        </label>
        <label className="grid min-w-0 gap-1.5">
          <span className="text-[0.95rem] font-semibold">Published topic</span>
          <input className={input} value={topic} onChange={(e) => setTopic(e.target.value.trim())} spellCheck={false} aria-invalid={!tOk} />
          {!tOk && <span className="text-sm text-bad">Not a valid topic: it must not be empty or contain + or #.</span>}
        </label>
      </div>
      {fOk && tOk && (
        <div className="grid gap-3">
          {levels.length > 0 && (
            <div className="relative overflow-x-auto rounded-lg border border-line">
              <table className="w-full border-collapse text-[0.95rem]">
                <caption className="sr-only">Level-by-level comparison</caption>
                <thead className="bg-surface-2">
                  <tr>
                    {["Level", "Filter", "Topic", "Result"].map((h) => (
                      <th key={h} scope="col" className="border-b border-line-strong px-3 py-2 text-left font-bold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {levels.map((l, i) => (
                    <tr key={i} className="border-b border-line last:border-b-0">
                      <td className="px-3 py-1.5">{i + 1}</td>
                      <td className="px-3 py-1.5 font-mono">{l.f}</td>
                      <td className="break-all px-3 py-1.5 font-mono">{l.t}</td>
                      <td className={cn("min-w-40 px-3 py-1.5", l.ok ? "text-ok" : "text-bad")}>
                        {l.ok ? "✓" : "✗"} {l.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <p className={cn("rounded-md px-2.5 py-1 font-semibold", match ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad")} aria-live="polite">
              {match ? "Match: the broker delivers it." : dollar ? "No match: wildcards at the first level never match topics starting with $." : "No match: the broker does not deliver it."}
            </p>
            <Button
              size="sm"
              onClick={() => onResult({ test: "Topic match", settings: `${filter} vs ${topic}`, outcome: match ? "Match" : "No match" })}
            >
              Use this result
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
