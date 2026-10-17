import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { cn } from "~/lib/cn";
import {
  DEFAULT_RULES,
  DEVICES,
  convert,
  decodeFrame,
  encodeFrame,
  toMqtt,
  type DeviceKind,
  type DeviceValues,
} from "~/labs/l10-gateway-translator/engine";

const SAMPLE: Record<DeviceKind, DeviceValues> = {
  zigbee: { temperature: 28.5 },
  ble: { temperature: 26.2, humidity: 62 },
  modbus: { voltage: 230.5, power: 1520 },
};

const KIND_LABEL: Record<DeviceKind, string> = {
  zigbee: "Zigbee sensor",
  ble: "BLE sensor",
  modbus: "Modbus meter",
};

const STEPS = ["Receive", "Decode", "Convert", "Publish"] as const;

const STEP_TEXT: Record<(typeof STEPS)[number], string> = {
  Receive: "The gateway's radio or serial port receives a raw frame: just bytes, written here in hexadecimal.",
  Decode: "The protocol adapter knows the frame format, so it splits the bytes into named fields.",
  Convert: "Raw numbers become real units. Each protocol uses its own scaling, so the gateway applies the right one.",
  Publish: "The value is published over MQTT in one common JSON format. The cloud never needs to know which radio was used.",
};

export default function GatewayVisual() {
  const [kind, setKind] = useState<DeviceKind>("zigbee");
  const [step, setStep] = useState(0);
  const device = DEVICES.find((d) => d.kind === kind)!;
  const frame = encodeFrame(kind, SAMPLE[kind]);
  const decoded = decodeFrame(kind, frame);
  const [field, setField] = useState(0);
  const valueFields = decoded.fields.filter((f) => /Value|Temperature|Humidity|Register/.test(f.name));
  const highlight = new Set(
    step === 0 ? [] : step === 1 ? decoded.fields[field]?.bytes ?? [] : valueFields.flatMap((f) => f.bytes),
  );
  const messages = decoded.readings.map((r) => toMqtt(device, r, DEFAULT_RULES));

  return (
    <div className="grid grid-cols-1 gap-6">
      <Segmented<DeviceKind>
        label="Choose a device"
        value={kind}
        onChange={(k) => {
          setKind(k);
          setStep(0);
          setField(0);
        }}
        options={(Object.keys(KIND_LABEL) as DeviceKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))}
        className="min-w-0 max-w-full overflow-x-auto pb-1"
      />

      <ol className="grid grid-cols-4 gap-1.5" aria-label="Gateway steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              aria-current={i === step ? "step" : undefined}
              onClick={() => setStep(i)}
              className={cn(
                "w-full rounded-lg border-2 px-2 py-2 text-center text-sm font-semibold transition-colors",
                i === step
                  ? "border-brand bg-brand-soft text-ink"
                  : i < step
                    ? "border-line-strong bg-surface text-ink-2"
                    : "border-line bg-surface text-ink-3",
              )}
            >
              <span className="block text-xs font-normal text-ink-3">Step {i + 1}</span>
              {s}
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-4 rounded-lg border border-line bg-surface p-4">
        <p className="text-ink-2" aria-live="polite">
          <span className="font-semibold text-ink">{STEPS[step]}: </span>
          {STEP_TEXT[STEPS[step]]}
        </p>

        <div>
          <p className="mb-1.5 text-sm text-ink-3">
            Raw frame from the {device.name} ({frame.length} bytes)
          </p>
          <ol className="flex flex-wrap gap-1.5" aria-label="Frame bytes">
            {frame.map((b, i) => (
              <li
                key={i}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-md border-2 font-mono text-sm font-bold transition-colors",
                  highlight.has(i) ? "border-brand bg-brand-soft text-ink" : "border-line-strong bg-surface-2 text-ink-2",
                )}
              >
                {b.toString(16).padStart(2, "0")}
              </li>
            ))}
          </ol>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${kind}-${step}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {step === 1 && (
              <ul className="grid gap-1.5 sm:grid-cols-2" aria-label="Decoded fields">
                {decoded.fields.map((f, i) => (
                  <li key={f.name}>
                    <button
                      type="button"
                      aria-pressed={i === field}
                      onClick={() => setField(i)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left",
                        i === field ? "border-brand bg-brand-soft" : "border-line hover:border-line-strong",
                      )}
                    >
                      <span className="block text-sm font-semibold">
                        {f.name} <span className="font-mono font-normal text-ink-3">{f.raw}</span>
                      </span>
                      <span className="block text-sm text-ink-2">{f.meaning}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {step === 2 && (
              <ul className="grid gap-2">
                {decoded.readings.map((r) => {
                  const shown = convert(r, DEFAULT_RULES);
                  return (
                    <li key={r.quantity} className="rounded-lg border border-line bg-surface-2 px-3 py-2">
                      <span className="font-semibold capitalize">{r.quantity}: </span>
                      <span className="font-mono">
                        {shown.value} {shown.unit}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {step === 3 && (
              <ul className="grid gap-2" aria-label="MQTT messages">
                {messages.map((m) => (
                  <li key={m.topic} className="rounded-lg border border-line bg-surface-2 p-3 font-mono text-sm">
                    <span className="block text-ink-3">PUBLISH to</span>
                    <span className="block font-semibold text-ink">{m.topic}</span>
                    <span className="mt-1 block text-ink-2">{m.payload}</span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
            icon={<ChevronLeft size={16} aria-hidden />}
          >
            Previous step
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={step === STEPS.length - 1}
            onClick={() => setStep((s) => s + 1)}
            icon={<ChevronRight size={16} aria-hidden />}
          >
            Next step
          </Button>
        </div>
      </div>

      <section aria-labelledby="gw-notice" className="max-w-[70ch]">
        <h2 id="gw-notice" className="text-h3 font-bold">
          What to notice
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2 marker:text-ink-3">
          <li>Each protocol packs the same kind of number differently: byte order and scaling both differ.</li>
          <li>Zigbee and BLE store numbers little-endian (low byte first); Modbus stores them big-endian.</li>
          <li>The Modbus frame ends with a CRC so the gateway can reject damaged data.</li>
          <li>Whatever the device, the output is the same simple MQTT JSON. Switch devices and compare.</li>
        </ul>
      </section>
    </div>
  );
}
