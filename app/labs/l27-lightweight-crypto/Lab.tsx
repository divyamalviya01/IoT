import { Info } from "lucide-react";
import { useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { ChartCard, ChartTooltip, chartStyle, seriesColor } from "~/components/theory/ChartCard";
import { Segmented } from "~/components/ui/Segmented";
import { Slider } from "~/components/ui/Slider";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import type { SF } from "~/labs/l19-lora-airtime/engine";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import { ALGORITHMS, DEVICES, KEY_EXCHANGE_MS, cost, daily, getAlgorithm, getDevice, radioEnergy, type AlgoId, type DeviceId } from "./engine";

const lab = getLab("l27-lightweight-crypto")!;

const steps = [
  "Keep AES-128-GCM on the Arduino Uno with a 64-byte message and 96 messages a day (one every 15 minutes). Read the time and energy, then press Record observation.",
  "Change the algorithm to Ascon-AEAD128, then SPECK-64/128, recording each. Which is cheapest on an 8-bit chip?",
  "Choose the ESP32 and record AES-128-GCM and ChaCha20-Poly1305. Then do the same on the Raspberry Pi 4. Why does the winner change?",
  "Set the message to 16 bytes and compare the time per byte with 256 bytes. Look at the crypto-versus-radio bar.",
  "Open the lab record and explain which cipher you would choose for each device.",
];

const PER_DAY = [24, 96, 288, 1440];
const PER_DAY_LABEL: Record<number, string> = { 24: "24 (hourly)", 96: "96 (every 15 min)", 288: "288 (every 5 min)", 1440: "1440 (every minute)" };

const fmtTime = (ms: number) =>
  ms >= 1000 ? `${(ms / 1000).toFixed(ms >= 10_000 ? 0 : 1)} s` : ms >= 1 ? `${ms.toFixed(2)} ms` : ms >= 0.001 ? `${(ms * 1000).toFixed(ms * 1000 >= 10 ? 0 : 1)} µs` : `${(ms * 1e6).toFixed(0)} ns`;
const fmtEnergy = (mJ: number) => (mJ >= 1 ? `${mJ.toFixed(2)} mJ` : mJ >= 0.001 ? `${(mJ * 1000).toFixed(1)} µJ` : `${(mJ * 1e6).toFixed(0)} nJ`);
const fmtShare = (s: number) => (s >= 0.01 ? `${(s * 100).toFixed(1)} %` : s >= 0.0001 ? `${(s * 100).toFixed(2)} %` : "< 0.01 %");

function summarise(rows: ObservationRow[]): string {
  if (rows.length < 2) return "";
  const parts: string[] = [];
  const groups = new Map<string, ObservationRow[]>();
  for (const r of rows) groups.set(`${r.device}|${r.bytes}`, [...(groups.get(`${r.device}|${r.bytes}`) ?? []), r]);
  for (const [key, list] of groups) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => Number(a.timeUs) - Number(b.timeUs));
    const [device, bytes] = key.split("|");
    parts.push(`On the ${device} with ${bytes}-byte messages, ${sorted[0].algo} was fastest (${sorted[0].time}) and ${sorted.at(-1)!.algo} slowest (${sorted.at(-1)!.time}).`);
  }
  const aes = rows.filter((r) => r.algoId === "aesgcm");
  const devices = new Set(aes.map((r) => r.device));
  if (devices.size > 1) parts.push("The same AES-GCM cost very different amounts on different devices, because some chips have AES hardware and others do not.");
  const share = Math.max(...rows.map((r) => Number(r.cryptoShare)));
  parts.push(`In every case encryption used at most ${(share * 100).toFixed(1)} % of the energy of sending the message by radio, so strong encryption barely affects battery life.`);
  return parts.join(" ");
}

