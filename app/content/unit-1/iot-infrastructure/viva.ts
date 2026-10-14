import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What are the five stages of a reference IoT infrastructure?",
    a: "Devices, gateways, network, cloud platform and applications.",
  },
  {
    q: "Explain the smart grid as an IoT infrastructure.",
    a: "Smart meters (devices) send readings to a data concentrator (gateway) over RF mesh or cellular links (network) to the utility's head-end and meter data system (cloud platform), which drives billing portals and recharge apps (applications).",
  },
  {
    q: "Why does a wearable usually use a phone as its gateway?",
    a: "A wearable is small and battery-powered, so it uses low-power Bluetooth Low Energy to reach the phone, which has the internet connection.",
  },
  {
    q: "What services does a connected car offer?",
    a: "Live navigation, automatic crash alerts, remote locking, vehicle health reports and software updates over the air.",
  },
  {
    q: "How is IoT used in supply chains?",
    a: "RFID tags, GPS trackers and temperature loggers on goods let companies see where each shipment is and whether it stayed at the right temperature.",
  },
  {
    q: "Name one advantage and one limitation of large IoT infrastructures.",
    a: "Advantage: remote monitoring replaces manual visits. Limitation: many stages means more points that can fail or be attacked.",
  },
];

export default viva;
