import { Eye, Lock, LockOpen, Send, ShieldCheck, Smartphone, UserX } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { flipBit, toHex } from "~/labs/l26-crypto-workbench/engine";
import { mqttPublish, openRecord, sealRecord } from "~/labs/l25-packet-sniffer/engine";
import { cn } from "~/lib/cn";

type Attack = "eavesdrop" | "tamper" | "replay";
type Enc = "off" | "on";

interface Outcome {
  eveSees: string;
  eveNote: string;
  doorOpen: boolean;
  doorText: string;
  safe: boolean;
}

const ATTACK_TEXT: Record<Attack, string> = {
  eavesdrop: "Eve only listens to the message.",
  tamper: "Eve changes the message on its way to the lock.",
  replay: "Eve sends an old \"unlock\" message she recorded yesterday.",
};

/** Works out what really happens, using the same MQTT bytes and AES-GCM records as lab L25. */
async function run(attack: Attack, enc: Enc): Promise<Outcome> {
  const lock = mqttPublish("home/door/cmd", "lock");
  if (enc === "off") {
    if (attack === "eavesdrop") return { eveSees: "PUBLISH home/door/cmd = lock", eveNote: "She reads the topic and the command.", doorOpen: false, doorText: "The door locks, as asked. But Eve now knows how the lock is controlled.", safe: false };
    if (attack === "tamper") return { eveSees: "PUBLISH home/door/cmd = lock → unlock", eveNote: "She rewrites four letters.", doorOpen: true, doorText: "The door UNLOCKS. Plain MQTT has no way to notice the change.", safe: false };
    return { eveSees: "PUBLISH home/door/cmd = unlock (recorded yesterday)", eveNote: "She plays back an old message.", doorOpen: true, doorText: "The door UNLOCKS. The old message looks exactly like a new one.", safe: false };
  }
  const record = await sealRecord(lock, 7);
  const hex = `${toHex(record).slice(0, 36)}…`;
  if (attack === "eavesdrop") return { eveSees: hex, eveNote: `Only random-looking bytes: a ${record.length}-byte record went to the lock.`, doorOpen: false, doorText: "The door locks. Eve learned nothing except that a short message was sent.", safe: true };
  if (attack === "tamper") {
    try {
      await openRecord(flipBit(record, 12, 2), 7);
      return { eveSees: hex, eveNote: "She flips one bit.", doorOpen: true, doorText: "The change was not noticed.", safe: false };
    } catch {
      return { eveSees: `${hex} (one bit flipped)`, eveNote: "She cannot read it, so she can only flip bits blindly.", doorOpen: false, doorText: "The lock throws the message away: the authentication tag no longer matches.", safe: true };
    }
  }
  const old = await sealRecord(mqttPublish("home/door/cmd", "unlock"), 2);
  try {
    await openRecord(old, 7);
    return { eveSees: `${toHex(old).slice(0, 36)}…`, eveNote: "An old record.", doorOpen: true, doorText: "The old message was accepted.", safe: false };
  } catch {
    return { eveSees: `${toHex(old).slice(0, 36)}… (recorded yesterday)`, eveNote: "She resends yesterday's encrypted \"unlock\".", doorOpen: false, doorText: "The lock rejects it: the record's sequence number is old, so it does not decrypt.", safe: true };
  }
}

