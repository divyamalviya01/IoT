import { motion, useReducedMotion, type Transition } from "motion/react";
import { useState, type ReactNode } from "react";
import { cn } from "~/lib/cn";

interface Characteristic {
  id: string;
  name: string;
  meaning: string;
  example: string;
  core?: boolean;
  Anim: (props: { still: boolean }) => ReactNode;
}

const loop = (duration: number, delay = 0): Transition => ({
  duration,
  delay,
  repeat: Infinity,
  ease: "easeInOut",
});

/* Each animation is a 120 × 64 SVG. With `still`, it shows one clear frame. */

/** Day scene with a night layer cross-fading over it (opacity animates reliably everywhere). */
function Adaptive({ still }: { still: boolean }) {
  const night = still ? undefined : { opacity: [0, 1, 0] };
  return (
    <>
      <rect x="0" y="0" width="120" height="64" rx="6" fill="var(--surface-2)" />
      <circle cx="24" cy="20" r="8" fill="var(--copper)" />
      <motion.g initial={{ opacity: 0 }} animate={night} transition={loop(5)}>
        <rect x="0" y="0" width="120" height="64" rx="6" fill="var(--ink-2)" />
        <circle cx="24" cy="20" r="8" fill="var(--line-strong)" />
      </motion.g>
      <rect x="62" y="26" width="34" height="20" rx="4" fill="var(--ink-3)" />
      <circle cx="79" cy="36" r="6" fill="var(--brand)" />
      <motion.circle cx="79" cy="36" r="6" fill="var(--bad)" initial={{ opacity: 0 }} animate={night} transition={loop(5)} />
    </>
  );
}

function SelfConfiguring({ still }: { still: boolean }) {
  return (
    <>
      <rect x="10" y="22" width="26" height="20" rx="4" fill="var(--u2)" />
      <motion.path
        d="M36 32 L86 32"
        stroke="var(--brand)"
        strokeWidth="2.5"
        strokeDasharray="4 4"
        fill="none"
        initial={{ pathLength: still ? 1 : 0 }}
        animate={still ? undefined : { pathLength: [0, 1, 1, 0] }}
        transition={loop(4)}
      />
      <motion.circle
        cx="98"
        cy="32"
        r="11"
        fill="var(--u1)"
        initial={{ opacity: 1 }}
        animate={still ? undefined : { opacity: [0, 1, 1, 0] }}
        transition={loop(4)}
      />
      <motion.path
        d="M93 32 l4 4 l7 -8"
        stroke="var(--surface)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        initial={{ opacity: 1 }}
        animate={still ? undefined : { opacity: [0, 0, 1, 0] }}
        transition={loop(4)}
      />
    </>
  );
}

function Interoperable({ still }: { still: boolean }) {
  return (
    <>
      <circle cx="18" cy="32" r="12" fill="var(--u1)" />
      <rect x="90" y="20" width="24" height="24" rx="3" fill="var(--u3)" />
      <motion.g
        initial={{ x: still ? 30 : 0 }}
        animate={still ? undefined : { x: [0, 54, 0] }}
        transition={loop(3)}
      >
        <rect x="30" y="24" width="30" height="16" rx="8" fill="var(--brand)" />
        <text x="45" y="35.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--brand-ink)">
          MQTT
        </text>
      </motion.g>
    </>
  );
}

function Identity({ still }: { still: boolean }) {
  const ids = ["10.0.0.7", "A4:CF:12", "RFID 0457"];
  return (
    <>
      {ids.map((id, i) => (
        <motion.g
          key={id}
          initial={{ opacity: 1 }}
          animate={still ? undefined : { opacity: [0.25, 1, 1, 0.25] }}
          transition={loop(3, i * 0.6)}
        >
          <circle cx={12} cy={12 + i * 20} r="6" fill={["var(--u1)", "var(--u2)", "var(--u3)"][i]} />
          <text x="24" y={15.5 + i * 20} fontSize="10" fontFamily="var(--font-mono)" fill="var(--ink)">
            {id}
          </text>
        </motion.g>
      ))}
    </>
  );
}

function Integrated({ still }: { still: boolean }) {
  const services = [
    [100, 12],
    [104, 32],
    [100, 52],
  ];
  return (
    <>
      <circle cx="22" cy="32" r="11" fill="var(--u1)" />
      {services.map(([x, y], i) => (
        <g key={i}>
          <motion.line
            x1="33"
            y1="32"
            x2={x - 9}
            y2={y}
            stroke="var(--brand)"
            strokeWidth="2"
            initial={{ opacity: 1 }}
            animate={still ? undefined : { opacity: [0.2, 1, 0.2] }}
            transition={loop(2.4, i * 0.4)}
          />
          <rect x={x - 9} y={y - 7} width="18" height="14" rx="3" fill="var(--u2)" />
        </g>
      ))}
    </>
  );
}

