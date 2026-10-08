/**
 * Single source of truth for the syllabus: units → topics → labs.
 *
 * Keep this file pure data (no React, no MDX, no browser APIs):
 * react-router.config.ts imports it at build time to list pre-rendered paths.
 * Whether a topic's content has been written yet is decided at runtime by
 * app/content/modules.ts, not here.
 */

export type UnitId = "start" | "unit-1" | "unit-2" | "unit-3";
export type UnitNumber = 0 | 1 | 2 | 3;
export type VisualKind = "3d" | "2d" | "chart" | "interactive";

export interface Unit {
  id: UnitId;
  number: UnitNumber;
  title: string;
  summary: string;
  /** Syllabus text exactly as printed in BCA-501 */
  syllabus: string[];
  outcomes: string[];
}

export interface Topic {
  slug: string;
  /** Display number, e.g. "1.9" */
  code: string;
  unit: UnitId;
  /** Roadmap phase that builds this topic */
  phase: number;
  title: string;
  /** The words from the syllabus this topic covers */
  syllabusText: string;
  /** One-line, student-facing summary */
  summary: string;
  visual: VisualKind | null;
  /** Lab id such as "L06", or null for topics with no practical */
  lab: string | null;
}

export interface Lab {
  /** "L06" */
  id: string;
  /** URL slug, also the folder name under app/labs/ */
  slug: string;
  title: string;
  /** Topic code this lab belongs to */
  topic: string;
  phase: number;
  aim: string;
  tech: string[];
}

export const units: Unit[] = [
  {
    id: "start",
    number: 0,
    title: "Start here",
    summary:
      "How this lab works: the five tabs on every topic, how simulations run and how to print a lab record.",
    syllabus: [],
    outcomes: [],
  },
  {
    id: "unit-1",
    number: 1,
    title: "Devices and protocols",
    summary:
      "What an IoT system is made of, the hardware that runs it, and the protocols devices use to talk.",
    syllabus: [
      "Introduction to IoT components, Characteristics IoT sensor nodes, Edge computer, cloud and peripheral cloud, single board computers, open source hardwares, Examples of IoT infrastructure.",
      "IoT protocols and softwares, MQTT, UDP, MQTT brokers, publish subscribe modes, HTTP, COAP, XMPP and gateway protocols.",
    ],
    outcomes: [
      "Explain IoT components, sensor nodes, edge/fog/cloud and IoT hardware.",
      "Compare MQTT, CoAP, HTTP, XMPP and UDP, and run pub/sub and request/response exchanges.",
    ],
  },
  {
    id: "unit-2",
    number: 2,
    title: "Communication and wireless",
    summary:
      "How IoT devices connect: communication patterns, protocol layers and choosing the right wireless technology.",
    syllabus: [
      "IoT point to point communication technologies, IoT Communication Pattern, IoT protocol Architecture, Selection of Wireless technologies (6LoWPAN, Zigbee, WIFI, BT, BLE, SIG, NFC, LORA, Widi).",
    ],
    outcomes: [
      "Choose a suitable wireless technology and communication pattern for a given IoT scenario.",
    ],
  },
  {
    id: "unit-3",
    number: 3,
    title: "Cloud, security and applications",
    summary:
      "Where IoT data goes and how it is analysed, how IoT systems are secured, and real applications.",
    syllabus: [
      "Introduction to Cloud computation and BigData analytics, Evolution of Cloud Computation, Commercial clouds and their features, open source IoT platforms, cloud dashboards, Introduction to big data analytics and Hadoop.",
      "IoT security, Need for encryption, standard encryption protocol, light weight cryptography, Quadruple Trust Model for IoT-A – Threat Analysis and model for IoT-A, Cloud security.",
      "IoT application and its Variants. Case studies: IoT for smart cities, health care, agriculture, smart meters. M2M, Web of things, Cellular IoT, Industrial IoT, Industry 4.0, IoT standards.",
    ],
    outcomes: [
      "Describe cloud platforms, dashboards, big data analytics and Hadoop for IoT.",
      "Identify IoT security threats and apply encryption and threat-modeling concepts.",
      "Analyse real IoT applications: smart city, health, agriculture, smart meters, IIoT.",
    ],
  },
];

