import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Simulated phone and three BLE devices in a 12 m × 10 m room: HR Band (heart-rate band), Room Sensor (temperature and humidity) and Shop Beacon (iBeacon)",
    "Signal-strength model with adjustable path-loss exponent n and noise",
  ],
  theory:
    "Bluetooth Low Energy (BLE) devices advertise by sending short packets on three advertising channels: 37, 38 and 39. A phone scans for these packets and measures their signal strength, the RSSI, in dBm. A connectable device's data is arranged by GATT into services, which hold characteristics, each with a 16-bit UUID and properties such as read and notify. Writing 01 00 to a characteristic's CCCD (0x2902) turns on notifications, so the device sends each new value without being asked. Signal strength falls with distance as RSSI = P1m − 10 × n × log10(d), where P1m is the RSSI at 1 m and n is 2 in free space and about 3 indoors. A phone estimates distance by turning this formula round, so noise and a wrong n give wrong distances.",
  procedure: [
    "Open lab L17, BLE explorer. Press Start scan and note each device's RSSI, estimated distance and advertising channels.",
    "Press Connect on HR Band. Press Read on Body Sensor Location, then Subscribe on Heart Rate Measurement and watch the notifications. Press Unsubscribe.",
    "Press Connect on Room Sensor and Read Temperature and Humidity. Press View advert on Shop Beacon and note its iBeacon fields.",
    "With Measure distance to set to Shop Beacon, press 1 m under Place the phone. Press Record observation with Average last 10 readings off, then tick it, wait for 10 readings and record again.",
    "Repeat step 4 at 4 m and 8 m.",
    "Set Room's true n to 3.0 and Phone assumes n to 2.0. Press 4 m, wait for 10 readings and press Record observation.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "device", label: "Device" },
    { key: "distance", label: "True distance", unit: "m" },
    { key: "nTrue", label: "True n" },
    { key: "nAssumed", label: "Assumed n" },
    { key: "averaged", label: "Averaged" },
    { key: "rssi", label: "RSSI", unit: "dBm" },
    { key: "estimate", label: "Estimate", unit: "m" },
    { key: "error", label: "Error", unit: "%" },
  ],
  resultHint:
    "Say how the error changed with distance, what averaging 10 readings did, and what happened when the phone assumed the wrong n. Add one thing you saw in the GATT browser.",
  viva: [
    {
      q: "Why does a BLE device advertise on three channels?",
      a: "Channels 37, 38 and 39 sit in different parts of the 2.4 GHz band, away from the busiest Wi-Fi channels, so at least one copy of each packet usually gets through.",
    },
    {
      q: "What is the difference between a service and a characteristic?",
      a: "A service groups related data, such as Heart Rate (0x180D). A characteristic is one value inside it, such as Heart Rate Measurement (0x2A37), with properties such as read or notify.",
    },
    {
      q: "Why could you not Read Heart Rate Measurement?",
      a: "It only has the notify property. The phone writes 01 00 to its CCCD (0x2902) to subscribe, and then the band sends a new value every second.",
    },
    {
      q: "Why can't the phone connect to the Shop Beacon?",
      a: "A beacon is not connectable. It only broadcasts an advertisement (iBeacon: UUID, major, minor and measured power) that any phone nearby can hear.",
    },
    {
      q: "Why does the distance error grow with distance?",
      a: "RSSI falls with the log of distance, so far away a few dB of noise change the estimate by many metres. Near the device the same noise moves it only a little.",
    },
    {
      q: "Why did averaging help with noise but not with a wrong n?",
      a: "Noise is random, so it partly cancels out over 10 readings. A wrong n is the same mistake every time, so it gives a steady bias, for example 8 m instead of 4 m when n is 3 but the phone assumes 2.",
    },
  ],
};

export default record;
