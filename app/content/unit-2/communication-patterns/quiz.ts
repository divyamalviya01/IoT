import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "In which pattern does the server keep no memory of the client between messages?",
    options: ["Exclusive pair", "Request–response", "Publish–subscribe with persistent sessions", "None of these"],
    answer: 1,
    explanation: "Request–response is stateless: each request is complete in itself and the server forgets it after answering.",
  },
  {
    id: "q2",
    question: "Why can polling (request–response) miss a reading?",
    options: [
      "The server deletes old readings every second",
      "If a value changes twice between two polls, the app only sees the newer value",
      "Requests are always lost",
      "Polling uses UDP",
    ],
    answer: 1,
    explanation: "The app learns only what the value is at each poll. A change that is replaced before the next poll is never seen.",
  },
  {
    id: "q3",
    question: "In publish–subscribe, a sensor publishes one reading and three apps subscribe to its topic. How many copies does the broker send?",
    options: ["One", "Two", "Three", "None"],
    answer: 2,
    explanation: "The broker sends one copy to every matching subscriber, so three apps get three copies.",
  },
  {
    id: "q4",
    question: "How does push–pull differ from publish–subscribe?",
    options: [
      "In push–pull each message goes to one consumer, and consumers pull when ready",
      "Push–pull sends every message to every consumer",
      "Push–pull needs no server",
      "There is no difference",
    ],
    answer: 0,
    explanation: "Push–pull uses a queue: each message is taken by one consumer, which pulls it when it is free.",
  },
  {
    id: "q5",
    question: "What happens in push–pull when readings arrive faster than the workers can process them?",
    options: [
      "Readings are thrown away",
      "The queue grows, so readings wait longer but are not lost",
      "The sensors stop sending",
      "Each worker gets every reading",
    ],
    answer: 1,
    explanation: "The queue stores readings until a worker is free. The backlog grows and delay rises, but nothing is lost.",
  },
  {
    id: "q6",
    question: "Which protocol is the usual example of the exclusive pair pattern?",
    options: ["HTTP", "MQTT", "WebSocket", "CoAP"],
    answer: 2,
    explanation: "A WebSocket keeps one full-duplex connection open, so both sides can send at any time.",
  },
  {
    id: "q7",
    question: "Why is an exclusive-pair server called stateful?",
    options: [
      "It stores every reading forever",
      "It must remember every open connection",
      "It uses a state machine for each message",
      "It runs only in one state",
    ],
    answer: 1,
    explanation: "The server keeps each client's connection open and must remember it, which costs memory for every client.",
  },
  {
    id: "q8",
    question: "A phone app shows a live dashboard and also switches a fan instantly. Which pattern fits best?",
    options: ["Request–response with polling every minute", "Push–pull", "Exclusive pair", "Broadcast"],
    answer: 2,
    explanation: "Exclusive pair gives instant updates in both directions over one open connection.",
  },
  {
    id: "q9",
    question: "A BLE fitness band sends its data to the cloud through a phone app. Which communication model is this?",
    options: ["Device-to-device", "Device-to-cloud", "Device-to-gateway", "Back-end data sharing"],
    answer: 2,
    explanation: "The phone acts as a gateway between the short-range band and the cloud.",
  },
  {
    id: "q10",
    question: "Which pattern needs an always-on broker that matches topics?",
    options: ["Request–response", "Publish–subscribe", "Exclusive pair", "Point-to-point"],
    answer: 1,
    explanation: "Publish–subscribe depends on a broker that forwards each message to the subscribers of its topic.",
  },
];

export default quiz;