export const topics: Topic[] = [
  // Start here
  {
    slug: "getting-started",
    code: "0.1",
    unit: "start",
    phase: 0,
    title: "Getting started with the lab",
    syllabusText: "Orientation",
    summary:
      "Follow one data packet from a sensor to a phone, and learn how each tab and lab works.",
    visual: "3d",
    lab: "L00",
  },

  // Unit 1, part A: fundamentals and hardware
  {
    slug: "iot-components",
    code: "1.1",
    unit: "unit-1",
    phase: 1,
    title: "Introduction to IoT and its components",
    syllabusText: "Introduction to IoT components",
    summary: "What the Internet of Things is and the four building blocks of every IoT system.",
    visual: "3d",
    lab: "L01",
  },
  {
    slug: "iot-characteristics",
    code: "1.2",
    unit: "unit-1",
    phase: 1,
    title: "Characteristics of IoT",
    syllabusText: "Characteristics",
    summary: "The features that make an IoT system different from an ordinary computer network.",
    visual: "2d",
    lab: null,
  },
  {
    slug: "sensor-nodes",
    code: "1.3",
    unit: "unit-1",
    phase: 1,
    title: "IoT sensor nodes",
    syllabusText: "IoT sensor nodes",
    summary: "Inside a sensor node: sensing, processing, radio and power, and how readings become data.",
    visual: "3d",
    lab: "L02",
  },
  {
    slug: "edge-fog-cloud",
    code: "1.4",
    unit: "unit-1",
    phase: 1,
    title: "Edge computer, cloud and peripheral cloud",
    syllabusText: "Edge computer, cloud and peripheral cloud",
    summary: "Where IoT data is processed, from the device itself to a data centre far away.",
    visual: "3d",
    lab: "L03",
  },
  {
    slug: "single-board-computers",
    code: "1.5",
    unit: "unit-1",
    phase: 1,
    title: "Single board computers and open-source hardware",
    syllabusText: "single board computers, open source hardwares",
    summary: "Raspberry Pi, Arduino, ESP32 and friends, and what makes hardware open source.",
    visual: "3d",
    lab: "L04",
  },
  {
    slug: "iot-infrastructure",
    code: "1.6",
    unit: "unit-1",
    phase: 1,
    title: "Examples of IoT infrastructure",
    syllabusText: "Examples of IoT infrastructure",
    summary: "Real systems such as smart homes, smart grids and connected cars, layer by layer.",
    visual: "2d",
    lab: null,
  },

  // Unit 1, part B: protocols and software
  {
    slug: "protocols-overview",
    code: "1.7",
    unit: "unit-1",
    phase: 2,
    title: "IoT protocols and software",
    syllabusText: "IoT protocols and softwares",
    summary: "The IoT protocol stack at a glance, and the software that runs on IoT devices.",
    visual: "interactive",
    lab: null,
  },
  {
    slug: "udp",
    code: "1.8",
    unit: "unit-1",
    phase: 2,
    title: "UDP (and how it differs from TCP)",
    syllabusText: "UDP",
    summary: "Fast, connectionless delivery: why many IoT protocols run on UDP instead of TCP.",
    visual: "2d",
    lab: "L05",
  },
  {
    slug: "mqtt",
    code: "1.9",
    unit: "unit-1",
    phase: 2,
    title: "MQTT, brokers and publish–subscribe",
    syllabusText: "MQTT, MQTT brokers, publish subscribe modes",
    summary: "The most popular IoT messaging protocol: topics, brokers, QoS levels and more.",
    visual: "3d",
    lab: "L06",
  },
  {
    slug: "http",
    code: "1.10",
    unit: "unit-1",
    phase: 2,
    title: "HTTP for IoT",
    syllabusText: "HTTP",
    summary: "The web's request–response protocol, REST APIs, and its cost on small devices.",
    visual: "2d",
    lab: "L07",
  },
  {
    slug: "coap",
    code: "1.11",
    unit: "unit-1",
    phase: 2,
    title: "CoAP",
    syllabusText: "COAP",
    summary: "A lightweight, web-like protocol over UDP, built for constrained devices.",
    visual: "2d",
    lab: "L08",
  },
  {
    slug: "xmpp",
    code: "1.12",
    unit: "unit-1",
    phase: 2,
    title: "XMPP",
    syllabusText: "XMPP",
    summary: "A chat protocol built on XML that devices can use to message each other.",
    visual: "2d",
    lab: "L09",
  },
  {
    slug: "gateway-protocols",
    code: "1.13",
    unit: "unit-1",
    phase: 2,
    title: "Gateway protocols",
    syllabusText: "gateway protocols",
    summary: "How a gateway translates between local device protocols and the internet.",
    visual: "2d",
    lab: "L10",
  },
  {
    slug: "protocol-comparison",
    code: "1.14",
    unit: "unit-1",
    phase: 2,
    title: "Comparing IoT protocols",
    syllabusText: "MQTT, UDP, HTTP, COAP, XMPP (summary)",
    summary: "MQTT, CoAP, HTTP and XMPP side by side, and when to choose each.",
    visual: "chart",
    lab: "L11",
  },

  // Unit 2, part A: communication
  {
    slug: "point-to-point",
    code: "2.1",
    unit: "unit-2",
    phase: 3,
    title: "Point-to-point communication technologies",
    syllabusText: "IoT point to point communication technologies",
    summary: "Direct links between devices, network topologies, and short-range wired buses.",
    visual: "3d",
    lab: "L12",
  },
  {
    slug: "communication-patterns",
    code: "2.2",
    unit: "unit-2",
    phase: 3,
    title: "IoT communication patterns",
    syllabusText: "IoT Communication Pattern",
    summary: "Request–response, publish–subscribe, push–pull and exclusive pair.",
    visual: "2d",
    lab: "L13",
  },
  {
    slug: "protocol-architecture",
    code: "2.3",
    unit: "unit-2",
    phase: 3,
    title: "IoT protocol architecture",
    syllabusText: "IoT protocol Architecture",
    summary: "IoT architecture layers and where each protocol fits in the stack.",
    visual: "3d",
    lab: "L14",
  },

  // Unit 2, part B: wireless
  {
    slug: "choosing-wireless",
    code: "2.4",
    unit: "unit-2",
    phase: 4,
    title: "Selecting a wireless technology",
    syllabusText: "Selection of Wireless technologies",
    summary: "Range, data rate, power and cost: how to pick the right radio for a job.",
    visual: "3d",
    lab: "L15",
  },
  {
    slug: "6lowpan",
    code: "2.5",
    unit: "unit-2",
    phase: 4,
    title: "6LoWPAN",
    syllabusText: "6LoWPAN",
    summary: "Squeezing IPv6 into tiny low-power radio frames.",
    visual: "interactive",
    lab: null,
  },
  {
    slug: "zigbee",
    code: "2.6",
    unit: "unit-2",
    phase: 4,
    title: "Zigbee",
    syllabusText: "Zigbee",
    summary: "Low-power mesh networking for homes and buildings.",
    visual: "3d",
    lab: "L16",
  },
  {
    slug: "wifi",
    code: "2.7",
    unit: "unit-2",
    phase: 4,
    title: "Wi-Fi",
    syllabusText: "WIFI",
    summary: "Wi-Fi standards, bands and channels, and Wi-Fi made for IoT.",
    visual: "interactive",
    lab: null,
  },
  {
    slug: "bluetooth-ble",
    code: "2.8",
    unit: "unit-2",
    phase: 4,
    title: "Bluetooth, BLE and the Bluetooth SIG",
    syllabusText: "BT, BLE, SIG",
    summary: "Classic Bluetooth, Bluetooth Low Energy, and the group that writes the standard.",
    visual: "2d",
    lab: "L17",
  },
  {
    slug: "nfc",
    code: "2.9",
    unit: "unit-2",
    phase: 4,
    title: "NFC",
    syllabusText: "NFC",
    summary: "Tap-to-connect communication over a few centimetres.",
    visual: "3d",
    lab: "L18",
  },
  {
    slug: "lora",
    code: "2.10",
    unit: "unit-2",
    phase: 4,
    title: "LoRa and LoRaWAN",
    syllabusText: "LORA",
    summary: "Long-range, low-power radio that reaches kilometres on a small battery.",
    visual: "3d",
    lab: "L19",
  },
  {
    slug: "widi",
    code: "2.11",
    unit: "unit-2",
    phase: 4,
    title: "WiDi",
    syllabusText: "Widi",
    summary: "Intel Wireless Display: sending a screen to a TV over Wi-Fi, and what replaced it.",
    visual: null,
    lab: null,
  },

  // Unit 3, part A: cloud and big data
  {
    slug: "cloud-computing",
    code: "3.1",
    unit: "unit-3",
    phase: 5,
    title: "Introduction to cloud computing",
    syllabusText: "Introduction to Cloud computation",
    summary: "What the cloud is, service models (IaaS, PaaS, SaaS) and why IoT needs it.",
    visual: "2d",
    lab: null,
  },
  {
    slug: "cloud-evolution",
    code: "3.2",
    unit: "unit-3",
    phase: 5,
    title: "Evolution of cloud computing",
    syllabusText: "Evolution of Cloud Computation",
    summary: "From mainframes to serverless: how computing moved into the cloud.",
    visual: "2d",
    lab: null,
  },
  {
    slug: "commercial-clouds",
    code: "3.3",
    unit: "unit-3",
    phase: 5,
    title: "Commercial clouds and their features",
    syllabusText: "Commercial clouds and their features",
    summary: "IoT services from the big cloud providers and the features they share.",
    visual: "2d",
    lab: null,
  },
  {
    slug: "open-source-platforms",
    code: "3.4",
    unit: "unit-3",
    phase: 5,
    title: "Open-source IoT platforms",
    syllabusText: "open source IoT platforms",
    summary: "ThingsBoard, Node-RED, Eclipse IoT and other platforms you can run yourself.",
    visual: "2d",
    lab: "L20",
  },
  {
    slug: "cloud-dashboards",
    code: "3.5",
    unit: "unit-3",
    phase: 5,
    title: "Cloud dashboards",
    syllabusText: "cloud dashboards",
    summary: "Showing live IoT data with gauges, charts, maps and alerts.",
    visual: "chart",
    lab: "L21",
  },
  {
    slug: "big-data-analytics",
    code: "3.6",
    unit: "unit-3",
    phase: 5,
    title: "Introduction to big data analytics",
    syllabusText: "BigData analytics, Introduction to big data analytics",
    summary: "The 5 Vs of big data and the kinds of analytics used on IoT data.",
    visual: "2d",
    lab: "L22",
  },
  {
    slug: "hadoop",
    code: "3.7",
    unit: "unit-3",
    phase: 5,
    title: "Hadoop",
    syllabusText: "Hadoop",
    summary: "HDFS storage and MapReduce processing for very large datasets.",
    visual: "3d",
    lab: "L23",
  },

  // Unit 3, part B: security
  {
    slug: "iot-security",
    code: "3.8",
    unit: "unit-3",
    phase: 6,
    title: "IoT security",
    syllabusText: "IoT security",
    summary: "Why IoT devices are easy targets and the attacks they face at each layer.",
    visual: "3d",
    lab: "L24",
  },
  {
    slug: "need-for-encryption",
    code: "3.9",
    unit: "unit-3",
    phase: 6,
    title: "Need for encryption",
    syllabusText: "Need for encryption",
    summary: "What anyone on the network can read when data is not encrypted.",
    visual: "2d",
    lab: "L25",
  },
  {
    slug: "encryption-protocols",
    code: "3.10",
    unit: "unit-3",
    phase: 6,
    title: "Standard encryption protocols",
    syllabusText: "standard encryption protocol",
    summary: "AES, RSA, Diffie–Hellman, hashing and TLS in simple terms.",
    visual: "2d",
    lab: "L26",
  },
  {
    slug: "lightweight-cryptography",
    code: "3.11",
    unit: "unit-3",
    phase: 6,
    title: "Lightweight cryptography",
    syllabusText: "light weight cryptography",
    summary: "Encryption designed for devices with little memory, power and speed.",
    visual: "chart",
    lab: "L27",
  },
  {
    slug: "quadruple-trust-model",
    code: "3.12",
    unit: "unit-3",
    phase: 6,
    title: "Quadruple Trust Model for IoT-A",
    syllabusText: "Quadruple Trust Model for IoT-A",
    summary: "Protection, security, privacy and safety: the four kinds of trust an IoT system needs.",
    visual: "interactive",
    lab: null,
  },
  {
    slug: "threat-analysis",
    code: "3.13",
    unit: "unit-3",
    phase: 6,
    title: "Threat analysis and model for IoT-A",
    syllabusText: "Threat Analysis and model for IoT-A",
    summary: "Finding threats in a system step by step with STRIDE and a risk matrix.",
    visual: "2d",
    lab: "L28",
  },
  {
    slug: "cloud-security",
    code: "3.14",
    unit: "unit-3",
    phase: 6,
    title: "Cloud security",
    syllabusText: "Cloud security",
    summary: "Who secures what in the cloud, and how devices prove who they are.",
    visual: "2d",
    lab: null,
  },

  // Unit 3, part C: applications and case studies
  {
    slug: "iot-applications",
    code: "3.15",
    unit: "unit-3",
    phase: 7,
    title: "IoT applications and their variants",
    syllabusText: "IoT application and its Variants",
    summary: "Where IoT is used, and variants such as IIoT, IoMT and AIoT.",
    visual: "2d",
    lab: null,
  },
  {
    slug: "smart-cities",
    code: "3.16",
    unit: "unit-3",
    phase: 7,
    title: "Case study: smart cities",
    syllabusText: "Case studies: IoT for smart cities",
    summary: "Smart parking, street lighting, traffic and waste management.",
    visual: "3d",
    lab: "L29",
  },
  {
    slug: "healthcare",
    code: "3.17",
    unit: "unit-3",
    phase: 7,
    title: "Case study: health care",
    syllabusText: "health care",
    summary: "Wearables and remote patient monitoring.",
    visual: "chart",
    lab: "L30",
  },
  {
    slug: "agriculture",
    code: "3.18",
    unit: "unit-3",
    phase: 7,
    title: "Case study: agriculture",
    syllabusText: "agriculture",
    summary: "Precision farming with soil sensors, weather data and smart irrigation.",
    visual: "3d",
    lab: "L31",
  },
  {
    slug: "smart-meters",
    code: "3.19",
    unit: "unit-3",
    phase: 7,
    title: "Case study: smart meters",
    syllabusText: "smart meters",
    summary: "Two-way electricity meters, time-of-use tariffs and the smart grid.",
    visual: "chart",
    lab: "L32",
  },
  {
    slug: "m2m",
    code: "3.20",
    unit: "unit-3",
    phase: 8,
    title: "M2M (machine to machine)",
    syllabusText: "M2M",
    summary: "Machines talking directly to machines, and how M2M differs from IoT.",
    visual: "2d",
    lab: null,
  },
  {
    slug: "web-of-things",
    code: "3.21",
    unit: "unit-3",
    phase: 8,
    title: "Web of Things",
    syllabusText: "Web of things",
    summary: "Using ordinary web standards to describe and control things.",
    visual: "2d",
    lab: "L33",
  },
  {
    slug: "cellular-iot",
    code: "3.22",
    unit: "unit-3",
    phase: 8,
    title: "Cellular IoT",
    syllabusText: "Cellular IoT",
    summary: "NB-IoT, LTE-M and 5G: connecting devices through mobile networks.",
    visual: "chart",
    lab: null,
  },
  {
    slug: "industrial-iot",
    code: "3.23",
    unit: "unit-3",
    phase: 8,
    title: "Industrial IoT",
    syllabusText: "Industrial IoT",
    summary: "Sensors in factories, SCADA and predictive maintenance.",
    visual: "3d",
    lab: "L34",
  },
  {
    slug: "industry-4-0",
    code: "3.24",
    unit: "unit-3",
    phase: 8,
    title: "Industry 4.0",
    syllabusText: "Industry 4.0",
    summary: "The fourth industrial revolution and the technologies behind it.",
    visual: "2d",
    lab: null,
  },
  {
    slug: "iot-standards",
    code: "3.25",
    unit: "unit-3",
    phase: 8,
    title: "IoT standards",
    syllabusText: "IoT standards",
    summary: "Who writes IoT standards, and which standard covers what.",
    visual: null,
    lab: null,
  },
];

