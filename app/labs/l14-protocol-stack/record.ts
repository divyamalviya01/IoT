import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Protocol stack builder with four challenges: 3-layer and 5-layer IoT architectures, the IoT protocol stack against OSI, and the IETF stack",
  ],
  theory:
    "IoT systems are described in layers. The 3-layer architecture has perception (sensors and actuators), network (carrying data, including gateways) and application (services for users). The 5-layer architecture splits this into perception, transport, processing, application and business. Real protocols also sit at layers that match the OSI model: MQTT and CoAP at the application layer, TCP and UDP at transport, IPv6 and RPL at the network layer, 6LoWPAN as an adaptation layer, and IEEE 802.15.4, BLE and Wi-Fi at the link and physical layers. The IETF stack for small battery devices is CoAP over UDP over IPv6 (routed by RPL) over 6LoWPAN over IEEE 802.15.4.",
  procedure: [
    "Open lab L14, Protocol stack builder, and choose the 3-layer IoT architecture.",
    "Select each token in the tray and then the layer it belongs to, or drag it onto the layer.",
    "Press Check my stack. Read the hint for the first mistake, move that token and check again until the stack is correct. Press Record observation.",
    "Repeat for the 5-layer IoT architecture and record.",
    "Repeat for the IoT protocol stack and OSI, noting the OSI layer numbers, and record.",
    "Build the IETF stack for a battery sensor, leaving the protocols that do not fit in the tray, and record.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "challenge", label: "Challenge" },
    { key: "tokens", label: "Tokens" },
    { key: "firstTime", label: "Right first time" },
    { key: "mistakes", label: "Mistakes" },
    { key: "wrongTokens", label: "Tokens moved after a mistake" },
    { key: "checks", label: "Checks" },
    { key: "result", label: "Result" },
  ],
  resultHint:
    "Say which challenges you completed, which tokens you placed wrongly at first and why they belong where they do, and write the IETF stack from top to bottom.",
  viva: [
    {
      q: "In which layer of the 3-layer model does a gateway belong, and why?",
      a: "The network layer, because it connects local devices to the internet and carries their data onwards.",
    },
    {
      q: "Why does the 5-layer model have a business layer?",
      a: "To manage the whole IoT system: its business and profit model, charging and users' privacy, using the results of the layers below.",
    },
    {
      q: "Why is 6LoWPAN placed in an adaptation layer?",
      a: "It sits between IPv6 and IEEE 802.15.4 and adapts one to the other, compressing IPv6 headers and splitting packets to fit the small radio frames.",
    },
    {
      q: "Where does LoRaWAN fit, and why?",
      a: "In the link and physical layers: it is the MAC layer on top of the LoRa radio and does not carry IP by itself.",
    },
    {
      q: "Why are TCP, HTTP and Wi-Fi not used in the IETF stack for a coin-cell sensor?",
      a: "They cost too much: TCP needs a handshake and resends, HTTP has large text headers, and Wi-Fi uses too much power. UDP, CoAP and IEEE 802.15.4 do the same jobs cheaply.",
    },
    {
      q: "Write the IETF stack from top to bottom.",
      a: "CoAP, UDP, IPv6 (routed by RPL), 6LoWPAN, IEEE 802.15.4.",
    },
  ],
};

export default record;
