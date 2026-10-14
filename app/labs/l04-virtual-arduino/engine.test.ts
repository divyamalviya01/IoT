import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS, SketchRunner, VirtualUno, arduinoMap, sketchSource, validateParams } from "./engine";

describe("VirtualUno", () => {
  it("reads 0–5 V as 0–1023", () => {
    const uno = new VirtualUno();
    uno.analogVolts.set("A0", 0);
    expect(uno.analogRead("A0")).toBe(0);
    uno.analogVolts.set("A0", 5);
    expect(uno.analogRead("A0")).toBe(1023);
    uno.analogVolts.set("A0", 2.5);
    expect(uno.analogRead("A0")).toBe(512);
  });

  it("uses PWM on PWM pins and switches fully on other pins", () => {
    const uno = new VirtualUno();
    uno.pinMode(9, "OUTPUT");
    uno.analogWrite(9, 64);
    expect(uno.brightness(9)).toBeCloseTo(64 / 255);

    uno.pinMode(13, "OUTPUT");
    uno.analogWrite(13, 127);
    expect(uno.brightness(13)).toBe(0);
    uno.analogWrite(13, 128);
    expect(uno.brightness(13)).toBe(1);
  });

  it("copies Arduino's integer map()", () => {
    expect(arduinoMap(512, 0, 1023, 0, 255)).toBe(127);
    expect(arduinoMap(1023, 0, 1023, 0, 255)).toBe(255);
    expect(arduinoMap(0, 0, 1023, 0, 255)).toBe(0);
  });
});

describe("sketches", () => {
  it("Blink toggles the LED every delay and measures the period", () => {
    const run = new SketchRunner("blink", { ...DEFAULT_PARAMS.blink, delayMs: 250 });
    run.advance(1);
    expect(run.uno.brightness(13)).toBe(1);
    run.advance(250);
    expect(run.uno.brightness(13)).toBe(0);
    run.advance(1000);
    expect(run.blinkPeriod()).toBe(500);
  });

  it("Button and LED follows the button", () => {
    const run = new SketchRunner("button", DEFAULT_PARAMS.button);
    run.advance(5);
    expect(run.uno.brightness(13)).toBe(0);
    run.uno.inputs.set(2, 1);
    run.advance(5);
    expect(run.uno.brightness(13)).toBe(1);
    run.uno.inputs.set(2, 0);
    run.advance(5);
    expect(run.uno.brightness(13)).toBe(0);
  });

  it("the dimmer maps the knob to LED brightness and prints readings every 500 ms", () => {
    const run = new SketchRunner("dimmer", DEFAULT_PARAMS.dimmer);
    run.uno.analogVolts.set("A0", 2.5);
    run.advance(1200);
    expect(run.lastReading).toBe(512);
    expect(run.uno.brightness(9)).toBeCloseTo(127 / 255);
    expect(run.uno.serial.map((l) => l.text)).toEqual(["512", "512", "512"]);
  });

  it("the dimmer on a non-PWM pin can only switch fully", () => {
    const run = new SketchRunner("dimmer", { ...DEFAULT_PARAMS.dimmer, ledPin: 13 });
    run.uno.analogVolts.set("A0", 1);
    run.advance(10);
    expect(run.uno.brightness(13)).toBe(0);
    run.uno.analogVolts.set("A0", 4);
    run.advance(600);
    expect(run.uno.brightness(13)).toBe(1);
  });

  it("the alarm turns on above the threshold", () => {
    const run = new SketchRunner("alarm", { ...DEFAULT_PARAMS.alarm, threshold: 600 });
    run.uno.analogVolts.set("A0", 2);
    run.advance(10);
    expect(run.uno.brightness(8)).toBe(0);
    run.uno.analogVolts.set("A0", 4);
    run.advance(600);
    expect(run.uno.brightness(8)).toBe(1);
  });

  it("flags shared pins and dimming on a non-PWM pin", () => {
    expect(validateParams("button", { ...DEFAULT_PARAMS.button, ledPin: 2 })).toHaveLength(1);
    expect(validateParams("dimmer", { ...DEFAULT_PARAMS.dimmer, ledPin: 13 })[0]).toContain("no PWM");
    expect(validateParams("blink", DEFAULT_PARAMS.blink)).toHaveLength(0);
  });

  it("shows the chosen values in the source code", () => {
    const src = sketchSource("blink", { ...DEFAULT_PARAMS.blink, ledPin: 7, delayMs: 300 });
    expect(src).toContain("⟦7⟧");
    expect(src).toContain("delay(⟦300⟧)");
  });
});
