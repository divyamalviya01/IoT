import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "LoRa time-on-air calculator (Semtech AN1200.13 formula) with an illustrative link-budget range model",
  ],
  theory:
    "LoRa sends data as chirps whose length is set by the spreading factor (SF7 to SF12). Each step up doubles the chirp time, so the receiver can hear weaker signals and the range grows, but the data rate halves and every message stays on air longer. Time on air is calculated from the spreading factor, the bandwidth and the number of bytes, including 13 bytes of LoRaWAN overhead. Radio rules limit airtime: Europe's EU868 band allows 1 % (about 864 s a day), while networks such as The Things Network ask for at most 30 s a day. India's IN865 band has no duty-cycle limit but limits power.",
  procedure: [
    "Open lab L19, LoRa airtime and range calculator. Set the spreading factor to SF7, the bandwidth to 125 kHz and the application data to 10 bytes. Press Record observation.",
    "Change the spreading factor to SF10 and then SF12, pressing Record observation each time.",
    "At SF12, raise the application data to 60 bytes, note the warning, and set it back to 10 bytes.",
    "At SF12, change the bandwidth to 500 kHz and press Record observation.",
    "Switch the airtime rule to TTN 30 s/day and note the messages per day.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "sf", label: "SF" },
    { key: "bw", label: "Bandwidth", unit: "kHz" },
    { key: "app", label: "Data", unit: "bytes" },
    { key: "airtime", label: "Time on air" },
    { key: "perDay", label: "Messages per day" },
    { key: "rule", label: "Rule" },
    { key: "range", label: "Range", unit: "km" },
  ],
  resultHint:
    "Describe how time on air, messages per day and range changed with the spreading factor and the bandwidth. Say which setting you would choose for a sensor 2 km from the gateway and why.",
  viva: [
    {
      q: "Why did the time on air roughly double at each spreading factor?",
      a: "Each step up doubles the length of every chirp (2^SF divided by the bandwidth), so the same message takes about twice as long.",
    },
    {
      q: "Why does a higher spreading factor reach farther?",
      a: "Longer chirps let the receiver pick out weaker signals, about 2.5 dB weaker per step, so the link works over a longer distance.",
    },
    {
      q: "Why did 500 kHz shorten the time on air but also the range?",
      a: "A wider band makes chirps shorter, but the receiver also picks up more noise, so it needs a stronger signal (about 3 dB more for each doubling).",
    },
    {
      q: "Why does LoRaWAN add 13 bytes to every message?",
      a: "For the LoRaWAN header, device address, frame counter, port and message integrity code that protect and route the message.",
    },
    {
      q: "How many SF12 messages of 10 bytes are allowed per day under the 1 % rule?",
      a: "About 582: 864 s of airtime a day divided by about 1.48 s per message. Under The Things Network's 30 s rule, only about 20.",
    },
    {
      q: "What does adaptive data rate do?",
      a: "The network tells devices close to a gateway to use a lower spreading factor, which saves their airtime and battery while keeping the link reliable.",
    },
  ],
};

export default record;
