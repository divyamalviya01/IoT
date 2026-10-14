import { useState } from "react";
import { ExploreLayout, type ExploreItem } from "~/components/theory/ExploreLayout";
import { Slider } from "~/components/ui/Slider";
import SensorNodeScene, { type NodeUnit } from "./SensorNodeScene";

const units: (ExploreItem & { id: NodeUnit })[] = [
  {
    id: "radio",
    group: "Communication unit",
    name: "Radio transceiver",
    text: "Sends readings out and receives commands over a low-power radio such as Zigbee, BLE or LoRa. It uses the most energy, so it sleeps whenever it can.",
  },
  {
    id: "mcu",
    group: "Processing unit",
    name: "Microcontroller",
    text: "A small computer with a processor, memory and input/output pins. It reads the ADC, applies simple rules and prepares packets.",
  },
  {
    id: "sensing",
    group: "Sensing unit",
    name: "Sensor and ADC",
    text: "The sensor turns a physical quantity, such as heat, into a voltage. The ADC (analog-to-digital converter) turns that voltage into a number the microcontroller can use.",
  },
  {
    id: "power",
    group: "Power unit",
    name: "Battery and power",
    text: "Supplies energy from a battery, sometimes topped up by a small solar cell (energy harvesting). It decides how long the node can work on its own.",
  },
];

export default function SensorNodesVisual() {
  const [active, setActive] = useState<NodeUnit>("sensing");
  const [separation, setSeparation] = useState(60);

  return (
    <ExploreLayout
      scene={
        <SensorNodeScene active={active} onSelect={setActive} explode={separation / 100} />
      }
      listTitle="Parts of a sensor node"
      items={units}
      active={active}
      onSelect={(id) => setActive(id as NodeUnit)}
      controls={
        <Slider
          label="Separate the layers"
          value={separation}
          min={0}
          max={100}
          step={5}
          format={(v) => (v === 0 ? "Assembled" : `${v}%`)}
          onChange={setSeparation}
          className="mb-2"
        />
      }
      notice={[
        "Data moves upward: physical signal, then a number, then a packet, then radio waves.",
        "The power unit feeds every other unit.",
        "Separate the layers to see the four units one by one.",
        "Select a layer in the scene or in the list to read what it does.",
      ]}
    />
  );
}
