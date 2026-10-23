import { CheckCircle2, ChevronLeft, ChevronRight, Eye, Lock, RotateCcw, User } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";
import { CompareTable } from "~/components/theory/CompareTable";
import { SequenceDiagram, type SequenceMessage } from "~/components/theory/SequenceDiagram";
import { Button } from "~/components/ui/Button";
import { cn } from "~/lib/cn";
import { diffieHellman } from "~/labs/l26-crypto-workbench/engine";

/* ------------------------------------------------------------------ */
/* (a) Diffie–Hellman as paint mixing, next to the same toy numbers    */
/* ------------------------------------------------------------------ */

/** Paint colours stay the same in light and dark themes; every blob also carries a text label. */
const PAINT = {
  yellow: "#f2c12e",
  red: "#d63c3c",
  blue: "#2f62d0",
  orange: "#e8842f",
  green: "#4f9a4a",
  brown: "#7b4b2e",
  olive: "#a89a3a",
} as const;
type Paint = keyof typeof PAINT;

interface Blob {
  /** Shared layout id: the same id in another column makes the blob travel there */
  id: string;
  paint: Paint;
  label: string;
  sub?: string;
  secret?: boolean;
  /** Arrived from the other side this step (no pop-in, it slides across) */
  moved?: boolean;
}

const PUBLIC: Blob = { id: "dh-public", paint: "yellow", label: "Public yellow", sub: "everyone knows it" };
const A_SECRET: Blob = { id: "dh-a-secret", paint: "red", label: "Alice's secret", sub: "red, kept at home", secret: true };
const B_SECRET: Blob = { id: "dh-b-secret", paint: "blue", label: "Bob's secret", sub: "blue, kept at home", secret: true };
const A_MIX: Blob = { id: "dh-a-mix", paint: "orange", label: "Alice's mix", sub: "yellow + red" };
const B_MIX: Blob = { id: "dh-b-mix", paint: "green", label: "Bob's mix", sub: "yellow + blue" };
const A_GOT: Blob = { ...B_MIX, sub: "received from Bob", moved: true };
const B_GOT: Blob = { ...A_MIX, sub: "received from Alice", moved: true };
const A_FINAL: Blob = { id: "dh-a-final", paint: "brown", label: "Shared colour", sub: "green + her red" };
const B_FINAL: Blob = { id: "dh-b-final", paint: "brown", label: "Shared colour", sub: "orange + his blue" };
const EVE_A: Blob = { id: "dh-eve-a", paint: "orange", label: "Copy of orange", sub: "seen by Eve" };
const EVE_B: Blob = { id: "dh-eve-b", paint: "green", label: "Copy of green", sub: "seen by Eve" };
const EVE_TRY: Blob = { id: "dh-eve-try", paint: "olive", label: "Eve's best try", sub: "orange + green" };

interface PaintStep {
  title: string;
  text: string;
  alice: Blob[];
  net: Blob[];
  bob: Blob[];
}

const STEPS: PaintStep[] = [
  {
    title: "Agree on a public colour",
    text: "Alice and Bob agree in the open on a common paint: yellow. Eve, listening on the network, knows it too.",
    alice: [],
    net: [PUBLIC],
    bob: [],
  },
  {
    title: "Pick secret colours",
    text: "Each picks a secret paint and keeps it at home: Alice picks red, Bob picks blue. These are never sent.",
    alice: [A_SECRET],
    net: [PUBLIC],
    bob: [B_SECRET],
  },
  {
    title: "Mix each secret with yellow",
    text: "Alice mixes her red with yellow and gets orange. Bob mixes his blue with yellow and gets green.",
    alice: [A_SECRET, A_MIX],
    net: [PUBLIC],
    bob: [B_SECRET, B_MIX],
  },
  {
    title: "Swap the mixes in public",
    text: "They send their mixes across the network. Eve copies both on the way, but the secrets stay at home.",
    alice: [A_SECRET, A_GOT],
    net: [PUBLIC, EVE_A, EVE_B],
    bob: [B_SECRET, B_GOT],
  },
  {
    title: "Add your own secret",
    text: "Alice adds her red to Bob's green. Bob adds his blue to Alice's orange. Both now hold the same brown.",
    alice: [A_SECRET, A_GOT, A_FINAL],
    net: [PUBLIC, EVE_A, EVE_B],
    bob: [B_SECRET, B_GOT, B_FINAL],
  },
  {
    title: "Eve is stuck",
    text: "Eve mixes what she has and gets a muddy olive, not the brown. She cannot unmix orange to get red back.",
    alice: [A_SECRET, A_GOT, A_FINAL],
    net: [PUBLIC, EVE_A, EVE_B, EVE_TRY],
    bob: [B_SECRET, B_GOT, B_FINAL],
  },
];

