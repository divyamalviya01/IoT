import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "Why is IoT architecture divided into layers?",
    a: "Layers split a large system into separate jobs. Each layer can be built or changed without rewriting the others, and standard interfaces let devices from different makers work together.",
  },
  {
    q: "Explain the 3-layer IoT architecture.",
    a: "Perception layer: sensors and actuators that sense and act on the physical world. Network layer: carries data to servers and connects devices, including gateways. Application layer: delivers services to users, such as smart-home or health apps.",
  },
  {
    q: "What are the five layers of the 5-layer IoT architecture?",
    a: "Perception, transport, processing (middleware), application and business.",
  },
  {
    q: "What does the processing layer do?",
    a: "It stores, analyses and processes the large amount of data coming from the transport layer, using databases, cloud computing and big-data tools.",
  },
  {
    q: "Map IoT protocols onto the OSI layers.",
    a: "Application: CoAP, MQTT, XMPP. Transport: UDP and TCP. Network: IPv6, routed by RPL. Adaptation (between network and link): 6LoWPAN. Link and physical: IEEE 802.15.4, BLE, Wi-Fi, LoRaWAN.",
  },
  {
    q: "Describe the IETF stack for constrained devices.",
    a: "CoAP at the application layer, UDP at transport, IPv6 routed by RPL at the network layer, 6LoWPAN for adaptation, and IEEE 802.15.4 at the link and physical layers.",
  },
  {
    q: "Why is 6LoWPAN called an adaptation layer?",
    a: "It does not route or deliver data itself. It adapts IPv6 to IEEE 802.15.4 by compressing the 40-byte IPv6 header and splitting large packets to fit in 127-byte frames.",
  },
  {
    q: "What is the IoT-A reference model?",
    a: "A reference architecture from a European research project (2010–2013). It gives common names and views, including domain, information, functional and communication models and a trust, security and privacy model.",
  },
];

export default viva;