function Connectivity({ still }: { still: boolean }) {
  return (
    <>
      <line x1="16" y1="32" x2="104" y2="32" stroke="var(--line-strong)" strokeWidth="2" />
      {[16, 60, 104].map((x) => (
        <circle key={x} cx={x} cy="32" r="9" fill="var(--u2)" />
      ))}
      <motion.circle
        cy="32"
        r="4"
        fill="var(--brand)"
        initial={{ cx: still ? 38 : 16 }}
        animate={still ? undefined : { cx: [16, 104] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
    </>
  );
}

function Scalable({ still }: { still: boolean }) {
  const dots = Array.from({ length: 16 }, (_, i) => i);
  return (
    <>
      {dots.map((i) => {
        const col = i % 8;
        const row = Math.floor(i / 8);
        return (
          <motion.circle
            key={i}
            cx={14 + col * 13}
            cy={22 + row * 20}
            r="4.5"
            fill="var(--u3)"
            initial={{ opacity: 1 }}
            animate={still ? undefined : { opacity: [0, 1, 1, 0] }}
            transition={loop(4, (i / 16) * 1.6)}
          />
        );
      })}
    </>
  );
}

function Heterogeneous({ still }: { still: boolean }) {
  return (
    <>
      <circle cx="60" cy="32" r="7" fill="var(--brand)" />
      {[
        <circle key="c" cx="16" cy="16" r="9" fill="var(--u1)" />,
        <rect key="r" x="94" y="7" width="18" height="18" rx="2" fill="var(--u2)" />,
        <path key="t" d="M60 46 l10 16 h-20 z" fill="var(--u3)" />,
      ].map((shape, i) => (
        <motion.g
          key={i}
          initial={{ y: 0 }}
          animate={still ? undefined : { y: [0, -3, 0] }}
          transition={loop(2, i * 0.3)}
        >
          {shape}
        </motion.g>
      ))}
      <path d="M22 21 L54 30 M94 18 L66 29 M60 46 L60 39" stroke="var(--line-strong)" strokeWidth="2" />
    </>
  );
}

function Intelligent({ still }: { still: boolean }) {
  const bars = [14, 26, 20, 34];
  return (
    <>
      {bars.map((h, i) => (
        <rect key={i} x={10 + i * 12} y={54 - h} width="8" height={h} rx="2" fill="var(--u2)" />
      ))}
      <path d="M64 32 h14" stroke="var(--line-strong)" strokeWidth="2" />
      <circle cx="96" cy="30" r="13" fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth="1.5" />
      <motion.circle
        cx="96"
        cy="30"
        r="13"
        fill="var(--warn)"
        initial={{ opacity: 1 }}
        animate={still ? undefined : { opacity: [0, 1, 0] }}
        transition={loop(2.4)}
      />
      <rect x="91" y="44" width="10" height="6" rx="1.5" fill="var(--ink-3)" />
    </>
  );
}

function Energy({ still }: { still: boolean }) {
  return (
    <>
      <rect x="22" y="18" width="66" height="28" rx="5" fill="none" stroke="var(--ink-3)" strokeWidth="2.5" />
      <rect x="88" y="26" width="5" height="12" rx="1.5" fill="var(--ink-3)" />
      <motion.rect
        x="26"
        y="22"
        height="20"
        rx="2.5"
        fill="var(--ok)"
        initial={{ width: still ? 28 : 58 }}
        animate={still ? undefined : { width: [58, 10, 58] }}
        transition={loop(6)}
      />
      <motion.text
        x="104"
        y="20"
        fontSize="11"
        fontWeight="700"
        fill="var(--ink-3)"
        initial={{ opacity: 1 }}
        animate={still ? undefined : { opacity: [0, 1, 0] }}
        transition={loop(2)}
      >
        z
      </motion.text>
    </>
  );
}

function Secure({ still }: { still: boolean }) {
  return (
    <>
      <motion.g
        initial={{ x: still ? 40 : 0 }}
        animate={still ? undefined : { x: [0, 70, 70, 0] }}
        transition={loop(4)}
      >
        <rect x="6" y="28" width="26" height="20" rx="3" fill="var(--brand)" />
        <path d="M12 28 v-6 a7 7 0 0 1 14 0 v6" fill="none" stroke="var(--ink-2)" strokeWidth="2.5" />
      </motion.g>
      <line x1="6" y1="54" x2="114" y2="54" stroke="var(--line-strong)" strokeWidth="2" />
    </>
  );
}

const characteristics: Characteristic[] = [
  {
    id: "adaptive",
    name: "Dynamic and self-adapting",
    core: true,
    meaning: "Devices change their behaviour when conditions change.",
    example: "A security camera switches from colour to infrared when it gets dark.",
    Anim: Adaptive,
  },
  {
    id: "configuring",
    name: "Self-configuring",
    core: true,
    meaning: "Devices set themselves up with little or no human help.",
    example: "A new smart bulb joins the Wi-Fi, updates itself and appears in the app.",
    Anim: SelfConfiguring,
  },
  {
    id: "interoperable",
    name: "Interoperable protocols",
    core: true,
    meaning: "Devices use standard protocols, so different makers' devices can talk.",
    example: "A sensor from one company sends MQTT messages to another company's cloud.",
    Anim: Interoperable,
  },
  {
    id: "identity",
    name: "Unique identity",
    core: true,
    meaning: "Every device has its own address or ID, such as an IP address, MAC address or RFID code.",
    example: "Each FASTag has its own RFID code linked to one vehicle.",
    Anim: Identity,
  },
  {
    id: "integrated",
    name: "Integrated into the information network",
    core: true,
    meaning: "Devices are part of the internet and share data with other systems.",
    example: "A farm rain gauge feeds both a flood-warning service and a crop-insurance app.",
    Anim: Integrated,
  },
  {
    id: "connectivity",
    name: "Connectivity",
    meaning: "Devices stay connected so data can flow at any time.",
    example: "A smart meter reports every 15 minutes over a mobile network.",
    Anim: Connectivity,
  },
  {
    id: "scalability",
    name: "Scalability",
    meaning: "The system keeps working well as it grows from tens to millions of devices.",
    example: "A city adds 10,000 new street-light controllers without slowing the system.",
    Anim: Scalable,
  },
  {
    id: "heterogeneity",
    name: "Heterogeneity",
    meaning: "Devices differ in hardware, software and networks, but work in one system.",
    example: "Zigbee bulbs, Wi-Fi cameras and LoRa water meters in one smart building.",
    Anim: Heterogeneous,
  },
  {
    id: "intelligence",
    name: "Intelligence",
    meaning: "The system turns data into decisions, sometimes automatically.",
    example: "Irrigation runs only when the soil is dry and no rain is forecast.",
    Anim: Intelligent,
  },
  {
    id: "energy",
    name: "Limited energy and resources",
    meaning: "Many devices run on small batteries with little memory, so they sleep whenever they can.",
    example: "A soil sensor wakes for one second every ten minutes to last two years on one battery.",
    Anim: Energy,
  },
  {
    id: "security",
    name: "Security and privacy",
    meaning: "Devices and their data must be protected from attackers.",
    example: "Messages are encrypted, and default passwords must be changed on first use.",
    Anim: Secure,
  },
];

export default function CharacteristicsVisual() {
  const reduced = useReducedMotion() ?? false;
  const [active, setActive] = useState(characteristics[0].id);
  const current = characteristics.find((c) => c.id === active)!;

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Characteristics of IoT">
          {characteristics.map(({ id, name, core, Anim }) => (
            <li key={id}>
              <button
                type="button"
                aria-pressed={id === active}
                onClick={() => setActive(id)}
                className={cn(
                  "grid h-full w-full gap-2 rounded-lg border p-3 text-left transition-colors",
                  id === active
                    ? "border-brand bg-brand-soft"
                    : "border-line bg-surface hover:border-line-strong",
                )}
              >
                <svg viewBox="0 0 120 64" className="h-16 w-full" aria-hidden="true">
                  <Anim still={reduced} />
                </svg>
                <span className="font-semibold leading-snug">{name}</span>
                {core && <span className="text-sm text-ink-3">One of the core five</span>}
              </button>
            </li>
          ))}
        </ul>

        <section
          aria-live="polite"
          className="grid content-start gap-2 self-start rounded-lg border border-line bg-surface p-4 xl:sticky xl:top-20"
        >
          {current.core && <p className="text-sm text-ink-3">One of the core five</p>}
          <h2 className="text-h3 font-bold">{current.name}</h2>
          <p className="text-ink">{current.meaning}</p>
          <p className="text-ink-2">
            <span className="font-semibold text-ink">Example: </span>
            {current.example}
          </p>
        </section>
      </div>

      <section aria-labelledby="char-notice" className="max-w-[70ch]">
        <h2 id="char-notice" className="text-h3 font-bold">
          What to notice
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2 marker:text-ink-3">
          <li>The first five cards are the core characteristics most textbooks list.</li>
          <li>Several characteristics work together: a self-configuring device still needs a unique identity.</li>
          <li>The last two cards are limits engineers must design around, not just features.</li>
          <li>Select a card to read its meaning and a real example.</li>
        </ul>
      </section>
    </div>
  );
}