/* The same run with numbers, straight from the lab engine. */
const P = 23n;
const G = 5n;
const SECRET_A = 6n;
const SECRET_B = 15n;
const DH = diffieHellman(P, G, SECRET_A, SECRET_B);
const s = (n: bigint) => String(n);
const Pow = ({ b, e }: { b: bigint; e: bigint | string }) => (
  <span className="whitespace-nowrap font-mono">
    {s(b)}
    <sup>{String(e)}</sup>
  </span>
);

const NUMBER_STEPS: { paints: Paint[]; content: ReactNode }[] = [
  {
    paints: ["yellow"],
    content: (
      <>
        Public numbers: <span className="font-mono">p = {s(P)}</span> and <span className="font-mono">g = {s(G)}</span>. Everyone knows them.
      </>
    ),
  },
  {
    paints: ["red", "blue"],
    content: (
      <>
        Secrets: Alice picks <span className="font-mono">a = {s(SECRET_A)}</span>, Bob picks <span className="font-mono">b = {s(SECRET_B)}</span>.
      </>
    ),
  },
  {
    paints: ["orange", "green"],
    content: (
      <>
        Alice: A = <Pow b={G} e={SECRET_A} /> mod {s(P)} = <strong className="font-mono">{s(DH.A)}</strong>. Bob: B = <Pow b={G} e={SECRET_B} /> mod {s(P)} ={" "}
        <strong className="font-mono">{s(DH.B)}</strong>.
      </>
    ),
  },
  {
    paints: ["orange", "green"],
    content: (
      <>
        Alice sends {s(DH.A)}; Bob sends {s(DH.B)}. Eve sees only p = {s(P)}, g = {s(G)}, A = {s(DH.A)} and B = {s(DH.B)}.
      </>
    ),
  },
  {
    paints: ["brown"],
    content: (
      <>
        Alice: <Pow b={DH.B} e={SECRET_A} /> mod {s(P)} = <strong className="font-mono">{s(DH.aliceSecret)}</strong>. Bob: <Pow b={DH.A} e={SECRET_B} /> mod {s(P)} ={" "}
        <strong className="font-mono">{s(DH.bobSecret)}</strong>. Both get {s(DH.aliceSecret)}.
      </>
    ),
  },
  {
    paints: ["olive"],
    content: (
      <>
        Eve needs a or b, so she must solve <Pow b={G} e="?" /> mod {s(P)} = {s(DH.A)}. Easy for {s(P)}; hopeless for a 2048-bit p.
      </>
    ),
  },
];

const BLOB_SHAPE = "58% 42% 55% 45% / 52% 60% 40% 48%";

