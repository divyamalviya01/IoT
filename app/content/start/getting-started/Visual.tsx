import { useState } from "react";
import PacketJourneyScene from "~/components/three/scenes/PacketJourneyScene";
import { ExploreLayout, type ExploreItem } from "~/components/theory/ExploreLayout";

type Stop = "sensor" | "gateway" | "internet" | "cloud" | "app";

const stops: (ExploreItem & { id: Stop })[] = [
  {
    id: "sensor",
    name: "Sensor",
    text: "Measures the temperature outside the house and sends each reading as a small packet over a short-range radio link.",
  },
  {
    id: "gateway",
    name: "Gateway",
    text: "Collects packets from nearby devices and forwards them to the internet. A home Wi-Fi router often plays this role.",
  },
  {
    id: "internet",
    name: "Internet",
    text: "Carries the packet across many networks to a data centre that may be hundreds of kilometres away. This is usually the longest part of the delay.",
  },
  {
    id: "cloud",
    name: "Cloud",
    text: "Stores the reading, compares it with earlier readings and decides whether anyone needs an alert.",
  },
  {
    id: "app",
    name: "Phone app",
    text: "Fetches the latest data from the cloud and shows it to you, wherever you are.",
  },
];

export default function GettingStartedVisual() {
  const [active, setActive] = useState<Stop>("sensor");

  return (
    <ExploreLayout
      scene={<PacketJourneyScene activeStop={active} onSelectStop={(id: Stop) => setActive(id)} />}
      listTitle="Stops on the journey"
      items={stops}
      active={active}
      onSelect={(id) => setActive(id as Stop)}
      notice={[
        "Packets leave the sensor one at a time, not as one continuous stream.",
        "Every packet passes the same stops in the same order.",
        "The rings around the sensor show its radio signal. The gateway must be within range to hear it.",
        "Select a stop in the scene or in the list to read what it does. Drag to turn the scene.",
      ]}
    />
  );
}