export const labs: Lab[] = [
  {
    id: "L00",
    slug: "l00-packet-journey",
    title: "Packet journey",
    topic: "0.1",
    phase: 0,
    aim: "To send data packets from a sensor to the cloud and observe how network delay and packet loss affect delivery.",
    tech: ["Motion", "Recharts"],
  },
  {
    id: "L01",
    slug: "l01-build-iot-system",
    title: "Build an IoT system",
    topic: "1.1",
    phase: 1,
    aim: "To assemble the components of an IoT system in the correct order and observe data flowing end to end.",
    tech: ["React Flow", "Motion"],
  },
  {
    id: "L02",
    slug: "l02-sensor-node",
    title: "Sensor node simulator",
    topic: "1.3",
    phase: 1,
    aim: "To study how a sensor node converts an analog signal into digital readings and how duty cycling affects battery life.",
    tech: ["Motion", "Recharts"],
  },
  {
    id: "L03",
    slug: "l03-edge-fog-cloud",
    title: "Edge vs fog vs cloud",
    topic: "1.4",
    phase: 1,
    aim: "To compare latency, bandwidth and cost when IoT data is processed at the edge, in the fog and in the cloud.",
    tech: ["three.js", "Recharts"],
  },
  {
    id: "L04",
    slug: "l04-virtual-arduino",
    title: "Virtual Arduino and GPIO",
    topic: "1.5",
    phase: 1,
    aim: "To control an LED and read a button and a potentiometer using the GPIO pins of a virtual microcontroller board.",
    tech: ["SVG", "Motion"],
  },
  {
    id: "L05",
    slug: "l05-tcp-vs-udp",
    title: "TCP vs UDP",
    topic: "1.8",
    phase: 2,
    aim: "To compare reliability and speed of TCP and UDP under different packet-loss and delay conditions.",
    tech: ["Motion"],
  },
  {
    id: "L06",
    slug: "l06-mqtt-broker",
    title: "MQTT broker simulator",
    topic: "1.9",
    phase: 2,
    aim: "To publish and subscribe to MQTT topics through a broker and study wildcards, QoS levels, retained messages and Last Will.",
    tech: ["three.js", "Motion"],
  },
  {
    id: "L07",
    slug: "l07-rest-api",
    title: "REST API playground",
    topic: "1.10",
    phase: 2,
    aim: "To read sensor data and control an actuator on an IoT device using HTTP methods and status codes.",
    tech: ["Motion"],
  },
  {
    id: "L08",
    slug: "l08-coap",
    title: "CoAP client–server simulator",
    topic: "1.11",
    phase: 2,
    aim: "To exchange confirmable and non-confirmable CoAP messages and observe retransmission and the Observe option.",
    tech: ["Motion"],
  },
  {
    id: "L09",
    slug: "l09-xmpp",
    title: "XMPP device messaging",
    topic: "1.12",
    phase: 2,
    aim: "To exchange presence and message stanzas between two devices using XMPP and compare message size with MQTT.",
    tech: ["Motion"],
  },
  {
    id: "L10",
    slug: "l10-gateway-translator",
    title: "Gateway protocol translator",
    topic: "1.13",
    phase: 2,
    aim: "To translate device frames from local protocols into MQTT messages using gateway mapping and filtering rules.",
    tech: ["Motion"],
  },
  {
    id: "L11",
    slug: "l11-protocol-race",
    title: "Protocol race",
    topic: "1.14",
    phase: 2,
    aim: "To compare MQTT, CoAP, HTTP and XMPP on message size, delivery time and energy for the same sensor reading.",
    tech: ["Recharts"],
  },
  {
    id: "L12",
    slug: "l12-network-topology",
    title: "Network topology simulator",
    topic: "2.1",
    phase: 3,
    aim: "To study how star, mesh, tree, bus and ring topologies behave when a node or link fails.",
    tech: ["three.js"],
  },
  {
    id: "L13",
    slug: "l13-communication-patterns",
    title: "Communication pattern playground",
    topic: "2.2",
    phase: 3,
    aim: "To compare request–response, publish–subscribe, push–pull and exclusive pair patterns for the same monitoring task.",
    tech: ["Motion", "Recharts"],
  },
  {
    id: "L14",
    slug: "l14-protocol-stack",
    title: "Protocol stack builder",
    topic: "2.3",
    phase: 3,
    aim: "To place IoT protocols in the correct layers of the IoT protocol architecture.",
    tech: ["Drag and drop"],
  },
  {
    id: "L15",
    slug: "l15-wireless-selector",
    title: "Wireless technology selector",
    topic: "2.4",
    phase: 4,
    aim: "To select a suitable wireless technology for a given IoT scenario based on range, data rate, power and cost.",
    tech: ["Recharts"],
  },
  {
    id: "L16",
    slug: "l16-zigbee-mesh",
    title: "Zigbee mesh self-healing",
    topic: "2.6",
    phase: 4,
    aim: "To observe how a Zigbee mesh network re-routes traffic when a router fails.",
    tech: ["three.js"],
  },
  {
    id: "L17",
    slug: "l17-ble-explorer",
    title: "BLE explorer",
    topic: "2.8",
    phase: 4,
    aim: "To scan for BLE devices, browse their GATT services and estimate distance from signal strength.",
    tech: ["Motion"],
  },
  {
    id: "L18",
    slug: "l18-nfc-tap",
    title: "NFC tap lab",
    topic: "2.9",
    phase: 4,
    aim: "To write and read NDEF records on an NFC tag and find the working distance of NFC.",
    tech: ["three.js"],
  },
  {
    id: "L19",
    slug: "l19-lora-airtime",
    title: "LoRa airtime and range calculator",
    topic: "2.10",
    phase: 4,
    aim: "To calculate LoRa time-on-air for different spreading factors and study the trade-off between range and data rate.",
    tech: ["Recharts"],
  },
  {
    id: "L20",
    slug: "l20-flow-programming",
    title: "Flow-based IoT programming",
    topic: "3.4",
    phase: 5,
    aim: "To build a Node-RED-style flow that reads a sensor, applies a rule and sends alerts.",
    tech: ["React Flow"],
  },
  {
    id: "L21",
    slug: "l21-dashboard-builder",
    title: "IoT dashboard builder",
    topic: "3.5",
    phase: 5,
    aim: "To build a cloud dashboard that shows live sensor data and controls an actuator.",
    tech: ["Recharts"],
  },
  {
    id: "L22",
    slug: "l22-stream-analytics",
    title: "Stream analytics",
    topic: "3.6",
    phase: 5,
    aim: "To apply a moving average and anomaly detection to a live stream of sensor data.",
    tech: ["Recharts"],
  },
  {
    id: "L23",
    slug: "l23-hadoop",
    title: "Hadoop: HDFS and MapReduce",
    topic: "3.7",
    phase: 5,
    aim: "To observe how HDFS stores replicated blocks and how MapReduce computes results from IoT logs.",
    tech: ["three.js", "Motion"],
  },
  {
    id: "L24",
    slug: "l24-security-audit",
    title: "Smart home security audit",
    topic: "3.8",
    phase: 6,
    aim: "To find and fix common security weaknesses in a simulated smart home.",
    tech: ["three.js"],
  },
  {
    id: "L25",
    slug: "l25-packet-sniffer",
    title: "Packet sniffer: plaintext vs encrypted",
    topic: "3.9",
    phase: 6,
    aim: "To compare what an eavesdropper can read from plaintext and encrypted IoT traffic.",
    tech: ["Motion"],
  },
  {
    id: "L26",
    slug: "l26-crypto-workbench",
    title: "Crypto workbench",
    topic: "3.10",
    phase: 6,
    aim: "To encrypt and decrypt data with AES, compute SHA-256 hashes and work through a small RSA example.",
    tech: ["Web Crypto"],
  },
  {
    id: "L27",
    slug: "l27-lightweight-crypto",
    title: "Lightweight crypto cost estimator",
    topic: "3.11",
    phase: 6,
    aim: "To compare the time and energy cost of standard and lightweight ciphers on constrained devices.",
    tech: ["Recharts"],
  },
  {
    id: "L28",
    slug: "l28-threat-modeling",
    title: "STRIDE threat modeling workshop",
    topic: "3.13",
    phase: 6,
    aim: "To identify threats in an IoT system using STRIDE and rank them on a risk matrix.",
    tech: ["Motion"],
  },
  {
    id: "L29",
    slug: "l29-smart-city",
    title: "Smart city control room",
    topic: "3.16",
    phase: 7,
    aim: "To control smart street lights, parking and traffic signals and measure the energy and time saved.",
    tech: ["three.js"],
  },
  {
    id: "L30",
    slug: "l30-patient-monitor",
    title: "Remote patient monitor",
    topic: "3.17",
    phase: 7,
    aim: "To monitor simulated patient vitals and configure alerts for abnormal readings.",
    tech: ["Recharts"],
  },
  {
    id: "L31",
    slug: "l31-smart-irrigation",
    title: "Smart irrigation",
    topic: "3.18",
    phase: 7,
    aim: "To compare sensor-based irrigation with a fixed schedule in terms of water used and crop health.",
    tech: ["three.js", "Recharts"],
  },
  {
    id: "L32",
    slug: "l32-smart-meter",
    title: "Smart meter and tariff simulator",
    topic: "3.19",
    phase: 7,
    aim: "To study smart meter readings under a time-of-use tariff and reduce the bill by shifting loads.",
    tech: ["Recharts"],
  },
  {
    id: "L33",
    slug: "l33-thing-description",
    title: "Thing Description explorer",
    topic: "3.21",
    phase: 8,
    aim: "To generate controls for a device automatically from its W3C Thing Description.",
    tech: ["Motion"],
  },
  {
    id: "L34",
    slug: "l34-predictive-maintenance",
    title: "Predictive maintenance",
    topic: "3.23",
    phase: 8,
    aim: "To detect early signs of machine failure from vibration and temperature data.",
    tech: ["three.js", "Recharts"],
  },
];

