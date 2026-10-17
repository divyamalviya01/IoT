import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "In MQTT, what does the broker do?",
    options: [
      "Measures sensor values",
      "Receives messages and forwards them to matching subscribers",
      "Encrypts the Wi-Fi network",
      "Stores web pages",
    ],
    answer: 1,
    explanation: "The broker sits between publishers and subscribers and routes each message by its topic.",
  },
  {
    id: "q2",
    question: "Which subscription receives home/kitchen/temperature but NOT home/kitchen/fridge/temperature?",
    options: ["home/#", "home/+/temperature", "#", "home/kitchen/#"],
    answer: 1,
    explanation: "+ matches exactly one level, so home/+/temperature matches kitchen but not kitchen/fridge.",
  },
  {
    id: "q3",
    question: "Which QoS level may deliver a message more than once?",
    options: ["QoS 0", "QoS 1", "QoS 2", "None of them"],
    answer: 1,
    explanation: "QoS 1 resends until it gets a PUBACK, so if the PUBACK is lost the message can arrive twice.",
  },
  {
    id: "q4",
    question: "How many messages does a QoS 2 publish use between the sender and the broker?",
    options: ["1", "2", "3", "4"],
    answer: 3,
    explanation: "PUBLISH, PUBREC, PUBREL and PUBCOMP make four messages, which guarantees exactly-once delivery.",
  },
  {
    id: "q5",
    question: "What is a retained message?",
    options: [
      "A message that failed to send",
      "The last message on a topic, kept by the broker and sent to new subscribers immediately",
      "A message that is encrypted",
      "A message stored on the sensor",
    ],
    answer: 1,
    explanation: "A retained message acts as the last known value, so new subscribers do not wait for the next update.",
  },
  {
    id: "q6",
    question: "When does the broker publish a client's Last Will and Testament?",
    options: [
      "Every time the client connects",
      "When the client disconnects unexpectedly",
      "When the client sends DISCONNECT",
      "Every 60 seconds",
    ],
    answer: 1,
    explanation: "The will is published only on an unexpected disconnect, such as a dead battery. A clean DISCONNECT cancels it.",
  },
  {
    id: "q7",
    question: "Which TCP port does MQTT use without TLS?",
    options: ["80", "443", "1883", "5683"],
    answer: 2,
    explanation: "MQTT uses port 1883, and 8883 with TLS. 5683 is CoAP.",
  },
  {
    id: "q8",
    question: "MQTT filters messages by…",
    options: ["Topic", "Message content", "Sender's IP address", "Message size"],
    answer: 0,
    explanation: "MQTT is topic-based. Content-based filtering needs rules engines on top.",
  },
  {
    id: "q9",
    question: "Which packet keeps an idle MQTT connection alive?",
    options: ["PUBREL", "PINGREQ", "SUBACK", "CONNACK"],
    answer: 1,
    explanation: "The client sends PINGREQ and the broker answers PINGRESP when there is no other traffic.",
  },
  {
    id: "q10",
    question: "What is MQTT-SN designed for?",
    options: [
      "Web browsers",
      "Sensor networks that cannot run TCP",
      "Video streaming",
      "Email",
    ],
    answer: 1,
    explanation: "MQTT-SN runs over UDP or non-IP links and uses short topic IDs for very small devices.",
  },
];

export default quiz;
