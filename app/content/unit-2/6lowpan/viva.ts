import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is 6LoWPAN and why is it needed?",
    a: "An adaptation layer that carries IPv6 over IEEE 802.15.4 radios. It is needed because 802.15.4 frames hold only 127 bytes, while IPv6 and UDP headers alone take 48 bytes and IPv6 expects 1280-byte packets.",
  },
  {
    q: "Name the main functions of 6LoWPAN.",
    a: "Header compression, fragmentation and reassembly, and mesh addressing for multi-hop forwarding.",
  },
  {
    q: "How does header compression work?",
    a: "It leaves out fields the receiver can work out: the version, zero traffic class and flow label, the length, and addresses built from MAC addresses. IPv6 and UDP headers can shrink from 48 bytes to about 6.",
  },
  {
    q: "Explain 6LoWPAN fragmentation.",
    a: "A packet too big for one frame is split. The first fragment has a 4-byte header with the packet size and a tag; later fragments have a 5-byte header that adds an offset in units of 8 bytes. The receiver reassembles them.",
  },
  {
    q: "Differentiate mesh-under and route-over.",
    a: "Mesh-under forwards packets in the adaptation layer using link addresses, so the mesh looks like one IP link. Route-over forwards at the IP layer, every radio hop is an IP hop, and RPL finds the routes.",
  },
  {
    q: "What is a border router?",
    a: "The device that connects a 6LoWPAN network to IP networks such as Ethernet or Wi-Fi. It compresses and expands headers and routes packets in and out of the mesh.",
  },
  {
    q: "Give a real-world example of 6LoWPAN.",
    a: "Thread, the smart-home mesh used by many Matter devices, runs IPv6 over 6LoWPAN on IEEE 802.15.4 radios.",
  },
];

export default viva;
