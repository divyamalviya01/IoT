import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Virtual Arduino Uno with an LED and resistor, a push button and a potentiometer",
  ],
  theory:
    "The Arduino Uno's GPIO pins can be set HIGH or LOW with digitalWrite() and read with digitalRead(). Its 10-bit ADC reads 0–5 V on pins A0–A5 as numbers from 0 to 1023 with analogRead(). Pins 3, 5, 6, 9, 10 and 11 can output PWM with analogWrite(), using duty values from 0 to 255 to set an LED's brightness. A sketch has setup(), which runs once, and loop(), which repeats forever; Serial.println() sends text to the serial monitor.",
  procedure: [
    "Open lab L04, Virtual Arduino and GPIO, and choose the Blink sketch.",
    "Change the delay to 250 ms, press Upload to board and measure the blink period. Press Record observation.",
    "Choose Button and LED. Hold the button and watch the LED. Record it.",
    "Choose Potentiometer dimmer. Turn the knob to three positions and note analogRead and the PWM duty. Record each.",
    "Change the dimmer's LED pin to 13 (no PWM), upload, and describe what happens.",
    "Choose Threshold alarm, set a limit and find the knob position where the alarm turns on.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "sketch", label: "Sketch" },
    { key: "settings", label: "Settings" },
    { key: "input", label: "Input" },
    { key: "measured", label: "What happened" },
  ],
  resultHint:
    "Describe how delay() set the blink period, how analogRead() values mapped to PWM duty, and what changed on a pin without PWM.",
  viva: [
    {
      q: "What is the difference between setup() and loop()?",
      a: "setup() runs once when the board starts or resets; loop() then runs again and again forever.",
    },
    {
      q: "What range of values does analogRead() return on the Uno, and why?",
      a: "0 to 1023, because the ADC has 10 bits and 2¹⁰ = 1024 steps.",
    },
    {
      q: "What does analogWrite(9, 127) do?",
      a: "It outputs PWM on pin 9 with a duty of about 50%, so an LED there glows at about half brightness.",
    },
    {
      q: "Why didn't the LED dim on pin 13?",
      a: "Pin 13 has no PWM, so analogWrite() can only switch it fully on (128 or more) or fully off.",
    },
    {
      q: "With delay(500) after each digitalWrite, what is the blink period?",
      a: "1000 ms: 500 ms on and 500 ms off.",
    },
  ],
};

export default record;
