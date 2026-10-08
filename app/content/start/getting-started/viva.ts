import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is a simulation, and why is it useful for learning IoT?",
    a: "A simulation is a computer model that behaves like a real system. It lets you experiment safely, repeat runs with the same result and change conditions such as delay or loss that are hard to control with real hardware.",
  },
  {
    q: "Name the stops a sensor reading passes on its way to a phone app.",
    a: "Sensor, gateway, internet, cloud, and finally the phone app.",
  },
  {
    q: "What is the difference between latency and packet loss?",
    a: "Latency is how long a packet takes to arrive, measured in milliseconds. Packet loss is the percentage of packets that never arrive.",
  },
  {
    q: "Why do losses on several links matter more than the loss on any single link?",
    a: "A packet must survive every link, so the delivery chances multiply. Three links with 10% loss each deliver only about 73% of packets.",
  },
  {
    q: "What is an acknowledgement (ack)?",
    a: "A short reply from the receiver confirming that a message arrived. If the sender gets no ack in time, it can resend the message.",
  },
  {
    q: "Name the three layers of the basic IoT model.",
    a: "Perception layer (sensors and actuators), network layer (gateways and the internet) and application layer (apps and dashboards).",
  },
];

export default viva;
