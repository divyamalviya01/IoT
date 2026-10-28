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
    question: "Which of these is NOT a usual characteristic of an IoT sensor node?",
    options: [
      "Large memory and a powerful processor",
      "Small size and low cost",
      "Low power use, often on a battery",
      "Short-range wireless communication",
    ],
    answer: 0,
    explanation: "Sensor nodes have limited processing, memory and storage. This keeps them small, cheap and low on power.",
  },
  {
    id: "q3",
    question: "In a wireless sensor network, what does fault tolerance mean?",
    options: [
      "Nodes are built so they can never fail",
      "Every node carries two batteries",
      "The whole network stops when one node fails",
      "The network keeps working even when some nodes fail",
    ],
    answer: 3,
    explanation: "Nodes can die from flat batteries, rain or damage. The other nodes carry on and send data around the dead ones.",
  },
  {
    id: "q4",
    question: "Why is it useful that sensor nodes are self-organising?",
    options: [
      "Each node gets a bigger battery",
      "Nodes spread over a large farm can build the network on their own",
      "Nodes can run heavy apps such as video editing",
      "Nodes no longer need a radio",
    ],
    answer: 1,
    explanation: "No one can set up hundreds of nodes by hand. Self-organising nodes find their neighbours and form the network themselves.",
  },
  {
    id: "q5",
    question: "What does an ADC do?",
    options: [
      "Turns a voltage into a number",
      "Turns a number into a voltage",
      "Stores the program",
      "Sends packets by radio",
    ],
    answer: 0,
    explanation: "An analog-to-digital converter turns the sensor's voltage into a number the microcontroller can use.",
  },
  {
    id: "q6",
    question: "How many steps does a 10-bit ADC have?",
    options: ["10", "100", "512", "1024"],
    answer: 3,
    explanation: "An n-bit ADC has 2ⁿ steps, and 2¹⁰ = 1024. With a 5 V reference, each step is about 4.9 mV.",
  },
  {
    id: "q7",
    question: "A 3-bit ADC splits 0–5 V into 8 steps of 0.625 V. Which code does it give for 2.0 V?",
    options: ["001", "010", "011", "100"],
    answer: 2,
    explanation: "2.0 ÷ 0.625 = 3.2, and quantisation rounds this down to step 3. Step 3 in 3-bit binary is 011.",
  },
  {
    id: "q8",
    question: "A node is awake for 1 second in every 100 seconds. What is its duty cycle?",
    options: ["0.01%", "1%", "10%", "99%"],
    answer: 1,
    explanation: "Duty cycle = awake time ÷ total time = 1 ÷ 100 = 1%.",
  },
  {
    id: "q9",
    question: "Why does duty cycling make a battery last longer?",
    options: [
      "The battery gets bigger while the node sleeps",
      "The radio sends more often",
      "The ADC uses fewer bits",
      "The node sleeps most of the time, so the average current falls",
    ],
    answer: 3,
    explanation:
      "Sleep current is tiny, so at 1% the average falls from 20 mA to about 0.21 mA. A 2000 mAh battery then lasts over a year, not about 4 days.",
  },
  {
    id: "q10",
    question: "A small solar panel recharges a farm sensor node's battery. What is this called?",
    options: ["Energy harvesting", "Duty cycling", "Quantisation", "Sampling"],
    answer: 0,
    explanation: "Energy harvesting collects small amounts of energy from light, heat or vibration.",
  },
];

export default quiz;
