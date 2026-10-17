import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What does XMPP stand for?",
    a: "Extensible Messaging and Presence Protocol. It began as Jabber in 1999 and was standardised by the IETF as RFC 6120.",
  },
  {
    q: "What is a JID? Give an example.",
    a: "A Jabber ID, the address of an XMPP user or device, in the form local@domain/resource, for example sensor1@home.example/kitchen.",
  },
  {
    q: "Name and explain the three XMPP stanzas.",
    a: "message pushes a message to someone, presence announces availability, and iq is a request–response pair (get/set with a matching result).",
  },
  {
    q: "What is federation?",
    a: "Servers run by different organisations connecting to each other, so users and devices on different domains can exchange messages, like email.",
  },
  {
    q: "Compare XMPP and MQTT.",
    a: "XMPP uses verbose XML, has built-in presence, request–response and federation, and addresses devices by JID. MQTT uses compact binary messages and publish–subscribe through a broker, addressed by topics.",
  },
  {
    q: "Which ports does XMPP use?",
    a: "TCP port 5222 for client-to-server connections and 5269 for server-to-server connections.",
  },
];

export default viva;
