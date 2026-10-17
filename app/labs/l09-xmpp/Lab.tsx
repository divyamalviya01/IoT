import { motion, useReducedMotion } from "motion/react";
import { CircleHelp, Send, Server, Smartphone, Thermometer, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { EventLog, type EventTone, type SimEvent } from "~/components/sim/EventLog";
import { ChartCard, ChartTooltip, chartStyle, seriesColor } from "~/components/theory/ChartCard";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { Slider } from "~/components/ui/Slider";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import { PHONE, SENSOR, XmppServer, bare, type Availability, type StanzaEvent } from "./engine";

const lab = getLab("l09-xmpp")!;

const steps = [
  "Set the Phone to Online, then the Sensor to Online. Watch the presence stanza travel to the phone.",
  "Press Send reading. Then set the Phone to Offline and press Send reading again: the server stores the message. Set the Phone back to Online to see it delivered.",
  "Press Ask for reading. Match the id of the iq get with the id of the iq result.",
  "Set the Sensor to Offline. Press Ask for reading, then Send reading, and read the errors.",
  "Press Record observation after each step. Compare the XML and MQTT sizes, then open the lab record.",
];

type Device = "sensor" | "phone";
type Spot = Device | "server";

/** Horizontal position of each stop on the stage, as % of its width */
const SPOT_X: Record<Spot, number> = { sensor: 100 / 6, server: 50, phone: 500 / 6 };
/** Seconds a stanza takes to cross one link */
const LINK_S = 0.6;
/** Seconds a finished stanza stays in view before fading (all but the last one) */
const HOLD_S = 0.5;
const APPEAR_S = 0.12;
const FADE_S = 0.3;

const AVAILABILITY: { value: Availability; label: string }[] = [
  { value: "online", label: "Online" },
  { value: "away", label: "Away" },
  { value: "offline", label: "Offline" },
];

/** Fixed order for the size chart, so a stanza type keeps its row. */
const STANZA_ORDER = [
  "presence (online)",
  "presence (away)",
  "presence (offline)",
  "message",
  "iq get",
  "iq result",
  "iq error",
];

/** One stanza from an action, with where it travels and when. */
interface Trip {
  ev: StanzaEvent;
  /** Stanza type as students name it, e.g. "iq result" */
  label: string;
  route: Spot[];
  /** Seconds after the action when it sets off */
  start: number;
  /** Seconds spent travelling */
  travel: number;
}

/** What the last status change or button press produced. */
interface Action {
  id: number;
  name: string;
  trips: Trip[];
  /** Plain-English line for the live region */
  note: string;
  /** Availability right after the action */
  sensor: Availability;
  phone: Availability;
  /** Seconds until the stored count changes on the stage */
  storeAt: number;
  /** Seconds until a reading reaches the phone */
  readingAt: number;
}

const deviceOf = (jid: string): Device => (bare(jid) === bare(SENSOR) ? "sensor" : "phone");
const nameOf = (jid: string) => bare(jid).split("@")[0];
const iqId = (ev: StanzaEvent) => (ev.kind === "iq" ? ev.xml.match(/\bid="([^"]*)"/)?.[1] : undefined);
const utf8 = (s: string) => new TextEncoder().encode(s).length;

function stanzaLabel(ev: StanzaEvent): string {
  if (ev.kind === "presence") {
    if (ev.xml.includes('type="unavailable"')) return "presence (offline)";
    if (ev.xml.includes("<show>away</show>")) return "presence (away)";
    return "presence (online)";
  }
  if (ev.kind === "iq") return `iq ${ev.xml.match(/type="(\w+)"/)?.[1] ?? ""}`.trim();
  return "message";
}

/**
 * Stops a stanza visits. A device that is not logged in cannot send, so its
 * error never leaves it; stored messages and iq errors for an offline sensor
 * start at the server, which sends them on the device's behalf.
 */
function routeOf(ev: StanzaEvent, fromStore: boolean, senderOnline: boolean): Spot[] {
  const from = deviceOf(ev.from);
  const to = deviceOf(ev.to);
  if (fromStore) return ["server", to];
  if (ev.outcome === "error") return senderOnline ? [from, "server"] : [from];
  if (ev.outcome === "delivered") {
    return senderOnline || ev.kind === "presence" ? [from, "server", to] : ["server", to];
  }
  // Stored offline or dropped: it stops at the server.
  return [from, "server"];
}

const OUTCOMES: StanzaEvent["outcome"][] = ["delivered", "stored offline", "error", "dropped"];

const logTone: Record<StanzaEvent["outcome"], EventTone> = {
  delivered: "ok",
  "stored offline": "warn",
  error: "bad",
  dropped: "bad",
};

type ChipTone = "ok" | "warn" | "bad" | "muted";
const chipClass: Record<ChipTone, string> = {
  ok: "border-ok bg-ok-soft text-ok",
  warn: "border-warn bg-warn-soft text-warn",
  bad: "border-bad bg-bad-soft text-bad",
  muted: "border-dashed border-line-strong bg-surface-2 text-ink-3",
};

function chipTone(ev: StanzaEvent): ChipTone {
  if (ev.outcome === "error" || ev.xml.includes('type="error"')) return "bad";
  if (ev.outcome === "stored offline") return "warn";
  if (ev.outcome === "dropped") return "muted";
  return "ok";
}

/** Joins the explanations of one action, saying once how often a repeated one happened. */
function noteFor(trips: Trip[]): string {
  const counts = new Map<string, number>();
  for (const t of trips) counts.set(t.ev.explanation, (counts.get(t.ev.explanation) ?? 0) + 1);
  return [...counts]
    .map(([text, n]) => (n > 1 ? `${text} This happened ${n} times.` : text))
    .join(" ");
}

function summarise(rows: ObservationRow[]): string {
  if (rows.length === 0) return "";
  const counted = OUTCOMES.map((o) => [o, rows.filter((r) => r.outcome === o).length] as const)
    .filter(([, n]) => n > 0)
    .map(([o, n]) => `${n} ${o === "error" && n > 1 ? "errors" : o}`)
    .join(", ");
  const parts = [`${rows.length} stanza${rows.length === 1 ? " was" : "s were"} recorded: ${counted}.`];
  const has = (test: (r: ObservationRow) => boolean) => rows.some(test);

  if (has((r) => String(r.stanza).startsWith("presence") && r.outcome === "delivered"))
    parts.push("Presence stanzas told the phone when the sensor's status changed.");
  if (has((r) => String(r.stanza).startsWith("presence") && r.outcome === "dropped" && r.phone === "offline"))
    parts.push("A presence update was dropped because the phone was offline.");
  if (has((r) => r.stanza === "message" && r.outcome === "stored offline" && r.phone === "offline"))
    parts.push("A reading sent while the phone was offline was stored by the server instead of being lost.");
  if (has((r) => r.stanza === "message" && r.outcome === "delivered" && String(r.action).startsWith("Phone")))
    parts.push("A stored message was delivered when the phone logged in again.");
  if (has((r) => r.stanza === "message" && r.outcome === "error" && r.sensor === "offline"))
    parts.push("An offline sensor could not send a reading, because a device must be logged in to send.");
  if (has((r) => r.stanza === "iq result"))
    parts.push("Ask for reading returned an iq result carrying the sensor's reading.");
  if (has((r) => r.stanza === "iq error" && r.sensor === "offline"))
    parts.push("With the sensor offline, Ask for reading returned an iq error instead of a reading.");
  if (has((r) => r.stanza === "iq get" && r.outcome === "error" && r.phone === "offline"))
    parts.push("An offline phone could not send an iq get.");

  const ratios = rows.map((r) => Number(r.ratio)).filter((x) => Number.isFinite(x) && x > 0);
  if (ratios.length === 1) {
    parts.push(`The XML stanza was ${ratios[0].toFixed(1)} times larger than the closest MQTT message.`);
  } else if (ratios.length > 1) {
    const avg = ratios.reduce((s, x) => s + x, 0) / ratios.length;
    parts.push(
      `On average an XML stanza was ${avg.toFixed(1)} times larger than the closest MQTT message (from ${Math.min(...ratios).toFixed(1)} to ${Math.max(...ratios).toFixed(1)} times over ${ratios.length} rows).`,
    );
  }
  if (ratios.some((x) => x > 1))
    parts.push("XML repeats tag names and full addresses, while MQTT uses a short binary header and topic.");
  return parts.join(" ");
}

/** Follows `value` after a delay, so the stage updates when a stanza arrives. */
function useLagged<T>(value: T, delayMs: number): T {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setShown(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return shown;
}

export default function XmppLab() {
  const server = useRef(new XmppServer());
  const [sensor, setSensor] = useState<Availability>("offline");
  const [phone, setPhone] = useState<Availability>("offline");
  const [temperature, setTemperature] = useState(server.current.temperature);
  const [stored, setStored] = useState(0);
  const [reading, setReading] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  // The latest stanza and the action that produced it: what Record observation saves.
  const [latest, setLatest] = useState<{ action: Action; trip: Trip } | null>(null);
  // Latest stanza of each type, for the size chart.
  const [sizes, setSizes] = useState<Record<string, StanzaEvent>>({});
  const [events, setEvents] = useState<SimEvent[]>([]);
  const actionId = useRef(0);
  const eventId = useRef(0);
  const startedAt = useRef<number | null>(null);
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");
  const reduced = useReducedMotion() ?? false;

  /**
   * Turns the engine's events into stage, log and readout state. A status
   * change passes its log line, and a note for when no stanza is sent.
   */
  const show = (name: string, produced: StanzaEvent[], statusLine?: string, quietNote = "") => {
    const statusChange = statusLine !== undefined;
    const s = server.current;
    const after = { sensor: s.availability(SENSOR), phone: s.availability(PHONE) };
    let clock = 0;
    const trips = produced.map((ev): Trip => {
      const route = routeOf(ev, statusChange && ev.kind === "message", after[deviceOf(ev.from)] !== "offline");
      const trip = { ev, label: stanzaLabel(ev), route, start: clock, travel: (route.length - 1) * LINK_S };
      clock += trip.travel + 0.15;
      return trip;
    });

    const storeTrip = trips.find((t) => t.ev.outcome === "stored offline" || t.route[0] === "server");
    const readingTrip = [...trips]
      .reverse()
      .find(
        (t) =>
          t.ev.outcome === "delivered" &&
          deviceOf(t.ev.to) === "phone" &&
          (t.ev.kind === "message" || t.label === "iq result"),
      );
    const next: Action = {
      id: ++actionId.current,
      name,
      trips,
      note: trips.length ? noteFor(trips) : quietNote,
      ...after,
      storeAt: storeTrip ? storeTrip.start + (storeTrip.route[0] === "server" ? 0 : storeTrip.travel) : 0,
      readingAt: readingTrip ? readingTrip.start + readingTrip.travel : 0,
    };

    const now = performance.now();
    startedAt.current ??= now;
    const base = now - startedAt.current;
    const logged: SimEvent[] = [];
    if (statusLine) logged.push({ id: ++eventId.current, t: base, text: statusLine, kind: "status" });
    for (const t of trips) {
      const id = iqId(t.ev);
      logged.push({
        id: ++eventId.current,
        t: base + (t.start + t.travel) * 1000,
        text: `${t.label}${id ? ` (id ${id})` : ""} from ${nameOf(t.ev.from)} to ${nameOf(t.ev.to)}: ${t.ev.outcome}, ${t.ev.bytes} bytes`,
        kind: t.ev.kind,
        tone: logTone[t.ev.outcome],
      });
    }

    setSensor(after.sensor);
    setPhone(after.phone);
    setStored(s.storedFor(PHONE));
    if (readingTrip) setReading(readingTrip.ev.mqtt.payload);
    setAction(next);
    if (trips.length) {
      setLatest({ action: next, trip: trips[trips.length - 1] });
      setSizes((prev) => {
        const copy = { ...prev };
        for (const t of trips) copy[t.label] = t.ev;
        return copy;
      });
    }
    setEvents((prev) => [...prev, ...logged]);
  };

  const changeStatus = (device: Device, availability: Availability) => {
    const produced = server.current.setAvailability(device === "sensor" ? SENSOR : PHONE, availability);
    const who = device === "sensor" ? "Sensor" : "Phone";
    const quiet =
      availability === "offline"
        ? `The ${device} is now offline. The server will store messages for it until it comes back.`
        : `The ${device} is now ${availability} and can receive stanzas. Nothing was waiting for it on the server.`;
    show(`${who} ${availability}`, produced, `${who} set to ${availability}.`, quiet);
  };

  const changeTemperature = (value: number) => {
    setTemperature(value);
    // The sensor's live value: what an iq get will read.
    server.current.temperature = value;
  };

  const sendReading = () => show("Send reading", [server.current.sendReading(temperature)]);
  const askReading = () => show("Ask for reading", server.current.askReading());

  const latestEv = latest?.trip.ev;
  const ratio = latestEv && latestEv.mqtt.bytes ? latestEv.bytes / latestEv.mqtt.bytes : null;

  const sizeData = useMemo(
    () =>
      STANZA_ORDER.filter((label) => sizes[label]).map((label) => ({
        stanza: label,
        xml: sizes[label].bytes,
        mqtt: sizes[label].mqtt.bytes || null,
      })),
    [sizes],
  );

  const record = () => {
    if (!latest) return;
    const { trip, action: a } = latest;
    const row: ObservationRow = {
      action: a.name,
      sensor: a.sensor,
      phone: a.phone,
      stanza: trip.label,
      outcome: trip.ev.outcome,
      xmlBytes: trip.ev.bytes,
      mqttBytes: trip.ev.mqtt.bytes || "—",
      ratio: trip.ev.mqtt.bytes ? (trip.ev.bytes / trip.ev.mqtt.bytes).toFixed(1) : "—",
    };
    addRow(row);
    const auto = summarise([...rows, row]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  // The stanzas shown as XML: the last action's (up to two, so an iq pair can be compared).
  const panelTrips = action?.trips.length ? action.trips.slice(-2) : latest ? [latest.trip] : [];
  const panelFrom = action?.trips.length ? action.name : latest?.action.name;

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordDisabled={!latest}
      recordHint={
        latest
          ? "Adds the latest stanza to the observation table below."
          : "Make a stanza first: change a device's status or press Send reading."
      }
      controls={
        <>
          <Segmented<Availability>
            label="Sensor"
            value={sensor}
            onChange={(a) => changeStatus("sensor", a)}
            options={AVAILABILITY}
          />
          <Segmented<Availability>
            label="Phone"
            value={phone}
            onChange={(a) => changeStatus("phone", a)}
            options={AVAILABILITY}
          />
          <Slider
            label="Temperature"
            value={temperature}
            min={15}
            max={45}
            step={0.5}
            unit="°C"
            onChange={changeTemperature}
            hint="The sensor's current reading."
          />
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              <Button icon={<Send size={16} aria-hidden />} onClick={sendReading}>
                Send reading
              </Button>
              <Button icon={<CircleHelp size={16} aria-hidden />} onClick={askReading}>
                Ask for reading
              </Button>
            </div>
            <p className="text-sm text-ink-3">
              Send reading: the sensor pushes a message to the phone. Ask for reading: the phone sends an iq get
              and waits for the reply.
            </p>
          </div>
        </>
      }
      stage={
        <Stage
          sensor={sensor}
          phone={phone}
          temperature={temperature}
          stored={stored}
          reading={reading}
          action={action}
          reduced={reduced}
        />
      }
      readouts={
        <>
          <StanzaPanel trips={panelTrips} from={panelFrom} />
          <Readouts
            items={[
              { label: "XML size", value: latestEv ? latestEv.bytes : "—", unit: latestEv ? "bytes" : undefined },
              {
                label: "MQTT size",
                value: latestEv ? latestEv.mqtt.bytes || "none" : "—",
                unit: latestEv?.mqtt.bytes ? "bytes" : undefined,
              },
              { label: "Times larger", value: ratio ? `${ratio.toFixed(1)}×` : "—" },
              { label: "Stored for phone", value: stored, tone: stored ? "warn" : "default" },
            ]}
          />
          <ChartCard
            title="Size in bytes: XMPP stanza vs closest MQTT message"
            description={`The latest stanza of each type you have sent.${sizes["iq error"] ? " An iq error has no MQTT equivalent, so it has no MQTT bar." : ""}`}
            data={sizeData}
            xKey="stanza"
            xLabel="Stanza"
            series={[
              { key: "xml", label: "XMPP (XML)", unit: "bytes" },
              { key: "mqtt", label: "MQTT", unit: "bytes" },
            ]}
            height={Math.max(150, 40 + sizeData.length * 48)}
            emptyText="Each stanza type appears here the first time it is sent."
          >
            <BarChart data={sizeData} layout="vertical" barGap={2} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid {...chartStyle.grid} vertical horizontal={false} />
              <XAxis type="number" {...chartStyle.axis} />
              <YAxis type="category" dataKey="stanza" {...chartStyle.axis} width={136} />
              <Tooltip
                cursor={chartStyle.barCursor}
                content={<ChartTooltip units={{ xml: "bytes", mqtt: "bytes" }} />}
              />
              <Bar
                dataKey="xml"
                name="XMPP (XML)"
                fill={seriesColor(0)}
                radius={[0, 4, 4, 0]}
                maxBarSize={18}
                isAnimationActive={false}
              />
              <Bar
                dataKey="mqtt"
                name="MQTT"
                fill={seriesColor(1)}
                radius={[0, 4, 4, 0]}
                maxBarSize={18}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartCard>
        </>
      }
      log={
        <EventLog
          events={events}
          filters={[
            { kind: "presence", label: "presence" },
            { kind: "message", label: "message" },
            { kind: "iq", label: "iq" },
          ]}
          emptyText="Change a device's status or press a button. Every stanza is listed here."
        />
      }
    />
  );
}

const statusClass: Record<Availability, string> = {
  online: "bg-ok-soft text-ok",
  away: "bg-warn-soft text-warn",
  offline: "bg-surface-2 text-ink-3",
};

const ringClass: Record<Availability, string> = {
  online: "border-ok text-ink-2",
  away: "border-warn text-ink-2",
  offline: "border-dashed border-line-strong text-ink-3",
};

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}

/** Lets an address or topic wrap before "@" or "/" rather than mid-word. */
function Breakable({ text }: { text: string }) {
  return (
    <>
      {text.split(/(?=[@/])/).map((part, i) => (
        <span key={i}>
          {i > 0 && <wbr />}
          {part}
        </span>
      ))}
    </>
  );
}

/** One device or the server: icon, name, status, address and one live value. */
function Node({
  icon: Icon,
  title,
  address,
  ring,
  badge,
  children,
}: {
  icon: LucideIcon;
  title: string;
  address: string;
  ring: string;
  badge: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 px-1 text-center">
      <span className={cn("flex size-12 items-center justify-center rounded-full border-2 bg-surface", ring)}>
        <Icon size={22} />
      </span>
      <span className="font-semibold">{title}</span>
      {badge}
      <span className="font-mono text-xs text-ink-3 wrap-anywhere">
        <Breakable text={address} />
      </span>
      {children}
    </div>
  );
}

/** The sensor, the server and the phone, with stanzas travelling between them. */
function Stage({
  sensor,
  phone,
  temperature,
  stored,
  reading,
  action,
  reduced,
}: {
  sensor: Availability;
  phone: Availability;
  temperature: number;
  stored: number;
  reading: string | null;
  action: Action | null;
  reduced: boolean;
}) {
  // The stored badge and the phone's reading change when the stanza gets there.
  const storedShown = useLagged(stored, reduced || !action ? 0 : action.storeAt * 1000);
  const readingShown = useLagged(reading, reduced || !action ? 0 : action.readingAt * 1000);
  const trips = action?.trips ?? [];
  const last = trips[trips.length - 1];

  return (
    <div className="grid gap-3 p-4">
      <div
        role="img"
        aria-label={`Sensor is ${sensor}, phone is ${phone}. The server home.example holds ${stored} stored message${stored === 1 ? "" : "s"} for the phone.${last ? ` Latest stanza: ${last.label} from ${nameOf(last.ev.from)} to ${nameOf(last.ev.to)}, ${last.ev.outcome}.` : ""}`}
      >
        {/* The lane every stanza travels along */}
        <div className="relative h-12" aria-hidden>
          <span
            className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-line-strong"
            style={{ left: `${SPOT_X.sensor}%`, width: `${SPOT_X.phone - SPOT_X.sensor}%` }}
          />
          {(Object.keys(SPOT_X) as Spot[]).map((spot) => (
            <span
              key={spot}
              className="absolute top-1/2 bottom-0 w-0.5 -translate-x-1/2 bg-line-strong"
              style={{ left: `${SPOT_X[spot]}%` }}
            />
          ))}
          {action &&
            trips.map((trip, i) => (
              <Chip
                key={`${action.id}-${i}-${reduced}`}
                trip={trip}
                isLast={i === trips.length - 1}
                reduced={reduced}
              />
            ))}
        </div>

        <div className="grid grid-cols-3" aria-hidden>
          <Node
            icon={Thermometer}
            title="Sensor"
            address={SENSOR}
            ring={ringClass[sensor]}
            badge={<Badge className={statusClass[sensor]}>{sensor}</Badge>}
          >
            <span className="font-mono text-sm tabular-nums">{temperature} °C</span>
          </Node>
          <Node
            icon={Server}
            title="Server"
            address="home.example"
            ring="border-brand text-brand"
            badge={<Badge className="bg-brand-soft text-brand">running</Badge>}
          >
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-sm",
                storedShown ? "bg-warn-soft font-semibold text-warn" : "text-ink-3",
              )}
            >
              {storedShown ? `${storedShown} stored for phone` : "Nothing stored"}
            </span>
          </Node>
          <Node
            icon={Smartphone}
            title="Phone"
            address={PHONE}
            ring={ringClass[phone]}
            badge={<Badge className={statusClass[phone]}>{phone}</Badge>}
          >
            <span className="text-sm text-ink-2">
              {readingShown === null ? "No reading yet" : `Got ${readingShown} °C`}
            </span>
          </Node>
        </div>
      </div>

      <p className="min-h-12 rounded-md bg-surface-2 px-3 py-2 text-sm text-ink-2" aria-live="polite">
        {action ? (
          <>
            <span className="font-semibold text-ink">{action.name}: </span>
            {action.note}
          </>
        ) : (
          "Both devices start offline. Set the Phone to Online, then the Sensor to Online."
        )}
      </p>
    </div>
  );
}

