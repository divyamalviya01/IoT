import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, ChartTooltip, chartStyle, seriesColor } from "~/components/theory/ChartCard";
import { Segmented } from "~/components/ui/Segmented";
import { ALGORITHMS, DEVICES, KEY_SIZES, cost, radioEnergy, type DeviceId } from "~/labs/l27-lightweight-crypto/engine";

const BYTES = 64;
const fmtTime = (ms: number) =>
  ms >= 1000 ? `${(ms / 1000).toFixed(ms >= 10_000 ? 0 : 1)} s` : ms >= 1 ? `${ms.toFixed(2)} ms` : ms >= 0.001 ? `${(ms * 1000).toFixed(ms * 1000 >= 10 ? 0 : 1)} µs` : `${(ms * 1e6).toFixed(0)} ns`;

export default function LightweightCryptoVisual() {
  const [device, setDevice] = useState<DeviceId>("avr");
  const d = DEVICES.find((x) => x.id === device)!;

  const keyData = KEY_SIZES.map((k) => ({ level: `${k.bits}-bit`, rsa: k.rsa, ecc: k.ecc }));
  const costData = ALGORITHMS.map((a, i) => {
    const c = cost(a.id, device, BYTES);
    return { name: a.name, us: Math.round(c.ms * 1000 * 10) / 10, label: fmtTime(c.ms), colour: seriesColor(i), aead: a.kind === "aead" };
  });
  const fastest = [...costData].sort((a, b) => a.us - b.us)[0];
  const radio = radioEnergy(BYTES, 7);
  const aesMj = cost("aesgcm", device, BYTES).mJ;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      <ChartCard
        title="Key size needed for the same security"
        description="Bits of key for each security strength (NIST SP 800-57). ECC stays small while RSA keys grow very fast. Log scale."
        data={keyData}
        xKey="level"
        xLabel="Security strength"
        series={[
          { key: "rsa", label: "RSA key", unit: "bits", color: seriesColor(1) },
          { key: "ecc", label: "ECC key", unit: "bits", color: seriesColor(0) },
        ]}
        height={280}
      >
        <BarChart data={keyData} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...chartStyle.grid} />
          <XAxis dataKey="level" {...chartStyle.axis} />
          <YAxis {...chartStyle.axis} scale="log" domain={[100, 20000]} ticks={[100, 1000, 10000]} allowDataOverflow width={56} tickFormatter={(v: number) => v.toLocaleString("en-IN")} />
          <Tooltip cursor={chartStyle.barCursor} content={<ChartTooltip units={{ rsa: "bits", ecc: "bits" }} />} />
          <Bar dataKey="rsa" name="RSA key" fill={seriesColor(1)} radius={chartStyle.bar.radius} maxBarSize={chartStyle.bar.maxBarSize} isAnimationActive={false}>
            <LabelList dataKey="rsa" position="top" fill="var(--ink-2)" fontSize={11} />
          </Bar>
          <Bar dataKey="ecc" name="ECC key" fill={seriesColor(0)} radius={chartStyle.bar.radius} maxBarSize={chartStyle.bar.maxBarSize} isAnimationActive={false}>
            <LabelList dataKey="ecc" position="top" fill="var(--ink-2)" fontSize={11} />
          </Bar>
        </BarChart>
      </ChartCard>

      <div className="grid min-w-0 gap-3">
        <Segmented<DeviceId> label="Device" value={device} onChange={setDevice} options={DEVICES.map((x) => ({ value: x.id, label: x.name.split(" (")[0] }))} />
        <p className="text-sm text-ink-3">
          {d.name}: {d.mhz} MHz. {d.note}.
        </p>
        <ChartCard
          title={`Time to protect a ${BYTES}-byte message`}
          description={`Illustrative figures for ${d.name.split(" (")[0]}. Shorter is better. On this device ${fastest.name} is fastest.`}
          data={costData}
          xKey="name"
          xLabel="Algorithm"
          series={[{ key: "us", label: "Time", unit: "µs" }]}
          legend={costData.map((c) => ({ label: `${c.name}${c.aead ? "" : " (encryption only)"}`, color: c.colour }))}
          height={260}
        >
          <BarChart data={costData} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid {...chartStyle.grid} />
            <XAxis dataKey="name" {...chartStyle.axis} interval={0} tick={{ ...chartStyle.axis.tick, fontSize: 11 }} tickFormatter={(n: string) => n.split("-")[0]} />
            <YAxis {...chartStyle.axis} unit=" µs" width={72} />
            <Tooltip cursor={chartStyle.barCursor} content={<ChartTooltip units={{ us: "µs" }} />} />
            <Bar dataKey="us" name="Time" radius={chartStyle.bar.radius} maxBarSize={36} isAnimationActive={false}>
              {costData.map((c) => (
                <Cell key={c.name} fill={c.colour} />
              ))}
              <LabelList dataKey="label" position="top" fill="var(--ink-2)" fontSize={11} />
            </Bar>
          </BarChart>
        </ChartCard>
        <p className="rounded-lg border border-line bg-surface p-3 text-sm text-ink-2">
          Sending the same {BYTES} bytes once by LoRa (SF7) takes about <strong className="text-ink">{radio.mJ.toFixed(1)} mJ</strong> of energy. AES-GCM on this device takes{" "}
          <strong className="text-ink">{aesMj < 0.001 ? `${(aesMj * 1000).toFixed(2)} µJ` : `${aesMj.toFixed(3)} mJ`}</strong>: the radio uses about {Math.round(radio.mJ / aesMj).toLocaleString("en-IN")} times more.
        </p>
      </div>

      <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
        <p className="font-semibold text-ink">What to notice</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>For 128-bit security, ECC needs 256 bits where RSA needs 3072: twelve times smaller.</li>
          <li>On the 8-bit Uno, SPECK and Ascon beat AES-GCM. On the ESP32, hardware makes AES-GCM the fastest.</li>
          <li>On the Raspberry Pi 4, ChaCha20 beats AES, because its CPU has no AES instructions.</li>
          <li>PRESENT is slow in software everywhere: it was designed for tiny chips, not processors.</li>
          <li>The timings are illustrative; lab L27 lets you change the message size and see the energy per day.</li>
        </ul>
      </div>
    </div>
  );
}
