import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "Why does IoT need encryption?",
    a: "Because IoT messages travel over radio and shared networks where anyone can capture them. Without encryption, passwords, readings and commands can be read, changed or replayed.",
  },
  {
    q: "Differentiate plaintext and ciphertext.",
    a: "Plaintext is readable data. Ciphertext is the scrambled form produced by encryption with a key; without the key it is meaningless.",
  },
  {
    q: "What is a man-in-the-middle attack?",
    a: "An attacker secretly sits between two parties, reading and possibly changing their messages while each thinks it is talking directly to the other.",
  },
  {
    q: "What is a replay attack and how is it prevented?",
    a: "Recording a valid message and sending it again later. Sequence numbers, timestamps or one-time values make old messages fail.",
  },
  {
    q: "Differentiate encryption in transit and at rest.",
    a: "In transit protects data while it moves over a network, for example with TLS. At rest protects stored data on a device, phone or server, for example with encrypted storage.",
  },
  {
    q: "What does encryption not protect?",
    a: "Metadata such as who talks to whom and when, data on a device the attacker already controls, and systems using weak or shared keys or skipping certificate checks.",
  },
  {
    q: "How does India's DPDP Act relate to IoT security?",
    a: "The Digital Personal Data Protection Act, 2023 requires consent and reasonable security safeguards for personal data, with breach reporting and heavy penalties, so IoT companies must protect the personal data their devices collect.",
  },
];

export default viva;
