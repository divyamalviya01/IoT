import { Fan, Lightbulb, Waves } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { SimControls } from "~/components/sim/SimControls";
import { useSimClock } from "~/components/sim/useSimClock";
import { ChartCard, ChartTooltip, chartStyle, seriesColor } from "~/components/theory/ChartCard";
import { Segmented } from "~/components/ui/Segmented";
import { Slider } from "~/components/ui/Slider";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import {
  INTERVALS,
  SENSORS,
  batteryLife,
  envValue,
  formatInterval,
  measure,
  quantize,
  resolutionAt,
  type SensorId,
} from "./engine";

const lab = getLab("l02-sensor-node")!;
const RUN_SECONDS = 60;
const BATTERY = { capacityMah: 2000, awakeMa: 80, awakeSeconds: 2, sleepMa: 0.01 };

const steps = [
  "Choose the LM35 sensor, set the ADC to 8 bits and press Play. Watch the stepped line follow the smooth one.",
  "Note the step size, resolution and error in the readouts, then press Record observation.",
  "Repeat with 10 and 12 bits. Watch the steps get smaller.",
  "Change the reporting interval and watch the battery life change.",
  "Try the LDR and soil sensors, and move the threshold to see when the actuator switches on.",
];

const ACTUATOR_ICON = { lm35: Fan, ldr: Lightbulb, soil: Waves } as const;

function fmt(n: number, digits = 1) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function summarise(rows: ObservationRow[]): string {
  if (rows.length < 2) return "";
  const parts: string[] = [];
  const byBits = [...rows].sort((a, b) => Number(a.bits) - Number(b.bits));
  const lo = byBits[0];
  const hi = byBits[byBits.length - 1];
  if (Number(hi.bits) > Number(lo.bits)) {
    parts.push(
      `Increasing the ADC from ${lo.bits} to ${hi.bits} bits reduced the step size from ${lo.stepMv} mV to ${hi.stepMv} mV, so readings became finer.`,
    );
  }
  const byLife = [...rows].sort((a, b) => Number(a.batteryDays) - Number(b.batteryDays));
  const short = byLife[0];
  const long = byLife[byLife.length - 1];
  if (Number(long.batteryDays) > Number(short.batteryDays)) {
    parts.push(
      `Reporting every ${long.interval} instead of every ${short.interval} raised the battery life from ${short.batteryDays} to ${long.batteryDays} days, because the node slept for a larger share of the time.`,
    );
  }
  return parts.join(" ");
}

