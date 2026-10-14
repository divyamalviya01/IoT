/**
 * Lab L04: a virtual Arduino Uno. It models the parts of the board a beginner
 * meets (digital pins, PWM pins, the 10-bit ADC and the serial monitor) and
 * runs four ready-made sketches whose values students can change.
 * No free-form code is executed: each sketch is TypeScript that behaves like
 * the C code shown on screen.
 */

export const PWM_PINS = [3, 5, 6, 9, 10, 11] as const;
export const DIGITAL_PINS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;
export const ANALOG_PINS = ["A0", "A1", "A2", "A3", "A4", "A5"] as const;
export type AnalogPin = (typeof ANALOG_PINS)[number];
export type PinMode = "INPUT" | "OUTPUT";

export function isPwmPin(pin: number): boolean {
  return (PWM_PINS as readonly number[]).includes(pin);
}

/** Arduino's map(): integer arithmetic that truncates, like the real function. */
export function arduinoMap(x: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return Math.trunc(((x - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin);
}

export interface SerialLine {
  t: number;
  text: string;
}

export class VirtualUno {
  millis = 0;
  readonly modes = new Map<number, PinMode>();
  /** Output level of each digital pin */
  readonly levels = new Map<number, 0 | 1>();
  /** PWM duty (0–255) of pins driven by analogWrite on a PWM pin */
  readonly pwm = new Map<number, number>();
  /** Voltage on each digital input pin, set by the circuit (for example a button) */
  readonly inputs = new Map<number, 0 | 1>();
  /** Voltage on each analog pin, set by the circuit (for example a potentiometer) */
  readonly analogVolts = new Map<AnalogPin, number>();
  serial: SerialLine[] = [];

  pinMode(pin: number, mode: PinMode) {
    this.modes.set(pin, mode);
  }

  digitalWrite(pin: number, value: 0 | 1) {
    this.pwm.delete(pin);
    this.levels.set(pin, value);
  }

  digitalRead(pin: number): 0 | 1 {
    return this.inputs.get(pin) ?? 0;
  }

  /** 10-bit ADC with a 5 V reference: 0 V → 0, 5 V → 1023. */
  analogRead(pin: AnalogPin): number {
    const volts = Math.min(5, Math.max(0, this.analogVolts.get(pin) ?? 0));
    return Math.round((volts / 5) * 1023);
  }

  /**
   * PWM pins get a duty cycle. On other pins the Uno can only switch fully:
   * values of 128 or more give HIGH, smaller values give LOW.
   */
  analogWrite(pin: number, value: number) {
    const v = Math.min(255, Math.max(0, Math.round(value)));
    if (isPwmPin(pin)) {
      this.pwm.set(pin, v);
      this.levels.set(pin, v > 0 ? 1 : 0);
    } else {
      this.pwm.delete(pin);
      this.levels.set(pin, v >= 128 ? 1 : 0);
    }
  }

  println(text: string | number) {
    this.serial.push({ t: this.millis, text: String(text) });
    if (this.serial.length > 200) this.serial.splice(0, this.serial.length - 200);
  }

  /** How bright an LED on this pin looks, 0–1. */
  brightness(pin: number): number {
    const duty = this.pwm.get(pin);
    if (duty !== undefined) return duty / 255;
    return this.modes.get(pin) === "OUTPUT" ? (this.levels.get(pin) ?? 0) : 0;
  }
}

/* ------------------------------------------------------------------ */
/* Sketches                                                            */
/* ------------------------------------------------------------------ */

export type SketchId = "blink" | "button" | "dimmer" | "alarm";

export interface SketchParams {
  ledPin: number;
  delayMs: number;
  buttonPin: number;
  potPin: AnalogPin;
  threshold: number;
}

export const DEFAULT_PARAMS: Record<SketchId, SketchParams> = {
  blink: { ledPin: 13, delayMs: 500, buttonPin: 2, potPin: "A0", threshold: 600 },
  button: { ledPin: 13, delayMs: 500, buttonPin: 2, potPin: "A0", threshold: 600 },
  dimmer: { ledPin: 9, delayMs: 500, buttonPin: 2, potPin: "A0", threshold: 600 },
  alarm: { ledPin: 8, delayMs: 500, buttonPin: 2, potPin: "A0", threshold: 600 },
};

export const SKETCH_TITLES: Record<SketchId, string> = {
  blink: "Blink",
  button: "Button and LED",
  dimmer: "Potentiometer dimmer",
  alarm: "Threshold alarm",
};

/** Which parts of the circuit each sketch uses (and which params can be edited). */
export const SKETCH_USES: Record<SketchId, { button: boolean; pot: boolean; editable: (keyof SketchParams)[] }> = {
  blink: { button: false, pot: false, editable: ["ledPin", "delayMs"] },
  button: { button: true, pot: false, editable: ["buttonPin", "ledPin"] },
  dimmer: { button: false, pot: true, editable: ["potPin", "ledPin"] },
  alarm: { button: false, pot: true, editable: ["potPin", "threshold", "ledPin"] },
};

/** Problems that would stop the circuit from working as intended. */
export function validateParams(id: SketchId, p: SketchParams): string[] {
  const issues: string[] = [];
  if (SKETCH_USES[id].button && p.buttonPin === p.ledPin) {
    issues.push("The button and the LED cannot share a pin.");
  }
  if (id === "dimmer" && !isPwmPin(p.ledPin)) {
    issues.push(
      `Pin ${p.ledPin} has no PWM, so analogWrite() can only switch it fully on or off. Try pin 3, 5, 6, 9, 10 or 11.`,
    );
  }
  return issues;
}

/** The C source shown on screen. Values the student can change are wrapped in ⟦ ⟧. */
export function sketchSource(id: SketchId, p: SketchParams): string {
  switch (id) {
    case "blink":
      return `const int LED = ⟦${p.ledPin}⟧;

void setup() {
  pinMode(LED, OUTPUT);
}

void loop() {
  digitalWrite(LED, HIGH);
  delay(⟦${p.delayMs}⟧);
  digitalWrite(LED, LOW);
  delay(⟦${p.delayMs}⟧);
}`;
    case "button":
      return `const int BUTTON = ⟦${p.buttonPin}⟧;
const int LED = ⟦${p.ledPin}⟧;

void setup() {
  pinMode(BUTTON, INPUT);
  pinMode(LED, OUTPUT);
}

void loop() {
  if (digitalRead(BUTTON) == HIGH) {
    digitalWrite(LED, HIGH);
  } else {
    digitalWrite(LED, LOW);
  }
}`;
    case "dimmer":
      return `const int POT = ⟦${p.potPin}⟧;
const int LED = ⟦${p.ledPin}⟧;

void setup() {
  pinMode(LED, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int value = analogRead(POT);          // 0 to 1023
  int duty = map(value, 0, 1023, 0, 255);
  analogWrite(LED, duty);               // 0 to 255
  Serial.println(value);
  delay(500);
}`;
    case "alarm":
      return `const int SENSOR = ⟦${p.potPin}⟧;
const int ALARM = ⟦${p.ledPin}⟧;
const int LIMIT = ⟦${p.threshold}⟧;

void setup() {
  pinMode(ALARM, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int value = analogRead(SENSOR);
  if (value > LIMIT) {
    digitalWrite(ALARM, HIGH);
  } else {
    digitalWrite(ALARM, LOW);
  }
  Serial.println(value);
  delay(500);
}`;
  }
}

/** A running sketch: setup() once, then loop() advanced by simulated time. */
export class SketchRunner {
  readonly uno = new VirtualUno();
  readonly id: SketchId;
  readonly params: SketchParams;
  /** Times (ms) when the LED pin changed level, for measuring the blink period */
  readonly ledChanges: number[] = [];
  private nextLoopAt = 0;
  private blinkOn = false;
  lastReading: number | null = null;

  constructor(id: SketchId, params: SketchParams) {
    this.id = id;
    this.params = params;
    this.setup();
  }

  private setup() {
    const { uno, params: p } = this;
    uno.pinMode(p.ledPin, "OUTPUT");
    if (this.id === "button") uno.pinMode(p.buttonPin, "INPUT");
    uno.digitalWrite(p.ledPin, 0);
  }

  /** Advances the board by dtMs of simulated time. */
  advance(dtMs: number) {
    const end = this.uno.millis + dtMs;
    // Event-driven: run loop() bodies at the moments they would start.
    while (this.nextLoopAt <= end) {
      this.uno.millis = Math.max(this.uno.millis, this.nextLoopAt);
      this.nextLoopAt += this.loopOnce();
    }
    this.uno.millis = end;
  }

  /** Runs one pass of loop() (or one half of Blink) and returns how long it takes, ms. */
  private loopOnce(): number {
    const { uno, params: p } = this;
    const before = uno.levels.get(p.ledPin) ?? 0;
    let duration = 1;

    switch (this.id) {
      case "blink":
        this.blinkOn = !this.blinkOn;
        uno.digitalWrite(p.ledPin, this.blinkOn ? 1 : 0);
        duration = p.delayMs;
        break;
      case "button":
        uno.digitalWrite(p.ledPin, uno.digitalRead(p.buttonPin));
        duration = 1;
        break;
      case "dimmer": {
        const value = uno.analogRead(p.potPin);
        uno.analogWrite(p.ledPin, arduinoMap(value, 0, 1023, 0, 255));
        uno.println(value);
        this.lastReading = value;
        duration = 500;
        break;
      }
      case "alarm": {
        const value = uno.analogRead(p.potPin);
        uno.digitalWrite(p.ledPin, value > p.threshold ? 1 : 0);
        uno.println(value);
        this.lastReading = value;
        duration = 500;
        break;
      }
    }

    if ((uno.levels.get(p.ledPin) ?? 0) !== before) this.ledChanges.push(uno.millis);
    return duration;
  }

  /** Measured blink period (one on + one off), ms, or null before two changes. */
  blinkPeriod(): number | null {
    const c = this.ledChanges;
    if (c.length < 3) return null;
    return c[c.length - 1] - c[c.length - 3];
  }
}
