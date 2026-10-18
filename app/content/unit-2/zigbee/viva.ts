import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is Zigbee?",
    a: "A low-power wireless mesh networking standard built on IEEE 802.15.4, working mainly at 2.4 GHz at 250 kbps, used for home and building automation.",
  },
  {
    q: "Name the three Zigbee device types and their roles.",
    a: "The coordinator starts the network and lets devices join; routers are mains-powered and relay messages; end devices are battery-powered sensors that sleep and never relay.",
  },
  {
    q: "Draw and explain the Zigbee protocol stack.",
    a: "IEEE 802.15.4 physical and MAC layers at the bottom, then the Zigbee network layer (addressing and mesh routing), the application support sublayer and device objects (delivery, joining, security), and the application layer with clusters.",
  },
  {
    q: "What topologies does Zigbee support?",
    a: "Star, tree and mesh. The mesh is the most common, because routers relay for each other and the network can heal itself.",
  },
  {
    q: "Explain self-healing in a Zigbee mesh.",
    a: "When a router fails, the network layer finds new routes through other routers, and end devices that lost their parent re-join another router in range.",
  },
  {
    q: "Why must Zigbee routers stay powered?",
    a: "Other devices depend on them to relay messages. Switching a router off at the wall removes a path from the mesh and can leave devices orphaned.",
  },
  {
    q: "What is the relation between Zigbee, the CSA and Matter?",
    a: "The Zigbee Alliance became the Connectivity Standards Alliance in 2021. The CSA created Matter, which runs over Wi-Fi, Thread and Ethernet; Zigbee devices join Matter homes through bridges.",
  },
  {
    q: "Give two advantages and two limitations of Zigbee.",
    a: "Advantages: very low power and a self-healing mesh that covers a whole building. Limitations: a low data rate unsuitable for video, and the need for a hub to reach phones and the internet.",
  },
];

export default viva;
