import { useId, useState } from "react";
import { Readouts } from "~/components/lab/Readouts";
import { ExploreLayout, type ExploreItem } from "~/components/theory/ExploreLayout";
import { Segmented } from "~/components/ui/Segmented";
import { TECHS, type Tech, type TechId } from "~/labs/l15-wireless-selector/engine";
import RangeScene, { BY_RANGE, formatRange, techColor, type RangeScale } from "./RangeScene";

/** "424 kbps", "1 Mbps", "100 Mbps" */
function formatRate(kbps: number): string {
  return kbps >= 1000 ? `${kbps / 1000} Mbps` : `${kbps} kbps`;
}

/** Splits "865–867 MHz (India)" into the numbers and the unit (with any note), for the readout. */
function splitBand(band: string): { value: string; unit?: string } {
  const match = /^(.+?)\s+([kMG]Hz)(?:\s*\((.+)\))?$/.exec(band);
  if (!match) return { value: band };
  return { value: match[1], unit: match[3] ? `${match[2]} (${match[3]})` : match[2] };
}

const count = (n: number) => Math.round(n).toLocaleString("en-IN");

/** Round to two significant figures, for "about" numbers. */
const roughly = (n: number) => {
  const step = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1);
  return count(Math.round(n / step) * step);
};

/** Where students meet each technology. */
const USED_FOR: Record<TechId, string> = {
  nfc: "Used for tap-to-pay cards and phones, metro cards and pairing by touch. The tiny range is a safety feature.",
  ble: "Used for fitness bands, beacons and other small battery devices that talk to a phone.",
  classic: "Used for audio: wireless earphones, speakers and car kits.",
  zigbee: "Used for smart bulbs and switches that pass messages along a mesh around a home.",
  wifi: "Used for cameras and other mains-powered devices that need a high data rate and direct internet (IP) access.",
  lorawan: "Used for farm, city and utility sensors that send a few bytes over kilometres and run for years on a battery.",
};

const items: (ExploreItem & { id: TechId })[] = BY_RANGE.map((t) => ({
  id: t.id,
  group: `${formatRange(t.typicalRangeM)} · ${formatRate(t.rateKbps)}`,
  name: t.name,
  text: `Typical range ${formatRange(t.typicalRangeM)} (up to about ${formatRange(t.maxRangeM)} in good conditions). Up to ${formatRate(t.rateKbps)}, on ${t.band}. ${USED_FOR[t.id]}`,
}));

const scaleOptions: { value: RangeScale; label: string }[] = [
  { value: "linear", label: "Linear scale" },
  { value: "log", label: "Log scale" },
];

const byId = (id: TechId): Tech => TECHS.find((t) => t.id === id) ?? TECHS[0];
const NFC = byId("nfc");
const WIFI = byId("wifi");
const LORAWAN = byId("lorawan");

const POWERS_OF_TEN = Math.round(Math.log10(LORAWAN.typicalRangeM / NFC.typicalRangeM));

/** What the selected ring looks like on the current scale. */
function scaleNote(tech: Tech, scale: RangeScale): string {
  const range = formatRange(tech.typicalRangeM);
  if (scale === "linear") {
    if (tech.id === "lorawan") {
      return `LoRaWAN's ${range} ring is the only one you can see on a linear scale. The next biggest, Wi-Fi, reaches only ${formatRange(WIFI.typicalRangeM)}.`;
    }
    const times = count(LORAWAN.typicalRangeM / tech.typicalRangeM);
    return `On this linear scale ${tech.name}'s ${range} ring is ${times} times smaller than LoRaWAN's, so it shrinks into the dot at the centre. Switch to the log scale to see it.`;
  }
  const power = Math.log10(tech.typicalRangeM);
  const exact = Math.abs(power - Math.round(power)) < 1e-9;
  if (exact) return `Each grey ring is ten times farther out than the one inside it. ${tech.name} (${range}) sits right on the ${range} ring.`;
  const inner = formatRange(10 ** Math.floor(power));
  const outer = formatRange(10 ** Math.ceil(power));
  return `Each grey ring is ten times farther out than the one inside it. ${tech.name} (${range}) sits between the ${inner} and ${outer} rings.`;
}

/** Colour key: which ring is which technology. */
function RingKey() {
  const keyId = useId();
  return (
    <div className="text-sm">
      <p id={keyId} className="sr-only">
        Ring colours
      </p>
      <ul aria-labelledby={keyId} className="flex flex-wrap gap-x-5 gap-y-1.5 text-ink-2">
        {BY_RANGE.map((t) => (
          <li key={t.id} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block size-3 shrink-0 rounded-full"
              style={{ backgroundColor: techColor(t) }}
            />
            {t.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ChoosingWirelessVisual() {
  const [scale, setScale] = useState<RangeScale>("linear");
  const [active, setActive] = useState<TechId>("lorawan");
  const tech = byId(active);
  const band = splitBand(tech.band);

  return (
    <ExploreLayout
      scene={
        <div className="grid min-w-0 grid-cols-1 gap-3">
          <Segmented label="Distance scale" options={scaleOptions} value={scale} onChange={setScale} size="sm" />
          <RangeScene scale={scale} active={active} onSelect={setActive} />
          <RingKey />
          <div className="grid min-w-0 gap-2">
            <p className="flex items-center gap-2 font-semibold">
              <span
                aria-hidden="true"
                className="inline-block size-3 shrink-0 rounded-full"
                style={{ backgroundColor: techColor(tech) }}
              />
              {tech.name}
            </p>
            <Readouts
              items={[
                { label: "Typical range", value: formatRange(tech.typicalRangeM) },
                {
                  label: "Best case",
                  value: formatRange(tech.maxRangeM),
                  hint: "Largest range in good conditions, with a clear line of sight",
                },
                { label: "Data rate", value: formatRate(tech.rateKbps), hint: "Highest data rate" },
                { label: "Band", value: band.value, unit: band.unit },
              ]}
            />
            <p className="text-sm text-ink-2" aria-live="polite">
              {scaleNote(tech, scale)}
            </p>
          </div>
        </div>
      }
      listTitle="Technologies"
      items={items}
      active={active}
      onSelect={(id) => setActive(id as TechId)}
      notice={[
        `The typical ranges span about ${POWERS_OF_TEN} powers of ten: from ${formatRange(NFC.typicalRangeM)} for NFC to ${formatRange(LORAWAN.typicalRangeM)} for LoRaWAN.`,
        "On a linear scale the short-range technologies vanish into a dot. A log scale gives every power of ten the same space, so all six rings show.",
        `Longer range usually means a lower data rate: LoRaWAN reaches about ${count(LORAWAN.typicalRangeM / WIFI.typicalRangeM)} times farther than Wi-Fi but carries about ${roughly(WIFI.rateKbps / LORAWAN.rateKbps)} times less data.`,
        "Range is only one test. Power, cost, network size and whether a phone must connect also decide the choice. Select a ring or a technology in the list to compare.",
      ]}
    />
  );
}
