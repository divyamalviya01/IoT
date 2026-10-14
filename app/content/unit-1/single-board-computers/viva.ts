import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is a single-board computer?",
    a: "A complete computer built on one circuit board, with processor, memory and ports, that runs an operating system. The Raspberry Pi is an example.",
  },
  {
    q: "How is a microcontroller board different from a single-board computer?",
    a: "A microcontroller board runs one program with no operating system, uses very little power and starts instantly. An SBC runs an operating system, has far more memory and power, and can run many programs.",
  },
  {
    q: "Give the key specifications of the Arduino Uno R3.",
    a: "ATmega328P at 16 MHz, 32 KB flash, 2 KB RAM, 14 digital pins (6 with PWM), 6 analog inputs with a 10-bit ADC, working at 5 V.",
  },
  {
    q: "What is GPIO?",
    a: "General-purpose input/output: pins a program can set HIGH or LOW, or read, to connect LEDs, buttons and sensors.",
  },
  {
    q: "What is PWM and where is it used?",
    a: "Pulse-width modulation switches a pin on and off quickly; the share of on-time sets the average power. It controls LED brightness and motor speed.",
  },
  {
    q: "What is open-source hardware? Name one open board.",
    a: "Hardware whose design files are published so anyone can study, change, make and sell it under an open licence. The Arduino Uno is an example.",
  },
  {
    q: "Why should you not connect a 5 V sensor output directly to a Raspberry Pi pin?",
    a: "Raspberry Pi GPIO pins work at 3.3 V. A 5 V signal can damage the pin or the processor, so a level shifter or voltage divider is needed.",
  },
];

export default viva;
