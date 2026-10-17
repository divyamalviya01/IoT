import { SequenceDiagram, type SequenceMessage } from "~/components/theory/SequenceDiagram";

const SENSOR = "sensor1@home.example/kitchen";
const ENGINEER = "engineer@company.example";

const MESSAGE_XML = `<message from="${SENSOR}" to="${ENGINEER}" type="chat"><body>Temperature is 28.5 C</body></message>`;
const MQTT_TOPIC = "home/kitchen/temp";
const MQTT_PAYLOAD = "28.5";

const utf8 = (s: string) => new TextEncoder().encode(s).length;
/** MQTT PUBLISH, QoS 0: fixed header (2) + topic length (2) + topic + payload. */
const mqttBytes = 2 + 2 + utf8(MQTT_TOPIC) + utf8(MQTT_PAYLOAD);
const xmppBytes = utf8(MESSAGE_XML);

const messages: SequenceMessage[] = [
  {
    from: "Sensor",
    to: "home.example",
    label: "<presence/>",
    note: "The sensor logs in to its own server and announces it is available.",
    code: `<presence from="${SENSOR}"/>`,
  },
  {
    from: "home.example",
    to: "company.example",
    label: "presence (federated)",
    note: "The engineer has subscribed to the sensor's presence, so the home server passes it to the company's server.",
    code: `<presence from="${SENSOR}" to="${ENGINEER}"/>`,
  },
  {
    from: "company.example",
    to: "Engineer",
    label: "presence",
    note: "The engineer's app now shows the sensor as online.",
  },
  {
    from: "Sensor",
    to: "home.example",
    label: "<message> alert",
    note: "The sensor pushes an alert as a message stanza addressed to the engineer's JID.",
    code: `<message from="${SENSOR}"\n         to="${ENGINEER}"\n         type="chat">\n  <body>Temperature is 28.5 C</body>\n</message>`,
  },
  {
    from: "home.example",
    to: "company.example",
    label: "<message> (federated)",
    note: "The home server sees a different domain and relays the stanza to company.example, just like email between providers.",
  },
  {
    from: "company.example",
    to: "Engineer",
    label: "<message>",
    note: "The engineer receives the alert.",
  },
  {
    from: "Engineer",
    to: "company.example",
    label: '<iq type="get">',
    note: "The engineer asks for the latest reading with an iq get. The id r1 will match the answer.",
    code: `<iq type="get" id="r1"\n    from="${ENGINEER}"\n    to="${SENSOR}">\n  <query xmlns="urn:example:sensor"/>\n</iq>`,
  },
  {
    from: "company.example",
    to: "Sensor",
    label: "iq get (via home.example)",
    note: "The request travels back through both servers to the sensor.",
  },
  {
    from: "Sensor",
    to: "Engineer",
    label: '<iq type="result">',
    reply: true,
    note: "The sensor answers with an iq result carrying the same id, r1. It travels back through both servers.",
    code: `<iq type="result" id="r1"\n    from="${SENSOR}"\n    to="${ENGINEER}">\n  <reading unit="C">28.5</reading>\n</iq>`,
  },
];

export default function XmppVisual() {
  const ratio = Math.round(xmppBytes / mqttBytes);
  return (
    <div className="grid grid-cols-1 gap-6">
      <p className="max-w-[70ch] text-ink-2">
        A kitchen sensor on the server <span className="font-mono">home.example</span> talks to an engineer on{" "}
        <span className="font-mono">company.example</span>. The two servers are federated. Step through to see each stanza.
      </p>
      <SequenceDiagram participants={["Sensor", "home.example", "company.example", "Engineer"]} messages={messages} />

      <section aria-labelledby="xmpp-size" className="grid gap-3 rounded-lg border border-line bg-surface p-4">
        <h2 id="xmpp-size" className="font-bold">
          The same reading in XMPP and MQTT
        </h2>
        <div className="grid gap-2" role="img" aria-label={`XMPP message ${xmppBytes} bytes, MQTT publish ${mqttBytes} bytes.`}>
          <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3">
            <span className="text-sm font-semibold">XMPP</span>
            <div className="flex items-center gap-2">
              <span className="h-5 rounded-sm bg-u3" style={{ width: "100%" }} aria-hidden />
              <span className="shrink-0 font-mono text-sm tabular-nums">{xmppBytes} B</span>
            </div>
          </div>
          <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3">
            <span className="text-sm font-semibold">MQTT</span>
            <div className="flex items-center gap-2">
              <span className="h-5 rounded-sm bg-u1" style={{ width: `${(mqttBytes / xmppBytes) * 100}%` }} aria-hidden />
              <span className="shrink-0 font-mono text-sm tabular-nums">{mqttBytes} B</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-ink-2">
          The XMPP stanza is about {ratio} times larger than an MQTT PUBLISH to <span className="font-mono">{MQTT_TOPIC}</span>{" "}
          with payload <span className="font-mono">{MQTT_PAYLOAD}</span>. Neither count includes TCP and IP headers, which
          both protocols need.
        </p>
      </section>

      <section aria-labelledby="xmpp-notice" className="max-w-[70ch]">
        <h2 id="xmpp-notice" className="text-h3 font-bold">
          What to notice
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2 marker:text-ink-3">
          <li>Each device only talks to its own server; servers relay to each other (federation).</li>
          <li>A message stanza pushes data; an iq stanza asks and waits for a matching result.</li>
          <li>Presence lets the engineer see whether the sensor is online, without any extra code.</li>
          <li>XML is easy to read but much bigger than MQTT's binary messages.</li>
        </ul>
      </section>
    </div>
  );
}
