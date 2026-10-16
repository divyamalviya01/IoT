import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is a protocol stack?",
    a: "A set of protocols arranged in layers, where each layer does one job and uses the layer below it: link/physical, network, transport and application.",
  },
  {
    q: "Name two IoT protocols at each layer.",
    a: "Application: MQTT, CoAP. Transport: TCP, UDP. Network: IPv6, 6LoWPAN. Link/physical: IEEE 802.15.4, BLE.",
  },
  {
    q: "What is encapsulation?",
    a: "As data goes down the stack, each layer adds its own header in front of it. The receiver removes the headers layer by layer.",
  },
  {
    q: "Why can't IoT devices simply use web protocols for everything?",
    a: "Web protocols assume powerful computers and fast links. IoT devices have little memory, run on batteries and use lossy radios, so they need lighter protocols with short headers.",
  },
  {
    q: "What is an RTOS? Give an example.",
    a: "A real-time operating system for microcontrollers that runs tasks on strict schedules. FreeRTOS and Zephyr are examples.",
  },
  {
    q: "Name three kinds of IoT software.",
    a: "Device firmware (for example Arduino sketches), message brokers (for example Mosquitto) and flow tools or middleware (for example Node-RED).",
  },
];

export default viva;
