import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is an LPWAN? Give two examples.",
    a: "A Low-Power Wide-Area Network that sends small amounts of data over kilometres on batteries that last years, such as LoRaWAN and Sigfox (NB-IoT is a cellular example).",
  },
  {
    q: "Differentiate LoRa and LoRaWAN.",
    a: "LoRa is the physical-layer radio modulation (chirp spread spectrum) from Semtech. LoRaWAN is the network protocol from the LoRa Alliance that defines gateways, the network server, device classes and security.",
  },
  {
    q: "What is chirp spread spectrum?",
    a: "A modulation in which each symbol is a chirp whose frequency sweeps across the whole channel. It lets the receiver decode signals even below the noise level and resists interference.",
  },
  {
    q: "Explain the spreading factor trade-off.",
    a: "From SF7 to SF12, each step doubles the chirp time. The receiver can then hear weaker signals, so range grows, but the data rate halves and messages stay on air longer, using more battery.",
  },
  {
    q: "Describe the LoRaWAN architecture.",
    a: "A star of stars: end devices send over LoRa to every gateway in range; gateways forward packets over IP to a network server, which removes duplicates, manages security and data rates, and passes data to application servers. Devices never relay for each other.",
  },
  {
    q: "Explain LoRaWAN device classes A, B and C.",
    a: "Class A devices listen only in two short receive windows after each uplink (lowest power). Class B add scheduled receive slots synchronised by gateway beacons. Class C listen almost all the time and are usually mains-powered.",
  },
  {
    q: "What is the duty-cycle rule?",
    a: "In Europe's EU868 band, a device may transmit only 1 % of the time, so after a 1.5 s message it must wait about 147 s. India's IN865 band limits power instead, but networks such as The Things Network ask for under 30 s of airtime a day.",
  },
  {
    q: "What is Sigfox and how does it differ from LoRaWAN?",
    a: "Sigfox is an operator-run ultra-narrowband LPWAN limited to 140 uplinks of 12 bytes a day. Unlike LoRaWAN, users cannot build their own network; the company was bought by UnaBiz after its 2022 bankruptcy.",
  },
];

export default viva;
