import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "What is the main job of an IoT gateway?",
    options: [
      "To measure temperature",
      "To connect local devices to the internet and translate their protocols",
      "To display web pages",
      "To generate electricity",
    ],
    answer: 1,
    explanation: "A gateway speaks local protocols on one side and an internet protocol such as MQTT on the other.",
  },
  {
    id: "q2",
    question: "A gateway sends a reading only when it changes by more than 0.5 °C. This is…",
    options: ["Aggregation", "Filtering", "Encryption", "Device management"],
    answer: 1,
    explanation: "Dropping readings that have not changed much is filtering, a form of edge processing.",
  },
  {
    id: "q3",
    question: "Which protocol is widely used in factories to read registers from meters and machines?",
    options: ["Modbus", "XMPP", "BLE", "HTTP"],
    answer: 0,
    explanation: "Modbus (1979) reads and writes numbered registers over RS-485 or TCP.",
  },
  {
    id: "q4",
    question: "Which protocol is designed for building automation such as air-conditioning?",
    options: ["BACnet", "DDS", "CoAP", "LoRa"],
    answer: 0,
    explanation: "BACnet (ASHRAE 135) is the standard protocol for building automation systems.",
  },
  {
    id: "q5",
    question: "Which protocol provides device management over CoAP?",
    options: ["AMQP", "LwM2M", "Modbus", "XMPP"],
    answer: 1,
    explanation: "Lightweight M2M (LwM2M) from OMA manages devices over CoAP, including firmware updates.",
  },
  {
    id: "q6",
    question: "Which protocol offers publish–subscribe without a central broker?",
    options: ["MQTT", "AMQP", "DDS", "HTTP"],
    answer: 2,
    explanation: "DDS lets devices publish and subscribe directly; MQTT and AMQP use brokers.",
  },
  {
    id: "q7",
    question: "What does “store and forward” mean for a gateway?",
    options: [
      "It stores firmware",
      "It keeps data while the internet is down and sends it later",
      "It forwards every message twice",
      "It stores passwords",
    ],
    answer: 1,
    explanation: "Buffering data during outages means no readings are lost.",
  },
  {
    id: "q8",
    question: "A Zigbee sensor reports the raw value 2850 in hundredths of a degree. What temperature does the gateway publish?",
    options: ["2850 °C", "285.0 °C", "28.50 °C", "2.85 °C"],
    answer: 2,
    explanation: "2850 × 0.01 = 28.50 °C.",
  },
  {
    id: "q9",
    question: "What is a disadvantage of a gateway?",
    options: [
      "It reduces internet traffic",
      "It is a single point of failure for the devices behind it",
      "It lets old devices join the system",
      "It adds security",
    ],
    answer: 1,
    explanation: "If the gateway fails, every device that depends on it loses its connection.",
  },
];

export default quiz;
