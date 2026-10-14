import type { ReactNode } from "react";
import { cn } from "~/lib/cn";

/*
 * Pin maps for the two boards, as plain HTML so they stay sharp and readable
 * on a phone. Colour shows the pin type, and every pin also says what it is
 * in words, so colour is never the only clue.
 */

type Kind = "5v" | "3v3" | "gnd" | "gpio" | "analog" | "other";

const KIND: Record<Kind, { label: string; dot: string }> = {
  "5v": { label: "5 V power", dot: "bg-bad text-bg" },
  "3v3": { label: "3.3 V power", dot: "bg-warn text-bg" },
  gnd: { label: "Ground", dot: "bg-ink text-bg" },
  gpio: { label: "GPIO (digital pin)", dot: "bg-brand text-bg" },
  analog: { label: "Analog input", dot: "bg-u2 text-bg" },
  other: { label: "Other", dot: "border border-line-strong bg-surface-2 text-ink-2" },
};

interface Pin {
  name: string;
  /** Special function, shown after the name. */
  extra?: string;
  kind: Kind;
}

const pin = (name: string, kind: Kind, extra?: string): Pin => ({ name, kind, extra });

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

/** Raspberry Pi 40-pin header, physical pins 1 to 40 in order. */
const PI_HEADER: Pin[] = [
  pin("3.3V power", "3v3"),
  pin("5V power", "5v"),
  pin("GPIO2", "gpio", "I²C SDA"),
  pin("5V power", "5v"),
  pin("GPIO3", "gpio", "I²C SCL"),
  pin("Ground", "gnd"),
  pin("GPIO4", "gpio"),
  pin("GPIO14", "gpio", "UART TX"),
  pin("Ground", "gnd"),
  pin("GPIO15", "gpio", "UART RX"),
  pin("GPIO17", "gpio"),
  pin("GPIO18", "gpio", "PWM0"),
  pin("GPIO27", "gpio"),
  pin("Ground", "gnd"),
  pin("GPIO22", "gpio"),
  pin("GPIO23", "gpio"),
  pin("3.3V power", "3v3"),
  pin("GPIO24", "gpio"),
  pin("GPIO10", "gpio", "SPI MOSI"),
  pin("Ground", "gnd"),
  pin("GPIO9", "gpio", "SPI MISO"),
  pin("GPIO25", "gpio"),
  pin("GPIO11", "gpio", "SPI SCLK"),
  pin("GPIO8", "gpio", "SPI CE0"),
  pin("Ground", "gnd"),
  pin("GPIO7", "gpio", "SPI CE1"),
  pin("GPIO0", "gpio", "ID EEPROM"),
  pin("GPIO1", "gpio", "ID EEPROM"),
  pin("GPIO5", "gpio"),
  pin("Ground", "gnd"),
  pin("GPIO6", "gpio"),
  pin("GPIO12", "gpio", "PWM0"),
  pin("GPIO13", "gpio", "PWM1"),
  pin("Ground", "gnd"),
  pin("GPIO19", "gpio", "PWM1"),
  pin("GPIO16", "gpio"),
  pin("GPIO26", "gpio"),
  pin("GPIO20", "gpio"),
  pin("Ground", "gnd"),
  pin("GPIO21", "gpio"),
];

