import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "What do the letters CIA stand for in security?",
    options: ["Control, Identity, Access", "Confidentiality, Integrity, Availability", "Cloud, Internet, Application", "Certificate, Identity, Authority"],
    answer: 1,
    explanation: "The CIA triad: data stays secret, unchanged and available.",
  },
  {
    id: "q2",
    question: "A \"lock\" command is changed to \"unlock\" on its way to a smart lock. Which goal is broken?",
    options: ["Confidentiality", "Integrity", "Availability", "Privacy"],
    answer: 1,
    explanation: "Integrity means data cannot be changed without it being noticed.",
  },
  {
    id: "q3",
    question: "What is the difference between authentication and authorisation?",
    options: [
      "They are the same",
      "Authentication proves who you are; authorisation decides what you may do",
      "Authorisation proves who you are; authentication decides what you may do",
      "Authentication is only for devices",
    ],
    answer: 1,
    explanation: "First you prove your identity, then the system checks your permissions.",
  },
  {
    id: "q4",
    question: "How did the Mirai botnet (2016) take over so many IoT devices?",
    options: ["By breaking AES encryption", "By logging in with factory default passwords over Telnet", "By stealing phones", "Through a satellite link"],
    answer: 1,
    explanation: "Mirai tried a list of common default usernames and passwords on open Telnet ports.",
  },
  {
    id: "q5",
    question: "Which incident first showed that malware could physically damage industrial equipment?",
    options: ["Mirai", "Stuxnet", "The Jeep hack", "WannaCry"],
    answer: 1,
    explanation: "Stuxnet, discovered in 2010, changed PLC programs and damaged centrifuges.",
  },
  {
    id: "q6",
    question: "Replaying a recorded \"unlock\" radio command later is an attack at which layer?",
    options: ["Perception", "Network", "Application", "Business"],
    answer: 1,
    explanation: "Replay, eavesdropping and man-in-the-middle are network-layer attacks.",
  },
  {
    id: "q7",
    question: "Which is item I1 of the OWASP IoT Top 10 (2018)?",
    options: ["Lack of physical hardening", "Weak, guessable or hardcoded passwords", "Insecure default settings", "Insufficient privacy protection"],
    answer: 1,
    explanation: "Weak, guessable or hardcoded passwords top the list.",
  },
  {
    id: "q8",
    question: "A device ships with UPnP switched on, opening ports by itself. Which OWASP IoT item is this?",
    options: ["I2 Insecure network services", "I9 Insecure default settings", "I6 Insufficient privacy protection", "I10 Lack of physical hardening"],
    answer: 1,
    explanation: "Unsafe out-of-the-box settings are 'insecure default settings'.",
  },
  {
    id: "q9",
    question: "What is India's TEC 31318:2021?",
    options: ["A data protection law", "A Code of Practice for Securing Consumer IoT", "An encryption algorithm", "A Wi-Fi standard"],
    answer: 1,
    explanation: "The Telecommunication Engineering Centre's 2021 code sets baseline security for consumer IoT devices.",
  },
  {
    id: "q10",
    question: "Which principle gives each user and device only the access it needs?",
    options: ["Defence in depth", "Least privilege", "Security through obscurity", "Availability"],
    answer: 1,
    explanation: "Least privilege limits the damage if one account or device is taken over.",
  },
];

export default quiz;