/* ------------------------------------------------------------------
   Lookups
   ------------------------------------------------------------------ */

const unitById = new Map(units.map((u) => [u.id, u]));
const topicBySlug = new Map(topics.map((t) => [t.slug, t]));
const topicByCode = new Map(topics.map((t) => [t.code, t]));
const labBySlug = new Map(labs.map((l) => [l.slug, l]));
const labById = new Map(labs.map((l) => [l.id, l]));

export const syllabusUnits = units.filter((u) => u.number > 0);

export function getUnit(id: string | undefined): Unit | undefined {
  return id ? unitById.get(id as UnitId) : undefined;
}

export function getTopic(slug: string | undefined): Topic | undefined {
  return slug ? topicBySlug.get(slug) : undefined;
}

export function getTopicByCode(code: string): Topic | undefined {
  return topicByCode.get(code);
}

export function getLab(slug: string | undefined): Lab | undefined {
  return slug ? labBySlug.get(slug) : undefined;
}

export function getLabById(id: string | null | undefined): Lab | undefined {
  return id ? labById.get(id) : undefined;
}

export function topicsInUnit(id: UnitId): Topic[] {
  return topics.filter((t) => t.unit === id);
}

export function labsInUnit(id: UnitId): Lab[] {
  return labs.filter((l) => getTopicByCode(l.topic)?.unit === id);
}

