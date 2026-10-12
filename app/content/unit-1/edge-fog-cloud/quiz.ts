import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Where does edge computing process data?",
    options: [
      "In a distant data centre",
      "On the device or a gateway right next to it",
      "Only on the user's phone",
      "On a satellite",
    ],
    answer: 1,
    explanation: "Edge computing processes data on or beside the device, so answers come back fastest.",
  },
  {
    id: "q2",
    question: "A self-driving car must brake within a few milliseconds. Where should that decision be made?",
    options: ["Cloud", "Fog", "Edge", "It does not matter"],
    answer: 2,
    explanation: "Only edge processing is fast enough and keeps working when the connection drops.",
  },
  {
    id: "q3",
    question: "Which tier has the most computing power and storage?",
    options: ["Devices", "Edge", "Fog", "Cloud"],
    answer: 3,
    explanation: "Cloud data centres offer practically unlimited storage and very high computing power.",
  },
  {
    id: "q4",
    question: "Fog computing usually happens on…",
    options: [
      "Local servers or gateways serving many devices in one area",
      "The sensor chip itself",
      "A global data centre",
      "Paper records",
    ],
    answer: 0,
    explanation: "Fog nodes sit between devices and the cloud, such as a factory server or a computer at a mobile tower.",
  },
  {
    id: "q5",
    question: "What is a cloudlet?",
    options: [
      "A very small sensor",
      "A small cloud data centre placed near the users",
      "A type of cloud storage plan",
      "A weather sensor",
    ],
    answer: 1,
    explanation: "Cloudlets bring cloud resources to the edge of the network; they make up the peripheral cloud.",
  },
  {
    id: "q6",
    question: "Which choice uses the most internet bandwidth?",
    options: [
      "Edge processing that sends only alerts",
      "Fog processing that sends hourly summaries",
      "Sending all raw data to the cloud",
      "Processing that never sends anything",
    ],
    answer: 2,
    explanation: "Sending raw data to the cloud moves the most data over the internet.",
  },
  {
    id: "q7",
    question: "Which tier keeps working when the internet connection fails?",
    options: ["Only the cloud", "Edge (and fog within the local area)", "None of them", "Only the cloud and fog"],
    answer: 1,
    explanation: "Edge and local fog processing do not depend on the internet; the cloud does.",
  },
  {
    id: "q8",
    question: "Which company introduced the term “fog computing”?",
    options: ["Google", "Cisco", "Intel", "IBM"],
    answer: 1,
    explanation: "Cisco introduced the term around 2012.",
  },
  {
    id: "q9",
    question: "Analysing five years of city traffic data to plan new roads fits best in…",
    options: ["Edge", "Fog", "Cloud", "A single traffic camera"],
    answer: 2,
    explanation: "Long-term storage and heavy analysis need the cloud's storage and computing power.",
  },
];

export default quiz;
