import { X } from "lucide-react";
import { SimControls } from "~/components/sim/SimControls";
import { useSimClock } from "~/components/sim/useSimClock";
import { cn } from "~/lib/cn";

/** One-way delay of the link, ms */
const D = 500;
/** TCP retransmission timeout, ms */
const RTO = 1600;
const LOST = 3;

interface Flight {
  label: string;
  /** Direction: "up" = sender → receiver */
  dir: "up" | "down";
  t0: number;
  t1: number;
  lost?: boolean;
  kind: "data" | "control";
}

function udpFlights(): Flight[] {
  return [1, 2, 3, 4, 5].map((n, i) => {
    const t0 = i * 300;
    return { label: `${n}`, dir: "up", t0, t1: t0 + D, lost: n === LOST, kind: "data" };
  });
}

function tcpFlights(): Flight[] {
  const f: Flight[] = [
    { label: "SYN", dir: "up", t0: 0, t1: D, kind: "control" },
    { label: "SYN-ACK", dir: "down", t0: D, t1: 2 * D, kind: "control" },
    { label: "ACK", dir: "up", t0: 2 * D, t1: 3 * D, kind: "control" },
  ];
  [1, 2, 3, 4, 5].forEach((n, i) => {
    const t0 = 2 * D + i * 300;
    const lost = n === LOST;
    f.push({ label: `${n}`, dir: "up", t0, t1: t0 + D, lost, kind: "data" });
    if (lost) {
      const r0 = t0 + RTO;
      f.push({ label: `${n}`, dir: "up", t0: r0, t1: r0 + D, kind: "data" });
      f.push({ label: `ACK ${n}`, dir: "down", t0: r0 + D, t1: r0 + 2 * D, kind: "control" });
    } else {
      f.push({ label: `ACK ${n}`, dir: "down", t0: t0 + D, t1: t0 + 2 * D, kind: "control" });
    }
  });
  return f;
}

const UDP = udpFlights();
const TCP = tcpFlights();
const UDP_END = Math.max(...UDP.map((f) => f.t1));
const TCP_END = Math.max(...TCP.map((f) => f.t1));

/** Which data packets the receiver has, and which the application has been given. */
function receiverState(flights: Flight[], t: number, inOrder: boolean) {
  const got = new Set<number>();
  for (const f of flights) {
    if (f.kind === "data" && !f.lost && f.t1 <= t) got.add(Number(f.label));
  }
  const delivered: number[] = [];
  const buffered: number[] = [];
  if (inOrder) {
    let next = 1;
    while (got.has(next)) delivered.push(next++);
    for (const n of [...got].sort()) if (n >= next) buffered.push(n);
  } else {
    delivered.push(...[...got].sort());
  }
  return { delivered, buffered };
}

