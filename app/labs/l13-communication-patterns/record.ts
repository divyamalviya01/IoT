import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "A simulated temperature-monitoring system with up to 20 sensors, up to 10 apps and one server, broker or queue, run for 10 minutes under each of the four patterns",
  ],
  theory:
    "A communication pattern decides who starts a conversation and how data flows between devices, servers and apps. In request–response (HTTP REST, CoAP) the client asks and the server answers, so an app that polls only learns of a change at its next poll and misses a value that changes twice between two polls. In publish–subscribe (MQTT) sensors publish to a broker, which sends a copy of each message to every subscriber at once and can keep copies for a subscriber that is offline. In push–pull, producers push messages into a queue and each consumer pulls one message when it is free, so every message goes to only one consumer and the queue absorbs bursts. In exclusive pair (WebSocket) each client keeps one full-duplex connection open, so the server can push data at once, but it must hold every connection and nothing reaches a client that is not connected. So the same monitoring job sends a different number of messages, with a different delay and server load, under each pattern.",
  procedure: [
    "Open lab L13, Communication pattern playground. Keep the default settings: Sensors 10, Apps 3, A reading every 5 s, Chance a reading changes 30%, Apps poll every 15 s, Network delay 50 ms and Worker time per reading 4 s.",
    "Choose each pattern under Pattern to watch and press Play to watch its messages. Then press Record observation.",
    "Lower Apps poll every to 5 s and press Record observation. Compare the missed readings and messages of request–response, then set Apps poll every back to 15 s.",
    "Set Apps to 2 and press Record observation. Look at the Push–pull queue over time chart, then set Apps back to 3.",
    "Tick App 1 goes offline from 5:00 to 6:00 and press Record observation. Set Watch from to 5:30 and play publish–subscribe, then exclusive pair.",
    "Untick the offline box, raise Sensors to 20, press Record observation and compare the Peak load chart.",
    "Press Open lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "pattern", label: "Pattern" },
    { key: "sensors", label: "Sensors" },
    { key: "apps", label: "Apps" },
    { key: "poll", label: "Poll every", unit: "s" },
    { key: "offline", label: "App 1 offline" },
    { key: "messages", label: "Messages" },
    { key: "avgDelay", label: "Average delay", unit: "s" },
    { key: "missed", label: "Missed", unit: "%" },
    { key: "peak", label: "Peak load", unit: "per 10 s" },
    { key: "connections", label: "Connections" },
  ],
  resultHint:
    "Name the pattern that sent the most messages and the one that sent the fewest, say which was slowest and which missed readings, and explain what happened in publish–subscribe and in exclusive pair when App 1 went offline.",
  viva: [
    {
      q: "Why does request–response miss readings even though no message is lost on the network?",
      a: "The app only sees the newest value when it polls. If a sensor's value changes twice between two polls, the first change is replaced before anyone asks for it. Polling more often misses less but sends more messages.",
    },
    {
      q: "Why did publish–subscribe send the most messages in this lab?",
      a: "The broker sends one copy of each reading to every app, and with MQTT QoS 1 every copy is acknowledged with a PUBACK. So each reading costs two messages for the sensor plus two more for every app.",
    },
    {
      q: "How is push–pull different from publish–subscribe?",
      a: "In push–pull each reading goes to only one worker, the worker pulls a reading when it is free, and the queue stores readings that arrive faster than the workers can handle them. In publish–subscribe the broker pushes a copy of every reading to every subscriber at once.",
    },
    {
      q: "App 1 went offline from 5:00 to 6:00. What happened to its readings in publish–subscribe and in exclusive pair?",
      a: "The MQTT broker kept App 1's copies in its persistent session and sent them when it reconnected at 6:00, so they arrived late but none were missed. In exclusive pair the server had no open connection to App 1 and stores nothing, so those readings were lost for App 1.",
    },
    {
      q: "Why did the push–pull delay grow so much when Apps was set to 2?",
      a: "Each worker spends 4 s on a reading, so two workers handle about 30 readings a minute. With the default settings about 36 changed readings arrive each minute, so the queue keeps growing and every reading waits longer.",
    },
    {
      q: "Which patterns make the server hold a connection open for every device, and what does that cost?",
      a: "Publish–subscribe and exclusive pair keep one connection open for each sensor and each app, 13 with the default settings. The server must remember all of them and exchange keep-alive messages, but in return it can push a reading the moment it arrives.",
    },
  ],
};

export default record;
