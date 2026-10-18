import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Which IEEE standard family is Wi-Fi?",
    options: ["802.3", "802.11", "802.15.1", "802.15.4"],
    answer: 1,
    explanation: "Wi-Fi is the brand name for IEEE 802.11 wireless LANs.",
  },
  {
    id: "q2",
    question: "Which channels in the 2.4 GHz band do not overlap?",
    options: ["1, 2 and 3", "1, 6 and 11", "2, 4 and 6", "5, 10 and 13"],
    answer: 1,
    explanation: "Channels are 5 MHz apart but about 20–22 MHz wide, so only 1, 6 and 11 are far enough apart.",
  },
  {
    id: "q3",
    question: "Two access points sit side by side. Which is worse: both on channel 1, or one on 1 and one on 3?",
    options: [
      "Both on channel 1 is worse",
      "Channels 1 and 3 is worse, because partly overlapping signals corrupt each other",
      "They are exactly the same",
      "Neither causes any problem",
    ],
    answer: 1,
    explanation: "On the same channel they hear each other and take turns. On overlapping channels they cannot decode each other, so they clash.",
  },
  {
    id: "q4",
    question: "Which Wi-Fi generation works only in the 5 GHz band?",
    options: ["802.11b", "802.11g", "802.11ac (Wi-Fi 5)", "802.11n (Wi-Fi 4)"],
    answer: 2,
    explanation: "802.11ac is 5 GHz only; 802.11n and 802.11ax use both 2.4 and 5 GHz.",
  },
  {
    id: "q5",
    question: "What is Wi-Fi HaLow (802.11ah)?",
    options: [
      "Wi-Fi at 60 GHz for virtual reality",
      "Wi-Fi below 1 GHz for IoT, reaching about 1 km at low power",
      "A security protocol",
      "A Bluetooth profile",
    ],
    answer: 1,
    explanation: "HaLow uses sub-GHz frequencies for longer range and lower power, aimed at IoT.",
  },
  {
    id: "q6",
    question: "How does Target Wake Time (Wi-Fi 6) help IoT devices?",
    options: [
      "It makes the radio faster",
      "The device agrees when it will next wake, so it can sleep in between",
      "It switches the device to Bluetooth",
      "It removes encryption",
    ],
    answer: 1,
    explanation: "TWT schedules wake-ups, letting battery devices sleep much more.",
  },
  {
    id: "q7",
    question: "In infrastructure mode, devices connect:",
    options: ["Directly to each other", "Through an access point", "Through a Zigbee coordinator", "Over NFC"],
    answer: 1,
    explanation: "Infrastructure mode uses an access point; ad-hoc and Wi-Fi Direct connect devices directly.",
  },
  {
    id: "q8",
    question: "Why are most Wi-Fi IoT devices plugged into the mains?",
    options: [
      "Wi-Fi radios use a lot of power to join and stay connected",
      "Wi-Fi does not work on batteries",
      "The law requires it",
      "Batteries block the signal",
    ],
    answer: 0,
    explanation: "Wi-Fi was built for speed, so it uses far more energy than BLE or Zigbee.",
  },
  {
    id: "q9",
    question: "Which is a big advantage of Wi-Fi for IoT?",
    options: ["Kilometres of range", "Direct IP connections and high data rates", "No power use", "Works without any access point always"],
    answer: 1,
    explanation: "Wi-Fi devices get IP addresses and can stream video or download firmware quickly.",
  },
  {
    id: "q10",
    question: "Which security standard should a modern Wi-Fi network use?",
    options: ["WEP", "No password", "WPA2 or WPA3", "MAC filtering only"],
    answer: 2,
    explanation: "WPA2, or better WPA3, encrypts Wi-Fi traffic. WEP is broken.",
  },
];

export default quiz;
