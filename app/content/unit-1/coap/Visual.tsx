import { useState } from "react";
import { SequenceDiagram, type SequenceMessage } from "~/components/theory/SequenceDiagram";
import { Segmented } from "~/components/ui/Segmented";
import { cn } from "~/lib/cn";

type ScenarioId = "con" | "lost" | "non" | "observe";

const scenarios: Record<ScenarioId, { label: string; intro: string; messages: SequenceMessage[] }> = {
  con: {
    label: "Confirmable",
    intro: "A confirmable (CON) request is acknowledged. The reading comes back inside the ACK.",
    messages: [
      { from: "Client", to: "Sensor", label: "CON GET /temp (MID 0x1a2b)", note: "The client asks for the temperature with a confirmable GET." },
      { from: "Sensor", to: "Client", label: "ACK 2.05 Content: 28.5", reply: true, note: "The ACK carries the answer too (a piggybacked response). Two messages in total." },
    ],
  },
  lost: {
    label: "Lost and retried",
    intro: "On a noisy radio link the request is lost twice. Watch the waiting time double between tries.",
    messages: [
      { from: "Client", to: "Sensor", label: "CON GET /temp  t = 0 s", lost: true, note: "The first try is lost. The client starts a timer of between 2 and 3 seconds (here 2.5 s)." },
      { from: "Client", to: "Sensor", label: "Retry 1  t = 2.5 s", lost: true, note: "No ACK, so the client resends with the same message ID. The timer doubles to 5 s." },
      { from: "Client", to: "Sensor", label: "Retry 2  t = 7.5 s", note: "Still no ACK, so it tries again after 5 s. This copy arrives." },
      { from: "Sensor", to: "Client", label: "ACK 2.05 Content: 28.5", reply: true, note: "Success after 7.5 seconds. If retries 3 and 4 had also failed (waits of 10 s and 20 s), the client would give up." },
    ],
  },
  non: {
    label: "Non-confirmable",
    intro: "A non-confirmable (NON) message is sent once and never acknowledged. Fine for frequent readings.",
    messages: [
      { from: "Sensor", to: "Client", label: "NON 2.05 reading: 28.5", note: "The sensor sends a reading with no request for an ACK." },
      { from: "Sensor", to: "Client", label: "NON 2.05 reading: 28.6", lost: true, note: "This one is lost, and nobody resends it." },
      { from: "Sensor", to: "Client", label: "NON 2.05 reading: 28.6", note: "The next regular reading arrives anyway. For frequent updates, an occasional loss does not matter." },
    ],
  },
  observe: {
    label: "Observe",
    intro: "With Observe, one request is enough. The sensor sends a notification each time the value changes.",
    messages: [
      { from: "Client", to: "Sensor", label: "CON GET /temp  Observe: 0", note: "The client registers interest with the Observe option." },
      { from: "Sensor", to: "Client", label: "ACK 2.05  Observe: 1  28.5", reply: true, note: "The sensor confirms and sends the current value. Notification number 1." },
      { from: "Sensor", to: "Client", label: "NON 2.05  Observe: 2  29.0", note: "The temperature changed, so the sensor pushes it. No new request was needed." },
      { from: "Sensor", to: "Client", label: "NON 2.05  Observe: 3  30.5", note: "Another change, another push. The rising numbers let the client put notifications in order." },
    ],
  },
};

