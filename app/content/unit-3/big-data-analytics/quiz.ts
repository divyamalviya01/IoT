import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Which V of big data describes how fast data arrives and must be handled?",
    options: ["Volume", "Velocity", "Variety", "Value"],
    answer: 1,
    explanation: "Velocity is speed; volume is amount; variety is kinds; value is usefulness.",
  },
  {
    id: "q2",
    question: "A sensor is stuck and keeps sending the same wrong value. Which V does this affect?",
    options: ["Volume", "Velocity", "Veracity", "Variety"],
    answer: 2,
    explanation: "Veracity is how trustworthy the data is.",
  },
  {
    id: "q3",
    question: "An MQTT payload {\"temp\": 31.2, \"door\": \"open\"} is an example of which kind of data?",
    options: ["Structured", "Semi-structured", "Unstructured", "Binary only"],
    answer: 1,
    explanation: "JSON has tags (keys) but no fixed table: semi-structured.",
  },
  {
    id: "q4",
    question: "CCTV video is which kind of data?",
    options: ["Structured", "Semi-structured", "Unstructured", "Relational"],
    answer: 2,
    explanation: "Video has no set format of fields: unstructured.",
  },
  {
    id: "q5",
    question: "Forecasting tomorrow's peak electricity demand is which kind of analytics?",
    options: ["Descriptive", "Diagnostic", "Predictive", "Prescriptive"],
    answer: 2,
    explanation: "Predictive analytics answers 'what will happen?'.",
  },
  {
    id: "q6",
    question: "Recommending a cheaper night tariff to shift load off the peak is which kind of analytics?",
    options: ["Descriptive", "Diagnostic", "Predictive", "Prescriptive"],
    answer: 3,
    explanation: "Prescriptive analytics answers 'what should we do?'.",
  },
  {
    id: "q7",
    question: "A gas-leak alarm must react within seconds. Which processing does it need?",
    options: ["Batch processing every night", "Stream processing", "Monthly reports", "Manual checking"],
    answer: 1,
    explanation: "Stream processing handles each reading as it arrives.",
  },
  {
    id: "q8",
    question: "What is the correct order of the IoT data pipeline?",
    options: ["Store → ingest → visualize → process", "Ingest → store → process → visualize", "Process → ingest → store → visualize", "Visualize → process → store → ingest"],
    answer: 1,
    explanation: "Data is collected (ingest), kept (store), analysed (process) and then shown or acted on.",
  },
  {
    id: "q9",
    question: "The last 20 readings average 28 °C with a standard deviation of 0.5 °C. What is the z-score of a 30 °C reading?",
    options: ["0.5", "2", "4", "30"],
    answer: 2,
    explanation: "z = (30 − 28) ÷ 0.5 = 4, which is above the usual limit of 3, so it is unusual.",
  },
  {
    id: "q10",
    question: "Why does a moving average lag behind a real change?",
    options: [
      "Because it uses only the newest reading",
      "Because it averages older readings too, so a change shows only gradually",
      "Because sensors are slow",
      "It never lags",
    ],
    answer: 1,
    explanation: "Averaging the last N readings smooths noise but trails a change by about half the window.",
  },
];

export default quiz;
