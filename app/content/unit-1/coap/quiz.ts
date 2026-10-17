import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Which transport protocol does CoAP use?",
    options: ["TCP", "UDP", "HTTP", "Zigbee"],
    answer: 1,
    explanation: "CoAP runs over UDP and adds its own optional reliability.",
  },
  {
    id: "q2",
    question: "How big is the CoAP fixed header?",
    options: ["2 bytes", "4 bytes", "8 bytes", "20 bytes"],
    answer: 1,
    explanation: "It has version, type, token length, code (1 byte) and message ID (2 bytes): 4 bytes in total.",
  },
  {
    id: "q3",
    question: "Which CoAP message type must be acknowledged?",
    options: ["NON", "CON", "RST", "ACK"],
    answer: 1,
    explanation: "Confirmable (CON) messages are resent until the receiver sends an ACK.",
  },
  {
    id: "q4",
    question: "What does the CoAP response code 2.05 mean?",
    options: ["Not Found", "Created", "Content (here is the data)", "Server error"],
    answer: 2,
    explanation: "2.05 Content carries the requested data, like HTTP 200 OK.",
  },
  {
    id: "q5",
    question: "What happens to the wait time each time a CON message is resent?",
    options: ["It stays the same", "It doubles", "It halves", "It becomes zero"],
    answer: 1,
    explanation: "CoAP uses exponential back-off: about 2–3 s first, then doubling each try.",
  },
  {
    id: "q6",
    question: "Which CoAP feature lets a server push changes without polling?",
    options: ["Block-wise transfer", "Observe", "Reset", "Multicast"],
    answer: 1,
    explanation: "After a GET with the Observe option, the server sends a notification each time the resource changes.",
  },
  {
    id: "q7",
    question: "Which request lists the resources a CoAP device offers?",
    options: ["GET /index.html", "GET /.well-known/core", "POST /list", "DELETE /core"],
    answer: 1,
    explanation: "Resource discovery uses GET /.well-known/core, which returns links in the CoRE Link Format.",
  },
  {
    id: "q8",
    question: "Which security protocol is used with CoAP?",
    options: ["TLS over TCP", "DTLS", "SSH", "WPA2"],
    answer: 1,
    explanation: "Because CoAP uses UDP, it is secured with DTLS (Datagram TLS), on port 5684.",
  },
  {
    id: "q9",
    question: "What is a piggybacked response?",
    options: [
      "A response split into blocks",
      "A response carried inside the ACK of a CON request",
      "A response sent by multicast",
      "A response that is lost",
    ],
    answer: 1,
    explanation: "When the server can answer at once, it puts the response in the ACK, saving a message.",
  },
];

export default quiz;