export default function LightweightCryptoLab() {
  const [algo, setAlgo] = useState<AlgoId>("aesgcm");
  const [device, setDevice] = useState<DeviceId>("avr");
  const [bytes, setBytes] = useState(64);
  const [perDay, setPerDay] = useState(96);
  const [sf, setSf] = useState<SF>(7);
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");

  const a = getAlgorithm(algo);
  const d = getDevice(device);
  const c = cost(algo, device, bytes);
  const day = daily(algo, device, bytes, perDay);
  const radio = radioEnergy(bytes, sf);
  const cryptoShare = c.mJ / (c.mJ + radio.mJ);

  const chartData = ALGORITHMS.map((x, i) => {
    const k = cost(x.id, device, bytes);
    return { name: x.name, us: Math.round(k.ms * 1000 * 100) / 100, label: fmtTime(k.ms), colour: seriesColor(i), id: x.id };
  });

  const record = () => {
    const row: ObservationRow = {
      algo: a.name,
      device: d.name.split(" (")[0],
      bytes,
      time: fmtTime(c.ms),
      energy: fmtEnergy(c.mJ),
      perDay,
      battery: fmtShare(day.batterySharePerYear),
      algoId: algo,
      timeUs: c.ms * 1000,
      cryptoShare,
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
      recordHint="Adds this algorithm, device and message to the observation table."
      controls={
        <>
          <Segmented<AlgoId> label="Algorithm" size="sm" value={algo} onChange={setAlgo} options={ALGORITHMS.map((x) => ({ value: x.id, label: x.name }))} />
          <Segmented<DeviceId> label="Device" size="sm" value={device} onChange={setDevice} options={DEVICES.map((x) => ({ value: x.id, label: x.name.split(" (")[0] }))} />
          <Slider label="Message size" value={bytes} min={8} max={256} step={8} unit="bytes" onChange={setBytes} />
          <Segmented<string> label="Messages per day" size="sm" value={String(perDay)} onChange={(v) => setPerDay(Number(v))} options={PER_DAY.map((n) => ({ value: String(n), label: PER_DAY_LABEL[n] }))} />
          <Segmented<string>
            label="Radio for comparison (LoRa)"
            size="sm"
            value={String(sf)}
            onChange={(v) => setSf(Number(v) as SF)}
            options={[7, 10, 12].map((s) => ({ value: String(s), label: `SF${s}` }))}
          />
          <p className="flex gap-2 text-sm text-ink-3">
            <Info size={16} aria-hidden className="mt-0.5 shrink-0" />
            All timings are illustrative: rounded figures of the right size, chosen to show real trends. Real numbers depend on the library and compiler.
          </p>
        </>
      }
      stage={
        <div className="grid grid-cols-1 gap-4 p-3 sm:p-4">
          <div className="grid min-w-0 gap-1 rounded-lg border border-line bg-surface p-3 text-sm">
            <p className="font-bold text-ink">
              {a.name} <span className="font-normal text-ink-3">· {a.kind === "aead" ? "authenticated encryption" : "block cipher (encryption only, needs a separate integrity check)"}</span>
            </p>
            <p className="text-ink-2">
              Key {a.keyBits} bits{a.blockBits ? `, block ${a.blockBits} bits` : ""}, {a.rounds} rounds. {a.standard}.
            </p>
            <p className="text-ink-2">
              {d.name}: {d.mhz} MHz, about {d.mw >= 1000 ? `${d.mw / 1000} W` : `${d.mw} mW`} while busy. {d.note}.
            </p>
          </div>

          <ChartCard
            bare
            title={`Time to protect a ${bytes}-byte message on the ${d.name.split(" (")[0]}`}
            description="Every algorithm on this device. The chosen one is solid; the others are faded."
            data={chartData}
            xKey="name"
            xLabel="Algorithm"
            series={[{ key: "us", label: "Time", unit: "µs" }]}
            legend={chartData.map((x) => ({ label: x.name, color: x.colour }))}
            height={240}
          >
            <BarChart data={chartData} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid {...chartStyle.grid} />
              <XAxis dataKey="name" {...chartStyle.axis} interval={0} tick={{ ...chartStyle.axis.tick, fontSize: 11 }} tickFormatter={(n: string) => n.split("-")[0]} />
              <YAxis {...chartStyle.axis} unit=" µs" width={76} />
              <Tooltip cursor={chartStyle.barCursor} content={<ChartTooltip units={{ us: "µs" }} />} />
              <Bar dataKey="us" name="Time" radius={chartStyle.bar.radius} maxBarSize={40} isAnimationActive={false}>
                {chartData.map((x) => (
                  <Cell key={x.id} fill={x.colour} fillOpacity={x.id === algo ? 1 : 0.35} />
                ))}
                <LabelList dataKey="label" position="top" fill="var(--ink-2)" fontSize={11} />
              </Bar>
            </BarChart>
          </ChartCard>

          <div className="grid min-w-0 gap-1.5">
            <p className="text-sm font-semibold text-ink">Energy for one message: encrypting vs sending by LoRa {`SF${sf}`}</p>
            <div className="flex h-8 w-full overflow-hidden rounded-md border border-line" role="img" aria-label={`Encrypting uses ${(cryptoShare * 100).toFixed(2)} percent of the total; sending uses the rest.`}>
              <span className="h-full bg-u3" style={{ width: `${Math.max(cryptoShare * 100, 0.6)}%` }} />
              <span className="h-full flex-1 bg-surface-2" />
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-sm text-ink-2">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm bg-u3" aria-hidden /> Encrypt: {fmtEnergy(c.mJ)} ({fmtShare(cryptoShare)})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm border border-line bg-surface-2" aria-hidden /> Send by radio: {fmtEnergy(radio.mJ)} ({radio.ms.toFixed(0)} ms on air)
              </span>
            </div>
          </div>

          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[22rem] border-collapse text-sm">
              <caption className="pb-1 text-left font-semibold text-ink">Starting a secure session (once, not per message)</caption>
              <thead>
                <tr className="text-left text-ink-3">
                  <th scope="col" className="py-1 pr-3 font-semibold">Key exchange</th>
                  {DEVICES.map((x) => (
                    <th key={x.id} scope="col" className={cn("py-1 pr-3 font-semibold", x.id === device && "text-ink")}>
                      {x.name.split(" (")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["ecdh", "rsa"] as const).map((k) => (
                  <tr key={k} className="border-t border-line">
                    <th scope="row" className="py-1 pr-3 text-left font-medium text-ink">
                      {k === "ecdh" ? "ECC (ECDH P-256)" : "RSA-2048"}
                    </th>
                    {DEVICES.map((x) => (
                      <td key={x.id} className={cn("py-1 pr-3 tabular-nums", x.id === device ? "font-semibold text-ink" : "text-ink-2")}>
                        {fmtTime(KEY_EXCHANGE_MS[k][x.id])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }
      readouts={
        <Readouts
          items={[
            { label: "Cycles per message", value: c.cycles.toLocaleString("en-IN") },
            { label: "Time per message", value: fmtTime(c.ms) },
            { label: "Energy per message", value: fmtEnergy(c.mJ) },
            { label: "Time per byte", value: fmtTime(c.ms / bytes) },
            { label: "Energy per day", value: fmtEnergy(day.mJPerDay) },
            { label: "Battery used per year (crypto only)", value: fmtShare(day.batterySharePerYear), hint: "Two AA cells, 7.5 Wh" },
            { label: `Radio energy (SF${sf})`, value: fmtEnergy(radio.mJ) },
            { label: "Crypto share of crypto + radio", value: fmtShare(cryptoShare), tone: "ok" },
          ]}
        />
      }
    />
  );
}
