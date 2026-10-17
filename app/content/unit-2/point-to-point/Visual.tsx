import { useMemo, useState } from "react";
import { Readouts, type Readout } from "~/components/lab/Readouts";
import { ExploreLayout, type ExploreItem } from "~/components/theory/ExploreLayout";
import { Segmented } from "~/components/ui/Segmented";
import { Slider } from "~/components/ui/Slider";
import {
  TOPOLOGIES,
  TOPOLOGY_INFO,
  analyse,
  buildTopology,
  type FailureItem,
  type Topology,
  type TopologyKind,
} from "~/labs/l12-network-topology/engine";
import TopologyScene from "./TopologyScene";
import UartFrame from "./UartFrame";

const MIN_NODES = 5;
const MAX_NODES = 12;

/** One extra sentence per topology: where students meet it in IoT. */
const SEEN_IN: Record<TopologyKind, string> = {
  star: "Wi-Fi devices around one access point, and Bluetooth sensors around a phone, form a star.",
  tree: "Zigbee networks often grow like this, with routers passing data up towards the coordinator.",
  bus: "Wired sensor buses such as RS-485 (Modbus) and I²C put every device on the same pair of wires.",
  ring: "Some factory networks use a ring so that one cut cable does not stop the plant.",
  mesh: "Zigbee, Thread and Bluetooth Mesh devices pass each other's messages on to reach the gateway.",
};

const items: (ExploreItem & { id: TopologyKind })[] = TOPOLOGIES.map((kind) => ({
  id: kind,
  name: TOPOLOGY_INFO[kind].label,
  text: `${TOPOLOGY_INFO[kind].text} ${SEEN_IN[kind]}`,
}));

const options = TOPOLOGIES.map((kind) => ({ value: kind, label: TOPOLOGY_INFO[kind].label }));

/** "node 3", "the link between the gateway and node 1", "the shared cable between node 2 and node 3" */
function failureName(topo: Topology, item: FailureItem): string {
  const who = (id: number) => (id === 0 ? "the gateway" : `node ${id}`);
  if (item.kind === "node") return who(item.id);
  const l = topo.links[item.id];
  if (l.kind === "segment") return `the shared cable between ${who(l.a - topo.n)} and ${who(l.b - topo.n)}`;
  if (l.kind === "drop") return l.a === 0 ? "the gateway's drop cable" : `node ${l.a}'s drop cable`;
  return `the link between ${who(l.a)} and ${who(l.b)}`;
}

const devices = (count: number) => (count === 1 ? "1 device" : `${count} devices`);

export default function PointToPointVisual() {
  const [kind, setKind] = useState<TopologyKind>("star");
  const [n, setN] = useState(8);

  const { topo, analysis, weak } = useMemo(() => {
    const t = buildTopology(kind, n);
    const a = analyse(t);
    // Red only where one failure takes other devices down with it.
    const w: FailureItem | null = a.worst && a.worst.cutOff >= 2 ? { kind: a.worst.kind, id: a.worst.id } : null;
    return { topo: t, analysis: a, weak: w };
  }, [kind, n]);

  const worst = analysis.worst;
  const cut = worst?.cutOff ?? 0;

  const drops = topo.links.filter((l) => l.kind === "drop").length;
  const readouts: Readout[] = [
    {
      label: "Average hops",
      value: analysis.avgHops === null ? "–" : analysis.avgHops.toFixed(1),
      hint: "Hops from a device to the gateway, averaged over every device",
    },
    {
      label: "Longest trip",
      value: analysis.maxHops ?? "–",
      unit: analysis.maxHops === 1 ? "hop" : "hops",
    },
    topo.kind === "bus"
      ? { label: "Cables", value: 1, unit: `shared + ${drops} drops` }
      : { label: "Links", value: analysis.linkCount },
    {
      label: "Worst single failure",
      value: cut,
      unit: "cut off",
      tone: cut === 0 ? "ok" : cut >= 2 ? "bad" : "warn",
      hint: "The one broken link or device (not the gateway) that cuts off the most other devices",
    },
  ];

  let caption: string;
  if (!worst || cut === 0) {
    caption = "No single broken link or device cuts anyone off: there is always another way round.";
  } else if (cut === 1) {
    caption = `The worst single failure, such as ${failureName(topo, worst)}, cuts off only 1 device.`;
  } else {
    const name = failureName(topo, worst);
    caption = `Worst single failure: ${name}, shown in red. It cuts off ${devices(cut)}.`;
  }

  return (
    <div className="grid grid-cols-1 gap-10">
      <ExploreLayout
        scene={
          <div className="grid min-w-0 grid-cols-1 gap-3">
            <div className="flex min-w-0 flex-wrap items-end gap-x-8 gap-y-3">
              <Segmented label="Topology" options={options} value={kind} onChange={setKind} size="sm" />
              <Slider
                label="Nodes"
                value={n}
                min={MIN_NODES}
                max={MAX_NODES}
                onChange={setN}
                format={(v) => `${v} (1 gateway + ${v - 1} devices)`}
                className="w-full max-w-72 min-w-0"
              />
            </div>
            <TopologyScene kind={kind} n={n} weak={weak} />
            <Readouts items={readouts} />
            <p className="text-sm text-ink-2" aria-live="polite">
              {caption}
            </p>
          </div>
        }
        listTitle="Topologies"
        items={items}
        active={kind}
        onSelect={(id) => setKind(id as TopologyKind)}
        notice={[
          "Count the hops: one in a star, up through parents in a tree, and often a long way round the loop in a ring.",
          "On a bus every device is one hop from the gateway, but all packets share one cable, so one break splits it.",
          "A mesh needs the most links, but no single failure cuts a device off.",
          "The gateway is a single point of failure in every topology, so the readout leaves it out.",
        ]}
      />
      <UartFrame />
    </div>
  );
}
