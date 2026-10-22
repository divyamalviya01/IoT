import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Simulated room-temperature sensor sending one reading a minute from 08:00 to 14:00, with injected faults (seeded, so every run repeats)",
  ],
  theory:
    "Stream analytics processes each reading as it arrives. A moving average is the average of the last N readings (the window); it smooths out noise but trails real changes by about (N − 1) ÷ 2 readings. A z-score measures how unusual a reading is: z = (reading − average of the previous N readings) ÷ their standard deviation. A reading whose z-score is above a limit k (often 3) is flagged as an anomaly. A smaller k or window flags more readings, including false alarms; a larger one is calmer but slower. A z-score catches sudden spikes but misses slow drift, and a stuck sensor needs its own rule (the same value many times in a row).",
  procedure: [
    "Open lab L22, Stream analytics. Keep window 20 and k = 3, press Play or Show whole run, and press Record observation when the run ends.",
    "Lower k to 2 and record again; note the false alarms.",
    "Set k back to 3. Try windows of 5 and 50, recording each, and note the smoothing lag.",
    "Press Reset faults, start the run, and inject a stuck sensor and a slow drift. Note which one is flagged.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "window", label: "Window", unit: "readings" },
    { key: "k", label: "Limit k" },
    { key: "readings", label: "Readings" },
    { key: "spikes", label: "Spikes injected" },
    { key: "flagged", label: "Flagged" },
    { key: "caught", label: "Spikes caught" },
    { key: "falseAlarms", label: "False alarms" },
    { key: "missed", label: "Missed" },
  ],
  resultHint:
    "State which window and k gave the best balance of caught spikes and false alarms, how k and the window changed the results, and which fault the z-score could not catch.",
  viva: [
    {
      q: "What does a moving average do to a sensor stream?",
      a: "It replaces each reading by the average of the last N readings, which smooths out random noise but makes the line trail real changes.",
    },
    {
      q: "How is the z-score of a reading calculated?",
      a: "Subtract the average of the previous N readings from the reading, then divide by their standard deviation.",
    },
    {
      q: "Why did lowering k raise the false alarms?",
      a: "A lower limit flags readings that are only a little unusual, and ordinary noise sometimes reaches that level.",
    },
    {
      q: "What is the trade-off when choosing the window size?",
      a: "A small window reacts quickly but is jumpy and gives more false alarms; a large window is steady but slow to follow real changes.",
    },
    {
      q: "Why did the z-score miss the slow drift?",
      a: "The average of recent readings drifts along with the signal, so each new reading never looks unusual compared with the ones just before it.",
    },
    {
      q: "Why is the previous window used, without the current reading?",
      a: "If the spike were included, it would raise the average and the standard deviation and hide itself.",
    },
  ],
};

export default record;
