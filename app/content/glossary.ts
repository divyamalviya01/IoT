/**
 * Glossary terms. `id` is what <Term id="…"> refers to; `topic` is the slug of
 * the topic that teaches the term in depth. Definitions: one or two plain
 * sentences a first-year student can follow.
 */
export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  topic?: string;
}

export const glossary: GlossaryTerm[] = [
  {
    id: "actuator",
    term: "Actuator",
    definition:
      "A part that does something in the physical world when told to, such as a motor, relay, buzzer or LED.",
    topic: "sensor-nodes",
  },
  {
    id: "bandwidth",
    term: "Bandwidth",
    definition:
      "How much data a link can carry each second, usually given in kilobits or megabits per second (kbps, Mbps).",
  },
  {
    id: "broker",
    term: "Broker",
    definition:
      "A server in the middle that receives messages from publishers and passes them to every subscriber of that topic. MQTT uses a broker.",
    topic: "mqtt",
  },
  {
    id: "cloud",
    term: "Cloud",
    definition:
      "Computers in large data centres that you use over the internet to store and process data, instead of owning the machines yourself.",
    topic: "cloud-computing",
  },
  {
    id: "edge-computing",
    term: "Edge computing",
    definition:
      "Processing data close to where it is produced, on the device or a nearby computer, instead of sending everything to the cloud.",
    topic: "edge-fog-cloud",
  },
  {
    id: "gateway",
    term: "Gateway",
    definition:
      "A device that connects local IoT devices to the internet, often translating between their protocol and an internet protocol.",
    topic: "gateway-protocols",
  },
  {
    id: "iot",
    term: "Internet of Things (IoT)",
    definition:
      "Everyday objects fitted with sensors, processors and network connections so they can collect data and be monitored or controlled over the internet.",
    topic: "iot-components",
  },
  {
    id: "jitter",
    term: "Jitter",
    definition:
      "Variation in delay from one packet to the next. Low jitter means packets arrive at a steady pace.",
  },
  {
    id: "latency",
    term: "Latency",
    definition:
      "The time a packet takes to travel from sender to receiver, usually measured in milliseconds (ms).",
  },
  {
    id: "microcontroller",
    term: "Microcontroller (MCU)",
    definition:
      "A small computer on one chip, with processor, memory and input/output pins, used to control devices. The Arduino Uno uses one.",
    topic: "single-board-computers",
  },
  {
    id: "mqtt",
    term: "MQTT",
    definition:
      "A lightweight publish–subscribe messaging protocol widely used in IoT. Devices publish messages to topics on a broker.",
    topic: "mqtt",
  },
  {
    id: "node",
    term: "Node",
    definition: "Any device that is part of a network, such as a sensor, a gateway or a server.",
    topic: "sensor-nodes",
  },
  {
    id: "packet",
    term: "Packet",
    definition:
      "A small chunk of data sent over a network. It carries the data itself (the payload) plus headers saying where it comes from and where it is going.",
  },
  {
    id: "packet-loss",
    term: "Packet loss",
    definition:
      "When a packet never reaches its destination, for example because of radio interference or a full queue. Usually given as a percentage.",
  },
  {
    id: "payload",
    term: "Payload",
    definition:
      "The useful data inside a packet, such as a temperature reading, as opposed to the headers that help deliver it.",
  },
  {
    id: "protocol",
    term: "Protocol",
    definition:
      "An agreed set of rules for how devices format, send and understand messages. MQTT, HTTP and UDP are protocols.",
    topic: "protocols-overview",
  },
  {
    id: "publish-subscribe",
    term: "Publish–subscribe",
    definition:
      "A messaging pattern where senders publish to a topic and receivers subscribe to topics, without knowing about each other.",
    topic: "communication-patterns",
  },
  {
    id: "sensor",
    term: "Sensor",
    definition:
      "A part that measures something in the physical world, such as temperature, light or motion, and turns it into an electrical signal.",
    topic: "sensor-nodes",
  },
  {
    id: "simulation",
    term: "Simulation",
    definition:
      "A computer model that behaves like a real system, so you can experiment safely and repeat runs without real hardware.",
    topic: "getting-started",
  },
  {
    id: "throughput",
    term: "Throughput",
    definition:
      "How much data actually gets through per second. It is often lower than the bandwidth because of losses and overhead.",
  },
];

const byId = new Map(glossary.map((t) => [t.id, t]));

export function getTerm(id: string): GlossaryTerm | undefined {
  return byId.get(id);
}
