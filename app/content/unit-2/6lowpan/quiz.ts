import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "What does 6LoWPAN stand for?",
    options: [
      "IPv6 over Low-power Wireless Personal Area Networks",
      "Six Low-power Wide Area Protocols",
      "IPv6 over Long-range Wide Area Networks",
      "Sixth-generation Low-power WAN",
    ],
    answer: 0,
    explanation: "6LoWPAN carries IPv6 over low-power personal-area radios such as IEEE 802.15.4.",
  },
  {
    id: "q2",
    question: "What is the largest IEEE 802.15.4 frame?",
    options: ["64 bytes", "127 bytes", "1280 bytes", "1500 bytes"],
    answer: 1,
    explanation: "An 802.15.4 frame carries at most 127 bytes, including its own header and error check.",
  },
  {
    id: "q3",
    question: "How big are the IPv6 and UDP headers together before compression?",
    options: ["8 bytes", "20 bytes", "40 bytes", "48 bytes"],
    answer: 3,
    explanation: "IPv6 is 40 bytes and UDP is 8, so 48 bytes in total.",
  },
  {
    id: "q4",
    question: "In the best case, IPHC compresses the IPv6 and UDP headers to about:",
    options: ["6 bytes", "24 bytes", "40 bytes", "100 bytes"],
    answer: 0,
    explanation: "IPHC (2) + UDP next-header (1) + compressed ports (1) + checksum (2) = 6 bytes.",
  },
  {
    id: "q5",
    question: "Why can the IPv6 addresses often be left out of a 6LoWPAN header?",
    options: [
      "IoT devices do not need addresses",
      "They can be built from the radio's MAC addresses, which are already in the frame",
      "They are encrypted",
      "The gateway guesses them",
    ],
    answer: 1,
    explanation: "Link-local IPv6 addresses can be derived from the 802.15.4 MAC addresses, so they need not be sent again.",
  },
  {
    id: "q6",
    question: "What happens when a packet is too big for one frame?",
    options: ["It is dropped", "It is split into fragments that the receiver reassembles", "It is sent over Wi-Fi", "The radio sends it faster"],
    answer: 1,
    explanation: "6LoWPAN fragments the packet and the receiver puts the pieces back together.",
  },
  {
    id: "q7",
    question: "Why is losing one fragment costly?",
    options: [
      "It damages the radio",
      "The whole packet must be sent again",
      "It changes the IPv6 address",
      "It slows the network down for ever",
    ],
    answer: 1,
    explanation: "Without every fragment the receiver cannot rebuild the packet, so all of it must be resent.",
  },
  {
    id: "q8",
    question: "In route-over forwarding, which protocol finds the routes?",
    options: ["RPL", "HTTP", "MQTT", "DNS"],
    answer: 0,
    explanation: "Route-over forwards at the IP layer, and RPL builds the routes.",
  },
  {
    id: "q9",
    question: "What does a 6LoWPAN border router do?",
    options: [
      "Charges the sensors' batteries",
      "Connects the 6LoWPAN network to IP networks such as Wi-Fi or Ethernet",
      "Encrypts every fragment",
      "Replaces the coordinator",
    ],
    answer: 1,
    explanation: "The border (edge) router links the low-power mesh to the internet, compressing and expanding headers.",
  },
  {
    id: "q10",
    question: "Which smart-home network is built on IEEE 802.15.4 and 6LoWPAN?",
    options: ["Thread", "Bluetooth Classic", "Wi-Fi 6", "Sigfox"],
    answer: 0,
    explanation: "Thread uses 6LoWPAN over 802.15.4 so that every device has an IPv6 address; Matter can run over it.",
  },
];

export default quiz;
