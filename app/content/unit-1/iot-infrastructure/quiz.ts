import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Which is the correct order of the reference IoT infrastructure?",
    options: [
      "Devices → gateways → network → cloud platform → applications",
      "Applications → devices → cloud → gateways → network",
      "Cloud → devices → network → applications → gateways",
      "Gateways → applications → devices → network → cloud",
    ],
    answer: 0,
    explanation: "Data starts at devices, passes gateways and the network, is processed in the cloud and reaches people through applications.",
  },
  {
    id: "q2",
    question: "In a smart grid, which part collects readings from many smart meters?",
    options: ["Billing portal", "Data concentrator", "Electricity pole", "Phone app"],
    answer: 1,
    explanation: "A data concentrator gathers readings from nearby smart meters and forwards them to the utility.",
  },
  {
    id: "q3",
    question: "What acts as the gateway for most fitness bands?",
    options: ["A cell tower", "The user's smartphone", "A smart meter", "A data concentrator"],
    answer: 1,
    explanation: "Wearables send data by Bluetooth Low Energy to the phone, which forwards it to the internet.",
  },
  {
    id: "q4",
    question: "What is telematics?",
    options: [
      "Television over the internet",
      "Collecting and sending vehicle data over a mobile network",
      "A type of smart meter",
      "Tracking parcels with barcodes",
    ],
    answer: 1,
    explanation: "Telematics units in vehicles send location, speed and engine health over the mobile network.",
  },
  {
    id: "q5",
    question: "Which Indian standard requires tracking devices and emergency buttons in public transport vehicles?",
    options: ["AIS-140", "IS 16046", "BIS 1500", "IEC 60950"],
    answer: 0,
    explanation: "AIS-140 sets requirements for vehicle tracking systems and emergency buttons in public transport.",
  },
  {
    id: "q6",
    question: "India's eVIN network uses IoT ideas to track…",
    options: [
      "Electricity bills",
      "Vaccine stocks and cold-storage temperatures",
      "Railway tickets",
      "Traffic signals",
    ],
    answer: 1,
    explanation: "eVIN tracks vaccine stocks and the temperature of cold storage across the country.",
  },
  {
    id: "q7",
    question: "In a smart home, a hub that connects Zigbee bulbs to Wi-Fi is part of which stage?",
    options: ["Devices", "Gateways", "Cloud platform", "Applications"],
    answer: 1,
    explanation: "Gateways collect data from nearby devices and often translate between protocols.",
  },
  {
    id: "q8",
    question: "Which is a limitation of large IoT infrastructures?",
    options: [
      "Remote monitoring",
      "Reusing one structure across industries",
      "Many stages where things can fail or be attacked",
      "Better data from many devices",
    ],
    answer: 2,
    explanation: "Each stage is another point of failure or attack. The other options are advantages.",
  },
];

export default quiz;
