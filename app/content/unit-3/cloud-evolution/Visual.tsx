import { ChevronLeft, ChevronRight, Coins, Server } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";
import { Button } from "~/components/ui/Button";
import { cn } from "~/lib/cn";

interface Era {
  when: string;
  title: string;
  owns: string;
  pay: string;
  text: string;
  scene: ReactNode;
}

/* Small line drawings, 160 × 90, drawn with ink and the Unit 3 accent. */
const box = (x: number, y: number, w: number, h: number, accent = false, key?: string) => (
  <rect key={key} x={x} y={y} width={w} height={h} rx={3} fill={accent ? "var(--u3-soft)" : "var(--surface)"} stroke={accent ? "var(--u3)" : "var(--ink-2)"} strokeWidth={1.5} />
);
const line = (x1: number, y1: number, x2: number, y2: number, key?: string, dashed = false) => (
  <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--line-strong)" strokeWidth={1.5} strokeDasharray={dashed ? "4 3" : undefined} />
);
const cloudPath = "M40 52 a14 14 0 0 1 6-27 a20 20 0 0 1 38-6 a16 16 0 0 1 30 10 a12 12 0 0 1 2 23 z";
/** Computers in six universities, and the internet links between them */
const GRID = [
  [20, 14],
  [70, 6],
  [122, 16],
  [26, 62],
  [76, 68],
  [126, 60],
];
const GRID_LINKS = [
  [0, 1],
  [1, 2],
  [0, 3],
  [1, 4],
  [2, 5],
  [3, 4],
  [4, 5],
  [0, 4],
  [2, 4],
];

const ERAS: Era[] = [
  {
    when: "1960s",
    title: "Mainframes and time-sharing",
    owns: "One organisation owns one huge computer",
    pay: "Users share its time",
    text: "A single costly mainframe serves many users at simple terminals. Each user gets a slice of its time in turn.",
    scene: (
      <>
        {box(60, 12, 40, 50, true)}
        {[14, 52, 90, 128].map((x, i) => (
          <g key={x}>
            {line(80, 62, x + 9, 72, `l${i}`)}
            {box(x, 72, 18, 12, false, `t${i}`)}
          </g>
        ))}
      </>
    ),
  },
  {
    when: "1980s–90s",
    title: "Client–server",
    owns: "Every company owns its own servers",
    pay: "Buy hardware up front",
    text: "Cheap PCs talk to servers in the company's own room. The servers are sized for the busiest day, so they sit idle most of the time.",
    scene: (
      <>
        {box(66, 8, 28, 40, true)}
        {[20, 68, 116].map((x, i) => (
          <g key={x}>
            {line(80, 48, x + 12, 64, `l${i}`)}
            {box(x, 64, 24, 18, false, `p${i}`)}
          </g>
        ))}
      </>
    ),
  },
  {
    when: "Late 1990s",
    title: "Grid computing",
    owns: "Many institutes pool their machines",
    pay: "Shared for research",
    text: "Computers in different universities join over the internet to work on one large scientific job.",
    scene: (
      <>
        {GRID_LINKS.map(([a, b]) => line(GRID[a][0] + 8, GRID[a][1] + 8, GRID[b][0] + 8, GRID[b][1] + 8, `g${a}-${b}`, true))}
        {GRID.map(([x, y], i) => box(x, y, 16, 16, i === 1, `n${i}`))}
      </>
    ),
  },
  {
    when: "1999",
    title: "Virtualization and SaaS",
    owns: "Companies, now packing many virtual machines on each server",
    pay: "Software by subscription",
    text: "A hypervisor splits one physical server into several virtual machines. Salesforce sells software through the web browser.",
    scene: (
      <>
        {box(30, 10, 100, 72)}
        {[40, 72, 104].map((x, i) => box(x, 22, 26, 34, true, `v${i}`))}
        <rect x={40} y={62} width={90} height={12} rx={2} fill="var(--surface-2)" stroke="var(--ink-3)" />
        <text x={85} y={71} textAnchor="middle" className="fill-ink-2 text-[8px]">
          hypervisor
        </text>
      </>
    ),
  },
  {
    when: "2006",
    title: "The public cloud",
    owns: "The provider owns giant data centres",
    pay: "Pay per hour, per gigabyte",
    text: "Amazon launches S3 and EC2. Anyone can rent servers and storage in minutes and hand them back when done.",
    scene: (
      <>
        <path d={cloudPath} fill="var(--u3-soft)" stroke="var(--u3)" strokeWidth={1.5} transform="translate(2 4)" />
        {[60, 76, 92].map((x, i) => box(x, 30, 12, 18, false, `s${i}`))}
        {box(118, 64, 30, 18)}
        <text x={133} y={77} textAnchor="middle" className="fill-ink-2 text-[8px]">
          ₹ meter
        </text>
        {line(118, 64, 104, 54, "m", true)}
      </>
    ),
  },
  {
    when: "2013–2014",
    title: "Containers and serverless",
    owns: "The provider; you see only your app or function",
    pay: "Per container hour, or per function run",
    text: "Docker packs apps into light containers. AWS Lambda runs a function only when an event, such as a sensor message, arrives.",
    scene: (
      <>
        {[18, 46, 74].map((x, i) => box(x, 20, 24, 18, true, `c${i}`))}
        {[18, 46].map((x, i) => box(x, 44, 24, 18, true, `d${i}`))}
        <circle cx={128} cy={46} r={20} fill="var(--surface)" stroke="var(--u3)" strokeWidth={1.5} />
        <text x={128} y={53} textAnchor="middle" className="fill-u3 text-[20px] font-bold">
          λ
        </text>
        {line(100, 46, 108, 46, "e")}
      </>
    ),
  },
  {
    when: "2015 onwards",
    title: "IoT clouds and the edge",
    owns: "Cloud providers, plus gateways and edge servers near devices",
    pay: "Per message and device, plus local hardware",
    text: "AWS IoT and Azure IoT Hub manage millions of devices. Fast decisions move to gateways and edge servers close to the sensors.",
    scene: (
      <>
        <path d={cloudPath} fill="var(--u3-soft)" stroke="var(--u3)" strokeWidth={1.5} transform="translate(2 -14) scale(1 0.8)" />
        {[30, 110].map((x, i) => (
          <g key={x}>
            {line(x + 10, 54, 80, 40, `u${i}`, true)}
            {box(x, 54, 20, 12, true, `e${i}`)}
            {[-14, 4, 22].map((dx, j) => (
              <g key={dx}>
                {line(x + 10, 66, x + dx + 4, 78, `w${i}${j}`)}
                <circle cx={x + dx + 4} cy={81} r={3.5} fill="var(--surface)" stroke="var(--ink-2)" strokeWidth={1.5} />
              </g>
            ))}
          </g>
        ))}
      </>
    ),
  },
];

