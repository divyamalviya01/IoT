import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is a sensor node?",
    a: "A small, usually battery-powered device that senses its surroundings, processes the reading and sends it over a wireless link. It is the building block of a wireless sensor network.",
  },
  {
    q: "Name the four units of a sensor node.",
    a: "Sensing unit (sensor and ADC), processing unit (microcontroller and memory), communication unit (radio transceiver) and power unit (battery, possibly with energy harvesting).",
  },
  {
    q: "What is the difference between an analog and a digital sensor?",
    a: "An analog sensor gives a voltage that can take any value in a range, so it needs an ADC. A digital sensor gives fixed values such as HIGH and LOW, which the microcontroller reads directly.",
  },
  {
    q: "What is ADC resolution?",
    a: "The number of bits the ADC uses. An n-bit ADC divides the reference voltage into 2ⁿ steps; for example, a 10-bit ADC has 1024 steps.",
  },
  {
    q: "What is duty cycling and why is it used?",
    a: "Keeping the node asleep most of the time and waking it only briefly to measure and send. It lowers the average current, so batteries last months or years instead of days.",
  },
  {
    q: "Give two examples of sensors and two of actuators.",
    a: "Sensors: DHT11 (temperature and humidity) and PIR (motion). Actuators: relay and servo motor.",
  },
  {
    q: "Why does the radio sleep whenever possible?",
    a: "Transmitting and listening use far more current than sensing or processing, so the radio is the biggest drain on the battery.",
  },
];

export default viva;
