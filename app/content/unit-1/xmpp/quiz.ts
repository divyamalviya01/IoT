import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "What format does XMPP use for its messages?",
    options: ["JSON", "XML", "Binary only", "CSV"],
    answer: 1,
    explanation: "XMPP exchanges XML stanzas over a long-lived XML stream.",
  },
  {
    id: "q2",
    question: "In the JID sensor1@home.example/kitchen, what is “kitchen”?",
    options: ["The domain", "The resource", "The password", "The port"],
    answer: 1,
    explanation: "The part after the slash is the resource: one particular connection of that user or device.",
  },
  {
    id: "q3",
    question: "Which stanza announces that a device is online or away?",
    options: ["message", "iq", "presence", "query"],
    answer: 2,
    explanation: "Presence stanzas share availability and let others subscribe to it.",
  },
  {
    id: "q4",
    question: "Which stanza is used for request–response, such as asking a sensor for a reading?",
    options: ["message", "presence", "iq", "stream"],
    answer: 2,
    explanation: "iq (info/query) stanzas have types get, set, result and error, matched by an id.",
  },
  {
    id: "q5",
    question: "What is federation in XMPP?",
    options: [
      "Encrypting all messages",
      "Servers of different organisations connecting so their users can talk",
      "Splitting large messages",
      "Using one global server",
    ],
    answer: 1,
    explanation: "Like email, XMPP servers connect to each other, so users on different domains can exchange messages.",
  },
  {
    id: "q6",
    question: "What was XMPP originally called?",
    options: ["MQTT", "Jabber", "CoAP", "AMQP"],
    answer: 1,
    explanation: "XMPP began as Jabber in 1999, created by Jeremie Miller.",
  },
  {
    id: "q7",
    question: "What is the main drawback of XMPP for small IoT devices?",
    options: [
      "It has no security",
      "Its XML messages are large and it needs an open TCP connection",
      "It cannot send messages",
      "It only works on Bluetooth",
    ],
    answer: 1,
    explanation: "Verbose XML and a persistent TCP connection cost bandwidth and battery.",
  },
  {
    id: "q8",
    question: "How is XMPP extended with new features, such as for IoT?",
    options: ["Through XEPs", "Through QoS levels", "Through topics", "Through wildcards"],
    answer: 0,
    explanation: "XMPP Extension Protocols (XEPs), such as XEP-0323 for sensor data, add new features.",
  },
];

export default quiz;
