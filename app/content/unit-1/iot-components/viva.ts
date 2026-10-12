import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "Define the Internet of Things.",
    a: "IoT is a network of physical objects fitted with sensors, processors and network connections. They collect and exchange data over the internet and can be monitored or controlled remotely.",
  },
  {
    q: "Who coined the term IoT, and when?",
    a: "Kevin Ashton, in 1999, in a talk about connecting RFID tags to the internet.",
  },
  {
    q: "What are the four building blocks of an IoT system?",
    a: "Things (sensors and actuators), connectivity (gateways and networks), data processing (cloud or edge) and the user interface (apps and dashboards).",
  },
  {
    q: "What is the difference between a sensor and an actuator?",
    a: "A sensor measures something in the physical world and turns it into a signal. An actuator receives a command and does something physical, such as turning a motor.",
  },
  {
    q: "Give an Indian example of an IoT system and name its building blocks.",
    a: "FASTag: the RFID tag is the thing, the toll-plaza reader is the connectivity, the bank's system does the data processing and the SMS or app is the user interface.",
  },
  {
    q: "Why do devices usually connect through a gateway instead of directly to the internet?",
    a: "Small devices use short-range, low-power radios such as Zigbee or Bluetooth. The gateway collects their data and forwards it over the internet, so each device does not need its own internet connection.",
  },
  {
    q: "Name two advantages and two limitations of IoT.",
    a: "Advantages: automation and remote monitoring. Limitations: security and privacy risks, and dependence on the network.",
  },
];

export default viva;
