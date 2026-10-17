import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is an IoT gateway?",
    a: "A device that connects local devices to the internet, translating their protocols (such as Zigbee, BLE or Modbus) into an internet protocol such as MQTT or HTTP.",
  },
  {
    q: "List the functions of an IoT gateway.",
    a: "Protocol translation, data aggregation, filtering and edge processing, store and forward during outages, security and device management.",
  },
  {
    q: "What is Modbus?",
    a: "A simple industrial protocol from 1979 in which a master reads and writes numbered registers on slave devices, over RS-485 (RTU) or TCP port 502.",
  },
  {
    q: "What is the difference between MQTT and DDS?",
    a: "MQTT routes all messages through a central broker. DDS lets devices publish and subscribe directly, with no broker, and offers detailed real-time QoS controls.",
  },
  {
    q: "What are LwM2M and AMQP used for?",
    a: "LwM2M is for managing IoT devices remotely over CoAP, such as updating firmware. AMQP is for reliable message queuing between business systems.",
  },
  {
    q: "How does a gateway reduce internet traffic?",
    a: "By filtering out readings that have not changed much and by aggregating many readings into summaries before sending them.",
  },
];

export default viva;
