/**
 * Lab L02: how a sensor node turns a physical value into a number, and how
 * duty cycling sets battery life. Pure functions only.
 */

export type SensorId = "lm35" | "ldr" | "soil";

export interface SensorModel {
  id: SensorId;
  name: string;
  quantity: string;
  unit: string;
  /** Slider range for the environment */
  min: number;
  max: number;
  /** How far the value swings around its average during the run */
  swing: number;
  defaultValue: number;
  /** Physical value → sensor output voltage */
  toVolts: (value: number, vref: number) => number;
  /** Voltage → physical value (what the microcontroller calculates) */
  fromVolts: (volts: number, vref: number) => number;
  actuator: string;
  /** The actuator switches on when the value is above or below the threshold */
  direction: "above" | "below";
  defaultThreshold: number;
  thresholdStep: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const SENSORS: Record<SensorId, SensorModel> = {
  lm35: {
    id: "lm35",
    name: "LM35 temperature sensor",
    quantity: "Temperature",
    unit: "°C",
    min: 0,
    max: 100,
    swing: 5,
    defaultValue: 28,
    // 10 mV per °C, independent of the ADC reference.
    toVolts: (t) => clamp(t * 0.01, 0, 1.5),
    fromVolts: (v) => v / 0.01,
    actuator: "Fan",
    direction: "above",
    defaultThreshold: 30,
    thresholdStep: 1,
  },
  ldr: {
    id: "ldr",
    name: "LDR light sensor (voltage divider)",
    quantity: "Light",
    unit: "lux",
    min: 0,
    max: 1000,
    swing: 60,
    defaultValue: 120,
    // Simplified divider: brighter light → higher voltage, approaching Vref.
    toVolts: (lux, vref) => vref * (Math.max(0, lux) / (Math.max(0, lux) + 200)),
    fromVolts: (v, vref) => (v >= vref ? Infinity : (200 * v) / (vref - v)),
    actuator: "Street light",
    direction: "below",
    defaultThreshold: 100,
    thresholdStep: 10,
  },
  soil: {
    id: "soil",
    name: "Capacitive soil moisture sensor",
    quantity: "Soil moisture",
    unit: "%",
    min: 0,
    max: 100,
    swing: 8,
    defaultValue: 35,
    // Dry soil gives a higher voltage than wet soil.
    toVolts: (m, vref) => vref * (0.8 - 0.5 * (clamp(m, 0, 100) / 100)),
    fromVolts: (v, vref) => ((0.8 - v / vref) / 0.5) * 100,
    actuator: "Water pump",
    direction: "below",
    defaultThreshold: 30,
    thresholdStep: 1,
  },
};

export interface Quantized {
  /** ADC output, 0 to 2ⁿ − 1 */
  code: number;
  /** Volts per step: Vref ÷ 2ⁿ */
  step: number;
  /** The voltage the code stands for: code × step */
  volts: number;
  levels: number;
}

/** Converts a voltage the way a successive-approximation ADC does (rounding down). */
export function quantize(volts: number, vref: number, bits: number): Quantized {
  const levels = 2 ** bits;
  const step = vref / levels;
  const code = clamp(Math.floor(volts / step), 0, levels - 1);
  return { code, step, volts: code * step, levels };
}

/** The environment during the run: a slow wave around the chosen average. */
export function envValue(sensor: SensorModel, average: number, seconds: number, periodSeconds = 60): number {
  const v = average + sensor.swing * Math.sin((seconds / periodSeconds) * 2 * Math.PI);
  return clamp(v, sensor.min, sensor.max);
}

export interface Measurement {
  trueValue: number;
  volts: number;
  adc: Quantized;
  /** What the microcontroller calculates from the ADC code */
  measured: number;
  error: number;
  actuatorOn: boolean;
}

export function measure(
  sensor: SensorModel,
  trueValue: number,
  vref: number,
  bits: number,
  threshold: number,
): Measurement {
  const volts = sensor.toVolts(trueValue, vref);
  const adc = quantize(volts, vref, bits);
  const measured = sensor.fromVolts(adc.volts, vref);
  const actuatorOn = sensor.direction === "above" ? measured > threshold : measured < threshold;
  return { trueValue, volts, adc, measured, error: Math.abs(measured - trueValue), actuatorOn };
}

/**
 * Smallest change in the physical value one ADC step can show, near `value`.
 * For the LM35 this is constant; for the LDR it depends on the light level.
 */
export function resolutionAt(sensor: SensorModel, value: number, vref: number, bits: number): number {
  const step = vref / 2 ** bits;
  const v = sensor.toVolts(value, vref);
  return Math.abs(sensor.fromVolts(v + step, vref) - sensor.fromVolts(v, vref));
}

export interface BatteryInput {
  capacityMah: number;
  awakeMa: number;
  /** Seconds awake for each report (measure, connect, send) */
  awakeSeconds: number;
  sleepMa: number;
  /** Seconds between reports */
  intervalSeconds: number;
}

export interface BatteryResult {
  /** Share of time awake, 0–1 */
  duty: number;
  averageMa: number;
  hours: number;
  days: number;
}

/** average = duty × awake + (1 − duty) × sleep; life = capacity ÷ average. */
export function batteryLife(input: BatteryInput): BatteryResult {
  const duty = clamp(input.awakeSeconds / input.intervalSeconds, 0, 1);
  const averageMa = duty * input.awakeMa + (1 - duty) * input.sleepMa;
  const hours = input.capacityMah / averageMa;
  return { duty, averageMa, hours, days: hours / 24 };
}

/** Reporting intervals offered by the battery chart and slider. */
export const INTERVALS = [10, 30, 60, 300, 900, 1800, 3600] as const;

export function formatInterval(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${seconds / 60} min`;
  return `${seconds / 3600} h`;
}
