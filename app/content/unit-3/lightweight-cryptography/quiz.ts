import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Why is lightweight cryptography needed for many IoT devices?",
    options: [
      "Standard algorithms are illegal for devices",
      "Devices have little memory, slow processors and small batteries",
      "Lightweight ciphers are always stronger",
      "IoT data does not need protection",
    ],
    answer: 1,
    explanation: "Constrained hardware may not run standard algorithms efficiently.",
  },
  {
    id: "q2",
    question: "Which algorithm did NIST standardise for lightweight cryptography in SP 800-232 (2025)?",
    options: ["PRESENT", "SPECK", "Ascon", "DES"],
    answer: 2,
    explanation: "Ascon won the NIST competition in 2023 and became SP 800-232 in August 2025.",
  },
  {
    id: "q3",
    question: "What block size does PRESENT use?",
    options: ["32 bits", "64 bits", "128 bits", "256 bits"],
    answer: 1,
    explanation: "PRESENT is a 64-bit block cipher with an 80- or 128-bit key.",
  },
  {
    id: "q4",
    question: "Who published SIMON and SPECK?",
    options: ["NIST", "The US National Security Agency (NSA)", "ISO", "Google"],
    answer: 1,
    explanation: "The NSA published them in 2013; ISO declined to standardise them in 2018.",
  },
  {
    id: "q5",
    question: "Why might a Raspberry Pi 4 use ChaCha20 instead of AES?",
    options: ["AES is broken", "Its CPU has no AES instructions, and ChaCha20 is fast in plain software", "ChaCha20 uses no key", "ChaCha20 is a hash"],
    answer: 1,
    explanation: "Without AES hardware, ChaCha20 is usually faster in software.",
  },
  {
    id: "q6",
    question: "Which ECC key size gives about the same security as a 3072-bit RSA key?",
    options: ["128 bits", "160 bits", "256 bits", "1024 bits"],
    answer: 2,
    explanation: "NIST SP 800-57: 128-bit strength = RSA 3072 = ECC 256.",
  },
  {
    id: "q7",
    question: "What does AEAD mean?",
    options: [
      "Advanced Encryption with Asymmetric Data",
      "Authenticated encryption: it encrypts and adds an integrity tag",
      "A type of hash",
      "Automatic Encryption After Download",
    ],
    answer: 1,
    explanation: "AEAD schemes such as Ascon, AES-GCM and ChaCha20-Poly1305 protect both secrecy and integrity.",
  },
  {
    id: "q8",
    question: "On an ESP32 with an AES hardware engine, which is usually fastest?",
    options: ["AES-GCM", "PRESENT in software", "RSA-2048", "SHA-1"],
    answer: 0,
    explanation: "Hardware AES makes AES-GCM very fast on such chips.",
  },
  {
    id: "q9",
    question: "For a battery sensor sending a short message by LoRa, which uses more energy?",
    options: ["Encrypting the message", "Sending the message by radio", "They are always equal", "Neither uses energy"],
    answer: 1,
    explanation: "Radio transmission costs far more energy than encrypting a few bytes.",
  },
  {
    id: "q10",
    question: "Which is good advice when choosing a cipher for an IoT device?",
    options: ["Invent your own cipher", "Use a standard authenticated cipher and ECC for keys", "Use RSA for all data", "Skip encryption to save battery"],
    answer: 1,
    explanation: "Standard, tested AEAD ciphers plus ECC are the safe and efficient choice.",
  },
];

export default quiz;