/** Arduino Uno R3 digital header, from the end nearest the USB port. */
const UNO_DIGITAL_A: Pin[] = [
  pin("SCL", "other", "I²C SCL, same as A5"),
  pin("SDA", "other", "I²C SDA, same as A4"),
  pin("AREF", "other", "analog reference"),
  pin("GND", "gnd"),
  pin("D13", "gpio", "SPI SCK, built-in LED"),
  pin("D12", "gpio", "SPI MISO"),
  pin("D11 ~PWM", "gpio", "SPI MOSI"),
  pin("D10 ~PWM", "gpio", "SPI SS"),
  pin("D9 ~PWM", "gpio"),
  pin("D8", "gpio"),
];
const UNO_DIGITAL_B: Pin[] = [
  pin("D7", "gpio"),
  pin("D6 ~PWM", "gpio"),
  pin("D5 ~PWM", "gpio"),
  pin("D4", "gpio"),
  pin("D3 ~PWM", "gpio", "interrupt 1"),
  pin("D2", "gpio", "interrupt 0"),
  pin("D1", "gpio", "TX"),
  pin("D0", "gpio", "RX"),
];
const UNO_POWER: Pin[] = [
  pin("(not connected)", "other"),
  pin("IOREF", "other", "logic voltage"),
  pin("RESET", "other"),
  pin("3.3V", "3v3"),
  pin("5V", "5v"),
  pin("GND", "gnd"),
  pin("GND", "gnd"),
  pin("VIN", "other", "input voltage"),
];
const UNO_ANALOG: Pin[] = [
  pin("A0", "analog"),
  pin("A1", "analog"),
  pin("A2", "analog"),
  pin("A3", "analog"),
  pin("A4", "analog", "I²C SDA"),
  pin("A5", "analog", "I²C SCL"),
];

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function Legend({ kinds }: { kinds: Kind[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-2" aria-label="Pin colours">
      {kinds.map((kind) => (
        <li key={kind} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={cn("inline-block size-3.5 rounded-full", KIND[kind].dot)} />
          {KIND[kind].label}
        </li>
      ))}
    </ul>
  );
}

function PinText({ pin: p, align = "left" }: { pin: Pin; align?: "left" | "right" }) {
  return (
    <span className={cn("leading-tight", align === "right" && "text-right")}>
      <span className={cn("font-semibold", p.kind === "other" ? "text-ink-2" : "text-ink")}>
        {p.name}
      </span>
      {p.extra && <span className="block text-xs text-ink-3">{p.extra}</span>}
    </span>
  );
}

function Dot({ kind, children }: { kind: Kind; children?: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold tabular-nums",
        children === undefined ? "size-3.5" : "size-7",
        KIND[kind].dot,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Raspberry Pi                                                        */
/* ------------------------------------------------------------------ */

function PiPinMap() {
  const rows = Array.from({ length: 20 }, (_, i) => ({
    odd: { n: i * 2 + 1, pin: PI_HEADER[i * 2] },
    even: { n: i * 2 + 2, pin: PI_HEADER[i * 2 + 1] },
  }));

  return (
    <figure className="m-0 grid gap-3">
      <h3 className="font-bold">Raspberry Pi: 40-pin GPIO header</h3>
      <Legend kinds={["5v", "3v3", "gnd", "gpio"]} />
      <table className="w-full max-w-md border-collapse text-sm">
        <caption className="sr-only">
          Raspberry Pi GPIO header. Each row lists an odd-numbered pin and the even-numbered pin
          beside it.
        </caption>
        <thead>
          <tr className="text-xs text-ink-3">
            <th scope="col" className="pb-1 pr-2 text-right font-normal">
              Function
            </th>
            <th scope="col" className="pb-1 font-normal" colSpan={2}>
              Pins
            </th>
            <th scope="col" className="pb-1 pl-2 text-left font-normal">
              Function
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ odd, even }) => (
            <tr key={odd.n}>
              <td className="w-1/2 py-0.5 pr-2 text-right align-middle">
                <PinText pin={odd.pin} align="right" />
              </td>
              <td className="bg-surface-2 py-0.5 pl-1.5 pr-0.5 align-middle">
                <Dot kind={odd.pin.kind}>{odd.n}</Dot>
              </td>
              <td className="bg-surface-2 py-0.5 pl-0.5 pr-1.5 align-middle">
                <Dot kind={even.pin.kind}>{even.n}</Dot>
              </td>
              <td className="w-1/2 py-0.5 pl-2 text-left align-middle">
                <PinText pin={even.pin} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className="max-w-[70ch] text-sm text-ink-3">
        Hold the Pi with the header running down its right side and the USB ports at the bottom.
        Pin 1 is then at the top left. Odd-numbered pins are on the left and even-numbered pins on
        the right. Small text under a name is a special function. Signal pins work at 3.3 V.
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Arduino Uno                                                         */
/* ------------------------------------------------------------------ */

function PinList({ title, pins, side }: { title: string; pins: Pin[]; side: "left" | "right" }) {
  return (
    <div className="grid gap-1">
      <p className={cn("text-xs text-ink-3", side === "left" && "text-right")}>{title}</p>
      <ul className="grid gap-1" aria-label={title}>
        {pins.map((p, i) => (
          <li
            key={`${p.name}-${i}`}
            className={cn("flex min-h-7 items-center gap-2", side === "left" && "flex-row-reverse")}
          >
            <Dot kind={p.kind} />
            <PinText pin={p} align={side === "left" ? "right" : "left"} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function UnoPinMap() {
  return (
    <figure className="m-0 grid gap-3">
      <h3 className="font-bold">Arduino Uno: pin headers</h3>
      <Legend kinds={["5v", "3v3", "gnd", "gpio", "analog", "other"]} />
      <div className="grid max-w-lg grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 text-sm sm:gap-3">
        <div className="grid content-start gap-4 pt-16">
          <PinList title="Power header" pins={UNO_POWER} side="left" />
          <PinList title="Analog header" pins={UNO_ANALOG} side="left" />
        </div>

        {/* The board itself, turned on its side */}
        <div
          aria-hidden="true"
          className="flex w-12 flex-col items-center gap-2 rounded-lg border border-line-strong bg-surface-2 px-1 py-2 text-center text-[11px] leading-tight text-ink-3 sm:w-16"
        >
          <span className="w-full rounded border border-line-strong bg-surface px-0.5 py-1">USB</span>
          <span className="w-full rounded border border-line-strong bg-surface px-0.5 py-1">
            Power jack
          </span>
          <span className="mt-6 flex w-6 flex-1 items-center justify-center rounded bg-ink-3 text-surface [writing-mode:vertical-rl]">
            ATmega328P
          </span>
        </div>

        <div className="grid content-start gap-3">
          <PinList title="Digital header" pins={UNO_DIGITAL_A} side="right" />
          <PinList title="Digital header (continued)" pins={UNO_DIGITAL_B} side="right" />
        </div>
      </div>
      <figcaption className="max-w-[70ch] text-sm text-ink-3">
        The board is turned on its side: the USB port and power jack are at the top, the digital
        header is on the right, and the power and analog headers are on the left. ~ marks a pin
        that can output PWM.
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */

export default function PinoutDiagrams({ board }: { board: "pi" | "uno" }) {
  return (
    <section aria-labelledby="pin-maps" className="grid gap-4">
      <h2 id="pin-maps" className="text-h3 font-bold">
        Pin maps
      </h2>
      {board === "pi" ? <PiPinMap /> : <UnoPinMap />}
    </section>
  );
}
