import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Simulated Zigbee temperature sensor, BLE climate sensor and Modbus RTU energy meter (household appliances switch on and off behind the meter)",
    "Simulated IoT gateway and MQTT broker",
  ],
  theory:
    "An IoT gateway connects local devices that speak different protocols, such as Zigbee, BLE and Modbus, to the internet. It receives each raw frame, decodes the bytes into fields using the rules of that protocol, converts the raw numbers into real units and publishes them as MQTT messages with a topic and a JSON payload. A topic template, such as site/{location}/{quantity}, maps every device and reading to one topic, so the cloud sees one common format. MQTT text is larger than the compact binary frames, so translation alone can increase traffic. A deadband filter sends a reading only if it changed by more than a set percentage since the last value sent, which cuts the messages and bytes sent to the cloud.",
  procedure: [
    "Open lab L10, Gateway protocol translator. Keep all three devices ticked, the Topic template as site/{location}/{quantity}, the Temperature unit as Celsius (°C) and Send only if the value changed by more than at 0 %.",
    "Press Start gateway and choose 4× speed. Each run stops after one simulated minute. Study the latest frame and its MQTT messages, then press Record observation.",
    "Set Send only if the value changed by more than to 1 %, then 5 % and then 10 %. Each time, press Start gateway, let the run finish and press Record observation.",
    "Change the Topic template to factory/{device}/{quantity}, run, compare the topics in the event log and press Record observation.",
    "Set the Temperature unit to Fahrenheit (°F), run and compare the temperature payloads.",
    "Untick one device, run again and press Record observation.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "template", label: "Topic template" },
    { key: "unit", label: "Unit" },
    { key: "devices", label: "Devices on" },
    { key: "deadband", label: "Deadband", unit: "%" },
    { key: "time", label: "Time", unit: "s" },
    { key: "frames", label: "Frames in" },
    { key: "bytesIn", label: "Bytes in" },
    { key: "messagesOut", label: "MQTT messages out" },
    { key: "filtered", label: "Readings filtered" },
    { key: "bytesOut", label: "Bytes out" },
  ],
  resultHint:
    "Describe how the MQTT messages and bytes out changed as the deadband rose, compare bytes out with bytes in, and say what changed when you edited the topic template or the unit.",
  viva: [
    {
      q: "What does the gateway do in this lab?",
      a: "It receives raw frames from Zigbee, BLE and Modbus devices, decodes the bytes, converts the values into real units and publishes them as MQTT messages to a broker.",
    },
    {
      q: "Why were bytes out higher than bytes in when the deadband was 0 %?",
      a: "Each device frame is only 7 to 9 bytes of binary, but each MQTT message carries a text topic and a JSON payload of about 50 bytes. The BLE and Modbus frames also make two messages each.",
    },
    {
      q: "What is a deadband filter, and what did it change?",
      a: "It sends a reading only if it changed by more than a set percentage since the last value sent. Frames in stayed the same, but MQTT messages and bytes out fell sharply. At 1 % some small wobbles still got through; at 5 % and 10 % mostly real changes were sent, such as the power jumping when an appliance switched on.",
    },
    {
      q: "What does the topic template site/{location}/{quantity} do?",
      a: "It builds each topic by filling in the device's location and the reading's name, for example site/kitchen/temperature. Changing the template changes every topic without touching the devices.",
    },
    {
      q: "Why can a published topic not contain + or #?",
      a: "In MQTT, + and # are wildcards used only when subscribing. A message must be published to one exact topic.",
    },
    {
      q: "Where did the Celsius to Fahrenheit conversion happen?",
      a: "In the gateway. The device frames stayed the same; only the values and units in the MQTT payloads changed.",
    },
  ],
};

export default record;
