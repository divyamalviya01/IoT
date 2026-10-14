import { useState } from "react";
import { ExploreLayout, type ExploreItem } from "~/components/theory/ExploreLayout";
import { Segmented } from "~/components/ui/Segmented";
import TiersScene, { type ProcessAt, type Tier } from "./TiersScene";

const tiers: (ExploreItem & { id: Tier })[] = [
  {
    id: "devices",
    group: "Where data starts",
    name: "Devices",
    text: "Sensors and actuators produce data and carry out commands. They have very little memory and processing power.",
  },
  {
    id: "edge",
    group: "Closest to the devices",
    name: "Edge",
    text: "Processing on the device or on a gateway right next to it. Answers come back in a few milliseconds, even when the internet is down.",
  },
  {
    id: "fog",
    group: "In between",
    name: "Fog (and the peripheral cloud)",
    text: "A local server or small data centre between the edge and the cloud, for example in a factory or at a mobile tower. Small cloud servers placed at the edge of the network are called cloudlets, or the peripheral cloud.",
  },
  {
    id: "cloud",
    group: "Far away",
    name: "Cloud",
    text: "Large data centres with almost unlimited storage and computing power. Best for long-term storage and heavy analysis, but every trip takes the longest.",
  },
];

const processOptions: { value: ProcessAt; label: string }[] = [
  { value: "edge", label: "Edge" },
  { value: "fog", label: "Fog" },
  { value: "cloud", label: "Cloud" },
];

export default function EdgeFogCloudVisual() {
  const [active, setActive] = useState<Tier>("edge");
  const [processAt, setProcessAt] = useState<ProcessAt>("edge");

  return (
    <ExploreLayout
      scene={
        <>
          <TiersScene active={active} onSelect={setActive} processAt={processAt} />
          <p className="mt-2 text-sm text-ink-3">Typical times, for illustration</p>
        </>
      }
      listTitle="Tiers"
      items={tiers}
      active={active}
      onSelect={(id) => setActive(id as Tier)}
      controls={
        <Segmented
          label="Process at"
          options={processOptions}
          value={processAt}
          onChange={setProcessAt}
          className="mb-2"
        />
      }
      notice={[
        "The higher the tier, the more computing power, but the longer the round trip.",
        "Time-critical decisions, such as braking a car, belong at the edge.",
        "Only summaries need to travel all the way to the cloud, which saves bandwidth.",
        "Choose where to process the data and compare the round-trip times.",
      ]}
    />
  );
}
