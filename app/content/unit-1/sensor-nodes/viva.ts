import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is a sensor node?",
    a: "A small, usually battery-powered device that senses its surroundings, processes the reading and sends it over a wireless link. It is the building block of a wireless sensor network.",
  },
  {
    q: "Name the four units of a sensor node.",
    a: "Sensing unit: sensor and ADC. Processing unit: microcontroller and memory. Communication unit: radio transceiver. Power unit: battery, sometimes with energy harvesting.",
  },
  {
    q: "What are the main characteristics of an IoT sensor node?",
    a: "1) Small size and low cost. 2) Low power, usually on a battery. 3) Limited processing, memory and storage. 4) Short-range wireless communication. 5) Self-organising: nodes form the network on their own. 6) Fault-tolerant: the network keeps working when some nodes die.",
  },
  {
    q: "What is the difference between an analog and a digital sensor?",
    a: "An analog sensor gives a voltage that can take any value in a range, so it needs an ADC. A digital sensor gives fixed values such as HIGH and LOW, which the microcontroller reads directly.",
  },
  {
    q: "What is ADC resolution?",
    a: "The number of bits the ADC uses. An n-bit ADC has 2ⁿ steps. A 3-bit ADC on 0–5 V has 8 steps of 0.625 V. A 10-bit ADC has 1024 steps of about 4.9 mV.",
  },
  {
    q: "What is duty cycling and why is it used?",
    a: "Keeping the node asleep most of the time and waking it briefly to measure and send. Duty cycle = awake time ÷ total time, so awake 1 s in every 100 s is 1%. The average current falls, so batteries last months or years instead of days.",
  },
  {
    q: "Give two examples of sensors and two of actuators.",
    a: "Sensors: DHT11 (temperature and humidity) and PIR (motion). Actuators: relay and servo motor.",
  },
  {
    q: "Why does the radio sleep whenever possible?",
    a: "Sending and listening use far more current than sensing or processing. So the radio is the biggest drain on the battery.",
  },
];

export default viva;
