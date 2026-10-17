import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Simulated MQTT broker with four clients: kitchen sensor, door sensor, phone app and dashboard",
    "Lossy link simulator and topic matcher",
  ],
  theory:
    "MQTT is a publish–subscribe protocol. Clients never talk to each other directly: a publisher sends a message to a topic on the broker, and the broker forwards a copy to every client whose subscription filter matches that topic. In a filter, + matches exactly one level and # matches all remaining levels. A retained message is kept by the broker and sent at once to new subscribers, and a Last Will is published by the broker if a client disappears without disconnecting. QoS 0 sends a message at most once, QoS 1 at least once (duplicates are possible), and QoS 2 exactly once using a four-packet exchange.",
  procedure: [
    "Open lab L06, MQTT broker simulator. Press Publish to send the kitchen temperature and note which clients receive it. Press Record observation.",
    "Publish to a topic that no one subscribes to, such as home/garden/light, and record who receives it.",
    "Subscribe the Dashboard to home/+/status and record the retained messages it receives at once.",
    "Press Lose power on the Door sensor and record the Last Will that the broker publishes.",
    "Disconnect the Phone app, publish with QoS 1, then press Connect on the phone. Record what it receives.",
    "In QoS over a lossy link, set Packet loss to 30%. Press Send 20 messages at QoS 0, 1 and 2, recording each run.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "test", label: "Test" },
    { key: "settings", label: "Settings" },
    { key: "outcome", label: "What happened" },
  ],
  resultHint:
    "Explain how the broker chose the receivers of each message, what retained messages and the Last Will did, and how QoS 0, 1 and 2 behaved on the lossy link.",
  viva: [
    {
      q: "Why did the Dashboard receive the kitchen temperature but not the door state?",
      a: "Its filter home/+/temperature matches any one room level followed by temperature, so it matches home/kitchen/temperature but not home/door/state.",
    },
    {
      q: "What is the difference between + and # in a topic filter?",
      a: "+ matches exactly one level. # matches all the remaining levels and must be the last level of the filter.",
    },
    {
      q: "Why did the new subscriber get a message before anyone published?",
      a: "The broker had a retained message on that topic, and it sends the retained message to every new matching subscriber at once.",
    },
    {
      q: "When does the broker publish a client's Last Will?",
      a: "When the client disappears without sending DISCONNECT, for example after losing power. A clean disconnect does not trigger the will.",
    },
    {
      q: "Why did QoS 1 sometimes deliver a message twice?",
      a: "When the PUBACK is lost, the sender resends the PUBLISH. The receiver has already passed the first copy on, so the second one is a duplicate.",
    },
    {
      q: "How does QoS 2 avoid duplicates?",
      a: "The receiver remembers the packet ID after PUBREC and does not deliver resent copies again until PUBREL and PUBCOMP finish the exchange.",
    },
  ],
};

export default record;
