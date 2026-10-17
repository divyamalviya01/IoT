import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is MQTT and who created it?",
    a: "A lightweight publish–subscribe messaging protocol that runs over TCP. Andy Stanford-Clark (IBM) and Arlen Nipper created it in 1999 for monitoring oil pipelines.",
  },
  {
    q: "Explain the publish–subscribe model.",
    a: "Publishers send messages to topics on a broker without knowing the receivers. Subscribers tell the broker which topics they want, and the broker forwards each message to all matching subscribers.",
  },
  {
    q: "What is the difference between the + and # wildcards?",
    a: "+ matches exactly one topic level; # matches all remaining levels and must be the last character, for example home/# matches everything under home.",
  },
  {
    q: "Explain the three QoS levels of MQTT.",
    a: "QoS 0 sends once with no acknowledgement (at most once). QoS 1 waits for PUBACK and resends, so duplicates are possible (at least once). QoS 2 uses PUBREC, PUBREL and PUBCOMP to deliver exactly once.",
  },
  {
    q: "What is a Last Will and Testament?",
    a: "A message a client gives the broker when it connects. If the client disconnects unexpectedly, the broker publishes it, for example to announce that a sensor is offline.",
  },
  {
    q: "Name three MQTT brokers.",
    a: "Mosquitto, HiveMQ and EMQX. AWS IoT Core is a managed cloud broker.",
  },
  {
    q: "What is the difference between a clean session and a persistent session?",
    a: "In a clean session the broker forgets the client when it disconnects. In a persistent session it keeps the subscriptions and stores QoS 1 and 2 messages until the client returns.",
  },
];

export default viva;
