import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Who writes the Bluetooth specifications today?",
    options: ["IEEE", "The Bluetooth SIG", "The Wi-Fi Alliance", "The CSA"],
    answer: 1,
    explanation: "The Bluetooth Special Interest Group owns the Core Specification, profiles and assigned numbers.",
  },
  {
    id: "q2",
    question: "How many active peripherals can a Bluetooth Classic piconet have?",
    options: ["1", "3", "7", "255"],
    answer: 2,
    explanation: "A piconet has one central and up to seven active peripherals.",
  },
  {
    id: "q3",
    question: "How often does Bluetooth Classic hop between channels?",
    options: ["Once a second", "16 times a second", "1600 times a second", "It never hops"],
    answer: 2,
    explanation: "Classic hops 1600 times a second across 79 channels, which makes interference less harmful.",
  },
  {
    id: "q4",
    question: "Which channels does BLE use for advertising?",
    options: ["1, 6 and 11", "37, 38 and 39", "0, 12 and 39", "All 40 channels"],
    answer: 1,
    explanation: "Channels 37, 38 and 39 (2402, 2426 and 2480 MHz) are BLE's advertising channels.",
  },
  {
    id: "q5",
    question: "In GATT, what is a characteristic?",
    options: [
      "A group of services",
      "One value inside a service, with properties such as read or notify",
      "The radio channel",
      "A security key",
    ],
    answer: 1,
    explanation: "Services contain characteristics; each characteristic holds one value, like Heart Rate Measurement.",
  },
  {
    id: "q6",
    question: "How does a phone turn on notifications for a BLE characteristic?",
    options: ["It reads the value every second", "It writes 01 00 to the characteristic's CCCD", "It re-pairs the device", "It switches to Classic"],
    answer: 1,
    explanation: "Writing 01 00 to the Client Characteristic Configuration Descriptor (0x2902) enables notifications.",
  },
  {
    id: "q7",
    question: "What does a BLE beacon do?",
    options: [
      "Streams audio",
      "Only advertises a short ID so nearby phones know where they are",
      "Routes Zigbee messages",
      "Charges phones wirelessly",
    ],
    answer: 1,
    explanation: "Beacons such as iBeacon and Eddystone broadcast an ID and do not accept connections.",
  },
  {
    id: "q8",
    question: "Which is the best choice for wireless earbuds streaming music?",
    options: ["BLE advertising", "Bluetooth Classic (or LE Audio)", "Zigbee", "NFC"],
    answer: 1,
    explanation: "Audio needs a continuous stream; Classic (or the newer LE Audio) handles it.",
  },
  {
    id: "q9",
    question: "How does Bluetooth Mesh deliver messages?",
    options: ["Fixed routing tables", "Managed flooding through relay nodes", "Through Wi-Fi access points", "Only point-to-point"],
    answer: 1,
    explanation: "Relays rebroadcast messages until their hop limit runs out.",
  },
  {
    id: "q10",
    question: "Why are BLE distance estimates from RSSI only rough?",
    options: [
      "RSSI is always zero",
      "Walls, bodies and reflections change the signal strength",
      "BLE has no signal strength",
      "Phones round distances to kilometres",
    ],
    answer: 1,
    explanation: "Signal strength depends on the surroundings, so the same distance can give very different RSSI values.",
  },
];

export default quiz;
