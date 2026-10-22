import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Which widget is best for showing where delivery vans are?",
    options: ["Gauge", "Map", "Value card", "Switch"],
    answer: 1,
    explanation: "A map shows positions; the other widgets show numbers, states or controls.",
  },
  {
    id: "q2",
    question: "Which widget best shows how room temperature changed during the day?",
    options: ["Line chart", "Gauge", "Switch", "Alert"],
    answer: 0,
    explanation: "Line charts show a value over time, so trends and changes stand out.",
  },
  {
    id: "q3",
    question: "A dashboard asks the server for new data every 30 seconds. What is this called?",
    options: ["Push", "Polling", "Streaming", "Multicast"],
    answer: 1,
    explanation: "Polling repeats a request at fixed intervals, whether or not anything changed.",
  },
  {
    id: "q4",
    question: "Why is push (for example, WebSocket) often better than polling for a live dashboard?",
    options: [
      "It needs no server",
      "Data arrives as soon as it changes, with fewer wasted messages",
      "It works without the internet",
      "It shows older data",
    ],
    answer: 1,
    explanation: "Push sends only real changes, immediately, over an open connection.",
  },
  {
    id: "q5",
    question: "An alert turns on above 35 °C and off only below 34.5 °C. What is the 0.5 °C gap called?",
    options: ["Latency", "Hysteresis", "Jitter", "Resolution"],
    answer: 1,
    explanation: "Hysteresis stops an alert flashing on and off when a value wobbles around the limit.",
  },
  {
    id: "q6",
    question: "A user flips a dashboard switch while the bulb is offline. What should the switch show?",
    options: ["On, straight away", "An error, and forget the command", "\"Turning on…\" until the bulb reports that it is on", "Nothing"],
    answer: 2,
    explanation: "The switch sets desired state in the shadow; it is pending until the device reports back.",
  },
  {
    id: "q7",
    question: "Where should the most important widget, such as an alert, usually go?",
    options: ["Bottom right", "Top left", "On a second page", "Anywhere"],
    answer: 1,
    explanation: "People read screens from the top left, so key information goes there.",
  },
  {
    id: "q8",
    question: "Which is a sign of a badly designed dashboard?",
    options: ["Units on every value", "About 8 widgets", "Twelve gauges, two of them showing the same stream", "Status shown with an icon and a word"],
    answer: 2,
    explanation: "Clutter and duplicates hide what matters; a few well-chosen widgets work better.",
  },
  {
    id: "q9",
    question: "Why should status colours always come with an icon or word?",
    options: ["To save space", "So colour-blind users can still read the status", "Because colours do not show on phones", "To make the dashboard slower"],
    answer: 1,
    explanation: "Never rely on colour alone; about 1 in 12 men has some colour blindness.",
  },
  {
    id: "q10",
    question: "Which tool is an open-source dashboard tool widely used for time-series data?",
    options: ["Grafana", "HDFS", "Docker", "Zigbee"],
    answer: 0,
    explanation: "Grafana (AGPL-3.0) is widely used for charts and alerts on time-series data.",
  },
];

export default quiz;
