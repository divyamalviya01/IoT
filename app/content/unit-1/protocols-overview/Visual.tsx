import { motion } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { cn } from "~/lib/cn";

type StackId = "mqtt" | "coap" | "http";

interface LayerPart {
  layer: string;
  name: string;
  bytes: number;
  detail: string;
  /** Tailwind background class for the bar segment */
  tone: string;
}

const utf8 = (s: string) => new TextEncoder().encode(s).length;

/** Header sizes for each stack, from the payload outwards (top layer first). */
function buildStack(stack: StackId, payload: string, compress: boolean): LayerPart[] {
  const payloadBytes = utf8(payload);
  if (stack === "mqtt") {
    const topic = "home/temp";
    const remaining = 2 + utf8(topic) + payloadBytes;
    const lengthBytes = remaining > 127 ? 2 : 1;
    return [
      { layer: "Application", name: "MQTT PUBLISH header", bytes: 1 + lengthBytes + 2 + utf8(topic), detail: `Type and flags (1), remaining length (${lengthBytes}), topic length (2), topic “${topic}” (${utf8(topic)})`, tone: "bg-u3" },
      { layer: "Transport", name: "TCP header", bytes: 20, detail: "Source and destination ports, sequence and acknowledgement numbers, flags, window, checksum", tone: "bg-u2" },
      { layer: "Network", name: "IPv4 header", bytes: 20, detail: "Version, length, time to live, protocol, source and destination IP addresses", tone: "bg-u1" },
      { layer: "Link", name: "Wi-Fi frame header and check", bytes: 36, detail: "Radio (MAC) addresses, frame control, sequence number and a 4-byte error check (approximate)", tone: "bg-ink-3" },
    ];
  }
  if (stack === "coap") {
    const path = "temp";
    const coap = 4 + 2 + (1 + utf8(path)) + 1;
    const parts: LayerPart[] = [
      { layer: "Application", name: "CoAP header", bytes: coap, detail: `Fixed header (4), token (2), Uri-Path option “${path}” (${1 + utf8(path)}), payload marker (1)`, tone: "bg-u3" },
    ];
    if (compress) {
      parts.push({ layer: "Network + transport", name: "6LoWPAN compressed IPv6 + UDP", bytes: 7, detail: "6LoWPAN squeezes the 48 bytes of IPv6 and UDP headers by leaving out values the receiver can work out (approximate best case)", tone: "bg-u2" });
    } else {
      parts.push(
        { layer: "Transport", name: "UDP header", bytes: 8, detail: "Source port, destination port, length and checksum: 2 bytes each", tone: "bg-u2" },
        { layer: "Network", name: "IPv6 header", bytes: 40, detail: "Version, traffic class, flow label, length, next header, hop limit and two 16-byte addresses", tone: "bg-u1" },
      );
    }
    parts.push({ layer: "Link", name: "IEEE 802.15.4 frame header and check", bytes: 11, detail: "Frame control, sequence number, network (PAN) ID, short addresses and a 2-byte error check", tone: "bg-ink-3" });
    return parts;
  }
  const request = `POST /temp HTTP/1.1\r\nHost: api.example.com\r\nContent-Type: text/plain\r\nContent-Length: ${payloadBytes}\r\n\r\n`;
  return [
    { layer: "Application", name: "HTTP request line and headers", bytes: utf8(request), detail: "POST /temp HTTP/1.1, Host, Content-Type and Content-Length, all as readable text", tone: "bg-u3" },
    { layer: "Transport", name: "TCP header", bytes: 20, detail: "Source and destination ports, sequence and acknowledgement numbers, flags, window, checksum", tone: "bg-u2" },
    { layer: "Network", name: "IPv4 header", bytes: 20, detail: "Version, length, time to live, protocol, source and destination IP addresses", tone: "bg-u1" },
    { layer: "Link", name: "Ethernet header and check", bytes: 18, detail: "Destination and source MAC addresses (6 + 6), type (2) and a 4-byte error check", tone: "bg-ink-3" },
  ];
}

const STACK_LABEL: Record<StackId, string> = {
  mqtt: "MQTT over Wi-Fi",
  coap: "CoAP over 802.15.4",
  http: "HTTP over Ethernet",
};

