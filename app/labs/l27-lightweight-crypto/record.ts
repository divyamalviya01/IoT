import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Cost model for five ciphers on an Arduino Uno (ATmega328P), an ESP32 and a Raspberry Pi 4, with LoRa radio energy for comparison (illustrative figures)",
  ],
  theory:
    "The time to protect a message is roughly cycles = setup + cycles-per-byte × message size, and time = cycles ÷ clock speed. Energy = time × power. Lightweight ciphers such as SPECK and Ascon are cheap on 8-bit chips; AES is fastest when the chip has AES hardware (ESP32); ChaCha20 is fast on processors without AES instructions (Raspberry Pi 4); PRESENT is designed for hardware and slow in software. Authenticated encryption (AES-GCM, ChaCha20-Poly1305, Ascon) also detects changes. For public keys, ECC is far cheaper than RSA. Encrypting a short message costs much less energy than sending it by radio.",
  procedure: [
    "Open lab L27, Lightweight crypto cost estimator. Keep AES-128-GCM, Arduino Uno, 64 bytes and 96 messages a day; read the readouts and press Record observation.",
    "Record Ascon-AEAD128 and SPECK-64/128 on the Uno.",
    "Choose the ESP32 and record AES-128-GCM and ChaCha20-Poly1305; repeat on the Raspberry Pi 4.",
    "Compare 16-byte and 256-byte messages and look at the crypto-versus-radio energy bar.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "algo", label: "Algorithm" },
    { key: "device", label: "Device" },
    { key: "bytes", label: "Message", unit: "bytes" },
    { key: "time", label: "Time / message" },
    { key: "energy", label: "Energy / message" },
    { key: "perDay", label: "Messages / day" },
    { key: "battery", label: "Battery / year" },
  ],
  resultHint:
    "State which cipher was cheapest on each device and why, how message size changed the cost per byte, and how encryption energy compares with radio energy.",
  viva: [
    {
      q: "How is the time to encrypt a message estimated?",
      a: "Cycles = setup cycles + cycles per byte × message size; time = cycles ÷ clock speed; energy = time × power.",
    },
    {
      q: "Why was SPECK or Ascon cheaper than AES-GCM on the Arduino Uno?",
      a: "The Uno is an 8-bit chip with no AES hardware; lightweight ciphers use simple operations that small processors handle quickly.",
    },
    {
      q: "Why did AES-GCM win on the ESP32?",
      a: "The ESP32 has an AES hardware accelerator, which makes AES much faster than any software cipher.",
    },
    {
      q: "Why did ChaCha20 beat AES on the Raspberry Pi 4?",
      a: "The Pi 4's CPU has no AES instructions, and ChaCha20 runs fast in plain software.",
    },
    {
      q: "Why is the cost per byte higher for small messages?",
      a: "Each message has a fixed setup cost (key schedule, nonce, tag), which is spread over fewer bytes.",
    },
    {
      q: "Should a battery sensor skip encryption to save energy?",
      a: "No. Encrypting a short message uses a tiny fraction of the energy needed to send it by radio, so the saving would be negligible and the risk large.",
    },
  ],
};

export default record;
