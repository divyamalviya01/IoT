import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Who coined the term “Internet of Things”?",
    options: ["Tim Berners-Lee", "Kevin Ashton", "John Romkey", "Vint Cerf"],
    answer: 1,
    explanation:
      "Kevin Ashton used the phrase in 1999 in a talk about linking RFID tags to the internet.",
  },
  {
    id: "q2",
    question: "In which year was the term “Internet of Things” first used?",
    options: ["1982", "1990", "1999", "2008"],
    answer: 2,
    explanation:
      "The term dates from 1999. 1982 is the Carnegie Mellon Coke machine, and 1990 is Romkey's internet toaster.",
  },
  {
    id: "q3",
    question: "Which of these is NOT one of the four building blocks of IoT?",
    options: ["Things", "Connectivity", "Data processing", "Printer driver"],
    answer: 3,
    explanation:
      "The four building blocks are things, connectivity, data processing and the user interface.",
  },
  {
    id: "q4",
    question: "What does an actuator do?",
    options: [
      "Measures temperature",
      "Acts on the physical world when it receives a command",
      "Stores data in the cloud",
      "Connects devices to the internet",
    ],
    answer: 1,
    explanation:
      "An actuator, such as a motor, relay or valve, does something physical in response to a command.",
  },
  {
    id: "q5",
    question: "A soil moisture probe in a field belongs to which building block?",
    options: ["Things", "Connectivity", "Data processing", "User interface"],
    answer: 0,
    explanation: "Sensors and actuators are the “things” that sense and act on the physical world.",
  },
  {
    id: "q6",
    question: "In the FASTag system, what is the bank's account-checking system?",
    options: ["A thing", "Connectivity", "Data processing", "The user interface"],
    answer: 2,
    explanation:
      "The bank's system checks the account and deducts the toll, which is data processing.",
  },
  {
    id: "q7",
    question: "What is the main job of a gateway?",
    options: [
      "To measure physical quantities",
      "To connect local devices to the internet",
      "To display data to the user",
      "To store data for many years",
    ],
    answer: 1,
    explanation:
      "Devices usually talk to a nearby gateway over a short-range radio, and the gateway forwards their data to the internet.",
  },
  {
    id: "q8",
    question: "Which standard body published the definition of IoT in recommendation Y.2060?",
    options: ["IEEE", "ITU-T", "W3C", "ISO"],
    answer: 1,
    explanation:
      "ITU-T Y.2060 defines IoT as a global infrastructure that interconnects physical and virtual things.",
  },
  {
    id: "q9",
    question: "Which is a limitation of IoT?",
    options: [
      "Remote monitoring",
      "Automation of routine tasks",
      "Security and privacy risks",
      "Better decisions from real data",
    ],
    answer: 2,
    explanation:
      "Connected devices can be hacked and they collect personal data. The other options are advantages.",
  },
  {
    id: "q10",
    question: "In a smart home, which way do commands such as “switch on the fan” travel?",
    options: [
      "From the fan to the app",
      "From the user interface back to the actuator",
      "Only inside the cloud",
      "Commands are never sent in IoT",
    ],
    answer: 1,
    explanation:
      "Data flows from things to the user, and commands flow back from the user interface to the actuator.",
  },
];

export default quiz;
