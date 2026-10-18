import { motion, useReducedMotion } from "motion/react";
import { Pause, Play } from "lucide-react";
import { useId, useState } from "react";
import { seriesColor } from "~/components/theory/ChartCard";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { cn } from "~/lib/cn";
import { ADVERTISING_CHANNELS, PERIPHERALS, advertising, getPeripheral, hex, uuidText } from "~/labs/l17-ble-explorer/engine";

/* ------------------------------------------------------------------ */
/* Where BLE advertises in the 2.4 GHz band                            */
/* ------------------------------------------------------------------ */

const F0 = 2400;
const F1 = 2484;
const SW = 600;
const SH = 120;
const SBASE = 92;
const fx = (mhz: number) => ((mhz - F0) / (F1 - F0)) * SW;
const WIFI = [
  { ch: 1, mhz: 2412 },
  { ch: 6, mhz: 2437 },
  { ch: 11, mhz: 2462 },
];

function Spectrum() {
  const id = useId();
  return (
    <figure className="grid grid-cols-1 gap-2 rounded-lg border border-line bg-surface p-3 sm:p-4">
      <figcaption className="font-bold">BLE advertising channels sit in the gaps between Wi-Fi channels 1, 6 and 11</figcaption>
      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${SW} ${SH}`} className="block w-full min-w-[32rem]" role="img" aria-labelledby={`${id}-d`}>
          <desc id={`${id}-d`}>Wi-Fi channels 1, 6 and 11 are each 22 MHz wide. BLE advertising channels 37 at 2402 MHz, 38 at 2426 MHz and 39 at 2480 MHz fall between them.</desc>
          <line x1={0} x2={SW} y1={SBASE} y2={SBASE} stroke="var(--line-strong)" />
          {Array.from({ length: 40 }, (_, k) => 2402 + 2 * k).map((f) => (
            <line key={f} x1={fx(f)} x2={fx(f)} y1={SBASE} y2={SBASE + 4} stroke="var(--line)" />
          ))}
          {WIFI.map((w) => {
            const a = fx(w.mhz - 11);
            const b = fx(w.mhz + 11);
            const c = fx(w.mhz);
            return (
              <g key={w.ch}>
                <path d={`M ${a} ${SBASE} C ${a + 25} 24, ${b - 25} 24, ${b} ${SBASE}`} fill="var(--u2-soft)" stroke="var(--u2)" strokeWidth={1.5} />
                <text x={c} y={52} textAnchor="middle" className="fill-ink text-[11px] font-semibold">
                  Wi-Fi {w.ch}
                </text>
              </g>
            );
          })}
          {ADVERTISING_CHANNELS.map((c) => (
            <g key={c.channel}>
              <rect x={fx(c.mhz) - 3} y={14} width={6} height={SBASE - 14} rx={2} fill="var(--brand)" />
              <text x={fx(c.mhz)} y={10} textAnchor="middle" className="fill-ink text-[11px] font-bold">
                {c.channel}
              </text>
              <text x={fx(c.mhz)} y={SBASE + 16} textAnchor="middle" className="fill-ink-3 text-[10px]">
                {c.mhz}
              </text>
            </g>
          ))}
          <text x={SW / 2} y={SH - 2} textAnchor="middle" className="fill-ink-3 text-[10px]">
            Frequency (MHz) · small ticks are BLE's 40 channels, 2 MHz apart
          </text>
        </svg>
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Advertising events over one second                                  */
/* ------------------------------------------------------------------ */

const WINDOW_MS = 1000;
const ADVERTISERS = PERIPHERALS.filter((p) => p.id !== "beacon").concat(getPeripheral("beacon"));
// Devices power on at different moments; without a start offset every first packet would sit at 0 ms on top of the others.
const START_MS = [12, 430, 61];

function AdvertisingStrip() {
  const [playing, setPlaying] = useState(true);
  const reduced = useReducedMotion() ?? false;
  const id = useId();
  const packets = ADVERTISERS.flatMap((p, i) =>
    advertising(p, 0, WINDOW_MS)
      .map((pkt) => ({ ...pkt, t: pkt.t + START_MS[i], colour: seriesColor(i) }))
      .filter((pkt) => pkt.t < WINDOW_MS),
  );
  const W = 600;
  const rowH = 26;
  const top = 12;
  const tx = (t: number) => 70 + (t / WINDOW_MS) * (W - 80);
  const animate = playing && !reduced;

  return (
    <figure className="grid grid-cols-1 gap-2 rounded-lg border border-line bg-surface p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="font-bold">One second of advertising</figcaption>
        {!reduced && (
          <Button size="sm" onClick={() => setPlaying((v) => !v)} icon={playing ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}>
            {playing ? "Pause" : "Play"}
          </Button>
        )}
      </div>
      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${top + rowH * 3 + 24}`} className="block w-full min-w-[32rem]" role="img" aria-labelledby={`${id}-d`}>
          <desc id={`${id}-d`}>
            In one second the HR Band and the Shop Beacon each advertise about 10 times and the Room Sensor about once. Each advertising event sends the same packet on channels 37, 38 and 39.
          </desc>
          {ADVERTISING_CHANNELS.map((c, r) => (
            <g key={c.channel}>
              <line x1={70} x2={W - 10} y1={top + rowH * r + rowH / 2} y2={top + rowH * r + rowH / 2} stroke="var(--line)" />
              <text x={4} y={top + rowH * r + rowH / 2 + 4} className="fill-ink-2 text-[11px] font-semibold">
                Ch {c.channel}
              </text>
            </g>
          ))}
          {packets.map((p, i) => {
            const row = ADVERTISING_CHANNELS.findIndex((c) => c.channel === p.channel);
            return <rect key={i} x={tx(p.t) - 1.5} y={top + rowH * row + 6} width={3} height={rowH - 12} rx={1} fill={p.colour} />;
          })}
          {[0, 250, 500, 750, 1000].map((t) => (
            <text key={t} x={tx(t)} y={top + rowH * 3 + 16} textAnchor={t === WINDOW_MS ? "end" : "middle"} className="fill-ink-3 text-[10px]">
              {t} ms
            </text>
          ))}
          {animate && (
            <motion.line
              y1={top}
              y2={top + rowH * 3}
              stroke="var(--ink)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              initial={{ x1: tx(0), x2: tx(0) }}
              animate={{ x1: tx(WINDOW_MS), x2: tx(WINDOW_MS) }}
              transition={{ duration: 4, ease: "linear", repeat: Infinity }}
            />
          )}
        </svg>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2" aria-label="Legend">
        {ADVERTISERS.map((p, i) => (
          <li key={p.id} className="flex items-center gap-1.5">
            <span className="h-3 w-1.5 rounded-sm" style={{ backgroundColor: seriesColor(i) }} aria-hidden />
            {p.name}: every {p.advIntervalMs} ms{p.connectable ? "" : " (beacon, cannot connect)"}
          </li>
        ))}
      </ul>
      <p className="text-sm text-ink-3">
        The moving line is slowed down four times. Each event adds a random 0–10 ms delay, so two devices never stay in step and keep colliding.
      </p>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* GATT tree                                                           */
/* ------------------------------------------------------------------ */

function GattTree() {
  const [deviceId, setDeviceId] = useState("hr");
  const device = getPeripheral(deviceId);

  return (
    <section aria-labelledby="gatt-title" className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2 id="gatt-title" className="text-h3 font-bold">
            Inside a BLE device: the GATT tree
          </h2>
          <p className="max-w-[60ch] text-ink-2">A connected device shows its data as services, each holding characteristics. Open a characteristic to see its bytes.</p>
        </div>
        <Segmented<string>
          label="Device"
          size="sm"
          value={deviceId}
          onChange={setDeviceId}
          options={PERIPHERALS.map((p) => ({ value: p.id, label: p.name }))}
        />
      </div>

      {device.connectable ? (
        <ul className="grid gap-2" aria-label={`${device.name} services`}>
          {device.services.map((s) => (
            <li key={s.uuid} className="rounded-lg border border-line bg-surface-2 p-2.5">
              <p className="flex flex-wrap items-baseline gap-x-2 font-bold">
                {s.name} <span className="font-mono text-xs font-normal text-ink-3">service {uuidText(s.uuid)}</span>
              </p>
              <ul className="mt-1.5 grid gap-1.5 border-l-2 border-line pl-3">
                {s.characteristics.map((c) => {
                  const bytes = c.value(0);
                  return (
                    <li key={c.uuid}>
                      <details className="group rounded-md bg-surface px-2.5 py-1.5">
                        <summary className="flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold">{c.name}</span>
                          <span className="font-mono text-xs text-ink-3">{uuidText(c.uuid)}</span>
                          {c.properties.map((p) => (
                            <span key={p} className={cn("rounded px-1.5 text-xs font-semibold", p === "notify" ? "bg-u2-soft text-ink" : "bg-ok-soft text-ink")}>
                              {p}
                            </span>
                          ))}
                        </summary>
                        <p className="mt-1.5 text-sm">
                          <span className="font-mono">{hex(bytes)}</span> → <span className="font-semibold">{c.decode(bytes)}</span>
                        </p>
                        {!c.properties.includes("read") && (
                          <p className="text-sm text-ink-3">Notify only: the phone writes 01 00 to its CCCD (0x2902) and then receives a new value every second.</p>
                        )}
                      </details>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid gap-1.5 rounded-lg border border-line bg-surface-2 p-3 text-sm">
          <p className="font-semibold">{device.name} is a beacon: it only advertises and has no GATT services to connect to.</p>
          <p>
            Its advertisement carries iBeacon data: <span className="break-all font-mono">{hex(device.manufacturerData!)}</span>
          </p>
          <p className="text-ink-2">
            4C 00 = Apple's company ID, 02 15 = iBeacon, then a 16-byte UUID, major 1, minor 42 and C5 = −59 dBm, the signal strength at 1 m used to estimate distance.
          </p>
        </div>
      )}
    </section>
  );
}

export default function BluetoothVisual() {
  return (
    <div className="grid grid-cols-1 gap-6">
      <Spectrum />
      <AdvertisingStrip />
      <GattTree />
      <section aria-labelledby="ble-notice" className="max-w-[70ch]">
        <h2 id="ble-notice" className="text-h3 font-bold">
          What to notice
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2 marker:text-ink-3">
          <li>Every advertisement goes out on all three advertising channels, so a phone listening on any one of them hears it.</li>
          <li>The advertising channels avoid the middle of Wi-Fi channels 1, 6 and 11.</li>
          <li>A device that advertises more often is found faster but uses more battery.</li>
          <li>Data lives in characteristics inside services; some can be read, others only notify.</li>
        </ul>
      </section>
    </div>
  );
}
