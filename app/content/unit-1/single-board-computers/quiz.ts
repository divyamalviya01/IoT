import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Which of these runs a full operating system such as Linux?",
    options: ["Arduino Uno", "ESP8266", "Raspberry Pi", "ATmega328P"],
    answer: 2,
    explanation: "The Raspberry Pi is a single-board computer and runs an operating system. The others run a single program.",
  },
  {
    id: "q2",
    question: "Which microcontroller is on the Arduino Uno R3?",
    options: ["ESP32", "ATmega328P", "BCM2711", "Cortex-A8"],
    answer: 1,
    explanation: "The Uno R3 uses the 8-bit ATmega328P running at 16 MHz.",
  },
  {
    id: "q3",
    question: "How much RAM does the ATmega328P have?",
    options: ["2 KB", "32 KB", "512 KB", "2 GB"],
    answer: 0,
    explanation: "It has 2 KB of RAM and 32 KB of flash memory for the program.",
  },
  {
    id: "q4",
    question: "Which board has both Wi-Fi and Bluetooth built in?",
    options: ["Arduino Uno R3", "ESP8266", "ESP32", "BeagleBone Black"],
    answer: 2,
    explanation: "The ESP32 has Wi-Fi and Bluetooth/BLE. The ESP8266 has Wi-Fi only, and the Uno has no wireless.",
  },
  {
    id: "q5",
    question: "Which Arduino Uno pins can output PWM?",
    options: ["0, 1, 2, 4, 7, 8", "3, 5, 6, 9, 10, 11", "A0 to A5", "Only pin 13"],
    answer: 1,
    explanation: "Pins 3, 5, 6, 9, 10 and 11 support PWM; they are marked with a ~ on the board.",
  },
  {
    id: "q6",
    question: "At what voltage do Raspberry Pi GPIO pins work?",
    options: ["1.8 V", "3.3 V", "5 V", "12 V"],
    answer: 1,
    explanation: "Raspberry Pi GPIO pins use 3.3 V logic. A 5 V signal can damage them.",
  },
  {
    id: "q7",
    question: "A project needs to read one sensor on battery power for months. The best choice is…",
    options: [
      "A Raspberry Pi running a web server",
      "A microcontroller board",
      "A Jetson Nano",
      "A desktop computer",
    ],
    answer: 1,
    explanation: "Microcontroller boards use milliwatts of power and start instantly, so they suit battery-powered sensing.",
  },
  {
    id: "q8",
    question: "What does open-source hardware mean?",
    options: [
      "The hardware is free of cost",
      "The design files are published so anyone can study, change, make and sell it",
      "The hardware has no case",
      "The hardware only runs open-source software",
    ],
    answer: 1,
    explanation: "Open hardware publishes schematics, board layouts and parts lists under an open licence.",
  },
  {
    id: "q9",
    question: "Which licence was written specifically for hardware?",
    options: ["GPL v3", "MIT", "CERN-OHL v2", "Apache 2.0"],
    answer: 2,
    explanation: "The CERN Open Hardware Licence is designed for hardware. Arduino uses Creative Commons CC BY-SA.",
  },
  {
    id: "q10",
    question: "Why is the Raspberry Pi not considered fully open hardware?",
    options: [
      "It cannot run Linux",
      "Its full board design and main chip are not published",
      "It has no GPIO pins",
      "It is too expensive",
    ],
    answer: 1,
    explanation: "Only some diagrams are published; the full design and the SoC are closed.",
  },
];

export default quiz;