/** A stanza chip that travels its route; all but the last fade once they arrive. */
function Chip({ trip, isLast, reduced }: { trip: Trip; isLast: boolean; reduced: boolean }) {
  const id = iqId(trip.ev);
  const text = `${trip.ev.kind}${id ? ` ${id}` : ""}`;
  const className = cn(
    "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-xs font-semibold shadow-[0_0_0_3px_var(--surface)]",
    chipClass[chipTone(trip.ev)],
  );
  const xs = trip.route.map((spot) => `${SPOT_X[spot]}%`);
  const end = xs[xs.length - 1];
  const fades = !isLast || trip.ev.outcome === "dropped";

  if (reduced) {
    // No travel: only the end state of the last stanza.
    if (!isLast) return null;
    return (
      <span className={className} style={{ left: end, opacity: fades ? 0.45 : 1 }}>
        {text}
      </span>
    );
  }

  const total = APPEAR_S + trip.travel + HOLD_S + FADE_S;
  return (
    <motion.span
      className={className}
      initial={{ left: xs[0], opacity: 0 }}
      animate={{ left: xs, opacity: fades ? [0, 1, 1, 0] : [0, 1] }}
      transition={{
        left: { duration: Math.max(trip.travel, 0.01), delay: trip.start, ease: "easeInOut" },
        opacity: fades
          ? {
              duration: total,
              delay: trip.start,
              times: [0, APPEAR_S / total, (APPEAR_S + trip.travel + HOLD_S) / total, 1],
            }
          : { duration: APPEAR_S, delay: trip.start },
      }}
    >
      {text}
    </motion.span>
  );
}

