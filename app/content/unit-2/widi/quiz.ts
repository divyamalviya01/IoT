import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "What does WiDi stand for?",
    options: ["Wide Digital Interface", "Wireless Display (Intel)", "Wi-Fi Direct Internet", "Wireless Data Interchange"],
    answer: 1,
    explanation: "WiDi is Intel Wireless Display, for showing a laptop screen on a TV without cables.",
  },
  {
    id: "q2",
    question: "How did WiDi send the screen to the TV?",
    options: [
      "Over Bluetooth",
      "Over a direct Wi-Fi link between the laptop and the receiver",
      "Over the mobile network",
      "Over an infrared beam",
    ],
    answer: 1,
    explanation: "The laptop and receiver linked directly over Wi-Fi, peer to peer, without the home router.",
  },
  {
    id: "q3",
    question: "What hardware did a laptop need for WiDi?",
    options: ["An Intel processor and Intel Wi-Fi", "Any Bluetooth chip", "An NFC tag", "A LoRa radio"],
    answer: 0,
    explanation: "WiDi was Intel-only, which limited where it could be used.",
  },
  {
    id: "q4",
    question: "Which open standard replaced WiDi?",
    options: ["Zigbee", "Miracast", "LoRaWAN", "MQTT"],
    answer: 1,
    explanation: "Miracast, certified by the Wi-Fi Alliance in 2012, does the same job on many brands.",
  },
  {
    id: "q5",
    question: "Miracast is built on which Wi-Fi feature?",
    options: ["Wi-Fi Direct", "Wi-Fi HaLow", "WPA3", "Target Wake Time"],
    answer: 0,
    explanation: "Miracast uses Wi-Fi Direct, so no router is needed.",
  },
  {
    id: "q6",
    question: "About when did Intel discontinue WiDi?",
    options: ["2005", "2016", "2023", "It is still sold"],
    answer: 1,
    explanation: "Intel ended WiDi around 2016 as Miracast became built into Windows and TVs.",
  },
  {
    id: "q7",
    question: "How does Google Cast differ from screen mirroring?",
    options: [
      "It mirrors the screen at higher quality",
      "The TV fetches the video from the internet itself, and the phone acts as a remote",
      "It uses NFC",
      "It needs a cable",
    ],
    answer: 1,
    explanation: "With Cast, the phone tells the TV what to play; the TV streams it directly.",
  },
  {
    id: "q8",
    question: "Why does wireless screen mirroring add a small delay?",
    options: [
      "Radio waves are slow",
      "The screen must be compressed into a video stream and decoded again",
      "TVs are always slow",
      "It sends one pixel at a time",
    ],
    answer: 1,
    explanation: "Compression and decoding take a little time, which is noticeable in fast games.",
  },
];

export default quiz;
