import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Which HTTP method should read a sensor value without changing anything?",
    options: ["GET", "POST", "PUT", "DELETE"],
    answer: 0,
    explanation: "GET only reads a resource. POST, PUT and DELETE change something on the server.",
  },
  {
    id: "q2",
    question: "What does status code 404 mean?",
    options: ["Success", "Not found", "Server error", "Unauthorized"],
    answer: 1,
    explanation: "404 Not Found means there is no resource at that path.",
  },
  {
    id: "q3",
    question: "Status codes starting with 5 mean…",
    options: [
      "The request succeeded",
      "The client made a mistake",
      "The server failed",
      "The request was redirected",
    ],
    answer: 2,
    explanation: "5xx codes, such as 500 Internal Server Error, mean the server failed to handle a valid request.",
  },
  {
    id: "q4",
    question: "Which method replaces an LED's state with {\"state\":\"on\"}?",
    options: ["GET", "PUT", "HEAD", "OPTIONS"],
    answer: 1,
    explanation: "PUT replaces the resource with the data in the request body.",
  },
  {
    id: "q5",
    question: "Why is HTTP described as stateless?",
    options: [
      "It never stores data",
      "Each request is handled on its own and must carry everything the server needs",
      "It has no status codes",
      "It cannot run on devices",
    ],
    answer: 1,
    explanation: "The server does not remember previous requests, so each request is independent.",
  },
  {
    id: "q6",
    question: "What is polling?",
    options: [
      "The server pushing updates to the client",
      "The client asking again and again whether anything has changed",
      "Encrypting requests",
      "Compressing headers",
    ],
    answer: 1,
    explanation: "Polling repeats requests on a timer, which wastes requests when nothing changes.",
  },
  {
    id: "q7",
    question: "Which approach lets a server notify an app the moment something happens?",
    options: ["Polling", "A webhook", "A 404 response", "A GET request"],
    answer: 1,
    explanation: "With a webhook, the server calls the app's URL only when there is news.",
  },
  {
    id: "q8",
    question: "Which port does HTTPS use by default?",
    options: ["80", "443", "1883", "5683"],
    answer: 1,
    explanation: "HTTPS uses port 443. Plain HTTP uses port 80.",
  },
  {
    id: "q9",
    question: "Why is HTTP/1.1 heavy for small IoT devices?",
    options: [
      "It uses UDP",
      "Its text headers are large and it needs TCP connections",
      "It has no security",
      "It only works on Wi-Fi",
    ],
    answer: 1,
    explanation: "Text headers of hundreds of bytes and TCP handshakes cost bandwidth and battery for tiny readings.",
  },
];

export default quiz;
