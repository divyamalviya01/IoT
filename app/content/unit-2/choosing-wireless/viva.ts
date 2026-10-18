import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "List the criteria for selecting a wireless technology for IoT.",
    a: "Range, data rate, power consumption, cost, topology, frequency band, network size and security.",
  },
  {
    q: "Why are there so many IoT wireless technologies?",
    a: "Range, data rate and power trade against each other, so each technology chooses a different balance for a different kind of application.",
  },
  {
    q: "Which technology would you choose for a fitness band, and why?",
    a: "BLE: it uses very little power, phones support it directly, and its range of a few metres is enough to reach the owner's phone.",
  },
  {
    q: "Why is LoRaWAN not suitable for a CCTV camera?",
    a: "Its data rate is only a few kbps, far too low for video, which needs several Mbps. Wi-Fi suits the camera.",
  },
  {
    q: "What is an ISM band? Give two examples.",
    a: "A licence-free radio band anyone may use within power limits, such as 2.4 GHz worldwide and 865–867 MHz in India.",
  },
  {
    q: "Why do lower frequencies give longer range?",
    a: "Lower-frequency signals lose less energy over distance and pass through walls and vegetation better than higher frequencies.",
  },
  {
    q: "Which technologies form a mesh, and why does it matter?",
    a: "Zigbee and Thread (and Bluetooth Mesh) form meshes. Devices relay for each other, so the network covers a whole building and survives when one device fails.",
  },
  {
    q: "Can one IoT system use more than one wireless technology? Give an example.",
    a: "Yes. A smart city may use LoRaWAN for meters, a mesh for street lights, Wi-Fi or fibre for cameras and NFC cards for bus fares.",
  },
];

export default viva;
