import { useId, useMemo, useState } from "react";
import { Readouts, type Readout } from "~/components/lab/Readouts";
import { ExploreLayout, type ExploreItem } from "~/components/theory/ExploreLayout";
import { Segmented } from "~/components/ui/Segmented";
import { SPREADING_FACTORS, airtime, evaluate, type SF } from "~/labs/l19-lora-airtime/engine";
import { usePalette } from "~/lib/palette";
import Chirp from "./Chirp";
import FarmScene, {
  APP_BYTES,
  BANDWIDTH_KHZ,
  MAP_KM,
  PHY_BYTES,
  coverage,
  formatMs,
  type FarmPart,
} from "./FarmScene";

const parts: (ExploreItem & { id: FarmPart })[] = [
  {
    id: "device",
    group: "End device",
    name: "Soil sensor",
    text: "Measures soil moisture, wakes up now and then, and sends a few bytes by LoRa radio. It does not pick a gateway: it just transmits, and any gateway in range hears it. Then it sleeps again, so one battery can last for years.",
  },
  {
    id: "gateway",
    group: "Gateway",
    name: "Gateway",
    text: "A LoRa receiver on a tall pole or rooftop. It listens on several channels and spreading factors at once and forwards every packet it hears, unopened, to the network server over the internet (4G, fibre or Ethernet). It makes no decisions.",
  },
  {
    id: "server",
    group: "Network server",
    name: "Network server",
    text: "Gets a copy of each packet from every gateway that heard it, keeps one and drops the duplicates, and checks the packet is genuine. It also picks the best gateway for any reply and can tell a device to change its spreading factor.",
  },
  {
    id: "app",
    group: "Application",
    name: "Application",
    text: "The farmer's app or dashboard. It receives only the clean data, such as “soil moisture 23 %”, and decides what to do, for example switching on a pump.",
  },
];

const sfOptions = SPREADING_FACTORS.map((sf) => ({ value: String(sf), label: `SF${sf}` }));

const FASTEST = SPREADING_FACTORS[0];
const SLOWEST = SPREADING_FACTORS[SPREADING_FACTORS.length - 1];
const SLOWDOWN = Math.round(
  airtime(SLOWEST, BANDWIDTH_KHZ, PHY_BYTES).totalMs / airtime(FASTEST, BANDWIDTH_KHZ, PHY_BYTES).totalMs,
);

/** Colour key for the farm scene. */
function FarmKey() {
  const p = usePalette();
  const keyId = useId();
  const keys = [
    { label: "Gateway coverage", swatch: "area" as const, color: p.signal },
    { label: "Heard by a gateway", swatch: "dot" as const, color: p.signal },
    { label: "Not heard (red ×)", swatch: "dot" as const, color: p.bad },
    { label: "Packet", swatch: "dot" as const, color: p.signal },
  ];
  return (
    <div className="text-sm">
      <p id={keyId} className="sr-only">
        Key
      </p>
      <ul aria-labelledby={keyId} className="flex flex-wrap gap-x-5 gap-y-1.5 text-ink-2">
        {keys.map((k) => (
          <li key={k.label} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={k.swatch === "area" ? "inline-block h-3 w-5 shrink-0 rounded-sm border" : "inline-block size-3 shrink-0 rounded-full"}
              style={
                k.swatch === "area"
                  ? { backgroundColor: `color-mix(in srgb, ${k.color} 20%, transparent)`, borderColor: k.color }
                  : { backgroundColor: k.color }
              }
            />
            {k.label}
          </li>
        ))}
        <li className="text-ink-3">
          Map about {MAP_KM.width} × {MAP_KM.depth} km; devices drawn much larger than life.
        </li>
      </ul>
    </div>
  );
}

export default function LoraVisual() {
  const [sf, setSf] = useState<SF>(10);
  const [active, setActive] = useState<FarmPart>("device");

  const result = useMemo(() => evaluate(sf, BANDWIDTH_KHZ, APP_BYTES, "rural", "eu1pct"), [sf]);
  const cov = useMemo(() => coverage(sf), [sf]);

  const readouts: Readout[] = [
    {
      label: `Airtime, ${APP_BYTES} bytes`,
      value: formatMs(result.airtime.totalMs),
      hint: `Time on air for ${APP_BYTES} bytes of data plus ${PHY_BYTES - APP_BYTES} bytes of LoRaWAN header (PL = ${PHY_BYTES})`,
    },
    {
      label: "Bit rate",
      value: Math.round(result.bitRate).toLocaleString("en-IN"),
      unit: "bps",
    },
    {
      label: "Range (illustrative)",
      value: result.rangeKm.toFixed(1),
      unit: "km",
      hint: "Open farmland, 14 dBm. Real range depends on terrain, gateway height and buildings.",
    },
    {
      label: "Sensors heard",
      value: `${cov.heard} of ${cov.total}`,
      tone: cov.heard === cov.total ? "ok" : "warn",
    },
  ];

  const copies =
    cov.byBoth === 0
      ? "No sensor is heard by both gateways yet."
      : `${cov.byBoth} ${cov.byBoth === 1 ? "sensor is" : "sensors are"} heard by both gateways, so the network server gets two copies and keeps one.`;
  const missing = cov.total - cov.heard;
  const caption = `At SF${sf} each gateway hears about ${result.rangeKm.toFixed(1)} km around it. ${cov.heard} of ${cov.total} sensors are heard${
    missing > 0 ? ` and ${missing} ${missing === 1 ? "is" : "are"} out of range` : ""
  }. ${copies}`;

  return (
    <div className="grid grid-cols-1 gap-10">
      <ExploreLayout
        scene={
          <div className="grid min-w-0 grid-cols-1 gap-3">
            <Segmented label="Spreading factor" options={sfOptions} value={String(sf)} onChange={(v) => setSf(Number(v) as SF)} size="sm" />
            <FarmScene sf={sf} active={active} onSelect={setActive} />
            <FarmKey />
            <Readouts items={readouts} />
            <p className="text-sm text-ink-2" aria-live="polite">
              {caption}
            </p>
          </div>
        }
        listTitle="Parts of a LoRaWAN network"
        items={parts}
        active={active}
        onSelect={(id) => setActive(id as FarmPart)}
        notice={[
          `A higher spreading factor reaches farther, but each packet stays on air longer and uses more battery: SF${SLOWEST} takes about ${SLOWDOWN} times as long as SF${FASTEST} for the same ${APP_BYTES} bytes.`,
          "Gateways only listen and forward. Every gateway that hears a packet passes it on, and the network server drops the duplicates. Sensors never relay each other's messages: this is a star of stars, not a mesh.",
          "LoRa is the radio: the chirps drawn below. LoRaWAN is the network protocol on top of it: device addresses, security keys, gateways and the network server.",
          "Select a part in the scene or in the list to read what it does. Drag to turn the scene.",
        ]}
      />
      <Chirp sf={sf} onSfChange={setSf} />
    </div>
  );
}
