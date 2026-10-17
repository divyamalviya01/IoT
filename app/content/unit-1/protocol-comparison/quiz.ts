import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Which protocol has the smallest fixed header?",
    options: ["HTTP", "XMPP", "MQTT", "AMQP"],
    answer: 2,
    explanation: "MQTT's minimum header is 2 bytes. CoAP's fixed header is 4 bytes; HTTP and XMPP use long text.",
  },
  {
    id: "q2",
    question: "Which protocol runs over UDP?",
    options: ["MQTT", "CoAP", "HTTP", "XMPP"],
    answer: 1,
    explanation: "CoAP uses UDP. The others use TCP.",
  },
  {
    id: "q3",
    question: "Which protocol has built-in presence (online/offline status)?",
    options: ["XMPP", "CoAP", "HTTP", "AMQP"],
    answer: 0,
    explanation: "Presence is a core feature of XMPP.",
  },
  {
    id: "q4",
    question: "A thousand sensors stream readings to a cloud dashboard. Which protocol fits best?",
    options: ["MQTT", "XMPP", "FTP", "AMQP"],
    answer: 0,
    explanation: "MQTT is light, publish–subscribe and supported by every major IoT cloud.",
  },
  {
    id: "q5",
    question: "Which protocol cannot push updates to a client on its own?",
    options: ["MQTT", "CoAP with Observe", "HTTP/1.1", "XMPP"],
    answer: 2,
    explanation: "HTTP/1.1 is pure request–response; updates need polling, webhooks or WebSockets.",
  },
  {
    id: "q6",
    question: "Which security protocol does CoAP use?",
    options: ["TLS", "DTLS", "SSH", "WEP"],
    answer: 1,
    explanation: "Because it runs over UDP, CoAP is secured with DTLS.",
  },
  {
    id: "q7",
    question: "Which protocol is mainly used for reliable queues between business systems?",
    options: ["AMQP", "CoAP", "MQTT-SN", "BLE"],
    answer: 0,
    explanation: "AMQP routes messages into queues with guaranteed delivery, which suits back-end systems.",
  },
  {
    id: "q8",
    question: "What is the default port for MQTT without TLS?",
    options: ["80", "1883", "5222", "5683"],
    answer: 1,
    explanation: "MQTT uses 1883; HTTP 80; XMPP 5222; CoAP 5683.",
  },
  {
    id: "q9",
    question: "Why might a battery sensor on a lossy mesh prefer CoAP over MQTT?",
    options: [
      "CoAP has larger headers",
      "CoAP needs no TCP connection, so the device can wake, send one packet and sleep",
      "CoAP uses XML",
      "CoAP needs a broker",
    ],
    answer: 1,
    explanation: "UDP avoids the TCP handshake and keep-alive traffic, saving energy.",
  },
];

export default quiz;
