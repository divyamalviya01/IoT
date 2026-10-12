import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "List the five core characteristics of IoT.",
    a: "Dynamic and self-adapting, self-configuring, interoperable communication protocols, unique identity, and integrated into the information network.",
  },
  {
    q: "What does self-configuring mean? Give an example.",
    a: "Devices set themselves up with little human help: they join the network, get an address and update their firmware. A new smart plug that connects itself through the app is an example.",
  },
  {
    q: "Why is unique identity important in IoT?",
    a: "Data must come from, and commands must go to, the right device. Identifiers such as IP addresses, MAC addresses and RFID codes make each device distinct.",
  },
  {
    q: "How does IPv6 help IoT?",
    a: "IPv6 uses 128-bit addresses, about 3.4 × 10³⁸ of them, which is enough to give every IoT device its own address.",
  },
  {
    q: "What is heterogeneity in IoT?",
    a: "A single system mixes devices with different hardware, operating systems and radios, such as Zigbee, Wi-Fi and LoRa devices. The platform must handle all of them.",
  },
  {
    q: "Name one challenge created by the characteristics of IoT.",
    a: "Scalability creates huge volumes of data to store and analyse. Limited energy leaves little room for strong security.",
  },
];

export default viva;
