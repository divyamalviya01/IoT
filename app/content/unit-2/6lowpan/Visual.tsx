import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Readouts } from "~/components/lab/Readouts";
import { Button } from "~/components/ui/Button";
import { Slider } from "~/components/ui/Slider";
import { cn } from "~/lib/cn";
import { FRAME_BYTES, fragment, type FragmentResult } from "./fragment";

/** The IPv6 and UDP header fields, what IPHC does with each, and why. */
const FIELDS: { name: string; bytes: number; after: number; layer: "ipv6" | "udp" | "iphc"; why: string }[] = [
  { name: "Version", bytes: 0.5, after: 0, layer: "ipv6", why: "Always 6, so it is never sent." },
  { name: "Traffic class", bytes: 1, after: 0, layer: "ipv6", why: "Usually zero, so it is left out." },
  { name: "Flow label", bytes: 2.5, after: 0, layer: "ipv6", why: "Usually zero, so it is left out." },
  { name: "Payload length", bytes: 2, after: 0, layer: "ipv6", why: "Worked out from the radio frame's length." },
  { name: "Next header", bytes: 1, after: 0, layer: "ipv6", why: "Replaced by a 1-byte code saying UDP follows." },
  { name: "Hop limit", bytes: 1, after: 0, layer: "ipv6", why: "Common values (1, 64, 255) fit in 2 bits of IPHC." },
  { name: "Source address", bytes: 16, after: 0, layer: "ipv6", why: "Built from the sender's MAC address, which is already in the frame." },
  { name: "Destination address", bytes: 16, after: 0, layer: "ipv6", why: "Built from the receiver's MAC address, also in the frame." },
  { name: "UDP ports", bytes: 4, after: 1, layer: "udp", why: "Ports 61616–61631 squeeze into 4 bits each: 1 byte for both." },
  { name: "UDP length", bytes: 2, after: 0, layer: "udp", why: "Worked out from the frame length." },
  { name: "UDP checksum", bytes: 2, after: 2, layer: "udp", why: "Kept: it protects the data from errors." },
];
/** What compression adds: the IPHC header and the UDP next-header byte. */
const ADDED = [
  { name: "IPHC header", bytes: 2, why: "Says which fields were left out or shortened." },
  { name: "UDP code", bytes: 1, why: "Says a compressed UDP header follows." },
];

const LAYER_CLASS = { ipv6: "bg-u1-soft border-u1", udp: "bg-u2-soft border-u2", iphc: "bg-u3-soft border-u3" };