export default function SensorNodeLab() {
  const [sensorId, setSensorId] = useState<SensorId>("lm35");
  const sensor = SENSORS[sensorId];
  const [average, setAverage] = useState(sensor.defaultValue);
  const [bits, setBits] = useState(8);
  const [vref, setVref] = useState(5);
  const [sampleEvery, setSampleEvery] = useState(2);
  const [threshold, setThreshold] = useState(sensor.defaultThreshold);
  const [intervalIndex, setIntervalIndex] = useState(2);
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");

  const clock = useSimClock({ onTick: () => {}, stepMs: 1000, maxTimeMs: RUN_SECONDS * 1000 });
  const now = clock.timeMs / 1000;

  const chooseSensor = (id: SensorId) => {
    setSensorId(id);
    setAverage(SENSORS[id].defaultValue);
    setThreshold(SENSORS[id].defaultThreshold);
    clock.reset();
  };

  // Analog signal (fine) and what the ADC records at each sample (stepped).
  const data = useMemo(() => {
    const points: { t: number; analog: number; adc: number | null }[] = [];
    let held = 0;
    for (let i = 0; i <= RUN_SECONDS * 4; i++) {
      const t = i / 4;
      const volts = sensor.toVolts(envValue(sensor, average, t), vref);
      if (Math.abs(t / sampleEvery - Math.round(t / sampleEvery)) < 1e-9) {
        held = quantize(volts, vref, bits).volts;
      }
      points.push({ t, analog: Number(volts.toFixed(4)), adc: Number(held.toFixed(4)) });
    }
    return points;
  }, [sensor, average, vref, bits, sampleEvery]);

  const sampledAt = Math.floor(now / sampleEvery) * sampleEvery;
  const current = measure(sensor, envValue(sensor, average, sampledAt), vref, bits, threshold);
  const resolution = resolutionAt(sensor, average, vref, bits);
  const thresholdVolts = sensor.toVolts(threshold, vref);
  const interval = INTERVALS[intervalIndex];
  const battery = batteryLife({ ...BATTERY, intervalSeconds: interval });
  const batteryData = INTERVALS.map((s) => ({
    interval: formatInterval(s),
    days: Math.round(batteryLife({ ...BATTERY, intervalSeconds: s }).days),
  }));
  const Icon = ACTUATOR_ICON[sensorId];

  const record = () => {
    const row: ObservationRow = {
      sensor: sensor.name.split(" (")[0],
      bits,
      vref,
      stepMv: fmt(quantize(0, vref, bits).step * 1000, 2),
      resolution: `${fmt(resolution, 2)} ${sensor.unit}`,
      interval: formatInterval(interval),
      batteryDays: Math.round(battery.days),
    };
    addRow(row);
    const auto = summarise([...rows, row]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordHint="Adds the current ADC and battery settings to the observation table."
      controls={
        <>
          <Segmented<SensorId>
            label="Sensor"
            size="sm"
            value={sensorId}
            onChange={chooseSensor}
            options={[
              { value: "lm35", label: "LM35" },
              { value: "ldr", label: "LDR" },
              { value: "soil", label: "Soil" },
            ]}
          />
          <p className="-mt-3 text-sm text-ink-3">{sensor.name}</p>
          <Slider
            label={`Average ${sensor.quantity.toLowerCase()}`}
            value={average}
            min={sensor.min}
            max={sensor.max}
            step={sensor.thresholdStep}
            unit={sensor.unit}
            onChange={setAverage}
            hint={`During the run it swings by ±${sensor.swing} ${sensor.unit}.`}
          />
          <Segmented<string>
            label="ADC resolution"
            size="sm"
            value={String(bits)}
            onChange={(v) => setBits(Number(v))}
            options={[8, 10, 12].map((b) => ({ value: String(b), label: `${b}-bit` }))}
          />
          <Segmented<string>
            label="Reference voltage (Vref)"
            size="sm"
            value={String(vref)}
            onChange={(v) => setVref(Number(v))}
            options={[
              { value: "5", label: "5 V (Uno)" },
              { value: "3.3", label: "3.3 V (ESP32)" },
            ]}
          />
          <Slider
            label="Take a sample every"
            value={sampleEvery}
            min={0.5}
            max={10}
            step={0.5}
            unit="s"
            onChange={setSampleEvery}
          />
          <Slider
            label={`Switch the ${sensor.actuator.toLowerCase()} on ${sensor.direction}`}
            value={threshold}
            min={sensor.min}
            max={sensor.max}
            step={sensor.thresholdStep}
            unit={sensor.unit}
            onChange={setThreshold}
          />
          <Slider
            label="Report to the gateway every"
            value={intervalIndex}
            min={0}
            max={INTERVALS.length - 1}
            step={1}
            format={(i) => formatInterval(INTERVALS[i])}
            onChange={setIntervalIndex}
            hint="Each report keeps the node awake for 2 s at 80 mA. Asleep it draws 0.01 mA."
          />
        </>
      }
      stage={
        <div className="grid gap-3 p-4">
          <ChartCard
            title="Sensor voltage and what the ADC records"
            description="The stepped line is all the microcontroller ever sees: one value per sample, rounded down to an ADC step."
            data={data}
            xKey="t"
            xLabel="Time (s)"
            series={[
              { key: "analog", label: "Sensor voltage", unit: "V" },
              { key: "adc", label: "ADC value", unit: "V" },
            ]}
            height={260}
            bare
          >
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
              <CartesianGrid {...chartStyle.grid} />
              <XAxis dataKey="t" type="number" domain={[0, RUN_SECONDS]} {...chartStyle.axis} unit=" s" />
              <YAxis {...chartStyle.axis} unit=" V" width={64} domain={["auto", "auto"]} tickFormatter={(v: number) => v.toFixed(2)} />
              <Tooltip cursor={chartStyle.cursor} content={<ChartTooltip labelPrefix="t = " units={{ analog: "V", adc: "V" }} />} />
              <ReferenceLine y={thresholdVolts} stroke="var(--warn)" strokeDasharray="4 4" />
              <ReferenceLine x={now} stroke="var(--ink-3)" />
              <Line type="monotone" dataKey="analog" name="Sensor voltage" stroke={seriesColor(0)} strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="stepAfter" dataKey="adc" name="ADC value" stroke={seriesColor(1)} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ChartCard>
          <p className="text-sm text-ink-3">
            The dashed line is the threshold; the vertical line is the current time.
          </p>
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3",
              current.actuatorOn ? "border-ok bg-ok-soft" : "border-line bg-surface-2",
            )}
            aria-live="polite"
          >
            <Icon size={22} className={current.actuatorOn ? "text-ok" : "text-ink-3"} aria-hidden />
            <p>
              <span className="font-semibold">
                {sensor.actuator} {current.actuatorOn ? "on" : "off"}
              </span>
              <span className="text-ink-2">
                {" "}
                because the measured value ({fmt(current.measured)} {sensor.unit}) is{" "}
                {current.actuatorOn ? "" : "not "}
                {sensor.direction} {threshold} {sensor.unit}.
              </span>
            </p>
          </div>
        </div>
      }
      toolbar={<SimControls clock={clock} playLabel="Play" />}
      readouts={
        <>
          <Readouts
            items={[
              { label: "True value", value: fmt(current.trueValue), unit: sensor.unit },
              { label: "Sensor voltage", value: fmt(current.volts, 3), unit: "V" },
              { label: "ADC code", value: `${current.adc.code} / ${current.adc.levels - 1}` },
              { label: "Measured value", value: fmt(current.measured), unit: sensor.unit },
              { label: "Step size", value: fmt(current.adc.step * 1000, 2), unit: "mV" },
              { label: "Resolution", value: fmt(resolution, 2), unit: sensor.unit, hint: "Smallest change one ADC step can show" },
              { label: "Error now", value: fmt(current.error, 2), unit: sensor.unit, tone: current.error > resolution ? "warn" : "default" },
              { label: "Battery life", value: Math.round(battery.days), unit: "days", tone: battery.days > 180 ? "ok" : "default" },
            ]}
          />
          <ChartCard
            title="Battery life for different reporting intervals"
            description={`A 2000 mAh battery. Duty cycle now: ${fmt(battery.duty * 100, 2)}%, average current ${fmt(battery.averageMa, 3)} mA.`}
            data={batteryData}
            xKey="interval"
            xLabel="Report every"
            series={[{ key: "days", label: "Battery life", unit: "days" }]}
            height={200}
          >
            <BarChart data={batteryData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid {...chartStyle.grid} />
              <XAxis dataKey="interval" {...chartStyle.axis} />
              <YAxis {...chartStyle.axis} width={56} />
              <Tooltip cursor={chartStyle.barCursor} content={<ChartTooltip labelPrefix="Every " units={{ days: "days" }} />} />
              <Bar dataKey="days" name="Battery life" radius={chartStyle.bar.radius} maxBarSize={chartStyle.bar.maxBarSize} isAnimationActive={false}>
                {batteryData.map((_, i) => (
                  <Cell key={i} fill={i === intervalIndex ? seriesColor(0) : "var(--line-strong)"} />
                ))}
              </Bar>
            </BarChart>
          </ChartCard>
        </>
      }
    />
  );
}
