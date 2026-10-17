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
    id: "acknowledgement",
    term: "Acknowledgement (ACK)",
    definition:
      "A short reply that confirms a message arrived. If no ACK comes back in time, the sender can send the message again.",
    topic: "udp",
  },
  {
    id: "checksum",
    term: "Checksum",
    definition:
      "A small number worked out from the bytes of a message and sent with it. The receiver works it out again; if the two differ, the data was damaged on the way.",
    topic: "udp",
  },
  {
    id: "retransmission",
    term: "Retransmission",
    definition: "Sending a message again because no acknowledgement came back in time, so the first copy is taken to be lost.",
    topic: "udp",
  },
  {
    id: "head-of-line-blocking",
    term: "Head-of-line blocking",
    definition:
      "When one lost packet holds up the packets behind it. TCP delivers data strictly in order, so later data waits until the missing piece is resent.",
    topic: "udp",
  },
  {
    id: "exponential-backoff",
    term: "Exponential back-off",
    definition:
      "Waiting twice as long before each new retry. CoAP and TCP use it so that a busy network is not flooded with resends.",
    topic: "coap",
  },
  {
    id: "persistent-session",
    term: "Persistent session",
    definition:
      "An MQTT session that the broker keeps after the client disconnects: its subscriptions stay, and QoS 1 and 2 messages are stored until it reconnects. A clean session is forgotten instead.",
    topic: "mqtt",
  },
  {
    id: "deadband",
    term: "Deadband",
    definition:
      "A filter rule that sends a new reading only when it differs from the last one sent by more than a set amount, so tiny changes do not waste bandwidth.",
    topic: "gateway-protocols",
  },
  {
    id: "amqp",
    term: "AMQP",
    definition:
      "Advanced Message Queuing Protocol: a messaging protocol for business systems that routes messages into queues through a broker.",
    topic: "gateway-protocols",
  },
  {
    id: "coap",
    term: "CoAP",
    definition:
      "Constrained Application Protocol: a lightweight, web-like request–response protocol that runs over UDP, made for small devices.",
    topic: "coap",
  },
  {
    id: "dds",
    term: "DDS",
    definition:
      "Data Distribution Service: a publish–subscribe standard without a central broker, used in robots, vehicles and defence systems.",
    topic: "gateway-protocols",
  },
  {
    id: "dtls",
    term: "DTLS",
    definition:
      "Datagram TLS: the version of TLS encryption that works over UDP. CoAP uses it to secure messages.",
    topic: "coap",
  },
  {
    id: "encapsulation",
    term: "Encapsulation",
    definition:
      "Wrapping data inside the headers of each protocol layer as it goes down the stack, like putting a letter in an envelope and then in a parcel.",
    topic: "protocols-overview",
  },
  {
    id: "federation",
    term: "Federation",
    definition:
      "Servers run by different organisations connecting to each other, so users on one server can message users on another, like email.",
    topic: "xmpp",
  },
  {
    id: "handshake",
    term: "Handshake",
    definition:
      "An exchange of messages that sets up a connection before data is sent. TCP uses a three-way handshake: SYN, SYN-ACK, ACK.",
    topic: "udp",
  },
  {
    id: "header",
    term: "Header",
    definition:
      "Control information added in front of the data in a packet, such as addresses, ports and lengths.",
    topic: "protocols-overview",
  },
  {
    id: "jid",
    term: "JID (Jabber ID)",
    definition:
      "The address of an XMPP user or device, written like user@domain/resource, for example sensor1@home.example/kitchen.",
    topic: "xmpp",
  },
  {
    id: "keep-alive",
    term: "Keep-alive",
    definition:
      "Small messages sent regularly to show a connection is still working. MQTT clients send PINGREQ when they have nothing else to send.",
    topic: "mqtt",
  },
  {
    id: "last-will",
    term: "Last Will and Testament (LWT)",
    definition:
      "A message an MQTT client leaves with the broker in advance. The broker publishes it if the client disconnects unexpectedly.",
    topic: "mqtt",
  },
  {
    id: "lwm2m",
    term: "LwM2M",
    definition:
      "Lightweight M2M: a standard from OMA for managing IoT devices remotely, such as updating firmware or reading settings. It runs over CoAP.",
    topic: "gateway-protocols",
  },
  {
    id: "middleware",
    term: "Middleware",
    definition:
      "Software that sits between devices and applications and handles common jobs such as messaging, device management and data storage.",
    topic: "protocols-overview",
  },
  {
    id: "modbus",
    term: "Modbus",
    definition:
      "A simple industrial protocol from 1979 for reading and writing values (registers) in machines, over serial lines or TCP.",
    topic: "gateway-protocols",
  },
  {
    id: "observe",
    term: "Observe (CoAP)",
    definition:
      "A CoAP option that lets a client register interest in a resource once and then receive a notification every time it changes.",
    topic: "coap",
  },
  {
    id: "polling",
    term: "Polling",
    definition:
      "Asking a server again and again whether anything has changed. It is simple but wastes requests when nothing is new.",
    topic: "http",
  },
  {
    id: "port",
    term: "Port",
    definition:
      "A number that identifies which program on a device should receive a message, such as 80 for HTTP or 1883 for MQTT.",
    topic: "udp",
  },
  {
    id: "qos",
    term: "QoS (quality of service)",
    definition:
      "In MQTT, the delivery guarantee for a message: 0 at most once, 1 at least once, 2 exactly once.",
    topic: "mqtt",
  },
  {
    id: "rest",
    term: "REST",
    definition:
      "A style of web API where each thing is a resource with its own URL, read and changed with standard HTTP methods such as GET and PUT.",
    topic: "http",
  },
  {
    id: "retained-message",
    term: "Retained message",
    definition:
      "An MQTT message the broker keeps as the last known value of a topic and sends to every new subscriber straight away.",
    topic: "mqtt",
  },
  {
    id: "rtos",
    term: "RTOS (real-time operating system)",
    definition:
      "A small operating system for microcontrollers that runs tasks on strict schedules, such as FreeRTOS or Zephyr.",
    topic: "protocols-overview",
  },
  {
    id: "stanza",
    term: "Stanza",
    definition:
      "A single XML message in XMPP. There are three kinds: message, presence and iq (info/query).",
    topic: "xmpp",
  },
  {
    id: "status-code",
    term: "Status code",
    definition:
      "A three-digit number in an HTTP response that says how the request went, such as 200 OK or 404 Not Found.",
    topic: "http",
  },
  {
    id: "tcp",
    term: "TCP",
    definition:
      "Transmission Control Protocol: sets up a connection and makes sure every byte arrives, in order, resending anything lost.",
    topic: "udp",
  },
  {
    id: "topic",
    term: "Topic (MQTT)",
    definition:
      "A text label such as home/kitchen/temperature that names what a message is about. Subscribers choose topics to receive.",
    topic: "mqtt",
  },
  {
    id: "udp",
    term: "UDP",
    definition:
      "User Datagram Protocol: sends packets without a connection or delivery checks. It is fast and light, but lost packets stay lost.",
    topic: "udp",
  },
  {
    id: "webhook",
    term: "Webhook",
    definition:
      "A URL a server calls when something happens, so the receiver gets updates without polling.",
    topic: "http",
  },
  {
    id: "wildcard",
    term: "Wildcard (MQTT)",
    definition:
      "A symbol in an MQTT subscription that matches many topics: + matches one level and # matches all remaining levels.",
    topic: "mqtt",
  },
  {
    id: "xmpp",
    term: "XMPP",
    definition:
      "Extensible Messaging and Presence Protocol: an XML-based chat protocol that devices can also use to message each other and share presence.",
    topic: "xmpp",
  },
  {
    id: "adc",
    term: "ADC (analog-to-digital converter)",
    definition:
      "A circuit that turns a voltage into a number. A 10-bit ADC gives numbers from 0 to 1023.",
    topic: "sensor-nodes",
  },
  {
    id: "analog-signal",
    term: "Analog signal",
    definition:
      "A signal that can take any value in a range, such as a voltage that rises smoothly as a room warms up.",
    topic: "sensor-nodes",
  },
  {
    id: "cloudlet",
    term: "Cloudlet",
    definition:
      "A small cloud data centre placed at the edge of the network, close to users. Cloudlets form the peripheral cloud.",
    topic: "edge-fog-cloud",
  },
  {
    id: "digital-signal",
    term: "Digital signal",
    definition: "A signal with only a few fixed values, usually two: HIGH (1) and LOW (0).",
    topic: "sensor-nodes",
  },
  {
    id: "duty-cycle",
    term: "Duty cycle",
    definition:
      "The share of time a device is awake or a signal is on. A node awake 1 second in every 100 has a 1% duty cycle.",
    topic: "sensor-nodes",
  },
  {
    id: "energy-harvesting",
    term: "Energy harvesting",
    definition:
      "Collecting small amounts of energy from the surroundings, such as light, heat or vibration, to power or recharge a device.",
    topic: "sensor-nodes",
  },
  {
    id: "firmware",
    term: "Firmware",
    definition:
      "The program stored inside a device's chip that controls how the device works. Updating it can fix bugs or security holes.",
    topic: "single-board-computers",
  },
  {
    id: "fog-computing",
    term: "Fog computing",
    definition:
      "Processing data on local servers between the devices and the cloud, such as in a factory or at a mobile tower.",
    topic: "edge-fog-cloud",
  },
  {
    id: "gpio",
    term: "GPIO (general-purpose input/output)",
    definition:
      "Pins on a board that a program can set HIGH or LOW, or read, to connect sensors, buttons and LEDs.",
    topic: "single-board-computers",
  },
  {
    id: "interoperability",
    term: "Interoperability",
    definition:
      "The ability of devices from different makers to work together because they follow the same standards and protocols.",
    topic: "iot-characteristics",
  },
  {
    id: "ipv6",
    term: "IPv6",
    definition:
      "The newer version of the Internet Protocol. Its 128-bit addresses are enough to give every IoT device its own address.",
    topic: "iot-characteristics",
  },
  {
    id: "open-source-hardware",
    term: "Open-source hardware",
    definition:
      "Hardware whose design files are published so anyone can study, change, make and sell it, as long as they follow the licence.",
    topic: "single-board-computers",
  },
  {
    id: "pwm",
    term: "PWM (pulse-width modulation)",
    definition:
      "Switching a pin on and off very quickly. The share of on-time sets the average power, for example how bright an LED looks.",
    topic: "single-board-computers",
  },
  {
    id: "quantisation",
    term: "Quantisation",
    definition:
      "Rounding a smooth value to the nearest step an ADC can represent. The small difference is called quantisation error.",
    topic: "sensor-nodes",
  },
  {
    id: "rfid",
    term: "RFID",
    definition:
      "Radio-frequency identification: tags that a reader can identify by radio without touching them. FASTag uses RFID.",
    topic: "iot-characteristics",
  },
  {
    id: "sampling-rate",
    term: "Sampling rate",
    definition:
      "How often a sensor value is measured, for example 10 times per second (10 Hz) or once a minute.",
    topic: "sensor-nodes",
  },
  {
    id: "scalability",
    term: "Scalability",
    definition:
      "The ability of a system to keep working well as it grows from a few devices to thousands or millions.",
    topic: "iot-characteristics",
  },
  {
    id: "sbc",
    term: "Single-board computer (SBC)",
    definition:
      "A complete computer on one circuit board, with processor, memory and ports, that can run an operating system. The Raspberry Pi is one.",
    topic: "single-board-computers",
  },
  {
    id: "smart-grid",
    term: "Smart grid",
    definition:
      "An electricity network that uses sensors, smart meters and two-way communication to balance supply and demand.",
    topic: "iot-infrastructure",
  },
  {
    id: "telematics",
    term: "Telematics",
    definition:
      "Collecting and sending data from vehicles, such as location, speed and engine health, over a mobile network.",
    topic: "iot-infrastructure",
  },
  {
    id: "transceiver",
    term: "Transceiver",
    definition: "A single part that can both transmit and receive radio signals.",
    topic: "sensor-nodes",
  },
  {
    id: "unique-identifier",
    term: "Unique identifier",
    definition:
      "A name or number, such as an IP address, MAC address or RFID code, that belongs to exactly one device.",
    topic: "iot-characteristics",
  },
  {
    id: "wearable",
    term: "Wearable",
    definition:
      "A small IoT device worn on the body, such as a fitness band or smartwatch, that tracks things like steps and heart rate.",
    topic: "iot-infrastructure",
  },
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
