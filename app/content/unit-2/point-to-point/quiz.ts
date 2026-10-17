import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "What is a point-to-point link?",
    options: [
      "A link that sends one message to every device",
      "A direct link between exactly two devices",
      "A link that passes messages hop by hop",
      "A link shared by many devices on one cable",
    ],
    answer: 1,
    explanation: "Point-to-point joins exactly two devices, with nothing else sharing the link.",
  },
  {
    id: "q2",
    question: "A walkie-talkie lets both people talk, but only one at a time. This is:",
    options: ["Simplex", "Half duplex", "Full duplex", "Broadcast"],
    answer: 1,
    explanation: "Half duplex carries data both ways, but in one direction at a time.",
  },
  {
    id: "q3",
    question: "Which topology has a single point of failure at its centre?",
    options: ["Mesh", "Ring", "Star", "Full mesh"],
    answer: 2,
    explanation: "Every device in a star depends on the hub. If the hub fails, everyone is cut off.",
  },
  {
    id: "q4",
    question: "Why do Zigbee smart homes use a mesh topology?",
    options: [
      "It needs the fewest links",
      "Messages can take another route when a device fails, and range grows hop by hop",
      "It needs no routing at all",
      "It is the only topology that works wirelessly",
    ],
    answer: 1,
    explanation: "Mesh devices relay for each other, so there are other routes after a failure and messages can travel beyond one radio's range.",
  },
  {
    id: "q5",
    question: "In a bus topology, what happens if the shared cable breaks in the middle?",
    options: [
      "Nothing, devices use another route",
      "Only the device next to the break stops",
      "The network splits into two parts that cannot reach each other",
      "The bus becomes a ring",
    ],
    answer: 2,
    explanation: "A bus has only one cable, so a break splits it. Devices on the far side lose the gateway.",
  },
  {
    id: "q6",
    question: "What is the correct order of a UART frame?",
    options: [
      "Stop bit, data bits, start bit",
      "Start bit, data bits (highest bit first), stop bit",
      "Start bit, data bits (lowest bit first), optional parity bit, stop bit",
      "Parity bit, start bit, data bits, stop bit",
    ],
    answer: 2,
    explanation: "UART sends a start bit (0), eight data bits lowest first, an optional parity bit and a stop bit (1).",
  },
  {
    id: "q7",
    question: "At 9600 baud with 8 data bits, no parity and 1 stop bit, about how many characters can a UART send each second?",
    options: ["9600", "1200", "960", "96"],
    answer: 2,
    explanation: "Each character costs 10 bits (start + 8 data + stop), so 9600 ÷ 10 = 960 characters per second.",
  },
  {
    id: "q8",
    question: "Which wired link uses two wires, gives every chip an address and connects many sensors on one board?",
    options: ["UART", "I²C", "SPI", "Ethernet"],
    answer: 1,
    explanation: "I²C uses a data wire and a clock wire, and each chip on the bus has its own address.",
  },
  {
    id: "q9",
    question: "Why is RS-485 used for Modbus machines in factories?",
    options: [
      "It is the fastest link on a circuit board",
      "It sends signals as the difference between two wires, so it resists noise over long cables",
      "It needs no wires",
      "It works only between two devices",
    ],
    answer: 1,
    explanation: "RS-485's differential signal cancels electrical noise, so it works reliably over about 1200 m.",
  },
  {
    id: "q10",
    question: "Which technology lets two Wi-Fi devices connect directly without a router?",
    options: ["Wi-Fi Direct", "NFC", "Zigbee", "LoRa"],
    answer: 0,
    explanation: "Wi-Fi Direct creates a direct link between two Wi-Fi devices, such as a phone and a printer.",
  },
];

export default quiz;
