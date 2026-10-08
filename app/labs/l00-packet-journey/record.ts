import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Simulated temperature sensor, gateway, internet link and cloud server",
  ],
  theory:
    "In an IoT system, a sensor's reading travels to the cloud as small packets. Each packet crosses several links: sensor to gateway, gateway to the internet, and internet to the cloud. Every link adds some delay, called latency, and a link can sometimes drop a packet, called packet loss. Because a packet must survive every link, losses add up: with 10% loss on each of three links, only about 73% of packets arrive. Delays also add up, so the end-to-end delay is roughly the sum of the link delays.",
  procedure: [
    "Open lab L00, Packet journey.",
    "Set the delay per link to 100 ms and the packet loss to 0%. Keep 20 packets.",
    "Press Start sending and wait until every packet has arrived or been lost.",
    "Note the readouts and press Record observation.",
    "Repeat with packet loss at 10% and 20%, recording a row each time.",
    "Set loss back to 0% and repeat with delays of 50 ms and 300 ms.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "delay", label: "Delay per link", unit: "ms" },
    { key: "loss", label: "Loss per link", unit: "%" },
    { key: "sent", label: "Sent" },
    { key: "delivered", label: "Delivered" },
    { key: "lost", label: "Lost" },
    { key: "avgDelay", label: "Average end-to-end delay", unit: "ms" },
  ],
  resultHint:
    "Describe how the number of delivered packets changed as loss increased, and how the average delay changed with the delay setting.",
  viva: [
    {
      q: "What is latency?",
      a: "Latency is the time a packet takes to travel from sender to receiver. It is usually measured in milliseconds.",
    },
    {
      q: "What is packet loss?",
      a: "Packet loss is when a packet never reaches its destination, for example because of interference or a congested link. It is given as a percentage of packets sent.",
    },
    {
      q: "Why does loss on several links reduce delivery more than loss on one link?",
      a: "A packet must survive every link, so the chances multiply. With 10% loss per link over three links, delivery is 0.9 × 0.9 × 0.9, about 73%.",
    },
    {
      q: "What does a gateway do in this experiment?",
      a: "The gateway receives packets from the local sensor network and forwards them to the internet, so it connects the sensor to the cloud.",
    },
    {
      q: "Why do we use a simulation instead of real hardware for this experiment?",
      a: "A simulation lets us set exact delay and loss values, repeat runs with the same results and experiment safely without buying or wiring hardware.",
    },
  ],
};

export default record;
