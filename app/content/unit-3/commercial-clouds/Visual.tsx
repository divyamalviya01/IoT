import { ArrowDown, ArrowRight, Cloud, Lightbulb, RotateCcw, Smartphone, Wifi, WifiOff } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { cn } from "~/lib/cn";
import { createShadow, delta, deviceSync, setDesired, type Shadow } from "~/lib/sim/shadow";

const START: Shadow = createShadow({ power: "off", colour: "warm" });
/** How long the "device" takes to notice a change once it is online, in ms */
const SYNC_DELAY = 1400;

function Json({ label, value, highlight }: { label: string; value: object; highlight?: boolean }) {
  const empty = Object.keys(value).length === 0;
  return (
    <div className={cn("rounded-md border px-2.5 py-1.5 font-mono text-xs transition-colors", highlight && !empty ? "border-warn bg-warn-soft" : "border-line bg-surface")}>
      <span className="text-ink-3">"{label}": </span>
      <span className="text-ink">{empty ? "{ }" : JSON.stringify(value).replace(/,/g, ", ").replace(/:/g, ": ")}</span>
    </div>
  );
}

export default function DeviceShadowVisual() {
  const reduced = useReducedMotion() ?? false;
  const [shadow, setShadow] = useState(START);
  const [online, setOnline] = useState(false);
  const [log, setLog] = useState<string[]>(["The bulb is offline. Try turning it on from the app."]);
  const [pulse, setPulse] = useState(0);
  const d = delta(shadow);
  const pending = Object.keys(d).length > 0;
  const say = (line: string) => setLog((l) => [line, ...l].slice(0, 6));

  useEffect(() => {
    if (!online || !pending) return;
    const id = window.setTimeout(() => {
      const { shadow: next, applied } = deviceSync(shadow, true);
      setShadow(next);
      setPulse((p) => p + 1);
      say(`Bulb reads the delta ${JSON.stringify(applied)}, applies it and reports back (version ${next.version}).`);
    }, reduced ? 300 : SYNC_DELAY);
    return () => window.clearTimeout(id);
  }, [online, pending, shadow, reduced]);

  const want = (change: Record<string, string>) => {
    const next = setDesired(shadow, change);
    setShadow(next);
    const waiting = Object.keys(delta(next)).length > 0;
    say(`App sets desired ${JSON.stringify(change)} (version ${next.version}).${waiting && !online ? " The bulb is offline, so the delta waits in the cloud." : ""}`);
  };

  const isOn = shadow.reported.power === "on";
  const warm = shadow.reported.colour === "warm";

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5">
      <p className="max-w-prose text-ink-2">The app never talks to the bulb directly. It changes the shadow in the cloud, and the bulb catches up whenever it is online.</p>

      <div className="grid min-w-0 grid-cols-1 items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.3fr)_auto_minmax(0,1fr)]">
        {/* App */}
        <section className="grid min-w-0 content-start gap-3 rounded-lg border border-line bg-surface p-3" aria-label="Phone app">
          <h3 className="flex items-center gap-2 font-bold text-ink">
            <Smartphone size={18} aria-hidden className="text-brand" /> App
          </h3>
          <Segmented
            label="Power"
            size="sm"
            options={[
              { value: "off", label: "Off" },
              { value: "on", label: "On" },
            ]}
            value={String(shadow.desired.power) as "on" | "off"}
            onChange={(v) => want({ power: v })}
          />
          <Segmented
            label="Colour"
            size="sm"
            options={[
              { value: "warm", label: "Warm" },
              { value: "cool", label: "Cool" },
            ]}
            value={String(shadow.desired.colour) as "warm" | "cool"}
            onChange={(v) => want({ colour: v })}
          />
          <p className="text-sm text-ink-3">The app shows the reported state once the bulb confirms it.</p>
        </section>

        <div className="flex items-center justify-center text-ink-3" aria-hidden>
          <ArrowRight className="hidden lg:block" size={20} />
          <ArrowDown className="lg:hidden" size={20} />
        </div>

        {/* Cloud shadow */}
        <section className="grid min-w-0 content-start gap-2 rounded-lg border border-u3 bg-u3-soft p-3" aria-label="Device shadow in the cloud" aria-live="polite">
          <h3 className="flex items-center gap-2 font-bold text-ink">
            <Cloud size={18} aria-hidden className="text-u3" /> Device shadow (cloud)
          </h3>
          <Json label="desired" value={shadow.desired} />
          <Json label="reported" value={shadow.reported} />
          <Json label="delta" value={d} highlight />
          <p className="font-mono text-xs text-ink-2">"version": {shadow.version}</p>
          <p className="text-sm text-ink-2">{pending ? (online ? "The bulb is online: it will pick up the delta in a moment." : "Delta waiting: the bulb is offline.") : "In sync: desired and reported match, so the delta is empty."}</p>
        </section>

        <div className="flex items-center justify-center text-ink-3" aria-hidden>
          <ArrowRight className="hidden lg:block" size={20} />
          <ArrowDown className="lg:hidden" size={20} />
        </div>

        {/* Device */}
        <section className="grid min-w-0 content-start justify-items-center gap-3 rounded-lg border border-line bg-surface p-3" aria-label="Smart bulb">
          <h3 className="flex items-center gap-2 justify-self-start font-bold text-ink">
            <Lightbulb size={18} aria-hidden className="text-u1" /> Smart bulb
          </h3>
          <motion.svg key={pulse} viewBox="0 0 80 100" className="h-28 w-24" role="img" aria-label={`Bulb is ${isOn ? `on, ${warm ? "warm" : "cool"} light` : "off"}`} initial={reduced || pulse === 0 ? false : { scale: 0.92 }} animate={{ scale: 1 }}>
            {isOn && <circle cx={40} cy={38} r={36} fill={warm ? "#f5b54a" : "#8fc7ff"} opacity={0.3} />}
            <path d="M40 10 a26 26 0 0 1 16 46 c-3 3 -4 6 -4 10 h-24 c0 -4 -1 -7 -4 -10 a26 26 0 0 1 16 -46 z" fill={isOn ? (warm ? "#ffd27a" : "#cfe7ff") : "var(--surface-2)"} stroke="var(--ink-2)" strokeWidth={2} />
            <rect x={29} y={70} width={22} height={6} rx={2} fill="var(--ink-3)" />
            <rect x={31} y={78} width={18} height={6} rx={2} fill="var(--ink-3)" />
          </motion.svg>
          <p className="text-sm font-semibold text-ink">{isOn ? `On (${warm ? "warm" : "cool"})` : "Off"}</p>
          <Button
            size="sm"
            onClick={() => {
              setOnline((o) => !o);
              say(online ? "The bulb goes offline (asleep or out of signal)." : "The bulb comes online and checks its shadow.");
            }}
            icon={online ? <WifiOff size={14} aria-hidden /> : <Wifi size={14} aria-hidden />}
          >
            {online ? "Take offline" : "Bring online"}
          </Button>
          <p className="flex items-center gap-1.5 text-sm text-ink-2">
            {online ? <Wifi size={14} aria-hidden className="text-brand" /> : <WifiOff size={14} aria-hidden className="text-warn" />}
            {online ? "Online" : "Offline"}
          </p>
        </section>
      </div>

      <div className="grid min-w-0 gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-ink">What happened</h3>
          <Button
            size="sm"
            onClick={() => {
              setShadow(START);
              setOnline(false);
              setLog(["Reset. The bulb is offline."]);
            }}
            icon={<RotateCcw size={14} aria-hidden />}
          >
            Reset
          </Button>
        </div>
        <ol className="grid gap-1 text-sm text-ink-2">
          {log.map((line, i) => (
            <li key={`${log.length}-${i}`} className={cn("rounded-md px-2 py-1", i === 0 && "bg-surface-2 text-ink")}>
              {line}
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
        <p className="font-semibold text-ink">What to notice</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Turning the bulb on while it is offline still works: the change waits as a delta.</li>
          <li>Change power and colour several times while offline. The bulb applies only the latest desired state.</li>
          <li>Every change raises the version number, so a late, older message can be ignored.</li>
        </ul>
      </div>
    </div>
  );
}