export default function CloudEvolutionVisual() {
  const [i, setI] = useState(0);
  const reduced = useReducedMotion() ?? false;
  const era = ERAS[i];

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5">
      <p className="max-w-prose text-ink-2">Step through the eras. Watch who owns the computers and how people pay for them.</p>

      <ol className="flex min-w-0 gap-1 overflow-x-auto pb-1" aria-label="Eras">
        {ERAS.map((e, k) => (
          <li key={e.when} className="shrink-0">
            <button
              type="button"
              aria-current={k === i ? "step" : undefined}
              onClick={() => setI(k)}
              className={cn(
                "rounded-md border px-2.5 py-1.5 font-mono text-xs transition-colors",
                k === i ? "border-u3 bg-u3-soft font-semibold text-ink" : k < i ? "border-line bg-surface-2 text-ink-2" : "border-line bg-surface text-ink-3",
              )}
            >
              {e.when}
            </button>
          </li>
        ))}
      </ol>

      <div className="relative min-h-[15rem] overflow-hidden rounded-lg border border-line bg-surface p-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={era.when}
            initial={reduced ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="grid min-w-0 grid-cols-1 items-center gap-5 sm:grid-cols-[17rem_minmax(0,1fr)]"
          >
            <svg viewBox="0 0 160 90" className="mx-auto block w-full max-w-[17rem]" role="img" aria-label={`Drawing: ${era.title}`}>
              {era.scene}
            </svg>
            <div className="grid min-w-0 gap-2">
              <p className="font-mono text-sm font-semibold text-u3">{era.when}</p>
              <h3 className="text-lg font-bold text-ink">{era.title}</h3>
              <p className="text-ink-2">{era.text}</p>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-ink-2">
                  <Server size={14} aria-hidden /> {era.owns}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-ink-2">
                  <Coins size={14} aria-hidden /> {era.pay}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button size="sm" onClick={() => setI((k) => Math.max(0, k - 1))} disabled={i === 0} icon={<ChevronLeft size={14} aria-hidden />}>
          Earlier
        </Button>
        <span className="text-sm text-ink-3">
          {i + 1} of {ERAS.length}
        </span>
        <Button size="sm" onClick={() => setI((k) => Math.min(ERAS.length - 1, k + 1))} disabled={i === ERAS.length - 1} icon={<ChevronRight size={14} aria-hidden />}>
          Later
        </Button>
      </div>

      <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
        <p className="font-semibold text-ink">What to notice</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Ownership moves from each organisation to a few large providers, then partly back to the edge.</li>
          <li>Paying changes from buying machines up front to paying for exactly what you use.</li>
          <li>Each step packs more work onto shared hardware: time slices, virtual machines, containers, functions.</li>
        </ul>
      </div>
    </div>
  );
}
