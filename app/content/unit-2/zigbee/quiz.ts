import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Which radio standard is Zigbee built on?",
    options: ["IEEE 802.11", "IEEE 802.15.1", "IEEE 802.15.4", "IEEE 802.3"],
    answer: 2,
    explanation: "Zigbee uses the IEEE 802.15.4 physical and MAC layers and adds its own network and application layers.",
  },
  {
    id: "q2",
    question: "What is Zigbee's data rate at 2.4 GHz?",
    options: ["1 Mbps", "250 kbps", "54 Mbps", "5 kbps"],
    answer: 1,
    explanation: "802.15.4 at 2.4 GHz gives 250 kbps, enough for commands and sensor readings.",
  },
  {
    id: "q3",
    question: "How many coordinators does a Zigbee network have?",
    options: ["None", "Exactly one", "One per room", "One per end device"],
    answer: 1,
    explanation: "Exactly one coordinator starts the network, chooses its channel and lets devices join.",
  },
  {
    id: "q4",
    question: "Which Zigbee devices pass messages on for others?",
    options: ["Only end devices", "Coordinator and routers", "Only the coordinator", "Every device, including sleeping sensors"],
    answer: 1,
    explanation: "The coordinator and routers are mains-powered and relay. End devices sleep and never relay.",
  },
  {
    id: "q5",
    question: "Why can a Zigbee door sensor run for years on a coin cell?",
    options: [
      "It uses Wi-Fi",
      "As an end device it sleeps most of the time and never relays for others",
      "It has no radio",
      "It sends video only at night",
    ],
    answer: 1,
    explanation: "End devices wake briefly to send, then sleep; their parent router holds messages for them meanwhile.",
  },
  {
    id: "q6",
    question: "What does self-healing mean in a Zigbee mesh?",
    options: [
      "Devices repair their own batteries",
      "When a router fails, messages find another route and end devices re-join another parent",
      "The network deletes broken devices",
      "Encryption keys change every second",
    ],
    answer: 1,
    explanation: "The mesh re-forms routes around a failed router, so messages still arrive.",
  },
  {
    id: "q7",
    question: "If the coordinator fails, what stops first?",
    options: [
      "All radio signals",
      "New devices joining the network",
      "Battery charging",
      "Every route, immediately",
    ],
    answer: 1,
    explanation: "Routers keep using existing routes, but only the coordinator (trust centre) can let new devices join.",
  },
  {
    id: "q8",
    question: "What did the Zigbee Alliance rename itself in 2021?",
    options: ["Bluetooth SIG", "Wi-Fi Alliance", "Connectivity Standards Alliance (CSA)", "LoRa Alliance"],
    answer: 2,
    explanation: "It became the CSA, which also created the Matter standard.",
  },
  {
    id: "q9",
    question: "Which networks does Matter run over?",
    options: ["Zigbee only", "Wi-Fi, Thread and Ethernet", "LoRaWAN and Sigfox", "Bluetooth Classic only"],
    answer: 1,
    explanation: "Matter runs over IP networks: Wi-Fi, Thread and Ethernet. Zigbee devices join through a bridge.",
  },
  {
    id: "q10",
    question: "Which is a limitation of Zigbee?",
    options: ["It cannot form a mesh", "Its low data rate is unsuitable for video", "It uses too much power for sensors", "It has no security"],
    answer: 1,
    explanation: "250 kbps suits commands and readings, not audio or video streams.",
  },
];

export default quiz;
