import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Flow editor modelled on Node-RED (built with React Flow), with input, function and output nodes",
    "Simulated temperature sensor giving about 31–37 °C, one reading a second, with a simulated MQTT broker, dashboard gauge, SMS or e-mail alert and debug panel",
  ],
  theory:
    "Flow-based programming builds a program by wiring ready-made blocks called nodes, so little code is written. Input nodes, such as a sensor, start a flow; function nodes change, test or filter messages; output nodes publish, display or alert. Wires carry messages from an output port to an input port. A message has a payload, the data such as 34.6, and a topic, a label such as sensor/temperature. Pressing Deploy checks the flow and starts it; after any change you must deploy again. Node-RED, the best-known flow tool for IoT, was started at IBM in 2013 and is now an OpenJS Foundation project under the Apache 2.0 licence.",
  procedure: [
    "Open lab L20, Flow-based IoT programming, and choose challenge 1, Live gauge.",
    "Press Dashboard gauge in the palette. Wire the sensor's output port to the gauge's input port by dragging, or by tapping one port and then the other.",
    "Press Deploy. Let the replay reach 60 s (use 4× or Step), read the verdict and press Record observation.",
    "Choose challenge 2 and press Clear canvas. Build Sensor → Threshold (> 35) → Alert from the Yes port, and wire the No port to a Debug node. Deploy, replay and record.",
    "Choose challenge 3. Build Sensor → °C → °F → Template → MQTT out with the topic home/temp/f. Deploy, replay and record.",
    "Choose challenge 4. Build Sensor → Report by exception (0.5) → MQTT out on home/temp. Deploy, replay and record.",
    "Delete one wire and press Deploy to see how errors are reported. Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "challenge", label: "Challenge" },
    { key: "nodes", label: "Nodes" },
    { key: "wires", label: "Wires" },
    { key: "readings", label: "Readings" },
    { key: "mqtt", label: "MQTT msgs" },
    { key: "alerts", label: "Alerts" },
    { key: "dashboard", label: "Gauge updates" },
    { key: "result", label: "Result" },
  ],
  resultHint:
    "Say which challenges your flows passed and how each flow was wired. Compare the MQTT messages of challenges 3 and 4, and explain how report by exception saves data.",
  viva: [
    {
      q: "What is flow-based programming?",
      a: "A way of building a program by wiring ready-made nodes together. Messages flow along the wires from node to node, so little or no code is written.",
    },
    {
      q: "What is Node-RED?",
      a: "A free, browser-based flow editor for wiring IoT devices, APIs and online services. IBM started it in 2013; it is now an OpenJS Foundation project under the Apache 2.0 licence.",
    },
    {
      q: "What does a message carry in a flow?",
      a: "A payload, which is the data, such as 34.6, and a topic, which is a label, such as sensor/temperature. Each node reads the message, may change it, and passes it on.",
    },
    {
      q: "Why must a flow be deployed?",
      a: "Deploy checks the flow and starts it running. Changes on the canvas do nothing until you deploy again, which also stops a half-finished flow from running.",
    },
    {
      q: "Why does the Threshold node have two outputs?",
      a: "The Yes port carries messages for which the rule is true and the No port carries the rest. Wiring only Yes to the alert sends alerts for hot readings only.",
    },
    {
      q: "How does report by exception save data?",
      a: "It sends a reading only when it differs from the last one sent by at least a set amount. Steady readings are not sent again, which saves bandwidth and battery.",
    },
  ],
};

export default record;
