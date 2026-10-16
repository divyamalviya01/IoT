import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Which layer do MQTT and CoAP belong to?",
    options: ["Link layer", "Network layer", "Transport layer", "Application layer"],
    answer: 3,
    explanation: "MQTT, CoAP, HTTP and XMPP are application-layer protocols.",
  },
  {
    id: "q2",
    question: "Which transport protocol does CoAP use?",
    options: ["TCP", "UDP", "IPv6", "Zigbee"],
    answer: 1,
    explanation: "CoAP runs over UDP to keep messages small. MQTT and HTTP use TCP.",
  },
  {
    id: "q3",
    question: "What is encapsulation?",
    options: [
      "Encrypting data",
      "Each layer adding its own header as data goes down the stack",
      "Compressing images",
      "Removing errors from data",
    ],
    answer: 1,
    explanation: "Each layer wraps the data from the layer above with its own header, like envelopes inside a parcel.",
  },
  {
    id: "q4",
    question: "How big is the IPv6 header?",
    options: ["8 bytes", "20 bytes", "40 bytes", "128 bytes"],
    answer: 2,
    explanation: "The fixed IPv6 header is 40 bytes. 6LoWPAN compresses it to a few bytes for small radios.",
  },
  {
    id: "q5",
    question: "Which of these is a real-time operating system for microcontrollers?",
    options: ["FreeRTOS", "Mosquitto", "Node-RED", "HTTP"],
    answer: 0,
    explanation: "FreeRTOS, Zephyr, RIOT and Contiki are RTOSs. Mosquitto is a broker and Node-RED is a flow tool.",
  },
  {
    id: "q6",
    question: "What is Mosquitto?",
    options: ["A sensor", "An MQTT broker", "A radio standard", "An RTOS"],
    answer: 1,
    explanation: "Mosquitto is a popular open-source MQTT broker from the Eclipse Foundation.",
  },
  {
    id: "q7",
    question: "Why do IoT devices prefer protocols with short headers?",
    options: [
      "Short headers look neater",
      "Every byte sent costs battery energy and bandwidth",
      "Long headers are not allowed on the internet",
      "Short headers make data more secure",
    ],
    answer: 1,
    explanation: "Small battery-powered devices on slow radio links save energy and time by sending fewer bytes.",
  },
  {
    id: "q8",
    question: "Which protocol lets IPv6 work over tiny IEEE 802.15.4 radios?",
    options: ["6LoWPAN", "HTTP", "XMPP", "AMQP"],
    answer: 0,
    explanation: "6LoWPAN compresses and fragments IPv6 packets so they fit small low-power radio frames.",
  },
  {
    id: "q9",
    question: "What does middleware do in an IoT system?",
    options: [
      "Measures temperature",
      "Handles common jobs such as messaging and device management between devices and apps",
      "Generates electricity",
      "Replaces the radio",
    ],
    answer: 1,
    explanation: "Middleware sits between devices and applications and handles shared tasks like messaging and storage.",
  },
];

export default quiz;
