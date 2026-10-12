import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Which unit of a sensor node usually uses the most energy?",
    options: ["Sensing unit", "Processing unit", "Communication unit", "Power unit"],
    answer: 2,
    explanation: "The radio transceiver uses the most energy, which is why nodes switch it off whenever they can.",
  },
  {
    id: "q2",
    question: "What does an ADC do?",
    options: [
      "Turns a number into a voltage",
      "Turns a voltage into a number",
      "Stores the program",
      "Sends packets by radio",
    ],
    answer: 1,
    explanation: "An analog-to-digital converter turns the sensor's voltage into a number the microcontroller can use.",
  },
  {
    id: "q3",
    question: "How many steps does a 10-bit ADC have?",
    options: ["10", "100", "512", "1024"],
    answer: 3,
    explanation: "An n-bit ADC has 2ⁿ steps, and 2¹⁰ = 1024.",
  },
  {
    id: "q4",
    question: "A 10-bit ADC uses a 5 V reference. What is the size of one step?",
    options: ["About 0.5 mV", "About 4.9 mV", "About 50 mV", "About 0.5 V"],
    answer: 1,
    explanation: "Step size = 5 V ÷ 1024 ≈ 4.9 mV.",
  },
  {
    id: "q5",
    question: "The LM35 gives 10 mV per °C. What voltage does it give at 25 °C?",
    options: ["25 mV", "250 mV", "2.5 V", "25 V"],
    answer: 1,
    explanation: "25 °C × 10 mV/°C = 250 mV.",
  },
  {
    id: "q6",
    question: "Which sensor gives a digital HIGH when it detects movement?",
    options: ["LDR", "LM35", "PIR", "Soil moisture probe"],
    answer: 2,
    explanation: "A PIR sensor detects the heat of moving bodies and outputs HIGH when it sees motion.",
  },
  {
    id: "q7",
    question: "Which part would switch a high-power water pump on and off?",
    options: ["Relay", "LDR", "ADC", "Accelerometer"],
    answer: 0,
    explanation: "A relay is a switch controlled by a small signal, used for high-power loads such as pumps.",
  },
  {
    id: "q8",
    question: "A node is awake 1% of the time. What is its duty cycle?",
    options: ["0.01%", "1%", "10%", "99%"],
    answer: 1,
    explanation: "The duty cycle is the share of time the node is awake, so it is 1%.",
  },
  {
    id: "q9",
    question: "Why does duty cycling make a battery last longer?",
    options: [
      "The battery becomes larger",
      "The node sleeps most of the time, so average current falls",
      "The radio sends more often",
      "The ADC uses more bits",
    ],
    answer: 1,
    explanation: "Sleep current is tiny, so sleeping most of the time lowers the average current a lot.",
  },
  {
    id: "q10",
    question: "Collecting energy from sunlight to recharge a node's battery is called…",
    options: ["Duty cycling", "Quantisation", "Energy harvesting", "Sampling"],
    answer: 2,
    explanation: "Energy harvesting collects small amounts of energy from light, heat or vibration.",
  },
];

export default quiz;
