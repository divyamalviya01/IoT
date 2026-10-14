import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Virtual sensor node: LM35, LDR or soil moisture sensor, ADC, microcontroller, actuator and battery",
  ],
  theory:
    "A sensor turns a physical quantity into a voltage, and the ADC turns that voltage into a number. An n-bit ADC has 2ⁿ steps, and one step is the reference voltage divided by 2ⁿ, so more bits give finer readings. The rounding to the nearest step is called quantisation error. A sensor node saves energy by sleeping between reports; the average current is duty cycle × awake current + (1 − duty cycle) × sleep current, and battery life is the battery capacity divided by the average current.",
  procedure: [
    "Open lab L02, Sensor node simulator, and choose the LM35 temperature sensor.",
    "Set the ADC to 8 bits with a 5 V reference. Press Play and note the step size, the resolution and the error.",
    "Press Record observation.",
    "Change the ADC to 10 bits and then 12 bits, recording a row each time.",
    "Change the reporting interval from 1 minute to 15 minutes and note how the battery life changes. Record each.",
    "Try the LDR and soil moisture sensors and watch when the actuator switches on.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "sensor", label: "Sensor" },
    { key: "bits", label: "ADC bits" },
    { key: "vref", label: "Vref", unit: "V" },
    { key: "stepMv", label: "Step size", unit: "mV" },
    { key: "resolution", label: "Resolution" },
    { key: "interval", label: "Report every" },
    { key: "batteryDays", label: "Battery life", unit: "days" },
  ],
  resultHint:
    "Describe how the step size changed with the number of bits, and how the reporting interval changed the battery life.",
  viva: [
    {
      q: "How many steps does a 12-bit ADC have?",
      a: "2¹² = 4096 steps.",
    },
    {
      q: "What is the step size of a 10-bit ADC with a 5 V reference?",
      a: "5 V ÷ 1024 ≈ 4.9 mV.",
    },
    {
      q: "What is quantisation error?",
      a: "The difference between the true voltage and the nearest step the ADC can represent. It is always less than one step.",
    },
    {
      q: "Why does reporting less often make the battery last longer?",
      a: "The node spends a larger share of its time asleep, so its duty cycle and average current fall.",
    },
    {
      q: "Why does a lower reference voltage improve resolution for the LM35?",
      a: "The step size is Vref ÷ 2ⁿ, so a smaller reference gives smaller steps, and the LM35's output stays well below 3.3 V in normal use.",
    },
  ],
};

export default record;
