import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Which three properties of a wireless link trade off against each other?",
    options: ["Colour, size and weight", "Range, data rate and power", "Cost, brand and age", "Voltage, current and resistance"],
    answer: 1,
    explanation: "Sending farther or faster needs more power, so range, data rate and power pull against each other.",
  },
  {
    id: "q2",
    question: "Soil sensors spread over a 5 km farm must run for years on a battery. Which technology fits best?",
    options: ["Wi-Fi", "Bluetooth Classic", "LoRaWAN", "NFC"],
    answer: 2,
    explanation: "LoRaWAN reaches kilometres at very low power, which suits small, infrequent readings.",
  },
  {
    id: "q3",
    question: "Which technology is the best choice for a CCTV camera streaming HD video?",
    options: ["Zigbee", "LoRaWAN", "Wi-Fi", "NFC"],
    answer: 2,
    explanation: "Video needs several Mbps, which only Wi-Fi in this list can carry.",
  },
  {
    id: "q4",
    question: "Why is NFC suitable for payments?",
    options: [
      "It reaches several kilometres",
      "It works only over a few centimetres, so the card must be deliberately tapped",
      "It has the highest data rate",
      "It needs no encryption",
    ],
    answer: 1,
    explanation: "The very short range means a payment happens only when the customer brings the card or phone close.",
  },
  {
    id: "q5",
    question: "Forty smart bulbs must keep working even if one is unplugged. Which topology helps?",
    options: ["Point-to-point", "Mesh", "Bus", "Star with a single hub"],
    answer: 1,
    explanation: "A mesh such as Zigbee relays messages through other devices, so losing one bulb does not cut the others off.",
  },
  {
    id: "q6",
    question: "Which of these can a smartphone talk to directly, without a gateway?",
    options: ["Zigbee", "LoRaWAN", "BLE", "Sigfox"],
    answer: 2,
    explanation: "Phones have BLE, NFC and Wi-Fi radios. Zigbee and LoRaWAN devices need a hub or gateway.",
  },
  {
    id: "q7",
    question: "In India, which licence-free band does LoRaWAN use?",
    options: ["13.56 MHz", "865–867 MHz", "2.4 GHz", "60 GHz"],
    answer: 1,
    explanation: "India's IN865 band (865–867 MHz) is a licence-free ISM band; lower frequencies travel farther.",
  },
  {
    id: "q8",
    question: "On a range vs data-rate chart with log scales, why is the top-right corner empty?",
    options: [
      "The chart is wrong",
      "A technology that is both long-range and fast would need far more power than IoT devices have",
      "Fast radios are illegal",
      "Log scales hide those points",
    ],
    answer: 1,
    explanation: "Long range and high speed together cost power, so low-power IoT radios give up one to get the other.",
  },
  {
    id: "q9",
    question: "A device must have its own IP address and connect without a gateway. Which is the simplest choice?",
    options: ["Zigbee", "Wi-Fi", "Bluetooth Classic", "NFC"],
    answer: 1,
    explanation: "Wi-Fi devices get an IP address from the access point and connect to IP networks directly.",
  },
  {
    id: "q10",
    question: "Which is NOT usually a criterion when choosing an IoT radio?",
    options: ["Range", "Power consumption", "Screen resolution", "Frequency band"],
    answer: 2,
    explanation: "Screen resolution has nothing to do with the radio link.",
  },
];

export default quiz;
