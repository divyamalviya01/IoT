import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is HTTP?",
    a: "HyperText Transfer Protocol: a stateless request–response protocol over TCP. A client sends a request with a method and a URL; the server replies with a status code and data.",
  },
  {
    q: "Name four HTTP methods and what they do.",
    a: "GET reads a resource, POST creates or submits data, PUT replaces a resource and DELETE removes it.",
  },
  {
    q: "What do the status code classes 2xx, 4xx and 5xx mean?",
    a: "2xx means success, 4xx means the client made an error (such as 404 Not Found) and 5xx means the server failed (such as 500).",
  },
  {
    q: "What is REST?",
    a: "A style of API design where each thing is a resource with its own URL, acted on with standard HTTP methods and usually exchanged as JSON.",
  },
  {
    q: "What is the difference between polling and a webhook?",
    a: "With polling the client keeps asking whether anything changed. With a webhook the server calls the client's URL only when something happens.",
  },
  {
    q: "Why is HTTP not ideal for constrained IoT devices?",
    a: "Its text headers are large, it needs TCP connections and TLS handshakes, and it cannot push updates, so devices waste bandwidth and battery.",
  },
];

export default viva;
