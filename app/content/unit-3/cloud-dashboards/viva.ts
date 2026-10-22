import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is an IoT dashboard?",
    a: "A web or app screen of widgets bound to live data streams, which shows device data at a glance, raises alerts and lets people control devices.",
  },
  {
    q: "Name five dashboard widgets and when to use each.",
    a: "Gauge for one value with a range, line chart for trends over time, value card for the latest figure or state, map for locations, switch for sending commands, and alert for values crossing a limit.",
  },
  {
    q: "Differentiate polling and push.",
    a: "With polling the browser asks the server for new data every few seconds, even if nothing changed. With push, the server sends data as soon as it changes over an open connection such as a WebSocket, so it is fresher and uses fewer messages.",
  },
  {
    q: "What is hysteresis in an alert?",
    a: "A gap between the level that turns an alert on and the level that turns it off, so a value wobbling around the limit does not keep switching the alert on and off.",
  },
  {
    q: "How does a dashboard switch control a device?",
    a: "It sets the desired state in the device's shadow or twin in the cloud. The device applies it when it is online and reports back; the switch shows pending until then.",
  },
  {
    q: "List four rules of good dashboard design.",
    a: "Put key items at the top left, keep to about eight widgets, label everything with titles and units, use colour only for meaning with an icon or word, and add hysteresis to alerts.",
  },
  {
    q: "Name two dashboard tools.",
    a: "Grafana (open source) and the dashboards in ThingsBoard or Node-RED; ThingSpeak and Power BI are also used.",
  },
];

export default viva;
