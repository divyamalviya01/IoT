import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Virtual parts: sensors, microcontrollers, network devices, a cloud platform, apps and actuators",
  ],
  theory:
    "Every IoT system is built from four building blocks: things (sensors and actuators), connectivity, data processing and a user interface. Data flows from a sensor to a microcontroller, through a network device to the cloud, and on to an app. Commands flow back the other way to an actuator. The parts must also suit the task: a temperature sensor cannot water a field, and a short-range Wi-Fi network may not reach across a large farm.",
  procedure: [
    "Open lab L01, Build an IoT system, and choose the Smart room cooling scenario.",
    "Select a part in the tray, then select the slot where it belongs. Fill all six slots.",
    "Press Check my system and read the hint for any slot marked wrong. Fix it and check again.",
    "When the system works, press Run system and watch data flow up and the command flow back.",
    "Press Record observation.",
    "Repeat for the Smart irrigation and Smart parking scenarios.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "scenario", label: "Scenario" },
    { key: "attempts", label: "Checks" },
    { key: "mistakes", label: "Mistakes" },
    { key: "result", label: "Result" },
    { key: "path", label: "Data path" },
  ],
  resultHint:
    "Name the six kinds of parts every system needed, and describe one mistake the checker caught and why it mattered.",
  viva: [
    {
      q: "What are the four building blocks of an IoT system?",
      a: "Things (sensors and actuators), connectivity, data processing and the user interface.",
    },
    {
      q: "Why can't a sensor send data straight to the cloud?",
      a: "A sensor only produces a signal. A microcontroller must read it and package the data, and a network device must carry it to the internet.",
    },
    {
      q: "Why is a LoRa gateway better than Wi-Fi for a large farm?",
      a: "Wi-Fi reaches only tens of metres, while LoRa covers several kilometres on very little power.",
    },
    {
      q: "Which part acts on the decision in the smart irrigation system?",
      a: "The water pump, switched by a relay. It is the actuator.",
    },
    {
      q: "Why does the Arduino Uno need an extra module in a connected system?",
      a: "It has no built-in Wi-Fi or Bluetooth, so it needs a wireless module to reach the network. An ESP32 has Wi-Fi built in.",
    },
  ],
};

export default record;
