import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is edge computing?",
    a: "Processing data on the device itself or on a computer right next to it, so decisions come back in milliseconds and only results travel further.",
  },
  {
    q: "What is fog computing?",
    a: "Processing on local servers, routers or gateways between the devices and the cloud, such as a factory server that combines data from many machines.",
  },
  {
    q: "What is meant by the peripheral cloud?",
    a: "Cloud resources placed at the edge, or periphery, of the network, close to the users, for example cloudlets in a campus or servers at a mobile tower.",
  },
  {
    q: "Why not send all IoT data to the cloud?",
    a: "It adds delay, uses a lot of bandwidth, stops working without internet and may send private data outside the building.",
  },
  {
    q: "Give one example each for edge, fog and cloud processing.",
    a: "Edge: a car's automatic braking. Fog: a factory server monitoring all machines. Cloud: analysing years of traffic data for city planning.",
  },
  {
    q: "Which tier has the lowest latency and which has the most computing power?",
    a: "The edge has the lowest latency; the cloud has the most computing power.",
  },
];

export default viva;