export default function EncryptionNeedVisual() {
  const reduced = useReducedMotion() ?? false;
  const [attack, setAttack] = useState<Attack>("eavesdrop");
  const [enc, setEnc] = useState<Enc>("off");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [trip, setTrip] = useState(0);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    setOutcome(null);
    setTrip((t) => t + 1);
    const o = await run(attack, enc);
    window.setTimeout(() => {
      setOutcome(o);
      setBusy(false);
    }, reduced ? 0 : 1300);
  };

  const pick = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setOutcome(null);
  };

  const box = "grid min-w-0 justify-items-center gap-1 rounded-lg border p-2 text-center text-xs sm:p-3 sm:text-sm";

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5">
      <p className="max-w-prose text-ink-2">The phone sends "lock" to the smart lock over the home Wi-Fi. Eve is a guest on the same Wi-Fi. Choose what she tries, with and without encryption.</p>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <Segmented<Attack>
          label="What Eve tries"
          size="sm"
          value={attack}
          onChange={pick(setAttack)}
          options={[
            { value: "eavesdrop", label: "Listen" },
            { value: "tamper", label: "Change it" },
            { value: "replay", label: "Replay old" },
          ]}
        />
        <Segmented<Enc>
          label="Encryption"
          size="sm"
          value={enc}
          onChange={pick(setEnc)}
          options={[
            { value: "off", label: "Off (plain MQTT)" },
            { value: "on", label: "On (TLS)" },
          ]}
        />
      </div>

      <div className="relative grid min-w-0 grid-cols-3 items-start gap-2 sm:gap-4">
        <div className={cn(box, "border-line bg-surface")}>
          <Smartphone size={28} aria-hidden className="text-brand" />
          <p className="font-semibold text-ink">Phone app</p>
          <p className="text-ink-3">Sends "lock"</p>
        </div>
        <div className={cn(box, "border-dashed border-bad bg-bad-soft")}>
          <UserX size={28} aria-hidden className="text-bad" />
          <p className="font-semibold text-ink">Eve</p>
          <p className="text-ink-3">{ATTACK_TEXT[attack]}</p>
        </div>
        <div className={cn(box, outcome ? (outcome.doorOpen ? "border-bad bg-bad-soft" : "border-ok bg-ok-soft") : "border-line bg-surface")}>
          {outcome?.doorOpen ? <LockOpen size={28} aria-hidden className="text-bad" /> : <Lock size={28} aria-hidden className="text-ok" />}
          <p className="font-semibold text-ink">Smart lock</p>
          <p className="text-ink-3">{outcome ? (outcome.doorOpen ? "Unlocked" : "Locked") : "Waiting"}</p>
        </div>
        {trip > 0 && !reduced && (
          <motion.span
            key={trip}
            aria-hidden
            className={cn("pointer-events-none absolute top-3 size-4 rounded-full border-2 border-surface", enc === "on" ? "bg-u3" : "bg-warn")}
            initial={{ left: "12%" }}
            animate={{ left: ["12%", "48%", "48%", "84%"] }}
            transition={{ duration: 1.3, times: [0, 0.4, 0.6, 1] }}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={send} disabled={busy} icon={<Send size={16} aria-hidden />}>
          Send "lock"
        </Button>
        <span className="text-sm text-ink-3">{enc === "on" ? "Each message is an AES-GCM record with its own sequence number." : "Each message is plain MQTT bytes."}</span>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2" aria-live="polite">
        <section className="grid min-w-0 content-start gap-1 rounded-lg border border-line bg-surface p-3">
          <h3 className="flex items-center gap-2 font-bold text-ink">
            <Eye size={16} aria-hidden className="text-bad" /> What Eve sees
          </h3>
          <p className="break-all font-mono text-sm text-ink">{outcome ? outcome.eveSees : "Press Send."}</p>
          {outcome && <p className="text-sm text-ink-2">{outcome.eveNote}</p>}
        </section>
        <section className={cn("grid min-w-0 content-start gap-1 rounded-lg border p-3", outcome ? (outcome.safe ? "border-ok bg-ok-soft" : "border-bad bg-bad-soft") : "border-line bg-surface")}>
          <h3 className="flex items-center gap-2 font-bold text-ink">
            {outcome?.safe ? <ShieldCheck size={16} aria-hidden className="text-ok" /> : <LockOpen size={16} aria-hidden className={outcome ? "text-bad" : "text-ink-3"} />}
            What happens
          </h3>
          <p className="text-sm text-ink">{outcome ? outcome.doorText : "The result appears here."}</p>
          {outcome && <p className="text-sm font-semibold text-ink">{outcome.safe ? "Protected" : "Not protected"}</p>}
        </section>
      </div>

      <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
        <p className="font-semibold text-ink">What to notice</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Without encryption, all three tricks work. With TLS, all three fail.</li>
          <li>Encryption alone hides the message; the authentication tag is what catches the change.</li>
          <li>Sequence numbers make old messages useless, so replay fails too.</li>
          <li>Even with TLS, Eve still sees that a short message went to the lock. That is metadata.</li>
        </ul>
      </div>
    </div>
  );
}
