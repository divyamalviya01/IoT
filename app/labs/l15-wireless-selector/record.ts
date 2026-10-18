import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Wireless technology selector covering NFC, BLE, Bluetooth Classic, Zigbee, Wi-Fi and LoRaWAN (typical values)",
  ],
  theory:
    "No wireless technology is best at everything, because range, data rate and power trade against each other. A technology is ruled out if it cannot reach far enough, cannot carry the data rate, or cannot talk to a phone when that is required. The rest are compared on power (which matters more the longer the battery must last), cost, mesh support, IP support and how well their typical range fits the need. Typical answers: NFC for tap-to-pay, BLE for wearables, Zigbee for home lighting meshes, Wi-Fi for cameras and LoRaWAN for farms spread over kilometres.",
  procedure: [
    "Open lab L15, Wireless technology selector, and choose the Farm soil sensors scenario. Read the reasons and press Record observation.",
    "Choose each of the other scenarios in turn (Fitness band, Tap-to-pay counter, CCTV camera, Home lighting) and record each.",
    "Choose Home lighting, untick Mesh needed and record the new ranking.",
    "Set your own needs with the Range needed and Data rate needed sliders, Power and Cost per device, and record the result.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "scenario", label: "Scenario" },
    { key: "range", label: "Range needed" },
    { key: "rate", label: "Data rate needed" },
    { key: "battery", label: "Power" },
    { key: "winner", label: "Best fit" },
    { key: "runnerUp", label: "Runner-up" },
    { key: "ruledOut", label: "Ruled out" },
  ],
  resultHint:
    "For each scenario, state the best technology and the main reason it won, and explain why at least one other technology was ruled out.",
  viva: [
    {
      q: "Why was LoRaWAN the only choice for the farm?",
      a: "Every other technology reaches at most about 100 m, but the farm needs 5 km. LoRaWAN reaches kilometres at very low power.",
    },
    {
      q: "Why did BLE beat Bluetooth Classic for the fitness band?",
      a: "Both reach the phone, but BLE uses much less power, which matters for a battery that must last weeks.",
    },
    {
      q: "Why was Wi-Fi the only choice for the CCTV camera?",
      a: "HD video needs about 4 Mbps; only Wi-Fi can carry that, and the camera is mains-powered, so Wi-Fi's power use does not matter.",
    },
    {
      q: "What changed when Mesh needed was unticked for home lighting?",
      a: "Zigbee lost its mesh advantage, so other technologies scored closer to it; the mesh is what makes Zigbee the clear choice for many bulbs across a house.",
    },
    {
      q: "Why is NFC suitable for tap-to-pay?",
      a: "Its range of a few centimetres means a payment happens only when the card or phone is deliberately brought close, and it is cheap.",
    },
    {
      q: "Name the criteria used to choose a wireless technology.",
      a: "Range, data rate, power, cost, topology (mesh), whether a phone must connect, IP support, frequency band and security.",
    },
  ],
};

export default record;
