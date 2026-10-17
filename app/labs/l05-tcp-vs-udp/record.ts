import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Simulated sensor and server joined by a link with adjustable delay and packet loss",
    "UDP header inspector",
  ],
  theory:
    "TCP and UDP are the two transport protocols of the internet. TCP is connection-oriented: it opens a connection with a three-way handshake, numbers the data, waits for an acknowledgement (ACK) and resends anything that is not acknowledged in time, so every byte arrives in order. UDP is connectionless: it sends each datagram once with an 8-byte header and never resends, so it is faster and lighter but some data can be lost. TCP's reliability costs extra bytes and extra time, especially on a lossy link. Many IoT protocols, such as CoAP, use UDP and add their own light reliability only where it is needed.",
  procedure: [
    "Open lab L05, TCP vs UDP. Set Packet loss to 10% and leave the other settings.",
    "Press Start sending and watch both lanes until the run is complete.",
    "Note the readouts for TCP and UDP and press Record observation.",
    "Set Packet loss to 0%, then 30%. Run and record each time.",
    "Press Try different luck and run again to see a different pattern of losses.",
    "In the UDP header inspector, change the ports and payload and note the header bytes. Tick Damage one bit of the payload and note what the checksum does.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "loss", label: "Loss", unit: "%" },
    { key: "delay", label: "Delay", unit: "ms" },
    { key: "protocol", label: "Protocol" },
    { key: "delivered", label: "Delivered" },
    { key: "lost", label: "Lost" },
    { key: "resent", label: "Resent" },
    { key: "time", label: "Finished at" },
    { key: "bytes", label: "Bytes sent" },
  ],
  resultHint:
    "Compare TCP and UDP at each loss level: readings delivered, resends, time taken and bytes sent. Say which you would use for a live temperature feed and which for a firmware update, and why.",
  viva: [
    {
      q: "Why did TCP deliver every reading even at 30% loss?",
      a: "TCP waits for an ACK for each segment and resends it when the ACK does not come back before the timeout, until it gets through.",
    },
    {
      q: "Why did TCP take longer and send more bytes than UDP?",
      a: "TCP adds a three-way handshake, an ACK for every segment, a 20-byte header instead of 8, and resends after timeouts.",
    },
    {
      q: "What happens to the readings behind a lost TCP segment?",
      a: "They wait in the receiver's buffer, because TCP hands data to the app in order. This is called head-of-line blocking.",
    },
    {
      q: "Name the four fields of the UDP header.",
      a: "Source port, destination port, length and checksum, 2 bytes each, 8 bytes in total.",
    },
    {
      q: "What does the receiver do with a UDP datagram whose checksum is wrong?",
      a: "It throws the datagram away. UDP does not ask for it again; the application must cope with the loss.",
    },
    {
      q: "When is UDP a better choice than TCP for IoT?",
      a: "For small, frequent readings where speed and battery matter more than every single value, such as a temperature sent every few seconds.",
    },
  ],
};

export default record;