export function unitOfTopic(topic: Topic): Unit {
  return unitById.get(topic.unit)!;
}

/** Previous and next topic in syllabus order, for page-to-page navigation. */
export function topicNeighbours(slug: string): { prev?: Topic; next?: Topic } {
  const index = topics.findIndex((t) => t.slug === slug);
  if (index === -1) return {};
  return { prev: topics[index - 1], next: topics[index + 1] };
}

/* ------------------------------------------------------------------
   URLs
   ------------------------------------------------------------------ */

export const href = {
  home: () => "/",
  unit: (id: UnitId) => `/unit/${id}`,
  topic: (slug: string) => `/learn/${slug}`,
  labs: () => "/labs",
  lab: (slug: string) => `/labs/${slug}`,
  labRecord: (slug: string) => `/labs/${slug}/record`,
  quiz: (unit?: UnitId) => (unit ? `/quiz/${unit}` : "/quiz"),
  viva: () => "/viva",
  glossary: () => "/glossary",
  syllabus: () => "/syllabus",
};

/** Every path the static build pre-renders. */
export function prerenderPaths(): string[] {
  return [
    href.home(),
    ...units.map((u) => href.unit(u.id)),
    ...topics.map((t) => href.topic(t.slug)),
    href.labs(),
    ...labs.map((l) => href.lab(l.slug)),
    ...labs.map((l) => href.labRecord(l.slug)),
    href.quiz(),
    ...syllabusUnits.map((u) => href.quiz(u.id)),
    href.viva(),
    href.glossary(),
    href.syllabus(),
  ];
}
