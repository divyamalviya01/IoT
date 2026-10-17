import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "A simulated sensor that sends the same reading with CoAP, MQTT, XMPP and HTTP over one network link with adjustable loss and delay",
  ],
  theory:
    "MQTT, CoAP, HTTP and XMPP can all carry the same sensor reading, but they wrap it in very different amounts of extra data. CoAP has a 4-byte header and runs over UDP, MQTT has a 2-byte header over a TCP connection, while HTTP and XMPP send text or XML that can be far bigger than the reading itself. TCP resends lost segments, so TCP-based protocols deliver every reading but take longer on a lossy link; CoAP CON resends with its own timers, and CoAP NON does not resend at all. Protocols that keep a connection open pay a one-time setup cost that all readings share, while opening a new connection for every reading repeats the handshake each time. On a battery device both bytes and packets cost energy, because every packet wakes the radio.",
  procedure: [
    "Open lab L11, Protocol race. Keep Readings to send at 200, the Sensor reading at 28.5, Packet loss at 0% and One-way delay at 50 ms, with every protocol ticked under Protocols in the race.",
    "Press Start race and watch which lane finishes first. Press Record observation.",
    "Change Readings to send from 200 to 2. Note which protocols use more bytes per reading and check the Setup column in the results table. Record an observation, then set Readings to send back to 200.",
    "Raise Packet loss to 20%. Press Start race again and press Record observation. Note which lane lost readings.",
    "Compare the Average delay chart at 0% and 20% loss.",
    "Make the Sensor reading longer, for example {\"t\":28.5,\"h\":61}, and see how the bytes per reading change.",
    "Press Open lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "loss", label: "Loss", unit: "%" },
    { key: "delay", label: "One-way delay", unit: "ms" },
    { key: "readings", label: "Readings" },
    { key: "size", label: "Reading size", unit: "B" },
    { key: "protocol", label: "Protocol" },
    { key: "bytes", label: "Bytes per reading", unit: "B" },
    { key: "delivered", label: "Delivered", unit: "%" },
    { key: "avgDelay", label: "Average delay", unit: "ms" },
    { key: "energy", label: "Energy per reading", unit: "units" },
  ],
  resultHint:
    "Name the protocols that used the fewest and the most bytes per reading, say which protocol lost readings when packets were lost, and explain how connection setup and resends changed the bytes, delay and energy.",
  viva: [
    {
      q: "Why did MQTT QoS 0 still deliver every reading when packets were lost?",
      a: "MQTT runs over TCP, and TCP resends lost segments. So even QoS 0 readings arrive, only later.",
    },
    {
      q: "Why did CoAP NON lose readings on a lossy link?",
      a: "A NON message is one UDP datagram that is never acknowledged or resent. If the network drops it, the reading is gone.",
    },
    {
      q: "Why is HTTP with a new connection for every reading so costly?",
      a: "Each reading needs a TCP handshake, a text request and response, and four packets to close. That is 8 packets and about 460 bytes for a 4-byte reading.",
    },
    {
      q: "Why did XMPP and MQTT use many more bytes per reading when only 2 readings were sent?",
      a: "They must open a TCP connection, and XMPP must also open a stream and log in, before the first reading. This one-time setup is shared by fewer readings, so each reading carries a bigger share.",
    },
    {
      q: "CoAP CON and MQTT both delivered everything at 20% loss. Why was CoAP CON's average delay much longer?",
      a: "CoAP CON waits 2 to 3 seconds before it resends, and doubles the wait each time. TCP in this lab resends much sooner, after about 200 ms on a 50 ms link.",
    },
    {
      q: "Why does the lab count energy per packet as well as per byte?",
      a: "Every packet wakes the radio, which costs energy even for a tiny packet. Protocols that send many small packets, such as ACKs and handshakes, drain the battery faster.",
    },
  ],
};

export default record;
