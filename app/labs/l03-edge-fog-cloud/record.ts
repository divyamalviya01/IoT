import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Simulated devices, an edge gateway, a fog server, a cloud data centre and an internet uplink",
  ],
  theory:
    "IoT data can be processed at the edge (on or next to the device), in the fog (on local servers) or in the cloud (in distant data centres). The response time is the network round trip plus processing time, and processing slows down as a tier gets busier. Processing closer to the devices is faster and sends less data over the internet, while the cloud has the most computing power but the longest round trip. The right tier depends on the deadline and on how much data the devices produce.",
  procedure: [
    "Open lab L03, Edge vs fog vs cloud, and choose the Car braking scenario.",
    "Process at the edge, then the fog, then the cloud. For each, note the response time and whether it meets the deadline, and press Record observation.",
    "Choose the CCTV people count scenario and repeat. Watch what happens to the uplink when raw video goes to the cloud.",
    "Choose Factory vibration and increase the number of devices until a tier becomes overloaded. Record it.",
    "Choose the Monthly energy report scenario and compare all three tiers.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "scenario", label: "Scenario" },
    { key: "devices", label: "Devices" },
    { key: "tier", label: "Processed at" },
    { key: "latency", label: "Response time" },
    { key: "deadline", label: "Deadline" },
    { key: "meets", label: "Meets deadline?" },
    { key: "upstream", label: "To internet", unit: "Mbps" },
  ],
  resultHint:
    "For each scenario, say which tier you would choose and why, using the response times and upstream data you recorded.",
  viva: [
    {
      q: "Why did only the edge meet the car-braking deadline?",
      a: "The round trip to the fog or cloud alone takes longer than 10 ms, while edge processing happens right beside the sensors.",
    },
    {
      q: "Why did sending CCTV video to the cloud fail?",
      a: "Twenty cameras produce about 40 Mbps of raw video, more than the 20 Mbps uplink can carry, so the queue grows without limit.",
    },
    {
      q: "Why does response time rise as more devices are added?",
      a: "Each tier can process only so many messages per second. As it gets busier, messages wait longer in the queue.",
    },
    {
      q: "When is the cloud the best choice?",
      a: "When deadlines are relaxed and data volumes are small, such as a monthly energy report, or when heavy analysis and long-term storage are needed.",
    },
    {
      q: "How does edge processing save internet bandwidth?",
      a: "It sends only results or alerts instead of the raw data, so far less data crosses the uplink.",
    },
  ],
};

export default record;