/** Marks the id attribute, so an iq request and its reply can be matched by eye. */
function XmlText({ xml }: { xml: string }) {
  const parts = xml.split(/(\bid="[^"]*")/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 ? (
          <mark key={i} className="rounded-sm bg-brand-soft px-0.5 text-ink">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** Raw XML of the latest stanzas next to the closest MQTT message. */
function StanzaPanel({ trips, from }: { trips: Trip[]; from?: string }) {
  return (
    <section aria-label="Latest stanza" className="grid grid-cols-1 gap-4 rounded-lg border border-line bg-surface p-4">
      <h3 className="font-bold">
        {trips.length > 1 ? "Latest stanzas" : "Latest stanza"}
        {from && <span className="font-normal text-ink-3"> · from {from}</span>}
      </h3>
      {trips.length === 0 && (
        <p className="text-sm text-ink-3">
          No stanza yet. Change a device's status or press a button to see its XML here.
        </p>
      )}
      {trips.map((trip, i) => {
        const { ev } = trip;
        const payloadBytes = utf8(ev.mqtt.payload);
        return (
          <article key={i} className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="grid min-w-0 content-start gap-1">
              <p className="text-sm">
                <span className="font-semibold">XMPP {trip.label}</span>
                <span className="text-ink-3">
                  {" "}
                  · {nameOf(ev.from)} to {nameOf(ev.to)} · {ev.outcome} · {ev.bytes} bytes
                </span>
              </p>
              {/* Ligatures off, so "/>" and "</" show as the characters that are sent */}
              <pre className="rounded-md border border-line bg-surface-2 p-3 font-mono text-sm whitespace-pre-wrap text-ink wrap-anywhere [font-variant-ligatures:none]">
                <XmlText xml={ev.xml} />
              </pre>
            </div>
            <div className="grid min-w-0 content-start gap-1">
              <p className="text-sm">
                <span className="font-semibold">Closest MQTT message</span>
                {ev.mqtt.bytes > 0 && <span className="text-ink-3"> · {ev.mqtt.bytes} bytes</span>}
              </p>
              {ev.mqtt.bytes > 0 ? (
                <dl className="grid gap-1.5 rounded-md border border-line bg-surface-2 p-3 text-sm">
                  <div>
                    <dt className="text-ink-3">Topic</dt>
                    <dd className="font-mono wrap-anywhere">
                      <Breakable text={ev.mqtt.topic} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-3">Payload</dt>
                    <dd className="font-mono">{ev.mqtt.payload || "(empty)"}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-3">Size</dt>
                    <dd>
                      2 header + 2 topic length + {utf8(ev.mqtt.topic)} topic + {payloadBytes} payload ={" "}
                      <span className="font-semibold">{ev.mqtt.bytes} bytes</span>
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="rounded-md border border-line bg-surface-2 p-3 text-sm text-ink-2">
                  None. MQTT has no error reply: a request to a device that is not connected simply gets no answer.
                </p>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