function PaintBlob({ blob, reduced }: { blob: Blob; reduced: boolean }) {
  return (
    <motion.div
      layoutId={blob.id}
      layout
      initial={reduced || blob.moved ? false : { opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduced ? 0 : 0.8, ease: "easeInOut" }}
      className="grid w-full max-w-[7rem] justify-items-center gap-1 text-center"
    >
      <span
        className="relative block size-11 border-2 border-black/25 shadow-sm sm:size-14 dark:border-white/35"
        style={{ backgroundColor: PAINT[blob.paint], borderRadius: BLOB_SHAPE }}
        aria-hidden
      >
        {blob.secret && (
          <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full border border-line-strong bg-surface text-ink">
            <Lock size={11} />
          </span>
        )}
      </span>
      <span className="text-xs leading-tight font-semibold text-ink sm:text-sm">{blob.label}</span>
      {blob.sub && <span className="text-[0.7rem] leading-tight text-ink-3 sm:text-xs">{blob.sub}</span>}
    </motion.div>
  );
}

function Column({ title, icon, blobs, reduced, tone }: { title: string; icon: ReactNode; blobs: Blob[]; reduced: boolean; tone?: "net" }) {
  return (
    <section
      aria-label={`${title}: ${blobs.length ? blobs.map((b) => b.label).join(", ") : "nothing yet"}`}
      className={cn("grid min-w-0 content-start gap-3 rounded-lg border p-2 sm:p-3", tone === "net" ? "border-dashed border-line-strong bg-surface-2" : "border-line bg-surface")}
    >
      <h4 className="flex items-center justify-center gap-1.5 text-center text-sm font-bold text-ink sm:text-base">
        {icon}
        {title}
      </h4>
      <div className="flex min-h-24 flex-wrap content-start justify-center gap-3">
        {blobs.map((b) => (
          <PaintBlob key={b.id} blob={b} reduced={reduced} />
        ))}
        {!blobs.length && <p className="self-center text-xs text-ink-3">Nothing yet</p>}
      </div>
    </section>
  );
}

