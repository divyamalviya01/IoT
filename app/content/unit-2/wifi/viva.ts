import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is Wi-Fi?",
    a: "The brand name for wireless LANs built on IEEE 802.11 standards. Devices connect through an access point and get IP addresses.",
  },
  {
    q: "Name the Wi-Fi generations with their bands.",
    a: "802.11b and g at 2.4 GHz, 802.11a at 5 GHz, 802.11n (Wi-Fi 4) at 2.4 and 5 GHz, 802.11ac (Wi-Fi 5) at 5 GHz only, 802.11ax (Wi-Fi 6/6E) at 2.4, 5 and 6 GHz, and 802.11be (Wi-Fi 7).",
  },
  {
    q: "Why are channels 1, 6 and 11 used in 2.4 GHz?",
    a: "Channel centres are 5 MHz apart but each channel is about 20–22 MHz wide, so neighbouring channels overlap. Only 1, 6 and 11 are far enough apart not to.",
  },
  {
    q: "Differentiate co-channel and adjacent-channel interference.",
    a: "Co-channel: access points on the same channel hear each other and take turns, sharing the airtime. Adjacent-channel: partly overlapping channels cannot decode each other, so they transmit over each other and corrupt signals, which is worse.",
  },
  {
    q: "Compare infrastructure and ad-hoc modes.",
    a: "In infrastructure mode devices connect through an access point. In ad-hoc mode devices connect directly with no access point. Wi-Fi Direct is a modern direct-link option.",
  },
  {
    q: "Why is Wi-Fi difficult for battery IoT devices, and what helps?",
    a: "Joining and staying connected use a lot of power. Power-save mode, Target Wake Time in Wi-Fi 6, deep sleep between readings and Wi-Fi HaLow all help.",
  },
  {
    q: "What is Wi-Fi HaLow?",
    a: "IEEE 802.11ah: Wi-Fi below 1 GHz for IoT, reaching about a kilometre at lower data rates and low power.",
  },
];

export default viva;
