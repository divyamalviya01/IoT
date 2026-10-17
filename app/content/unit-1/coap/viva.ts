import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is CoAP?",
    a: "Constrained Application Protocol (RFC 7252): a lightweight, REST-style protocol for small devices that uses GET, POST, PUT and DELETE on URLs, running over UDP with a 4-byte header.",
  },
  {
    q: "Name the four CoAP message types.",
    a: "CON (confirmable), NON (non-confirmable), ACK (acknowledgement) and RST (reset).",
  },
  {
    q: "How does CoAP make delivery reliable over UDP?",
    a: "Confirmable messages must be acknowledged. If no ACK arrives, the sender resends with exponential back-off, starting at about 2–3 seconds and doubling, up to 4 retries.",
  },
  {
    q: "Give three differences between CoAP and HTTP.",
    a: "CoAP uses UDP while HTTP uses TCP; CoAP has a 4-byte binary header while HTTP uses large text headers; CoAP supports Observe and multicast, which HTTP does not.",
  },
  {
    q: "What is the Observe option?",
    a: "A client sends one GET with Observe, and the server then notifies it every time the resource changes, so the client does not need to poll.",
  },
  {
    q: "Which ports does CoAP use?",
    a: "UDP port 5683, and 5684 when secured with DTLS.",
  },
];

export default viva;