function PaintMixing() {
  const [step, setStep] = useState(0);
  const reduced = useReducedMotion() ?? false;
  const cur = STEPS[step];
  const last = STEPS.length - 1;

  return (
    <section aria-labelledby="dh-paint" className="grid min-w-0 grid-cols-1 gap-4">
      <div className="grid gap-1">
        <h2 id="dh-paint" className="text-h3 font-bold">
          Diffie–Hellman: sharing a secret in public
        </h2>
        <p className="max-w-[70ch] text-ink-2">
          Mixing paint is easy, but unmixing it is practically impossible. Diffie–Hellman uses maths that works the same way. Step through it.
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid min-w-0 content-start gap-3 rounded-lg border border-line bg-surface p-3 sm:p-4">
          <div className="grid min-w-0 grid-cols-3 gap-2 sm:gap-3">
            <Column title="Alice" icon={<User size={16} aria-hidden className="text-u3" />} blobs={cur.alice} reduced={reduced} />
            <Column title="Network" icon={<Eye size={16} aria-hidden className="text-warn" />} blobs={cur.net} reduced={reduced} tone="net" />
            <Column title="Bob" icon={<User size={16} aria-hidden className="text-u2" />} blobs={cur.bob} reduced={reduced} />
          </div>
          <p className="text-center text-xs text-ink-3">Eve can see everything in the dashed Network column.</p>

          <div className="min-h-24" aria-live="polite">
            <p className="font-semibold text-ink">
              Step {step + 1} of {STEPS.length}: {cur.title}
            </p>
            <p className="text-ink-2">{cur.text}</p>
            {step >= 4 && (
              <p className="mt-2 flex items-start gap-2 rounded-md border border-ok bg-ok-soft px-3 py-2 text-sm text-ink">
                <CheckCircle2 size={18} aria-hidden className="mt-0.5 shrink-0 text-ok" />
                <span>
                  <strong>Same colour on both sides.</strong> The brown itself never travelled over the network.
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => setStep((n) => Math.max(0, n - 1))} disabled={step === 0} icon={<ChevronLeft size={16} aria-hidden />}>
              Previous step
            </Button>
            <Button size="sm" variant="primary" onClick={() => setStep((n) => Math.min(last, n + 1))} disabled={step === last} icon={<ChevronRight size={16} aria-hidden />}>
              Next step
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStep(0)} disabled={step === 0} icon={<RotateCcw size={16} aria-hidden />}>
              Restart
            </Button>
          </div>
        </div>

        <section aria-labelledby="dh-numbers" className="grid min-w-0 content-start gap-3 rounded-lg border border-line bg-surface p-3 sm:p-4">
          <h3 id="dh-numbers" className="font-bold text-ink">
            The same steps with numbers
          </h3>
          <p className="text-sm text-ink-2">
            Mixing becomes <span className="font-mono">g<sup>secret</sup> mod p</span>. Easy to compute forwards, very hard to undo.
          </p>
          <ol className="grid min-w-0 gap-2">
            {NUMBER_STEPS.map((n, i) => (
              <li
                key={i}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)] gap-2 rounded-md border px-2 py-1.5 text-sm transition-opacity",
                  i === step ? "border-u3 bg-u3-soft text-ink" : "border-transparent text-ink-2",
                  i > step && "opacity-40",
                )}
              >
                <span className="font-mono font-bold text-ink-3">{i + 1}</span>
                <span className="min-w-0">
                  <span className="mr-1.5 inline-flex gap-0.5 align-middle" aria-hidden>
                    {n.paints.map((p) => (
                      <span key={p} className="inline-block size-3 border border-black/25 dark:border-white/35" style={{ backgroundColor: PAINT[p], borderRadius: BLOB_SHAPE }} />
                    ))}
                  </span>
                  {i > step ? <span className="sr-only">Not reached yet: </span> : null}
                  {n.content}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
        <p className="font-semibold text-ink">What to notice</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>The secret colours, and the numbers a and b, never leave Alice and Bob.</li>
          <li>Both reach the same result in a different order: yellow + red + blue either way.</li>
          <li>Eve sees the public colour and both mixes, like p, g, A and B, but cannot unmix them.</li>
          <li>With p = 23, Eve could simply try all 22 secrets. Real systems use a 2048-bit p or elliptic curves.</li>
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* (b) The TLS 1.3 handshake                                           */
/* ------------------------------------------------------------------ */

const CLIENT = "Sensor (client)";
const SERVER = "Broker (server)";

const TLS: SequenceMessage[] = [
  {
    from: CLIENT,
    to: SERVER,
    label: "ClientHello + key share",
    note: "The sensor says hello. It lists the cipher suites it supports and already sends its Diffie–Hellman public value, the key share.",
    code: `ClientHello
  version:       TLS 1.3
  cipher suites: TLS_AES_128_GCM_SHA256
                 TLS_CHACHA20_POLY1305_SHA256
  key share:     x25519, 32-byte public value
  server name:   broker.example.com`,
  },
  {
    from: SERVER,
    to: CLIENT,
    label: "ServerHello + key share",
    reply: true,
    note: "The broker picks one cipher suite and sends its own key share. Both sides can now work out the same secret, like the paint mixing. Everything after this is encrypted.",
    code: `ServerHello
  version:      TLS 1.3
  cipher suite: TLS_AES_128_GCM_SHA256
  key share:    x25519, 32-byte public value`,
  },
  {
    from: SERVER,
    to: CLIENT,
    label: "{EncryptedExtensions}",
    reply: true,
    note: "Extra settings, already encrypted. Curly braces { } mean the message is encrypted with keys from the handshake.",
  },
  {
    from: SERVER,
    to: CLIENT,
    label: "{Certificate}",
    reply: true,
    note: "The broker's certificate: its name and public key, signed by a certificate authority (CA) that the sensor trusts.",
    code: `Certificate
  subject:    broker.example.com
  public key: ECDSA P-256
  issued by:  Example Root CA
  valid:      2026-01-01 to 2027-01-01`,
  },
  {
    from: SERVER,
    to: CLIENT,
    label: "{CertificateVerify}",
    reply: true,
    note: "A signature over the whole handshake so far, made with the broker's private key. It proves the broker really owns the certificate.",
  },
  {
    from: SERVER,
    to: CLIENT,
    label: "{Finished}",
    reply: true,
    note: "A check value over every handshake message. If an attacker changed any of them, this check would fail.",
  },
  {
    from: CLIENT,
    to: SERVER,
    label: "{Finished}",
    note: "The sensor checks the certificate (trusted CA, right name, not expired) and the signature. Then it sends its own Finished. One round trip is done.",
  },
  {
    from: CLIENT,
    to: SERVER,
    label: "[MQTT CONNECT, PUBLISH]",
    note: "Now MQTT data flows, encrypted with AES-GCM. Square brackets [ ] mean application data. MQTT over TLS uses port 8883.",
    code: `TLS record: application data (port 8883)
  encrypted: MQTT CONNECT, then
             PUBLISH home/room1/temp "31.2"
  + 16-byte AES-GCM tag`,
  },
  {
    from: SERVER,
    to: CLIENT,
    label: "[MQTT CONNACK]",
    reply: true,
    note: "The broker's replies are protected the same way. The slow public-key work happened once; all the data uses fast AES-GCM.",
  },
];

function TlsHandshake() {
  return (
    <section aria-labelledby="tls-title" className="grid min-w-0 grid-cols-1 gap-4">
      <div className="grid gap-1">
        <h2 id="tls-title" className="text-h3 font-bold">
          TLS 1.3: how a sensor opens a secure MQTT connection
        </h2>
        <p className="max-w-[70ch] text-ink-2">
          TLS puts the pieces together: a Diffie–Hellman key share, a certificate with a signature, then AES-GCM for the data. Step through the handshake.
        </p>
      </div>

      <SequenceDiagram participants={[CLIENT, SERVER]} messages={TLS} caption="TLS 1.3 full handshake, then encrypted MQTT" />

      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-3 text-sm text-ink-2">
          <p className="font-semibold text-ink">One round trip (1-RTT)</p>
          <p className="mt-1">
            The key shares travel in the first two messages. So the sensor can send data after one round trip: ClientHello out, the broker's reply back. TLS 1.2
            needed two.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-3 text-sm text-ink-2">
          <p className="font-semibold text-ink">DTLS for CoAP</p>
          <p className="mt-1">
            CoAP runs over UDP, so it uses DTLS (port 5684). DTLS does the same handshake, and also resends handshake messages that UDP loses.
          </p>
        </div>
      </div>

      <CompareTable
        caption="Which part of TLS 1.3 does which job"
        columns={["Job", "In TLS 1.3", "Try it in lab L26"]}
        rows={[
          ["Agree on a shared key", "Key share: Diffie–Hellman on an elliptic curve (such as X25519)", "Toy Diffie–Hellman"],
          ["Prove who the server is", "Certificate plus a signature (RSA or ECDSA)", "Toy RSA: sign and verify"],
          ["Encrypt the data", "AES-128-GCM or ChaCha20-Poly1305", "AES-GCM"],
          ["Catch any change", "The GCM tag on every record; SHA-256 inside the Finished check", "AES-GCM tamper test, SHA-256"],
        ]}
      />

      <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
        <p className="font-semibold text-ink">What to notice</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Everything after ServerHello is encrypted, even the certificate.</li>
          <li>The certificate and its signature stop a fake broker. Diffie–Hellman alone cannot tell who is on the other end.</li>
          <li>The Finished checks catch an attacker who changes any handshake message.</li>
          <li>Public-key maths runs once per connection; the data itself uses fast symmetric AES-GCM.</li>
        </ul>
      </div>
    </section>
  );
}

export default function EncryptionProtocolsVisual() {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-10">
      <PaintMixing />
      <TlsHandshake />
    </div>
  );
}