/** CON GET /temp, token 7d 34, message ID 0x1a2b: encoded exactly as RFC 7252 specifies. */
const BYTES: { hex: string; field: string; meaning: string; group: "header" | "token" | "option" }[] = [
  { hex: "42", field: "Ver | Type | TKL", meaning: "01 00 0010: version 1, type CON (0), token length 2", group: "header" },
  { hex: "01", field: "Code", meaning: "0.01: GET", group: "header" },
  { hex: "1a", field: "Message ID", meaning: "High byte of 0x1a2b", group: "header" },
  { hex: "2b", field: "Message ID", meaning: "Low byte of 0x1a2b", group: "header" },
  { hex: "7d", field: "Token", meaning: "Token byte 1 (matches the response to this request)", group: "token" },
  { hex: "34", field: "Token", meaning: "Token byte 2", group: "token" },
  { hex: "b4", field: "Option header", meaning: "Delta 11 (Uri-Path) and length 4", group: "option" },
  { hex: "74", field: "Uri-Path", meaning: "“t”", group: "option" },
  { hex: "65", field: "Uri-Path", meaning: "“e”", group: "option" },
  { hex: "6d", field: "Uri-Path", meaning: "“m”", group: "option" },
  { hex: "70", field: "Uri-Path", meaning: "“p”", group: "option" },
];

const GROUP_TONE = {
  header: "border-u3 bg-u3-soft",
  token: "border-u2 bg-u2-soft",
  option: "border-u1 bg-u1-soft",
};

export default function CoapVisual() {
  const [id, setId] = useState<ScenarioId>("con");
  const [byte, setByte] = useState(0);
  const s = scenarios[id];

  return (
    <div className="grid grid-cols-1 gap-6">
      <Segmented<ScenarioId>
        label="Choose an exchange"
        value={id}
        onChange={setId}
        options={(Object.keys(scenarios) as ScenarioId[]).map((k) => ({ value: k, label: scenarios[k].label }))}
        className="min-w-0 max-w-full overflow-x-auto pb-1"
      />
      <p className="max-w-[70ch] text-ink-2">{s.intro}</p>
      <SequenceDiagram key={id} participants={["Client", "Sensor"]} messages={s.messages} />

      <section aria-labelledby="coap-bytes" className="grid gap-3 rounded-lg border border-line bg-surface p-4">
        <h2 id="coap-bytes" className="font-bold">
          Inside a real CoAP request: CON GET /temp
        </h2>
        <p className="text-sm text-ink-2">
          The whole request is only {BYTES.length} bytes. Select a byte to see what it means.
        </p>
        <ol className="flex flex-wrap gap-1.5" aria-label="Request bytes in hexadecimal">
          {BYTES.map((b, i) => (
            <li key={i}>
              <button
                type="button"
                aria-pressed={i === byte}
                aria-label={`Byte ${i + 1}: ${b.hex}, ${b.field}`}
                onClick={() => setByte(i)}
                className={cn(
                  "h-11 w-11 rounded-md border-2 font-mono text-sm font-bold",
                  GROUP_TONE[b.group],
                  i === byte && "outline-2 outline-offset-2 outline-ink",
                )}
              >
                {b.hex}
              </button>
            </li>
          ))}
        </ol>
        <p aria-live="polite" className="text-ink">
          <span className="font-semibold">
            Byte {byte + 1}, {BYTES[byte].field}:
          </span>{" "}
          {BYTES[byte].meaning}
        </p>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-3">
          <span className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded-sm border-2", GROUP_TONE.header)} aria-hidden /> 4-byte fixed header
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded-sm border-2", GROUP_TONE.token)} aria-hidden /> Token
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded-sm border-2", GROUP_TONE.option)} aria-hidden /> Uri-Path option
          </span>
        </p>
      </section>

      <section aria-labelledby="coap-notice" className="max-w-[70ch]">
        <h2 id="coap-notice" className="text-h3 font-bold">
          What to notice
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2 marker:text-ink-3">
          <li>A confirmable request needs only two messages, because the answer rides in the ACK.</li>
          <li>Retries keep the same message ID, so the sensor can spot duplicates.</li>
          <li>The wait between retries doubles each time, so a busy network is not flooded.</li>
          <li>Observe replaces polling: one request, then a push for every change.</li>
          <li>The same GET in HTTP/1.1 would need a TCP handshake and dozens of bytes of text headers.</li>
        </ul>
      </section>
    </div>
  );
}
