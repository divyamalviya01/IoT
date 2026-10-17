import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Simulated networks of 4 to 16 nodes with a gateway, in star, tree, bus, ring and mesh topologies",
  ],
  theory:
    "A topology is the shape in which devices are connected. In a star every device links to a central hub; in a tree devices hang off parents in branches; in a bus all devices share one cable; in a ring each device links to the next in a loop; in a mesh devices link to several neighbours. The number of hops is how many steps a message takes to reach the gateway. A single point of failure is a part whose failure cuts devices off. Topologies with more than one route, such as a ring or a mesh, survive a single failure, but they need more links.",
  procedure: [
    "Open lab L12, Network topology simulator. Choose Star and set Number of nodes to 8. Press Record observation.",
    "Click one link to break it and press Record observation. Click the gateway (G) to fail it and note what happens. Press Repair everything.",
    "Tick Highlight the weakest point. For Tree, Bus, Ring and Mesh, record the network with nothing broken.",
    "For each topology, break its weakest point and press Record observation again.",
    "On the Ring, break one link, record, then break a second link and record.",
    "Change the Number of nodes and compare the average hops.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "topology", label: "Topology" },
    { key: "nodes", label: "Nodes" },
    { key: "cables", label: "Cables" },
    { key: "failed", label: "Failed parts" },
    { key: "cutOff", label: "Cut off" },
    { key: "avgHops", label: "Average hops" },
    { key: "weakest", label: "Weakest point cuts off" },
    { key: "backup", label: "With backup path" },
  ],
  resultHint:
    "Compare the topologies on links needed, average hops and what a single failure does. Say which topology you would choose for a smart home and why.",
  viva: [
    {
      q: "Why did failing the hub of the star cut off every device?",
      a: "In a star every device's only link goes to the hub, so the hub is a single point of failure.",
    },
    {
      q: "Why did one broken link not cut anyone off in the ring?",
      a: "Messages went the other way round the loop. A second break, however, splits the ring into two parts.",
    },
    {
      q: "Why were all bus devices only one hop from the gateway?",
      a: "On a bus every device shares one cable and hears every message directly. But one break in the cable splits the network in two.",
    },
    {
      q: "Why did the mesh survive any single failure?",
      a: "Each device had links to several neighbours, so every device had at least two separate paths to the gateway.",
    },
    {
      q: "What is the cost of a mesh's resilience?",
      a: "It needs more links (and more radio work for routing) than a star, tree or bus with the same number of nodes.",
    },
    {
      q: "In a tree, which failure does the most damage?",
      a: "A failure close to the root, such as the link from the gateway to a first-level node, because it cuts off that whole branch.",
    },
  ],
};

export default record;
