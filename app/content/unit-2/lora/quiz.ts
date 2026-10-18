import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "What is the difference between LoRa and LoRaWAN?",
    options: [
      "They are the same thing",
      "LoRa is the radio (physical layer); LoRaWAN is the network protocol on top",
      "LoRa is for cities; LoRaWAN is for farms",
      "LoRaWAN is the radio; LoRa is the app",
    ],
    answer: 1,
    explanation: "LoRa is Semtech's chirp modulation; LoRaWAN is the LoRa Alliance's network protocol.",
  },
  {
    id: "q2",
    question: "What kind of signal does LoRa use?",
    options: ["Frequency hopping", "Chirps that sweep across the channel", "Infrared pulses", "Amplitude modulation only"],
    answer: 1,
    explanation: "Chirp spread spectrum lets the receiver pick out signals even below the noise.",
  },
  {
    id: "q3",
    question: "What happens when the spreading factor goes up by one?",
    options: [
      "Chirps last half as long and range falls",
      "Chirps last twice as long: more range, but half the data rate",
      "Nothing changes",
      "The frequency doubles",
    ],
    answer: 1,
    explanation: "Each SF step doubles the chirp time, improving sensitivity but halving the data rate.",
  },
  {
    id: "q4",
    question: "About how long does a 10-byte LoRaWAN message take on air at SF12, 125 kHz?",
    options: ["6 ms", "62 ms", "About 1.5 s", "15 s"],
    answer: 2,
    explanation: "With 13 bytes of LoRaWAN overhead (23 bytes), SF12 takes about 1483 ms, against 62 ms at SF7.",
  },
  {
    id: "q5",
    question: "What is LoRaWAN's network architecture called?",
    options: ["Mesh", "Ring", "Star of stars", "Bus"],
    answer: 2,
    explanation: "End devices talk to gateways, gateways to a network server: a star of stars, not a mesh.",
  },
  {
    id: "q6",
    question: "Which gateway receives an end device's uplink?",
    options: [
      "Only the nearest one, chosen by the device",
      "Every gateway in range; the network server removes duplicates",
      "None: devices relay for each other",
      "Only the gateway it paired with by NFC",
    ],
    answer: 1,
    explanation: "All gateways that hear the packet forward it, and the network server keeps one copy.",
  },
  {
    id: "q7",
    question: "Which LoRaWAN device class uses the least power?",
    options: ["Class A", "Class B", "Class C", "They are equal"],
    answer: 0,
    explanation: "Class A devices only listen in two short windows after sending, so they sleep the rest of the time.",
  },
  {
    id: "q8",
    question: "Under Europe's 1 % duty-cycle rule, roughly how many 1.48 s SF12 messages may a device send per day?",
    options: ["58", "582", "5820", "Unlimited"],
    answer: 1,
    explanation: "864 s of airtime a day ÷ 1.48 s ≈ 582 messages.",
  },
  {
    id: "q9",
    question: "Which statement about India's IN865 band is correct?",
    options: [
      "It requires a mobile operator licence",
      "It has no duty-cycle limit; rules limit power, and shared networks like TTN still ask for under 30 s of airtime a day",
      "It is at 2.4 GHz",
      "Devices may only send once a day",
    ],
    answer: 1,
    explanation: "865–867 MHz is licence-free in India with power limits rather than a duty-cycle rule.",
  },
  {
    id: "q10",
    question: "Which LPWAN allows only 140 uplink messages of 12 bytes each per day?",
    options: ["LoRaWAN", "Sigfox", "Zigbee", "Wi-Fi HaLow"],
    answer: 1,
    explanation: "Sigfox's ultra-narrowband service is limited to 12-byte messages, 140 up and 4 down each day.",
  },
];

export default quiz;
