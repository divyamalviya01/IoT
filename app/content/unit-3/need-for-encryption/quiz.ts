import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Why can IoT radio messages be captured so easily?",
    options: ["They are always printed on paper", "Radio signals reach anyone within range with a receiver", "They only travel through fibre", "They are stored on the device forever"],
    answer: 1,
    explanation: "Wi-Fi, BLE and LoRa are radio: anyone nearby can record the signal.",
  },
  {
    id: "q2",
    question: "An attacker records a valid \"open gate\" command and sends it again at night. What is this?",
    options: ["Eavesdropping", "Replay attack", "Phishing", "Jamming"],
    answer: 1,
    explanation: "A replay attack resends a captured message. Sequence numbers or timestamps stop it.",
  },
  {
    id: "q3",
    question: "What does plain MQTT on port 1883 reveal to someone sniffing the Wi-Fi?",
    options: ["Nothing", "Only the device's IP address", "Usernames, passwords, topics and message contents", "Only the message length"],
    answer: 2,
    explanation: "Plain MQTT sends everything as readable bytes, including the CONNECT password.",
  },
  {
    id: "q4",
    question: "Which property does an authentication tag (as in AES-GCM) add to encryption?",
    options: ["Faster speed", "Integrity: any change to the message is detected", "Smaller messages", "Anonymity"],
    answer: 1,
    explanation: "If even one bit changes, the tag check fails and the message is rejected.",
  },
  {
    id: "q5",
    question: "Encrypting data stored on a device's flash memory is called encryption…",
    options: ["in transit", "at rest", "in the middle", "on air"],
    answer: 1,
    explanation: "At rest means stored data; in transit means data moving over a network.",
  },
  {
    id: "q6",
    question: "Which of these can an eavesdropper STILL learn when traffic is encrypted with TLS?",
    options: ["The password", "The MQTT topic", "Who talks to whom, when and how much (metadata)", "The temperature value"],
    answer: 2,
    explanation: "Encryption hides contents, not the fact that devices are communicating.",
  },
  {
    id: "q7",
    question: "Which Indian law requires 'reasonable security safeguards' for personal data?",
    options: ["IT Act 2000 only", "Digital Personal Data Protection Act, 2023", "Telegraph Act 1885", "Consumer Protection Act 1986"],
    answer: 1,
    explanation: "The DPDP Act 2023, with Rules notified in November 2025, requires safeguards and breach reporting.",
  },
  {
    id: "q8",
    question: "A device accepts any server certificate without checking it. What can happen?",
    options: ["Nothing; it is still safe", "A man-in-the-middle can pretend to be the server and read the traffic", "The device runs faster", "The battery lasts longer"],
    answer: 1,
    explanation: "Encryption only helps if you are sure who you are talking to; certificate checks provide that.",
  },
  {
    id: "q9",
    question: "Which protocol secures CoAP, which runs over UDP?",
    options: ["TLS over TCP", "DTLS", "FTP", "SNMP"],
    answer: 1,
    explanation: "DTLS is TLS adapted to datagrams (UDP).",
  },
  {
    id: "q10",
    question: "Why is encryption harder on small IoT devices?",
    options: [
      "They cannot store any data",
      "They have little CPU, memory and battery, and each needs its own keys",
      "Encryption is illegal for devices",
      "Radios cannot carry ciphertext",
    ],
    answer: 1,
    explanation: "Limited hardware and key distribution are the main challenges; lightweight cryptography helps.",
  },
];

export default quiz;
