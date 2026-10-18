import { useCallback, useId, useState } from "react";
import { Readouts, type Readout } from "~/components/lab/Readouts";
import { ExploreLayout, type ExploreItem } from "~/components/theory/ExploreLayout";
import { Slider } from "~/components/ui/Slider";
import { URI_PREFIXES, fieldStrength, hex, readChance, tlv } from "~/labs/l18-nfc-tap/engine";
import { cn } from "~/lib/cn";
import NfcScene, { MAX_CM, RECORD, TAP_COUNT, tapsAt, type NfcPart, type TapResult } from "./NfcScene";

const items: (ExploreItem & { id: NfcPart })[] = [
  {
    id: "coil",
    group: "Phone (the reader)",
    name: "Phone's NFC coil",
    text: "A flat loop of wire just inside the back of the phone. Current at 13.56 MHz flows through it and makes a magnetic field that flips direction 13.56 million times a second. A thin magnetic sheet behind the coil steers most of the field out of the back, towards the tag.",
  },
  {
    id: "field",
    group: "Between phone and tag",
    name: "Magnetic field",
    text: "The field links the two coils, like the two halves of a transformer: this is magnetic induction. It is strongest at the coil and fades very fast. At 4 cm it is already only about a seventh as strong.",
  },
  {
    id: "antenna",
    group: "Tag (no battery)",
    name: "Tag antenna",
    text: "A few turns of flat metal track printed on the sticker. When the phone's field passes through it, a small current flows, and that current powers the chip.",
  },
  {
    id: "chip",
    group: "Tag (no battery)",
    name: "Tag chip",
    text: "A tiny memory chip, such as an NTAG213 with 144 bytes for data. Once powered, it answers by changing how much power it draws, which the phone senses as small changes in its own field. This one holds one NDEF record: a web address.",
  },
];

/** The URI record decoded the way a phone does it: prefix code, then the rest as UTF-8. */
const prefixPart = RECORD.parts.find((part) => part.name === "URI prefix");
const restPart = RECORD.parts.find((part) => part.name === "Rest of URI");
const PREFIX = URI_PREFIXES.find((u) => u.code === prefixPart?.bytes[0])?.prefix ?? "";
const REST = new TextDecoder().decode(new Uint8Array(restPart?.bytes ?? []));
const DECODED = PREFIX + REST;
const WRAPPED = tlv(RECORD.bytes).bytes;

function percent(share: number): string {
  const v = share * 100;
  if (v >= 10) return v.toFixed(0);
  return v.toFixed(1);
}

