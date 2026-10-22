import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "Name three commercial cloud IoT platforms.",
    a: "AWS IoT Core, Azure IoT Hub and Alibaba Cloud IoT Platform. ThingSpeak from MathWorks is a free-to-start IoT analytics service.",
  },
  {
    q: "List the common features of a cloud IoT platform.",
    a: "Device registry and identity, a device gateway for MQTT and HTTPS, a rules engine, device shadows or twins, an edge runtime, security and automatic provisioning, and links to storage and analytics.",
  },
  {
    q: "What is a device shadow?",
    a: "A JSON document in the cloud holding a device's reported state and the desired state set by apps. The difference (delta) is applied by the device when it next connects, so apps work even when the device is offline.",
  },
  {
    q: "What does a rules engine do?",
    a: "It checks each incoming message against rules and acts on it, for example storing it, sending an alert, or passing it to a function or database.",
  },
  {
    q: "Which IoT cloud services have been retired?",
    a: "Google Cloud IoT Core (August 2023), IBM Watson IoT Platform (December 2023), AWS IoT Analytics (December 2025) and AWS IoT Events (May 2026). Azure IoT Central accepts no new applications from September 2026.",
  },
  {
    q: "What is vendor lock-in and how can it be reduced?",
    a: "Being tied to one provider because moving is hard and costly. Using standard protocols such as MQTT, exportable data formats and configurable device firmware reduces it.",
  },
  {
    q: "Differentiate a device shadow and a digital twin.",
    a: "A device shadow stores one device's desired and reported state. A digital twin is a fuller live model of a machine, building or system, used for monitoring and testing changes in software.",
  },
];

export default viva;
