import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "Name the four IoT communication patterns.",
    a: "Request–response, publish–subscribe, push–pull and exclusive pair.",
  },
  {
    q: "Explain the request–response pattern. What is its main weakness for monitoring?",
    a: "A client sends a request and a stateless server sends a response, as in HTTP REST or CoAP. To watch a value the client must poll again and again, which wastes messages and can miss changes that happen between polls.",
  },
  {
    q: "What is the role of the broker in publish–subscribe?",
    a: "It receives every published message and forwards a copy to each client subscribed to the message's topic, so publishers and subscribers never deal with each other directly.",
  },
  {
    q: "Explain the push–pull pattern with an example.",
    a: "Producers push messages into a queue and consumers pull them when they are ready. For example, cameras push images into a queue and three servers pull images one at a time to analyse them. Each image goes to one server, and the queue holds images when the servers are busy.",
  },
  {
    q: "What is the exclusive pair pattern?",
    a: "A client and server keep one long-lived, full-duplex connection open, so either can send at any time. WebSocket is the usual example. The server is stateful because it must remember every open connection.",
  },
  {
    q: "Which patterns are stateless and which are stateful?",
    a: "Request–response is stateless. Exclusive pair is stateful, because the server holds each connection. A publish–subscribe broker also keeps state: subscriptions and, for persistent sessions, stored messages.",
  },
  {
    q: "What happens to readings for an app that goes offline, in publish–subscribe and in exclusive pair?",
    a: "An MQTT broker with a persistent session keeps QoS 1 and 2 messages and delivers them when the app reconnects, late but complete. A WebSocket server has no connection to send on, so readings sent while the app is away are lost.",
  },
  {
    q: "Name the four IoT communication models.",
    a: "Device-to-device, device-to-cloud, device-to-gateway and back-end data sharing (RFC 7452).",
  },
];

export default viva;