export default function NfcVisual() {
  const [active, setActive] = useState<NfcPart>("coil");
  const [distance, setDistance] = useState(2);
  const [lastTap, setLastTap] = useState<TapResult | null>(null);
  const dataId = useId();
  const tapsId = useId();

  const onTap = useCallback((tap: TapResult) => setLastTap(tap), []);
  const tap = lastTap && lastTap.distance === distance ? lastTap : null;

  const chance = readChance(distance);
  const strength = fieldStrength(distance);
  const results = tapsAt(distance);
  const reads = results.filter(Boolean).length;

  const readouts: Readout[] = [
    { label: "Distance", value: distance, unit: "cm" },
    {
      label: "Field at the tag",
      value: percent(strength),
      unit: "%",
      hint: "Strength of the phone's magnetic field at the tag, as a share of its strength right at the coil",
    },
    {
      label: "Chance a tap reads",
      value: Math.round(chance * 100),
      unit: "%",
      tone: chance >= 1 ? "ok" : chance > 0 ? "warn" : "bad",
    },
    {
      label: "Last tap",
      value: tap ? (tap.read ? "Read" : "No answer") : "–",
      tone: tap ? (tap.read ? "ok" : "bad") : "default",
    },
  ];

  let verdict: string;
  if (chance >= 1) verdict = "Every tap reads the tag.";
  else if (chance >= 0.3 && chance <= 0.7) verdict = "About half the taps read the tag; the rest get no answer.";
  else if (chance > 0) verdict = chance > 0.7 ? "Most taps read the tag, but not all." : "Only a few taps read the tag.";
  else verdict = "No tap reads the tag: it gets too little power from the field to answer.";

  return (
    <ExploreLayout
      scene={
        <div className="grid min-w-0 grid-cols-1 gap-3">
          <Slider
            label="Distance from phone to tag"
            value={distance}
            min={0}
            max={MAX_CM}
            step={0.5}
            onChange={(v) => setDistance(v)}
            format={(v) => `${v} cm`}
            className="w-full max-w-md min-w-0"
          />
          <NfcScene distance={distance} active={active} onSelect={setActive} onTap={onTap} />
          <Readouts items={readouts} />

          <section aria-labelledby={dataId} className="min-w-0 rounded-lg border border-line bg-surface p-4">
            <h3 id={dataId} className="font-semibold text-ink">
              What the tag sends: one NDEF record, {RECORD.bytes.length} bytes
            </h3>
            <ul className="mt-2 flex min-w-0 flex-wrap gap-2">
              {RECORD.parts.map((part) => (
                <li key={part.name} className="min-w-0 rounded-md border border-line bg-surface-2 px-2 py-1" title={part.meaning}>
                  <span className="block text-xs text-ink-3">{part.name}</span>
                  <span className="font-mono text-sm break-words text-ink">{hex(part.bytes)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-ink-2">
              The phone decodes it: prefix code {hex(prefixPart?.bytes ?? [])} means{" "}
              <span className="font-mono text-ink">{PREFIX}</span>, and the rest is the text{" "}
              <span className="font-mono text-ink">{REST}</span>, so it opens{" "}
              <span className="font-mono font-semibold break-words text-ink">{DECODED}</span>
            </p>
            <p className="mt-1 text-sm text-ink-3">
              On the tag the record is wrapped as 03 (NDEF message), its length, the record, then FE (end):{" "}
              <span className="font-mono break-words">{hex(WRAPPED)}</span>
            </p>

            <div className="mt-3 border-t border-line pt-3">
              <p id={tapsId} className="text-sm font-semibold text-ink">
                {TAP_COUNT} taps at {distance} cm: {reads} read
              </p>
              <ol aria-labelledby={tapsId} className="mt-1.5 flex flex-wrap gap-1.5">
                {results.map((ok, i) => (
                  <li
                    key={i}
                    aria-label={`Tap ${i + 1}: ${ok ? "read" : "no answer"}`}
                    className={cn(
                      "size-4 rounded-full border-2",
                      ok ? "border-ok bg-ok" : "border-line-strong bg-surface",
                      tap?.index === i && "outline-2 outline-offset-2 outline-ink",
                    )}
                  />
                ))}
              </ol>
              <p className="mt-1.5 text-sm text-ink-2" aria-live="polite">
                {verdict}
              </p>
            </div>
          </section>
        </div>
      }
      listTitle="Parts of an NFC read"
      items={items}
      active={active}
      onSelect={(id) => setActive(id as NfcPart)}
      notice={[
        "The field fades very fast with distance: every tap reads within about 4 cm, only some around 6 cm, and none from 8 cm (10 cm is the theoretical limit).",
        "The tag has no battery. The phone's field powers its chip for the moment of the read, so a sticker tag never needs charging.",
        "A reader has to be a few centimetres away, so it is hard to read a card from across a room. That is one reason NFC suits payments like RuPay contactless cards and UPI tap-to-pay. (FASTag is different: it is UHF RFID, read from metres away.)",
        "This view shows reader/writer mode. In card emulation mode the phone acts as a contactless card for a payment terminal. Peer-to-peer mode (phone to phone) is mostly history: Android Beam was removed in Android 10.",
      ]}
    />
  );
}
