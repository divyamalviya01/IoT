import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is UDP?",
    a: "User Datagram Protocol: a connectionless transport protocol that sends datagrams without setup, acknowledgements or retransmission. It is fast and light, with an 8-byte header.",
  },
  {
    q: "Name the fields of the UDP header.",
    a: "Source port, destination port, length and checksum, each 2 bytes.",
  },
  {
    q: "Explain the TCP three-way handshake.",
    a: "The client sends SYN, the server replies with SYN-ACK, and the client answers with ACK. After these three messages the connection is open and data can flow.",
  },
  {
    q: "Why is UDP called unreliable?",
    a: "It does not confirm delivery or resend lost datagrams, and datagrams may arrive out of order.",
  },
  {
    q: "Give two IoT situations where UDP is suitable and one where TCP is needed.",
    a: "UDP: frequent temperature readings and live video from a camera. TCP: a firmware update or a door-unlock command that must arrive.",
  },
  {
    q: "Which application protocols use TCP and which use UDP?",
    a: "TCP: HTTP, MQTT and XMPP. UDP: CoAP, DNS and most voice and video calls.",
  },
];

export default viva;
