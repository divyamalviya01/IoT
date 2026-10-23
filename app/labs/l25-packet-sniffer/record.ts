import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Simulated home network: a smart door lock, a phone app and an MQTT broker, with a packet sniffer on the same Wi-Fi (real MQTT bytes and real AES-GCM encryption)",
  ],
  theory:
    "Plain MQTT (port 1883) sends every byte as readable text, including the username and password in the CONNECT packet and every topic and message. Anyone on the same network can capture and read it (eavesdropping) and can also change it on the way (tampering). MQTT over TLS (port 8883) first runs a handshake to agree keys, then sends each MQTT packet inside an encrypted TLS record: a 5-byte header, the ciphertext and a 16-byte authentication tag. An eavesdropper sees only addresses, ports, sizes and timing (metadata). If any byte is changed, the tag check fails and the receiver throws the record away.",
  procedure: [
    "Open lab L25, Packet sniffer. Keep Plain MQTT and press Capture. Click the CONNECT packets and read the hex dump.",
    "Read \"What the eavesdropper learned\", press \"Change the lock command\" and press Record observation.",
    "Switch to MQTT over TLS, capture again and inspect the packets.",
    "Change the lock command again and press Record observation.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "mode", label: "Mode" },
    { key: "packets", label: "Packets" },
    { key: "password", label: "Password seen" },
    { key: "readable", label: "Readable messages" },
    { key: "bytes", label: "Bytes on wire" },
    { key: "overhead", label: "Extra vs plain" },
    { key: "tamper", label: "Changed command" },
  ],
  resultHint: "State what the sniffer could read in each mode, what stayed visible with TLS, the byte overhead of TLS, and what happened when the command was changed.",
  viva: [
    {
      q: "What did the sniffer see in plain MQTT?",
      a: "The username and password in the CONNECT packets, every topic, and every message, including the door commands and battery level.",
    },
    {
      q: "What could the sniffer still see with TLS?",
      a: "Only metadata: which addresses talked, the port 8883, the size of each packet and when it was sent. Not the passwords, topics or messages.",
    },
    {
      q: "Why did the TLS door refuse the changed command?",
      a: "Each TLS record carries an AES-GCM authentication tag. Changing any byte makes the tag check fail, so the receiver throws the record away.",
    },
    {
      q: "What is the structure of a TLS application data record?",
      a: "A 5-byte header (type 23, version, length), then the encrypted data plus one content-type byte, then a 16-byte authentication tag.",
    },
    {
      q: "Why did TLS send more bytes?",
      a: "Mainly because of the handshake at the start of each connection, which includes the server's certificate; each record also adds 22 bytes.",
    },
    {
      q: "Is encrypting MQTT enough on its own?",
      a: "No. Each device should also have its own login or certificate, the broker should check them, and devices must verify the broker's certificate to stop a man-in-the-middle.",
    },
  ],
};

export default record;
