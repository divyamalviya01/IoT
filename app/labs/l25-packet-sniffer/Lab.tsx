import { Eye, KeyRound, LockKeyhole, ShieldAlert, ShieldCheck, Wrench } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { SimControls } from "~/components/sim/SimControls";
import { useSimClock } from "~/components/sim/useSimClock";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import { HOSTS, TLS_HEADER_BYTES, capture, learned, tamper, type Mode, type Packet, type TamperResult } from "./engine";

const lab = getLab("l25-packet-sniffer")!;

const steps = [
  "Keep Plain MQTT (port 1883). Press Play to capture the traffic. Click the CONNECT packets and read the hex dump: look at the right-hand column.",
  "Read the panel \"What the eavesdropper learned\", then press \"Change the lock command\" and see what the door does. Press Record observation.",
  "Switch to MQTT over TLS (port 8883) and capture again. Click the packets: what can you still see?",
  "Try changing the lock command again, then press Record observation.",
  "Compare the bytes on the wire for both modes and open the lab record.",
];

const END_MS = 4500;
const hostName = (ip: string) => Object.values(HOSTS).find((h) => h.ip === ip)?.name ?? ip;

function HexDump({ bytes }: { bytes: Uint8Array }) {
  const rows: { offset: string; hex: string; ascii: string }[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = [...bytes.slice(i, i + 16)];
    rows.push({
      offset: i.toString(16).padStart(4, "0"),
      hex: chunk.map((b) => b.toString(16).padStart(2, "0")).join(" "),
      ascii: chunk.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ".")).join(""),
    });
  }
  return (
    <div className="relative overflow-x-auto rounded-md border border-line bg-surface-2 p-2">
      <pre className="min-w-[29rem] font-mono text-xs leading-relaxed text-ink">
        {rows.map((r) => (
          <div key={r.offset}>
            <span className="text-ink-3">{r.offset}</span>
            {"  "}
            {r.hex.padEnd(47, " ")}
            {"  "}
            <span className="text-u3">{r.ascii}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

function summarise(rows: ObservationRow[]): string {
  const plain = rows.find((r) => r.modeId === "plain");
  const tls = rows.find((r) => r.modeId === "tls");
  if (!plain || !tls) return "";
  const parts = [
    `With plain MQTT the sniffer read ${plain.passwordsN} password${Number(plain.passwordsN) === 1 ? "" : "s"} and ${plain.readable} messages, including the door commands.`,
    `With TLS it read no passwords and no messages: only who talked to whom, the port and the sizes.`,
    `TLS sent ${String(tls.overhead).replace("+", "")} more bytes than plain MQTT, mostly for the one-time handshake with its certificate; for such tiny messages the handshake outweighs the data.`,
  ];
  if (plain.tamper !== "Not tried" && tls.tamper !== "Not tried") parts.push(`When the lock command was changed on the way, the plain-MQTT door ${plain.tamper === "Obeyed" ? "obeyed it" : "refused it"}, while the TLS door ${tls.tamper === "Refused" ? "refused it because the authentication tag failed" : "obeyed it"}.`);
  parts.push("Encryption protects passwords, commands and readings, and its integrity check stops tampering.");
  return parts.join(" ");
}

export default function PacketSnifferLab() {
  const [mode, setMode] = useState<Mode>("plain");
  const [caps, setCaps] = useState<Record<Mode, Packet[]> | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [tampered, setTampered] = useState<Partial<Record<Mode, TamperResult>>>({});
  const [busy, setBusy] = useState(false);
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");
  const [timeMs, setTimeMs] = useState(0);

  useEffect(() => {
    let alive = true;
    void Promise.all([capture("plain"), capture("tls")]).then(([plain, tls]) => alive && setCaps({ plain, tls }));
    return () => {
      alive = false;
    };
  }, []);

  const clock = useSimClock({ onTick: (_dt, t) => setTimeMs(t), onReset: () => setTimeMs(0), stepMs: 500, maxTimeMs: END_MS });

  const all = caps?.[mode] ?? [];
  const visible = useMemo(() => all.filter((p) => p.t * 1000 <= timeMs), [all, timeMs]);
  const done = caps !== null && timeMs >= END_MS;
  const l = learned(visible);
  const sel = visible.find((p) => p.no === selected) ?? null;
  const plainTotal = caps ? learned(caps.plain).totalWireBytes : 0;
  const tlsTotal = caps ? learned(caps.tls).totalWireBytes : 0;
  const overhead = plainTotal ? Math.round(((tlsTotal - plainTotal) / plainTotal) * 100) : 0;

  const switchMode = (m: Mode) => {
    setMode(m);
    setSelected(null);
    clock.reset();
  };

  const tryTamper = async () => {
    setBusy(true);
    const r = await tamper(mode);
    setTampered((t) => ({ ...t, [mode]: r }));
    setBusy(false);
  };

  const record = () => {
    const t = tampered[mode];
    const row: ObservationRow = {
      mode: mode === "plain" ? "MQTT, port 1883" : "MQTT over TLS, 8883",
      packets: visible.length,
      password: l.passwords.length ? `Yes (${l.passwords.length})` : "No",
      readable: l.messages.length,
      bytes: l.totalWireBytes,
      overhead: mode === "tls" ? `+${overhead} %` : "—",
      tamper: t ? (t.accepted ? "Obeyed" : "Refused") : "Not tried",
      modeId: mode,
      passwordsN: l.passwords.length,
    };
    addRow(row);
    const auto = summarise([...rows, row]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  const t = tampered[mode];

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordDisabled={!done}
      recordHint={done ? "Adds what this capture revealed to the observation table." : "Capture all the traffic first (press Play, or Step to the end)."}
      controls={
        <>
          <Segmented<Mode>
            label="How the devices talk"
            value={mode}
            onChange={switchMode}
            options={[
              { value: "plain", label: "Plain MQTT (port 1883)" },
              { value: "tls", label: "MQTT over TLS (port 8883)" },
            ]}
          />
          <p className="text-sm text-ink-2">
            The door lock ({HOSTS.lock.ip}) and the phone app ({HOSTS.phone.ip}) talk to the MQTT broker ({HOSTS.broker.ip}) on the home Wi-Fi. A guest's laptop on the same Wi-Fi captures every packet.
          </p>
          <p className="text-sm text-ink-3">This is a simulation for learning. Capturing other people's traffic without permission is illegal.</p>
        </>
      }
      toolbar={<SimControls clock={clock} playLabel="Capture" />}
      stage={
        <div className="grid grid-cols-1 gap-4 p-3 sm:p-4">
          <div className="relative overflow-x-auto rounded-md border border-line">
            <table className="w-full min-w-[40rem] border-collapse font-mono text-xs">
              <thead>
                <tr className="bg-surface-2 text-left text-ink-2">
                  {["No.", "Time", "Source", "Destination", "Protocol", "Length", "Info"].map((h) => (
                    <th key={h} scope="col" className="px-2 py-1.5 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-2 py-6 text-center font-sans text-ink-3">
                      {caps ? "Press Capture to start listening." : "Preparing the capture…"}
                    </td>
                  </tr>
                )}
                {visible.map((p) => (
                  <tr
                    key={p.no}
                    tabIndex={0}
                    aria-selected={p.no === selected}
                    onClick={() => setSelected(p.no)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(p.no)}
                    className={cn("cursor-pointer border-t border-line", p.no === selected ? "bg-brand-soft" : p.decoded?.type === "CONNECT" ? "bg-bad-soft" : "hover:bg-surface-2")}
                  >
                    <td className="px-2 py-1 text-ink-3">{p.no}</td>
                    <td className="px-2 py-1 tabular-nums text-ink-2">{p.t.toFixed(3)}</td>
                    <td className="px-2 py-1 text-ink">{p.src}</td>
                    <td className="px-2 py-1 text-ink">{p.dst}</td>
                    <td className="px-2 py-1 text-ink">{p.protocol}</td>
                    <td className="px-2 py-1 tabular-nums text-ink-2">{p.wireBytes}</td>
                    <td className="px-2 py-1 text-ink">{p.info}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sel ? (
            <section className="grid min-w-0 gap-2" aria-label={`Packet ${sel.no} details`}>
              <h3 className="font-bold text-ink">
                Packet {sel.no}: {hostName(sel.src)} → {hostName(sel.dst)}
              </h3>
              <ul className="grid gap-0.5 font-mono text-xs text-ink-2">
                <li>
                  IP {sel.src} → {sel.dst}, TCP port {sel.srcPort} → {sel.dstPort}
                </li>
                {sel.decoded?.type === "CONNECT" && (
                  <li className="text-bad">
                    MQTT CONNECT: client "{sel.decoded.clientId}", user "{sel.decoded.username}", password "{sel.decoded.password}"
                  </li>
                )}
                {sel.decoded?.type === "PUBLISH" && (
                  <li>
                    MQTT PUBLISH: topic "{sel.decoded.topic}", message "{sel.decoded.payload}"
                  </li>
                )}
                {sel.decoded?.type === "CONNACK" && <li>MQTT CONNACK: connection accepted</li>}
                {sel.protocol === "TLS" && sel.info.startsWith("Application") && (
                  <li>
                    TLS record: type 23 (application data), {sel.data.length - TLS_HEADER_BYTES} bytes of ciphertext and tag. Contents: unreadable without the session key.
                  </li>
                )}
                {sel.info.startsWith("Handshake") && <li>TLS handshake message. Its size is typical; its contents are not shown here.</li>}
              </ul>
              {!sel.info.startsWith("Handshake") && <HexDump bytes={sel.data} />}
            </section>
          ) : (
            visible.length > 0 && <p className="text-sm text-ink-3">Click a packet to see its contents.</p>
          )}

          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
            <section className="grid min-w-0 content-start gap-1.5 rounded-lg border border-line bg-surface p-3" aria-live="polite">
              <h3 className="flex items-center gap-2 font-bold text-ink">
                <Eye size={16} aria-hidden className="text-bad" /> What the eavesdropper learned
              </h3>
              <p className="flex items-start gap-1.5 text-sm text-ink">
                <KeyRound size={14} aria-hidden className="mt-1 shrink-0 text-ink-3" />
                {l.passwords.length ? l.passwords.map((x) => `${x.user} / ${x.password}`).join(", ") : "No passwords"}
              </p>
              <p className="text-sm text-ink">
                {l.messages.length ? `${l.messages.length} messages: ${l.messages.map((m) => `${m.topic.replace("home/door/", "")}=${m.payload}`).join(", ")}` : "No messages or topics"}
              </p>
              <p className="text-sm text-ink-2">
                Always visible: {l.talkers.length} addresses talking, port {l.ports.join(", ") || "–"}, {l.totalWireBytes} bytes in {visible.length} packets.
              </p>
            </section>
            <section className={cn("grid min-w-0 content-start gap-1.5 rounded-lg border p-3", t ? (t.accepted ? "border-bad bg-bad-soft" : "border-ok bg-ok-soft") : "border-line bg-surface")} aria-live="polite">
              <h3 className="flex items-center gap-2 font-bold text-ink">
                <Wrench size={16} aria-hidden className="text-ink-3" /> Try to tamper
              </h3>
              <p className="text-sm text-ink-2">The phone sends "lock". Someone on the Wi-Fi changes it on its way to the door.</p>
              <div>
                <Button size="sm" onClick={tryTamper} disabled={busy || !caps} icon={<LockKeyhole size={14} aria-hidden />}>
                  Change the lock command
                </Button>
              </div>
              {t && (
                <p className="flex items-start gap-1.5 text-sm text-ink">
                  {t.accepted ? <ShieldAlert size={16} aria-hidden className="mt-0.5 shrink-0 text-bad" /> : <ShieldCheck size={16} aria-hidden className="mt-0.5 shrink-0 text-ok" />}
                  <span>
                    <strong>{t.outcome}.</strong> {t.detail}
                  </span>
                </p>
              )}
            </section>
          </div>
        </div>
      }
      readouts={
        <Readouts
          items={[
            { label: "Packets captured", value: `${visible.length} / ${all.length}` },
            { label: "Passwords seen", value: l.passwords.length, tone: l.passwords.length ? "bad" : "ok" },
            { label: "Readable messages", value: l.messages.length, tone: l.messages.length ? "bad" : "ok" },
            { label: "Bytes on the wire", value: l.totalWireBytes },
            { label: "Plain MQTT total", value: plainTotal, unit: "bytes" },
            { label: "TLS total", value: tlsTotal, unit: "bytes" },
            { label: "TLS extra bytes", value: `+${overhead}`, unit: "%", hint: "Mostly the one-time handshake" },
            { label: "Tampered command", value: t ? (t.accepted ? "Obeyed" : "Refused") : "Not tried", tone: t ? (t.accepted ? "bad" : "ok") : "default" },
          ]}
        />
      }
    />
  );
}
