import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "A camera switches to infrared at night. Which characteristic does this show?",
    options: ["Unique identity", "Dynamic and self-adapting", "Heterogeneity", "Scalability"],
    answer: 1,
    explanation: "The camera changes its behaviour when conditions change, so it is self-adapting.",
  },
  {
    id: "q2",
    question: "A new smart bulb joins the Wi-Fi and appears in the app by itself. Which characteristic is this?",
    options: ["Self-configuring", "Intelligence", "Security", "Integration"],
    answer: 0,
    explanation: "Devices that set themselves up with little human help are self-configuring.",
  },
  {
    id: "q3",
    question: "Why do IoT devices need interoperable communication protocols?",
    options: [
      "To use less battery",
      "So that devices from different makers can work together",
      "To make devices cheaper to build",
      "To give each device an IP address",
    ],
    answer: 1,
    explanation: "Standard protocols such as MQTT and CoAP let devices from different companies talk to each other.",
  },
  {
    id: "q4",
    question: "Which of these is a unique identifier for a device?",
    options: ["Its battery level", "Its MAC address", "Its temperature reading", "Its colour"],
    answer: 1,
    explanation: "IP addresses, MAC addresses and RFID codes identify exactly one device.",
  },
  {
    id: "q5",
    question: "How long is an IPv6 address?",
    options: ["32 bits", "64 bits", "128 bits", "256 bits"],
    answer: 2,
    explanation: "IPv6 addresses are 128 bits long, giving about 3.4 × 10³⁸ addresses.",
  },
  {
    id: "q6",
    question: "Zigbee bulbs, Wi-Fi cameras and LoRa meters in one system show which characteristic?",
    options: ["Heterogeneity", "Self-configuring", "Unique identity", "Limited energy"],
    answer: 0,
    explanation: "Heterogeneity means the system mixes different hardware, software and networks.",
  },
  {
    id: "q7",
    question: "A city adds 10,000 new street lights and the system keeps working well. This is…",
    options: ["Interoperability", "Scalability", "Self-adaptation", "Intelligence"],
    answer: 1,
    explanation: "Scalability is the ability to keep working well as the system grows.",
  },
  {
    id: "q8",
    question: "Which challenge comes from IoT devices having limited energy and resources?",
    options: [
      "Too many IP addresses",
      "Little room for strong security and complex software",
      "Devices are too fast",
      "Data is too small to analyse",
    ],
    answer: 1,
    explanation: "Small batteries, memory and processors leave little room for heavy software such as strong encryption.",
  },
  {
    id: "q9",
    question: "A farm's rain gauge also feeds a flood-warning service. Which characteristic is this?",
    options: [
      "Integrated into the information network",
      "Self-configuring",
      "Limited energy",
      "Unique identity",
    ],
    answer: 0,
    explanation: "Its data is shared with other systems through the internet, so it is integrated into the information network.",
  },
];

export default quiz;
