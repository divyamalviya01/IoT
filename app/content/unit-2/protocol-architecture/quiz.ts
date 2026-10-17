import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Which are the three layers of the basic IoT architecture?",
    options: [
      "Physical, data link, network",
      "Perception, network, application",
      "Perception, processing, business",
      "Sensor, cloud, database",
    ],
    answer: 1,
    explanation: "The 3-layer model is perception (sensing), network (transmission) and application (services).",
  },
  {
    id: "q2",
    question: "In which layer of the 3-layer model do sensors and RFID tags belong?",
    options: ["Application", "Network", "Perception", "Business"],
    answer: 2,
    explanation: "The perception layer senses the physical world, so sensors, actuators and RFID tags belong there.",
  },
  {
    id: "q3",
    question: "Which layer of the 5-layer model stores and analyses large amounts of data?",
    options: ["Transport", "Processing", "Business", "Perception"],
    answer: 1,
    explanation: "The processing (middleware) layer uses databases, cloud computing and big-data tools.",
  },
  {
    id: "q4",
    question: "Which layer of the 5-layer model manages business models, profits and users' privacy?",
    options: ["Application", "Processing", "Business", "Transport"],
    answer: 2,
    explanation: "The business layer manages the whole IoT system, including its business model and privacy.",
  },
  {
    id: "q5",
    question: "At which OSI layer does CoAP work?",
    options: ["Network", "Transport", "Application", "Data link"],
    answer: 2,
    explanation: "CoAP is an application-layer protocol, like HTTP.",
  },
  {
    id: "q6",
    question: "What does 6LoWPAN do?",
    options: [
      "Encrypts IoT data",
      "Compresses IPv6 headers so packets fit in small IEEE 802.15.4 frames",
      "Routes packets across the internet",
      "Replaces UDP",
    ],
    answer: 1,
    explanation: "6LoWPAN is an adaptation layer between IPv6 and IEEE 802.15.4: it compresses headers and splits large packets.",
  },
  {
    id: "q7",
    question: "Which is the IETF stack for constrained devices, from top to bottom?",
    options: [
      "HTTP, TCP, IPv4, Ethernet",
      "MQTT, TCP, IPv4, Wi-Fi",
      "CoAP, UDP, IPv6 (RPL), 6LoWPAN, IEEE 802.15.4",
      "CoAP, TCP, 6LoWPAN, IPv6, Bluetooth",
    ],
    answer: 2,
    explanation: "The IETF stack swaps heavy protocols for light ones: CoAP over UDP over IPv6 routed by RPL, over 6LoWPAN, over IEEE 802.15.4.",
  },
  {
    id: "q8",
    question: "What is RPL?",
    options: [
      "A routing protocol for low-power and lossy networks",
      "A header compression scheme",
      "A radio standard",
      "An application protocol",
    ],
    answer: 0,
    explanation: "RPL finds routes for IPv6 packets through a mesh of low-power devices. It works at the network layer.",
  },
  {
    id: "q9",
    question: "In the 5-layer IoT model, the transport layer means:",
    options: [
      "TCP and UDP only",
      "Moving data through networks such as Wi-Fi, Zigbee and 4G",
      "Physically carrying devices",
      "The business plan",
    ],
    answer: 1,
    explanation: "In the 5-layer IoT model, transport means moving data between perception and processing over networks, not TCP and UDP as in OSI.",
  },
  {
    id: "q10",
    question: "What did the IoT-A project produce?",
    options: [
      "A new radio chip",
      "An architectural reference model with domain, information, functional, communication and trust models",
      "A cloud service",
      "A programming language for sensors",
    ],
    answer: 1,
    explanation: "IoT-A defined a reference model that gives common names and views for describing any IoT system.",
  },
];

export default quiz;