function Lane({
  title,
  subtitle,
  flights,
  t,
  inOrder,
  end,
}: {
  title: string;
  subtitle: string;
  flights: Flight[];
  t: number;
  inOrder: boolean;
  end: number;
}) {
  const { delivered, buffered } = receiverState(flights, t, inOrder);
  const sentData = flights.filter((f) => f.kind === "data" && f.t0 <= t).length;
  const control = flights.filter((f) => f.kind === "control" && f.t0 <= t).length;
  const done = t >= end;

  return (
    <section className="grid gap-3 rounded-lg border border-line bg-surface p-4" aria-label={title}>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold">{title}</h3>
        <p className="text-sm text-ink-3">{subtitle}</p>
      </header>

      <div className="relative h-28" role="img" aria-label={`${title}: ${delivered.length} of 5 readings delivered to the application.`}>
        <div className="absolute inset-y-0 left-0 flex w-20 flex-col items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-sm font-semibold">
          Sensor
        </div>
        <div className="absolute inset-y-0 right-0 flex w-20 flex-col items-center justify-center rounded-lg border border-line-strong bg-surface-2 text-sm font-semibold">
          Server
        </div>
        <span className="absolute inset-x-20 top-1/2 h-0.5 -translate-y-1/2 bg-line" aria-hidden />
        {flights.map((f, i) => {
          if (t < f.t0) return null;
          const progress = Math.min(1, (t - f.t0) / (f.t1 - f.t0));
          if (f.lost && progress > 0.5) {
            // Show the loss briefly, then remove it.
            if (t - (f.t0 + (f.t1 - f.t0) / 2) > 700) return null;
            return (
              <span
                key={i}
                className="absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-bad-soft text-bad"
                style={{ left: "50%", top: f.kind === "data" ? "35%" : "65%" }}
                aria-hidden
              >
                <X size={14} strokeWidth={3} />
              </span>
            );
          }
          if (progress >= 1) return null;
          const p = f.dir === "up" ? progress : 1 - progress;
          return (
            <span
              key={i}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold whitespace-nowrap",
                f.kind === "data" ? "bg-brand text-brand-ink" : "bg-u2 text-bg",
              )}
              style={{
                left: `calc(5rem + (100% - 10rem) * ${p})`,
                top: f.dir === "up" ? "35%" : "65%",
              }}
              aria-hidden
            >
              {f.label}
            </span>
          );
        })}
      </div>

      <div className="grid gap-1 text-sm">
        <p>
          <span className="text-ink-3">Given to the server's application: </span>
          <span className="font-mono font-semibold">{delivered.length ? delivered.join(", ") : "none yet"}</span>
          {inOrder && buffered.length > 0 && (
            <span className="text-warn"> (holding {buffered.join(", ")} until {delivered.length + 1} arrives)</span>
          )}
        </p>
        <p className="text-ink-3">
          Data packets sent: <span className="tabular-nums text-ink">{sentData}</span>
          {" "}| Control messages: <span className="tabular-nums text-ink">{control}</span>
          {done && (
            <>
              {" "}| Finished at <span className="tabular-nums text-ink">{(end / 1000).toFixed(1)} s</span>
            </>
          )}
        </p>
      </div>
    </section>
  );
}

export default function TcpUdpVisual() {
  const clock = useSimClock({ onTick: () => {}, stepMs: 100, maxTimeMs: TCP_END + 400 });
  const t = clock.timeMs;

  return (
    <div className="grid grid-cols-1 gap-5">
      <p className="max-w-[70ch] text-ink-2">
        Both sensors send the same five readings over the same link, and reading {LOST} is lost on the way.
        Press Play to compare what happens.
      </p>
      <SimControls clock={clock} playLabel="Play" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Lane
          title="UDP"
          subtitle="No connection, no acknowledgements"
          flights={UDP}
          t={t}
          inOrder={false}
          end={UDP_END}
        />
        <Lane
          title="TCP"
          subtitle="Handshake, acknowledgements, retransmission"
          flights={TCP}
          t={t}
          inOrder
          end={TCP_END}
        />
      </div>
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-brand" aria-hidden /> Data
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-u2" aria-hidden /> Control (handshake and ACKs)
        </span>
        <span className="flex items-center gap-1.5">
          <X size={14} className="text-bad" aria-hidden /> Lost
        </span>
      </p>

      <section aria-labelledby="tcpudp-notice" className="max-w-[70ch]">
        <h2 id="tcpudp-notice" className="text-h3 font-bold">
          What to notice
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2 marker:text-ink-3">
          <li>UDP starts sending at once and finishes in under 2 seconds, but reading {LOST} never arrives.</li>
          <li>TCP spends a full round trip on the handshake before any data moves.</li>
          <li>When reading {LOST} is lost, TCP waits for a timer and sends it again.</li>
          <li>TCP holds readings 4 and 5 until 3 arrives, so the application always gets data in order.</li>
          <li>TCP delivers everything, but it needs more messages and takes more than twice as long.</li>
        </ul>
      </section>
    </div>
  );
}
