import { AppWindow, Cloud, Cpu, Globe, Router } from "lucide-react";
import { useState } from "react";
import { FlowDiagram, type FlowTone } from "~/components/theory/FlowDiagram";
import { Segmented } from "~/components/ui/Segmented";

type ExampleId = "home" | "grid" | "car" | "wearable" | "supply";

interface Stage {
  label: string;
  /** What fills this stage in the chosen example */
  part: string;
  note: string;
}

const STAGES: { name: string; icon: typeof Cpu; tone: FlowTone }[] = [
  { name: "Devices", icon: Cpu, tone: "u1" },
  { name: "Gateway", icon: Router, tone: "u2" },
  { name: "Network", icon: Globe, tone: "neutral" },
  { name: "Cloud platform", icon: Cloud, tone: "u3" },
  { name: "Application", icon: AppWindow, tone: "brand" },
];

const examples: Record<ExampleId, { name: string; links: string[]; stages: Stage[] }> = {
  home: {
    name: "Smart home",
    links: ["Wi-Fi, Zigbee", "Broadband", "Internet", "Internet"],
    stages: [
      { label: "Devices", part: "Bulbs, plugs, door sensors", note: "Smart bulbs, plugs, locks and door sensors sense and act inside the home." },
      { label: "Gateway", part: "Wi-Fi router or hub", note: "A Wi-Fi router, or a hub that translates Zigbee to Wi-Fi, connects the devices to the internet." },
      { label: "Network", part: "Home broadband", note: "The home's broadband line carries data to the internet." },
      { label: "Cloud platform", part: "Smart-home cloud", note: "The maker's cloud stores device states and runs automation rules, such as “lights off at 11 pm”." },
      { label: "Application", part: "Phone app, voice assistant", note: "The phone app and voice assistant let you check and control every device." },
    ],
  },
  grid: {
    name: "Smart grid",
    links: ["RF mesh", "Cellular", "Internet", "Internet"],
    stages: [
      { label: "Devices", part: "Smart meters", note: "Smart meters measure each home's electricity use every few minutes and can switch supply on or off." },
      { label: "Gateway", part: "Data concentrator", note: "A data concentrator collects readings from hundreds of meters in an area." },
      { label: "Network", part: "RF mesh or cellular", note: "Readings travel over a radio mesh or the mobile network to the electricity company." },
      { label: "Cloud platform", part: "Head-end and meter data system", note: "The utility's systems store readings, detect outages and calculate bills." },
      { label: "Application", part: "Billing portal, recharge app", note: "Consumers see their use and recharge prepaid meters from an app." },
    ],
  },
  car: {
    name: "Connected car",
    links: ["Car network", "4G/5G", "Internet", "Internet"],
    stages: [
      { label: "Devices", part: "GPS, engine, crash sensors", note: "Sensors measure location, speed, engine health and sudden impacts." },
      { label: "Gateway", part: "Telematics unit", note: "The telematics control unit in the car collects sensor data and has its own mobile modem." },
      { label: "Network", part: "4G/5G mobile network", note: "The mobile network carries data while the car is moving." },
      { label: "Cloud platform", part: "Carmaker's cloud", note: "The carmaker's cloud tracks vehicle health and sends software updates over the air." },
      { label: "Application", part: "Driver app, emergency alerts", note: "The driver's app shows the car's status; a crash alert can reach emergency services automatically." },
    ],
  },
  wearable: {
    name: "Wearable",
    links: ["Bluetooth LE", "Mobile data", "Internet", "Internet"],
    stages: [
      { label: "Devices", part: "Heart-rate and motion sensors", note: "Sensors in a fitness band measure steps, heart rate and sleep." },
      { label: "Gateway", part: "User's smartphone", note: "The band has no internet of its own; it sends data to the phone over Bluetooth Low Energy." },
      { label: "Network", part: "Mobile data or Wi-Fi", note: "The phone uploads the data over mobile data or Wi-Fi." },
      { label: "Cloud platform", part: "Health cloud", note: "The health cloud stores history and spots trends, such as a rising resting heart rate." },
      { label: "Application", part: "Fitness app, doctor's dashboard", note: "The fitness app shows progress; with permission, a doctor can see the data too." },
    ],
  },
  supply: {
    name: "Supply chain",
    links: ["RFID, BLE", "Cellular", "Internet", "Internet"],
    stages: [
      { label: "Devices", part: "RFID tags, GPS, temperature loggers", note: "Tags and loggers on boxes and containers record identity, location and temperature." },
      { label: "Gateway", part: "Readers and trackers", note: "RFID readers at warehouse doors and trackers in trucks collect the tag data." },
      { label: "Network", part: "Cellular or satellite", note: "Mobile or satellite links send updates even from highways and ships." },
      { label: "Cloud platform", part: "Logistics platform", note: "The logistics platform knows where every shipment is and whether it stayed cold enough." },
      { label: "Application", part: "Tracking dashboard, alerts", note: "Managers see shipments on a map and get alerts if a cold-chain box warms up." },
    ],
  },
};

export default function InfrastructureVisual() {
  const [exampleId, setExampleId] = useState<ExampleId>("grid");
  const [stage, setStage] = useState(0);
  const example = examples[exampleId];
  const current = example.stages[stage];

  return (
    <div className="grid grid-cols-1 gap-6">
      <Segmented<ExampleId>
        label="Choose an example"
        value={exampleId}
        onChange={(id) => {
          setExampleId(id);
          setStage(0);
        }}
        options={(Object.keys(examples) as ExampleId[]).map((id) => ({
          value: id,
          label: examples[id].name,
        }))}
        className="min-w-0 max-w-full overflow-x-auto pb-1"
      />

      <div className="rounded-lg border border-line bg-surface p-4">
        <FlowDiagram
          nodes={STAGES.map((s, i) => ({
            label: s.name,
            sub: example.stages[i].part,
            icon: s.icon,
            tone: s.tone,
          }))}
          links={example.links}
          activeIndex={stage}
          onSelect={setStage}
          caption={`${example.name} mapped to the five stages. Select a stage to read what it does.`}
        />
      </div>

      <section aria-live="polite" className="max-w-[70ch] rounded-lg border border-line bg-surface p-4">
        <p className="text-sm text-ink-3">
          {example.name}, stage {stage + 1} of 5
        </p>
        <h2 className="text-h3 font-bold">
          {current.label}: {current.part}
        </h2>
        <p className="mt-1 text-ink-2">{current.note}</p>
      </section>

      <section aria-labelledby="infra-notice" className="max-w-[70ch]">
        <h2 id="infra-notice" className="text-h3 font-bold">
          What to notice
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2 marker:text-ink-3">
          <li>The five stages stay the same; only the parts filling them change.</li>
          <li>The gateway can be a box on a wall, a unit in a car or simply your phone.</li>
          <li>The network stage picks the link that suits the place: broadband at home, mobile on the road.</li>
          <li>Switch between examples and compare what fills each stage.</li>
        </ul>
      </section>
    </div>
  );
}