function HeaderCompression() {
  const [compressed, setCompressed] = useState(false);
  const reduced = useReducedMotion() ?? false;
  const blocks = [
    ...(compressed ? ADDED.map((a) => ({ ...a, size: a.bytes, layer: "iphc" as const })) : []),
    ...FIELDS.map((f) => ({ name: f.name, why: f.why, size: compressed ? f.after : f.bytes, layer: f.layer })),
  ];
  const total = blocks.reduce((s, b) => s + b.size, 0);

  return (
    <section aria-labelledby="hc-title" className="grid grid-cols-1 gap-4 rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2 id="hc-title" className="text-h3 font-bold">
            Header compression
          </h2>
          <p className="max-w-[65ch] text-ink-2">
            The IPv6 and UDP headers take 48 bytes. Press the button to see which fields 6LoWPAN can leave out because the receiver can
            work them out.
          </p>
        </div>
        <Button variant="primary" onClick={() => setCompressed((c) => !c)}>
          {compressed ? "Show the full headers" : "Compress the headers"}
        </Button>
      </div>

      <div className="grid gap-1.5">
        <div className="flex h-12 w-full overflow-hidden rounded-md" role="img" aria-label={`Header bytes: ${total}. ${compressed ? "Compressed with IPHC." : "Uncompressed IPv6 and UDP."}`}>
          {blocks.map((b) => (
            <motion.div
              key={b.name}
              layout={!reduced}
              initial={false}
              animate={{ flexGrow: b.size, opacity: b.size ? 1 : 0 }}
              transition={{ duration: reduced ? 0 : 0.6 }}
              className={cn("flex min-w-0 basis-0 items-center justify-center overflow-hidden border-r-2 border-r-surface text-[0.65rem] font-semibold", LAYER_CLASS[b.layer])}
              title={`${b.name}: ${b.size} bytes`}
            >
              {b.size >= 2 && <span className="truncate px-1">{b.name}</span>}
            </motion.div>
          ))}
        </div>
        <p className="font-mono text-lg tabular-nums" aria-live="polite">
          {total} bytes {compressed && <span className="text-sm text-ink-3">(was 48)</span>}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-3" aria-hidden>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border bg-u1-soft border-u1" /> IPv6 header</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border bg-u2-soft border-u2" /> UDP header</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border bg-u3-soft border-u3" /> Added by 6LoWPAN</span>
        </div>
      </div>

      <div className="relative overflow-x-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-[0.95rem]">
          <caption className="sr-only">What happens to each header field</caption>
          <thead className="bg-surface-2">
            <tr>
              {["Field", "Before", "After", "Why"].map((h) => (
                <th key={h} scope="col" className="border-b border-line-strong px-3 py-2 text-left font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...ADDED.map((a) => ({ name: a.name, bytes: 0, after: a.bytes, why: a.why })), ...FIELDS].map((f) => (
              <tr key={f.name} className="border-b border-line last:border-0">
                <th scope="row" className="whitespace-nowrap px-3 py-1.5 text-left font-semibold">
                  {f.name}
                </th>
                <td className="px-3 py-1.5 font-mono tabular-nums">{f.bytes}</td>
                <td className={cn("px-3 py-1.5 font-mono tabular-nums", f.after < f.bytes ? "text-ok" : f.after > f.bytes ? "text-warn" : "")}>{f.after}</td>
                <td className="min-w-60 px-3 py-1.5 text-ink-2">{f.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-ink-3">Version and traffic class share bytes with the flow label in the real header; they are shown separately here. Best case: 48 bytes become 6.</p>
    </section>
  );
}

const SLICE = [
  { key: "mac", label: "802.15.4 header and check", cls: "bg-ink-3/40" },
  { key: "frag", label: "Fragment header", cls: "bg-u3" },
  { key: "ip", label: "IPv6 + UDP headers", cls: "bg-u2" },
  { key: "data", label: "Your data", cls: "bg-brand" },
] as const;

function FrameRow({ title, r }: { title: string; r: FragmentResult }) {
  const mac = FRAME_BYTES - r.available;
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold">{title}</h3>
        <span className="text-sm text-ink-2">
          {r.frames.length} frame{r.frames.length === 1 ? "" : "s"}, {r.bytesOnAir} bytes on air, {r.overheadPct}% overhead
        </span>
      </div>
      <ol className="grid gap-1" aria-label={`${title}: ${r.frames.length} frames`}>
        {r.frames.map((f, i) => {
          const parts = { mac, frag: f.fragHeader, ip: f.ipHeader, data: f.data };
          const used = mac + f.fragHeader + f.ipHeader + f.data;
          return (
            <li key={i} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-xs text-ink-3">Frame {i + 1}</span>
              <div className="flex h-6 min-w-0 flex-1 overflow-hidden rounded border border-line" title={`${used} of ${FRAME_BYTES} bytes used`}>
                {SLICE.map((s) =>
                  parts[s.key] > 0 ? (
                    <span key={s.key} className={cn("h-full border-r-2 border-r-surface last:border-r-0", s.cls)} style={{ width: `${(parts[s.key] / FRAME_BYTES) * 100}%` }} />
                  ) : null,
                )}
              </div>
              <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums text-ink-3">{f.data} B data</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function FragmentCalculator() {
  const [payload, setPayload] = useState(80);
  const [secure, setSecure] = useState(false);
  const plain = fragment(payload, { compressed: false, secure });
  const squeezed = fragment(payload, { compressed: true, secure });

  return (
    <section aria-labelledby="frag-title" className="grid grid-cols-1 gap-4 rounded-lg border border-line bg-surface p-4">
      <div className="grid gap-1">
        <h2 id="frag-title" className="text-h3 font-bold">
          Fragmentation calculator
        </h2>
        <p className="max-w-[65ch] text-ink-2">
          Each bar is one 127-byte radio frame. Change the size of the data a sensor sends and compare uncompressed and compressed
          headers.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Slider label="UDP data to send" value={payload} min={10} max={600} step={10} unit="bytes" onChange={setPayload} />
        <div className="flex flex-wrap gap-2">
          {[50, 80, 200, 500].map((p) => (
            <Button key={p} size="sm" variant={p === payload ? "secondary" : "ghost"} onClick={() => setPayload(p)}>
              {p} B
            </Button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={secure} onChange={(e) => setSecure(e.target.checked)} />
        <span>Link-layer security on (AES-CCM takes 21 more bytes per frame)</span>
      </label>

      <FrameRow title="Uncompressed headers (49 bytes)" r={plain} />
      <FrameRow title="Compressed headers (6 bytes)" r={squeezed} />

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-3" aria-hidden>
        {SLICE.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className={cn("h-3 w-4 rounded-sm", s.cls)} /> {s.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-4 rounded-sm border border-line" /> Unused
        </span>
      </div>

      <Readouts
        items={[
          { label: "Frames saved", value: plain.frames.length - squeezed.frames.length, tone: plain.frames.length > squeezed.frames.length ? "ok" : "default" },
          { label: "Bytes saved", value: plain.bytesOnAir - squeezed.bytesOnAir, unit: "bytes" },
          { label: "Overhead, uncompressed", value: `${plain.overheadPct}%` },
          { label: "Overhead, compressed", value: `${squeezed.overheadPct}%` },
        ]}
      />
      <p className="text-sm text-ink-3">
        Fragments after the first carry up to {Math.floor((plain.available - 5) / 8) * 8} bytes each (a multiple of 8). If one fragment is
        lost, the whole packet must be sent again.
      </p>
    </section>
  );
}

export default function SixLowpanVisual() {
  return (
    <div className="grid grid-cols-1 gap-6">
      <HeaderCompression />
      <FragmentCalculator />
      <section aria-labelledby="six-notice" className="max-w-[70ch]">
        <h2 id="six-notice" className="text-h3 font-bold">
          What to notice
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2 marker:text-ink-3">
          <li>Most of the IPv6 header is addresses, and both can be rebuilt from the MAC addresses already in the frame.</li>
          <li>At 80 bytes, compression turns two frames into one: fewer frames means less airtime and battery.</li>
          <li>For large data both need about the same number of frames, but compression still saves bytes.</li>
          <li>Turning on link security leaves less room in every frame, so more fragments are needed.</li>
        </ul>
      </section>
    </div>
  );
}
