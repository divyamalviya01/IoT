import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "Compare MQTT and CoAP.",
    a: "MQTT is publish–subscribe over TCP through a broker, with QoS 0/1/2. CoAP is request–response (REST) over UDP with a 4-byte header, CON/NON messages and Observe for push.",
  },
  {
    q: "Why is HTTP not the first choice for small IoT devices?",
    a: "Its text headers are large, it needs TCP connections and TLS handshakes, and it cannot push updates without polling or webhooks.",
  },
  {
    q: "Which protocol would you choose for battery sensors on a 6LoWPAN mesh, and why?",
    a: "CoAP, because it runs over UDP with a tiny header and needs no connection to be kept open.",
  },
  {
    q: "Give the default ports of MQTT, CoAP, HTTP and XMPP.",
    a: "MQTT 1883, CoAP 5683, HTTP 80 and XMPP 5222.",
  },
  {
    q: "Why do real IoT systems often use several protocols?",
    a: "Each part has different needs: tiny devices need CoAP or Zigbee, gateways send telemetry with MQTT, apps use HTTP APIs and back ends use queues such as AMQP.",
  },
  {
    q: "Which protocols support server push?",
    a: "MQTT, CoAP (with Observe), XMPP and AMQP. HTTP/1.1 does not.",
  },
];

export default viva;
