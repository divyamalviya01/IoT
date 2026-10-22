import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Simulated home sensors (temperature, humidity, power, front door, delivery van GPS) sending one reading a second",
    "Simulated porch bulb controlled through a cloud device shadow, with an online switch and an adjustable network delay",
  ],
  theory:
    "A cloud dashboard shows live IoT data using widgets: gauges for one number in a known range, line charts for trends, value cards for the latest state, maps for location, switches to control devices and alerts that warn when a value crosses a limit. A dashboard gets new data in two ways. With polling, the browser asks the cloud every few seconds, even when nothing has changed, so values can be old. With push (for example MQTT over WebSocket), the cloud sends a value only when it changes, so the dashboard updates at once. To control a device, the dashboard writes the desired state into a device shadow (AWS) or device twin (Azure). The device applies it when it is online and reports back, so the switch shows a pending state until it confirms. A good dashboard has few widgets, clear titles, sensible ranges, no duplicates and an alert at the top left.",
  procedure: [
    "Open lab L21, IoT dashboard builder, and press Start streams.",
    "Add a gauge, a line chart, an alert and a switch. Tap each widget and connect it to a suitable stream.",
    "Set the alert to go off above 34 °C with 0.5 °C hysteresis on room temperature. Wait for it to go off and press Record observation.",
    "Connect the switch to the porch bulb. Untick Device online, press the switch, then tick Device online again. Press Record observation.",
    "Set Update to Poll every 30 s and press Record observation. Compare the messages per minute and data age with Push.",
    "Load the Cluttered example, fix every design tip and press Record observation.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "widgets", label: "Widgets" },
    { key: "streams", label: "Streams" },
    { key: "update", label: "Update" },
    { key: "alerts", label: "Alerts" },
    { key: "commands", label: "Commands" },
    { key: "confirm", label: "Confirm", unit: "s" },
    { key: "messages", label: "Messages", unit: "/min" },
    { key: "tips", label: "Tips left" },
  ],
  resultHint:
    "Compare push and polling: messages per minute and how old the values were. Say what happened to the bulb command while the device was offline, and how you fixed the cluttered dashboard.",
  viva: [
    {
      q: "Which widget would you use for a tank level, and which for a delivery truck?",
      a: "A gauge for the tank level, because it is one number with a known range. A map for the truck, because what matters is where it is.",
    },
    {
      q: "What is the difference between polling and push?",
      a: "With polling the dashboard asks the cloud every few seconds, even if nothing changed. With push the cloud sends a value only when it changes, so it arrives at once.",
    },
    {
      q: "Why did polling every 30 s show old values?",
      a: "The dashboard only learns about a change at its next poll, so a value can be up to 30 s old, about 15 s on average.",
    },
    {
      q: "What is a device shadow or device twin?",
      a: "A copy of the device's state kept in the cloud, with the desired state set by apps and the reported state sent by the device. Their difference is the delta the device must apply.",
    },
    {
      q: "Why did the bulb stay “turning on” while it was offline?",
      a: "The switch only changed the desired state in the shadow. The bulb could not read it until it came back online, then it applied the change and reported on.",
    },
    {
      q: "Why does an alert use hysteresis?",
      a: "Without it, a value wobbling around the limit makes the alert go on and off again and again. Hysteresis clears it only once the value is clearly back to normal.",
    },
  ],
};

export default record;
