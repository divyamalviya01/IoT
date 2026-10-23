import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "What are the four parts of the Quadruple Trust Model?",
    options: [
      "Protection, security, privacy and safety",
      "Confidentiality, integrity, availability and privacy",
      "Devices, network, cloud and apps",
      "Spoofing, tampering, repudiation and denial",
    ],
    answer: 0,
    explanation: "IEEE 2413 names quadruple trust as protection, security, privacy and safety.",
  },
  {
    id: "q2",
    question: "Which standard named the 'quadruple trust' goal for IoT architectures?",
    options: ["IEEE 802.15.4", "IEEE 2413 (P2413)", "RFC 7252", "ISO 9001"],
    answer: 1,
    explanation: "The IEEE P2413 working group, now the IEEE 2413 standard, named it.",
  },
  {
    id: "q3",
    question: "What was IoT-A?",
    options: ["A wireless protocol", "A European research project that produced an IoT Architectural Reference Model", "An encryption algorithm", "A cloud company"],
    answer: 1,
    explanation: "IoT-A (2010–2013) produced a common reference model for IoT systems.",
  },
  {
    id: "q4",
    question: "A robot arm stops instantly when a worker steps into its area. Which pillar is this mainly?",
    options: ["Privacy", "Security", "Safety", "Protection"],
    answer: 2,
    explanation: "It is designed so the system cannot hurt a person: safety.",
  },
  {
    id: "q5",
    question: "A fitness company sells heart-rate data to an insurer without asking users. Which pillar is broken?",
    options: ["Safety", "Privacy", "Protection", "Availability"],
    answer: 1,
    explanation: "Nobody broke in; personal data was used in a way users did not agree to.",
  },
  {
    id: "q6",
    question: "A storm surge destroys a hub; a surge protector and backups would have saved it. Which pillar is this?",
    options: ["Protection", "Security", "Privacy", "Safety"],
    answer: 0,
    explanation: "Protection covers damage and faults that are not deliberate attacks.",
  },
  {
    id: "q7",
    question: "A device installs firmware only if it carries the maker's signature. Which pillar does this serve?",
    options: ["Privacy", "Safety", "Security", "Protection"],
    answer: 2,
    explanation: "It stops attackers installing their own code: security.",
  },
  {
    id: "q8",
    question: "A smart lock opens when its battery dies so nobody is trapped in a fire. Which two pillars pull against each other?",
    options: ["Privacy and protection", "Safety and security", "Protection and privacy", "Security and privacy"],
    answer: 1,
    explanation: "It is safer for people but less secure against intruders.",
  },
  {
    id: "q9",
    question: "Keeping detailed logs of who used a device helps security but can conflict with…",
    options: ["Safety", "Privacy", "Protection", "Availability"],
    answer: 1,
    explanation: "Logs about people are personal data, so they must be limited and protected.",
  },
  {
    id: "q10",
    question: "Why must IoT devices also trust each other?",
    options: [
      "So that they use less power",
      "So a gateway accepts data only from authenticated devices and can ignore a misbehaving one",
      "So they can share passwords",
      "Devices never need to trust each other",
    ],
    answer: 1,
    explanation: "Device authentication and reputation stop fake or faulty devices from feeding bad data.",
  },
];

export default quiz;
