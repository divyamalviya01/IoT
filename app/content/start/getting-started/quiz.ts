import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "What is a packet?",
    options: [
      "A small chunk of data sent over a network",
      "A type of sensor that measures temperature",
      "The battery inside an IoT device",
      "A cable that connects a sensor to a gateway",
    ],
    answer: 0,
    explanation:
      "Data is split into small packets. Each one carries part of the data (the payload) plus addressing information.",
  },
  {
    id: "q2",
    question: "Latency is best described as…",
    options: [
      "the share of packets that never arrive",
      "the time a packet takes to travel from sender to receiver",
      "the amount of data a link can carry each second",
      "the number of devices on a network",
    ],
    answer: 1,
    explanation: "Latency is a delay, so it is measured in time, usually milliseconds.",
  },
  {
    id: "q3",
    question: "Which unit is normally used for latency in IoT networks?",
    options: ["Kilobytes", "Percent", "Milliseconds", "Volts"],
    answer: 2,
    explanation: "Network delays are usually a few to a few hundred milliseconds (ms).",
  },
  {
    id: "q4",
    question: "Each of three links has a delay of 100 ms. About how long does the whole journey take?",
    options: ["33 ms", "100 ms", "300 ms", "1000 ms"],
    answer: 2,
    explanation: "Delays add up along a path: 100 + 100 + 100 = 300 ms.",
  },
  {
    id: "q5",
    question: "Each of three links loses 10% of packets. About what share of packets reaches the end?",
    options: ["90%", "73%", "70%", "30%"],
    answer: 1,
    explanation:
      "A packet must survive every link, so the chances multiply: 0.9 × 0.9 × 0.9 ≈ 0.73, about 73%. It is not 70%, because losses don't simply add.",
  },
  {
    id: "q6",
    question: "What is the main job of a gateway in an IoT system?",
    options: [
      "To measure the temperature",
      "To show readings to the user",
      "To connect local devices to the internet",
      "To store years of data",
    ],
    answer: 2,
    explanation: "The gateway is the bridge between the local device network and the internet.",
  },
  {
    id: "q7",
    question: "Why does a sensor resend a reading?",
    options: [
      "Because no acknowledgement arrived in time",
      "Because the reading was too large",
      "Because the cloud asked for a new sensor",
      "Because the battery is full",
    ],
    answer: 0,
    explanation: "If the sender gets no ack before a timeout, it assumes the message was lost and sends it again.",
  },
  {
    id: "q8",
    question: "In the three-layer IoT model, where do sensors and actuators belong?",
    options: ["Application layer", "Network layer", "Perception layer", "Cloud layer"],
    answer: 2,
    explanation: "The perception layer senses the physical world and acts on it, so sensors and actuators live there.",
  },
];

export default quiz;
