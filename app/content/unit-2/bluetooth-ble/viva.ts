import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is the Bluetooth SIG and what does it do?",
    a: "The Bluetooth Special Interest Group, founded in 1998. It writes the Bluetooth specifications and profiles, assigns UUIDs and qualifies products before they may use the Bluetooth name.",
  },
  {
    q: "What is a piconet and a scatternet?",
    a: "A piconet is one central device with up to seven active peripherals. Piconets that share a device form a scatternet.",
  },
  {
    q: "Why does Bluetooth Classic use frequency hopping?",
    a: "Changing channel 1600 times a second means interference on any one channel affects only a tiny part of the transmission.",
  },
  {
    q: "How does a BLE device get discovered?",
    a: "It sends short advertisements on channels 37, 38 and 39. A phone scanning those channels hears it and can connect.",
  },
  {
    q: "Explain GATT services and characteristics with an example.",
    a: "A service groups related data and a characteristic is one value in it. The Heart Rate service (0x180D) contains Heart Rate Measurement (0x2A37, notify) and Body Sensor Location (0x2A38, read).",
  },
  {
    q: "Differentiate Bluetooth Classic and BLE.",
    a: "Classic streams continuous data such as audio over 79 hopping channels at 1–3 Mbps and uses more power. BLE sends small, infrequent data over 40 channels, connects in milliseconds and runs for months or years on a coin cell.",
  },
  {
    q: "What is a beacon? Give an example.",
    a: "A BLE device that only advertises an ID, such as Apple's iBeacon or Google's Eddystone, so phones nearby can tell which shelf, room or exhibit they are near.",
  },
  {
    q: "What is new in Bluetooth 6.0 that helps distance measurement?",
    a: "Channel Sounding, which measures distance accurately using the signal's phase and timing, instead of estimating it roughly from signal strength.",
  },
];

export default viva;
