import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Which part of a cloud IoT platform keeps the list of devices and their credentials?",
    options: ["Rules engine", "Device registry", "Dashboard", "Data lake"],
    answer: 1,
    explanation: "The device registry stores each device's identity and credentials, often an X.509 certificate.",
  },
  {
    id: "q2",
    question: "A rule says: 'If temperature > 40, store the message and send an alert.' Which feature runs it?",
    options: ["Device shadow", "Rules engine", "Device registry", "Hypervisor"],
    answer: 1,
    explanation: "The rules engine checks incoming messages and routes or acts on them.",
  },
  {
    id: "q3",
    question: "In a device shadow, what is the 'delta'?",
    options: [
      "The device's battery level",
      "The difference between the desired state and the reported state",
      "The number of messages sent today",
      "The device's certificate",
    ],
    answer: 1,
    explanation: "The delta lists desired values the device has not reached yet; it applies them when it reconnects.",
  },
  {
    id: "q4",
    question: "An app turns a bulb on while the bulb is offline. What happens?",
    options: [
      "The command is lost",
      "The app waits until the bulb is online",
      "The desired state is saved in the shadow, and the bulb applies it when it reconnects",
      "The cloud turns the bulb on directly",
    ],
    answer: 2,
    explanation: "This is exactly why shadows exist: the app sets desired state, and the device catches up later.",
  },
  {
    id: "q5",
    question: "What does Azure call its device shadow?",
    options: ["Device twin", "Thing", "Channel", "Topic"],
    answer: 0,
    explanation: "Azure IoT Hub uses device twins; AWS and Alibaba use device shadows.",
  },
  {
    id: "q6",
    question: "Which commercial IoT service was retired on 16 August 2023?",
    options: ["AWS IoT Core", "Azure IoT Hub", "Google Cloud IoT Core", "ThingSpeak"],
    answer: 2,
    explanation: "Google retired Cloud IoT Core in August 2023 and pointed customers to partners.",
  },
  {
    id: "q7",
    question: "Which protocol does Azure IoT Hub support that AWS IoT Core does not list?",
    options: ["MQTT", "HTTPS", "AMQP", "TCP"],
    answer: 2,
    explanation: "Azure IoT Hub supports MQTT, AMQP and HTTPS; AWS IoT Core supports MQTT and HTTPS (plus MQTT over WebSocket).",
  },
  {
    id: "q8",
    question: "What is AWS IoT Greengrass (or Azure IoT Edge) used for?",
    options: ["Billing", "Running cloud rules and code on a local gateway, even when the internet is down", "Designing circuit boards", "Storing certificates only"],
    answer: 1,
    explanation: "Edge runtimes bring cloud logic to local hardware for speed and offline operation.",
  },
  {
    id: "q9",
    question: "Which statement about ThingSpeak is correct?",
    options: ["It is open source", "It is free to start, with MATLAB analysis, but not open source", "It was retired in 2023", "It only supports CoAP"],
    answer: 1,
    explanation: "ThingSpeak, from MathWorks, has a free tier and built-in MATLAB analysis, but its code is not open.",
  },
  {
    id: "q10",
    question: "What is the best way to reduce cloud lock-in?",
    options: ["Use only one provider's SDK features", "Use standard protocols like MQTT and keep data exportable", "Never update firmware", "Avoid encryption"],
    answer: 1,
    explanation: "Standard protocols and exportable data make it possible to move when a service changes or retires.",
  },
];

export default quiz;