export default function EncapsulationVisual() {
  const [payload, setPayload] = useState("28.5");
  const [stack, setStack] = useState<StackId>("mqtt");
  const [compress, setCompress] = useState(false);
  const [wrapped, setWrapped] = useState(4);
  const inputId = useId();

  const layers = useMemo(() => buildStack(stack, payload, compress), [stack, payload, compress]);
  const shown = layers.slice(0, Math.min(wrapped, layers.length));
  const payloadBytes = utf8(payload);
  const headerBytes = shown.reduce((s, l) => s + l.bytes, 0);
  const total = payloadBytes + headerBytes;
  const overheadPct = total ? Math.round((headerBytes / total) * 100) : 0;

  // Outermost header first in the bar, payload last.
  const segments = [...shown].reverse();

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid gap-4 rounded-lg border border-line bg-surface p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid min-w-0 gap-4">
          <label htmlFor={inputId} className="grid gap-1.5">
            <span className="text-[0.95rem] font-semibold">Sensor reading (the payload)</span>
            <input
              id={inputId}
              value={payload}
              maxLength={64}
              onChange={(e) => setPayload(e.target.value)}
              className="h-10 rounded-lg border border-line-strong bg-bg px-3 font-mono"
            />
          </label>
          <Segmented<StackId>
            label="Protocol stack"
            size="sm"
            value={stack}
            onChange={(s) => {
              setStack(s);
              setWrapped(4);
            }}
            options={(Object.keys(STACK_LABEL) as StackId[]).map((s) => ({ value: s, label: STACK_LABEL[s] }))}
            className="min-w-0 max-w-full"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => setWrapped((w) => Math.max(0, w - 1))}
            disabled={wrapped === 0}
            icon={<Minus size={15} aria-hidden />}
          >
            Unwrap a layer
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setWrapped((w) => Math.min(layers.length, w + 1))}
            disabled={wrapped >= layers.length}
            icon={<Plus size={15} aria-hidden />}
          >
            Wrap the next layer
          </Button>
        </div>
        {stack === "coap" && (
          <label className="flex items-center gap-2 text-[0.95rem] lg:col-span-2">
            <input
              type="checkbox"
              checked={compress}
              onChange={(e) => setCompress(e.target.checked)}
              className="size-4 accent-[var(--brand)]"
            />
            Use 6LoWPAN header compression
          </label>
        )}
      </div>

      <figure className="grid gap-3">
        <figcaption className="font-bold">The packet on the wire, drawn to scale</figcaption>
        <div
          className="flex h-16 w-full overflow-hidden rounded-lg border border-line-strong"
          role="img"
          aria-label={`${segments.map((s) => `${s.name} ${s.bytes} bytes`).join(", ")}, then the payload, ${payloadBytes} bytes.`}
        >
          {segments.map((s) => (
            <motion.div
              key={s.name}
              layout
              initial={{ opacity: 0, scaleX: 0.4 }}
              animate={{ opacity: 1, scaleX: 1 }}
              style={{ flexGrow: s.bytes, flexBasis: 0, transformOrigin: "right" }}
              className={cn("flex min-w-6 items-center justify-center border-r border-surface text-xs font-bold text-bg", s.tone)}
            >
              <span className="truncate px-1">{s.bytes}</span>
            </motion.div>
          ))}
          <motion.div
            layout
            style={{ flexGrow: Math.max(payloadBytes, 1), flexBasis: 0 }}
            className="flex min-w-10 items-center justify-center bg-brand text-xs font-bold text-brand-ink"
          >
            <span className="truncate px-1 font-mono">{payload || "(empty)"}</span>
          </motion.div>
        </div>
        <p className="text-sm text-ink-3">
          Each block's width matches its size in bytes. The green block is your data; everything else is headers.
        </p>
      </figure>

      <div className="relative overflow-x-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-[0.95rem]">
          <caption className="sr-only">Headers added by each layer</caption>
          <thead className="bg-surface-2">
            <tr>
              <th scope="col" className="border-b border-line-strong px-3 py-2 text-left font-bold">Layer</th>
              <th scope="col" className="border-b border-line-strong px-3 py-2 text-left font-bold">Adds</th>
              <th scope="col" className="border-b border-line-strong px-3 py-2 text-right font-bold">Bytes</th>
              <th scope="col" className="border-b border-line-strong px-3 py-2 text-right font-bold">Running total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-line">
              <th scope="row" className="px-3 py-2 text-left font-semibold">Data</th>
              <td className="px-3 py-2 text-ink-2">Your reading “{payload}”</td>
              <td className="px-3 py-2 text-right tabular-nums">{payloadBytes}</td>
              <td className="px-3 py-2 text-right tabular-nums">{payloadBytes}</td>
            </tr>
            {layers.map((l, i) => {
              const added = i < shown.length;
              const running = payloadBytes + layers.slice(0, i + 1).reduce((s, x) => s + x.bytes, 0);
              return (
                <tr key={l.name} className={cn("border-b border-line last:border-0 align-top", !added && "text-ink-3")}>
                  <th scope="row" className="px-3 py-2 text-left font-semibold">
                    <span className={cn("mr-2 inline-block size-2.5 rounded-sm", l.tone)} aria-hidden />
                    {l.layer}
                  </th>
                  <td className="px-3 py-2">
                    <span className="block font-semibold">{l.name}</span>
                    <span className="block text-sm text-ink-3">{l.detail}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{added ? l.bytes : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{added ? running : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="rounded-lg border border-line bg-surface p-4 text-ink" aria-live="polite">
        <span className="font-semibold">{total} bytes</span> travel to carry{" "}
        <span className="font-semibold">{payloadBytes} bytes</span> of data, so{" "}
        <span className="font-semibold">{overheadPct}%</span> of the packet is headers.
      </p>

      <section aria-labelledby="encap-notice" className="max-w-[70ch]">
        <h2 id="encap-notice" className="text-h3 font-bold">
          What to notice
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2 marker:text-ink-3">
          <li>Each layer adds its header in front of everything above it, like envelopes inside a parcel.</li>
          <li>For a short reading, the headers are much bigger than the data itself.</li>
          <li>HTTP's text headers are far larger than MQTT's or CoAP's binary headers.</li>
          <li>Turn on 6LoWPAN compression for CoAP and watch the IPv6 and UDP headers shrink from 48 bytes to about 7.</li>
        </ul>
      </section>
    </div>
  );
}
