import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "How long is the UDP header?",
    options: ["4 bytes", "8 bytes", "20 bytes", "40 bytes"],
    answer: 1,
    explanation: "The UDP header has four 2-byte fields: source port, destination port, length and checksum.",
  },
  {
    id: "q2",
    question: "Which field is NOT part of the UDP header?",
    options: ["Source port", "Length", "Sequence number", "Checksum"],
    answer: 2,
    explanation: "Sequence numbers belong to TCP, which numbers every byte. UDP does not.",
  },
  {
    id: "q3",
    question: "What is the correct order of the TCP three-way handshake?",
    options: ["ACK, SYN, SYN-ACK", "SYN, SYN-ACK, ACK", "SYN, ACK, FIN", "SYN-ACK, SYN, ACK"],
    answer: 1,
    explanation: "The client sends SYN, the server replies SYN-ACK, and the client confirms with ACK.",
  },
  {
    id: "q4",
    question: "What happens to a lost UDP datagram?",
    options: [
      "UDP resends it automatically",
      "It stays lost unless the application resends it",
      "The receiver asks for it again",
      "It is delivered later through TCP",
    ],
    answer: 1,
    explanation: "UDP gives no delivery guarantee; any reliability must be added by the application.",
  },
  {
    id: "q5",
    question: "Which IoT protocol runs over UDP?",
    options: ["MQTT", "HTTP", "CoAP", "XMPP"],
    answer: 2,
    explanation: "CoAP uses UDP. MQTT, HTTP and XMPP use TCP.",
  },
  {
    id: "q6",
    question: "Why might a battery-powered sensor prefer UDP?",
    options: [
      "UDP encrypts data",
      "UDP skips the handshake and acknowledgements, saving energy",
      "UDP guarantees delivery",
      "UDP has a larger header",
    ],
    answer: 1,
    explanation: "Fewer messages and smaller headers mean less radio time and longer battery life.",
  },
  {
    id: "q7",
    question: "When should an IoT system use TCP instead of UDP?",
    options: [
      "For a temperature reading sent every 5 seconds",
      "For a firmware update that must arrive complete",
      "For live video",
      "For a broadcast to all devices",
    ],
    answer: 1,
    explanation: "A firmware update must arrive complete and in order, which TCP guarantees.",
  },
  {
    id: "q8",
    question: "What does a port number identify?",
    options: [
      "The device's location",
      "The program on the device that should receive the data",
      "The size of the packet",
      "The radio channel",
    ],
    answer: 1,
    explanation: "Ports identify programs, for example 5683 for CoAP and 1883 for MQTT.",
  },
  {
    id: "q9",
    question: "Which feature does TCP have that UDP lacks?",
    options: ["Port numbers", "Checksum", "Congestion control", "A header"],
    answer: 2,
    explanation: "Both use ports and checksums, but only TCP has flow and congestion control.",
  },
];

export default quiz;
