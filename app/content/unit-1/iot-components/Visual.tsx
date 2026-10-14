import { useState } from "react";
import { ExploreLayout, type ExploreItem } from "~/components/theory/ExploreLayout";
import { usePalette } from "~/lib/palette";
import SmartHomeScene, { type SmartHomePart } from "./SmartHomeScene";

const parts: (ExploreItem & { id: SmartHomePart })[] = [
  {
    id: "sensor",
    group: "Things",
    name: "Temperature sensor",
    text: "Measures the room temperature every few seconds and turns it into data.",
  },
  {
    id: "fan",
    group: "Things",
    name: "Fan (actuator)",
    text: "Switches on or off when a command arrives. Actuators let an IoT system act on the physical world.",
  },
  {
    id: "gateway",
    group: "Connectivity",
    name: "Wi-Fi gateway",
    text: "Connects the devices in the house to the internet and passes data both ways.",
  },
  {
    id: "cloud",
    group: "Data processing",
    name: "Cloud platform",
    text: "Stores readings, checks them against rules such as “above 30 °C” and decides what should happen.",
  },
  {
    id: "app",
    group: "User interface",
    name: "Phone app",
    text: "Shows the live temperature and lets you switch the fan on or off from anywhere.",
  },
];

function FlowKey() {
  const p = usePalette();
  const keys = [
    { label: "Reading (data going up)", color: p.signal },
    { label: "Command (going back down)", color: p.copper },
  ];
  return (
    <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2" aria-label="Key">
      {keys.map((key) => (
        <li key={key.label} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block size-3 rounded-full"
            style={{ backgroundColor: key.color }}
          />
          {key.label}
        </li>
      ))}
    </ul>
  );
}

export default function IotComponentsVisual() {
  const [active, setActive] = useState<SmartHomePart>("sensor");

  return (
    <ExploreLayout
      scene={
        <>
          <SmartHomeScene active={active} onSelect={setActive} />
          <FlowKey />
        </>
      }
      listTitle="Parts of the smart home"
      items={parts}
      active={active}
      onSelect={(id) => setActive(id as SmartHomePart)}
      notice={[
        "Data flows up from the sensor to the cloud, and commands flow back down to the fan.",
        "Each colour marks one building block: things, connectivity, data processing and user interface.",
        "Take away any one block and the system no longer works end to end.",
        "Select a part in the scene or in the list to read what it does. Drag to turn the scene.",
      ]}
    />
  );
}
