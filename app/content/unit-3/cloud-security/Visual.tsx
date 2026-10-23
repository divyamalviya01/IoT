import { useState } from "react";
import { BadgeCheck, Building2, CircleCheck, CircleX, Database, KeyRound, SlidersHorizontal, UserRound, type LucideIcon } from "lucide-react";
import { SequenceDiagram } from "~/components/theory";
import type { SequenceMessage } from "~/components/theory/SequenceDiagram";
import { Segmented } from "~/components/ui/Segmented";
import { cn } from "~/lib/cn";
import { ResponsibilityStack, type CloudModel } from "../cloud-computing/ResponsibilityStack";

/* ------------------------------------------------------------------ */
/* (a) Shared responsibility                                           */
/* ------------------------------------------------------------------ */

const DUTIES: Record<CloudModel, { title: string; provider: string; you: string; note?: string }> = {
  onprem: {
    title: "On-premises: you secure it all",
    provider: "Nothing. There is no provider, so the building, servers and network are all yours to guard.",
    you: "Lock the server room, patch every server, and run the firewall yourself.",
  },
  iaas: {
    title: "IaaS: you secure the operating system and up",
    provider: "The data centre building, power, hardware, storage, network and the virtualisation layer.",
    you: "Patch the operating system, set firewall rules, and secure the MQTT broker you installed.",
  },
  paas: {
    title: "PaaS: you secure your app and its settings",
    provider: "Everything up to the runtime, such as the MQTT broker inside AWS IoT Core or Azure IoT Hub.",
    you: "Write safe app code and rules. Give each device a policy that allows only its own topics.",
  },
  saas: {
    title: "SaaS: you secure how it is used",
    provider: "The whole application, as well as everything below it.",
    you: "Add users carefully, turn on two-factor login, and check who the dashboard is shared with.",
    note: "The provider stores and protects your data, but who may see it is still your decision.",
  },
};

const ALWAYS: { icon: LucideIcon; name: string; text: string }[] = [
  { icon: Database, name: "Data", text: "What you collect, who may read it, and backups." },
  { icon: UserRound, name: "Identities and access", text: "User accounts, roles and two-factor login." },
  { icon: KeyRound, name: "Device credentials", text: "One certificate per device; revoke it if lost." },
  { icon: SlidersHorizontal, name: "Configuration", text: "Settings such as open ports or public storage." },
];

function SharedResponsibility() {
  const [model, setModel] = useState<CloudModel>("paas");
  const duty = DUTIES[model];

  return (
    <section aria-labelledby="shared-heading" className="grid min-w-0 grid-cols-1 gap-4">
      <div className="grid gap-1">
        <h2 id="shared-heading" className="text-h3 font-bold">
          Shared responsibility: who secures what?
        </h2>
        <p className="max-w-[65ch] text-ink-2">
          The provider secures the cloud itself. You secure what you put in it. Pick a model to see where the line falls.
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <ResponsibilityStack
          value={model}
          onChange={setModel}
          youLabel="You secure"
          providerLabel="Provider secures"
          caption="Who secures each layer?"
        />

        <div className="grid min-w-0 content-start gap-3" aria-live="polite">
          <h3 className="text-lg font-bold text-ink">{duty.title}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-u3 bg-u3-soft p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <Building2 size={15} aria-hidden className="text-u3" /> Provider secures
              </p>
              <p className="mt-1 text-ink-2">{duty.provider}</p>
            </div>
            <div className="rounded-lg border border-u1 bg-u1-soft p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <UserRound size={15} aria-hidden className="text-u1" /> You must still
              </p>
              <p className="mt-1 text-ink-2">{duty.you}</p>
            </div>
          </div>
          {duty.note && <p className="text-sm text-ink-2">{duty.note}</p>}

          <div className="rounded-lg border border-line bg-surface p-3">
            <p className="font-semibold text-ink">Always yours, in every model</p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {ALWAYS.map(({ icon: Icon, name, text }) => (
                <li key={name} className="flex items-start gap-2">
                  <Icon size={17} aria-hidden className="mt-0.5 shrink-0 text-u1" />
                  <span className="text-sm text-ink-2">
                    <strong className="block text-[0.95rem] text-ink">{name}</strong>
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
            <p className="font-semibold text-ink">What to notice</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Moving towards SaaS, the provider takes over more layers. Your four duties never move.</li>
              <li>Most cloud data leaks come from wrong settings, such as a storage bucket left public.</li>
              <li>The provider cannot protect an account whose password was guessed or leaked.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* (b) Mutual TLS device login                                         */
/* ------------------------------------------------------------------ */

type Story = "trusted" | "revoked" | "unknown";

const DEVICE = "Device";
const CLOUD = "IoT cloud";

const storyOptions: { value: Story; label: string }[] = [
  { value: "trusted", label: "Registered device" },
  { value: "revoked", label: "Revoked certificate" },
  { value: "unknown", label: "Unknown certificate" },
];

/** Steps 1 to 4 are the same in every story. */
const OPENING: SequenceMessage[] = [
  {
    from: DEVICE,
    to: CLOUD,
    label: "ClientHello",
    note: "The device starts the TLS 1.3 handshake. It lists the ciphers it can use and sends its half of a key exchange.",
    code: [
      "ClientHello",
      "  version:     TLS 1.3",
      "  ciphers:     AES-128-GCM, ...",
      "  key_share:   the device's half",
      "  server_name: iot.example.com",
    ].join("\n"),
  },
  {
    from: CLOUD,
    to: DEVICE,
    reply: true,
    label: "ServerHello",
    note: "The cloud picks a cipher and sends its half of the key exchange. Both sides now share secret keys, so everything after this is encrypted.",
  },
  {
    from: CLOUD,
    to: DEVICE,
    reply: true,
    label: "CertificateRequest",
    note: "The cloud asks the device to show a certificate too. This request is what makes the TLS mutual. Steps 2 to 4 travel together in one reply.",
  },
  {
    from: CLOUD,
    to: DEVICE,
    reply: true,
    label: "Server certificate + signature",
    note: "The cloud sends its X.509 certificate and signs the handshake with its private key. The device checks both, so it knows this is the real cloud.",
    code: [
      "Device checks the server:",
      "  ✓ Signed by a CA it trusts",
      "  ✓ Name matches iot.example.com",
      "  ✓ Not expired",
      "  ✓ Signature proves the server",
      "    holds its private key",
    ].join("\n"),
  },
];

const DEVICE_CERT = (cn: string, issuer: string) =>
  [
    "Certificate (X.509)",
    `  subject:  CN=${cn}`,
    `  issuer:   ${issuer}`,
    "CertificateVerify",
    "  a signature over the handshake,",
    "  made with the device's private key",
    "  (the key never leaves the device)",
  ].join("\n");

const STORIES: Record<Story, { messages: SequenceMessage[]; ok: boolean; result: string; about: string }> = {
  trusted: {
    ok: true,
    result: "Connected: both sides proved who they are",
    about: "A thermostat registered in the cloud, with a certificate from the company's device CA.",
    messages: [
      ...OPENING,
      {
        from: DEVICE,
        to: CLOUD,
        label: "Device certificate + signature",
        note: "The device sends its own X.509 certificate and signs the handshake with its private key. Only the holder of that key can make this signature.",
        code: DEVICE_CERT("thermostat-042", "Example Device CA"),
      },
      {
        from: DEVICE,
        to: CLOUD,
        label: "Finished",
        note: "The cloud checks the device's certificate and signature. Every check passes. Both Finished messages confirm nothing was changed on the way.",
        code: [
          "Cloud checks the device:",
          "  ✓ Signed by the CA it trusts",
          "  ✓ Found in the device registry",
          "  ✓ Status: ACTIVE (not revoked)",
          "  ✓ Signature proves it has the key",
        ].join("\n"),
      },
      {
        from: DEVICE,
        to: CLOUD,
        label: "MQTT CONNECT (encrypted)",
        note: "The device logs in to the MQTT broker inside the encrypted tunnel, on port 8883. It needs no password: its certificate already proved who it is.",
      },
      {
        from: CLOUD,
        to: DEVICE,
        reply: true,
        label: "CONNACK: accepted",
        note: "The broker accepts. Readings and commands now travel encrypted, and each side knows exactly who is on the other end.",
      },
    ],
  },
  revoked: {
    ok: false,
    result: "Refused: the certificate was revoked",
    about: "This thermostat was reported stolen, so the owner revoked its certificate in the cloud.",
    messages: [
      ...OPENING,
      {
        from: DEVICE,
        to: CLOUD,
        label: "Device certificate + signature",
        note: "The stolen device sends its real certificate and a valid signature. Its key still works, but the cloud keeps a list of revoked certificates.",
        code: DEVICE_CERT("thermostat-042", "Example Device CA"),
      },
      {
        from: CLOUD,
        to: DEVICE,
        reply: true,
        label: "Alert: certificate_revoked",
        note: "The registry marks this certificate REVOKED. The cloud sends a TLS alert and closes the connection.",
        code: [
          "Cloud checks the device:",
          "  ✓ Signed by the CA it trusts",
          "  ✓ Signature proves it has the key",
          "  ✗ Status: REVOKED (stolen)",
          "  → handshake refused",
        ].join("\n"),
      },
      {
        from: DEVICE,
        to: CLOUD,
        lost: true,
        label: "MQTT CONNECT",
        note: "There is no TLS session, so the device can never send MQTT messages. Other devices are not affected.",
      },
    ],
  },
  unknown: {
    ok: false,
    result: "Refused: no trusted CA signed the certificate",
    about: "A device the cloud has never seen, showing a certificate it made itself (self-signed).",
    messages: [
      ...OPENING,
      {
        from: DEVICE,
        to: CLOUD,
        label: "Device certificate + signature",
        note: "The device sends a self-signed certificate. Its signature is valid, but anyone can make a self-signed certificate.",
        code: DEVICE_CERT("thermostat-042", "thermostat-042 (itself)"),
      },
      {
        from: CLOUD,
        to: DEVICE,
        reply: true,
        label: "Alert: unknown_ca",
        note: "No CA that the cloud trusts signed this certificate, and it is not in the registry. The cloud refuses the handshake.",
        code: [
          "Cloud checks the device:",
          "  ✗ Not signed by any CA it trusts",
          "  ✗ Not in the device registry",
          "  → handshake refused",
        ].join("\n"),
      },
      {
        from: DEVICE,
        to: CLOUD,
        lost: true,
        label: "MQTT CONNECT",
        note: "No session, so no data. Using the same device name did not help: only a trusted signature counts.",
      },
    ],
  },
};

const STORES: { icon: LucideIcon; name: string; text: string }[] = [
  { icon: KeyRound, name: "Private key", text: "Never sent over the network. Best kept in a secure chip." },
  { icon: BadgeCheck, name: "Device certificate", text: "Its public key and name, signed by the device CA." },
  { icon: Building2, name: "Trusted CA certificate", text: "Used to check that the server is the real cloud." },
];

function MutualTls() {
  const [story, setStory] = useState<Story>("trusted");
  const s = STORIES[story];
  const ResultIcon = s.ok ? CircleCheck : CircleX;

  return (
    <section aria-labelledby="mtls-heading" className="grid min-w-0 grid-cols-1 gap-4">
      <div className="grid gap-1">
        <h2 id="mtls-heading" className="text-h3 font-bold">
          Device login with mutual TLS
        </h2>
        <p className="max-w-[65ch] text-ink-2">
          Ordinary TLS proves only the server. In mutual TLS the device proves itself too, with its own certificate.
        </p>
      </div>

      <Segmented label="Which device connects?" options={storyOptions} value={story} onChange={setStory} />

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
        <div className="min-w-0">
          <SequenceDiagram
            key={story}
            participants={[DEVICE, CLOUD]}
            messages={s.messages}
            caption={`TLS 1.3 handshake: ${storyOptions.find((o) => o.value === story)?.label.toLowerCase()}`}
          />
        </div>

        <div className="grid min-w-0 content-start gap-3">
          <p className="text-ink-2">{s.about}</p>
          <p
            className={cn(
              "flex items-start gap-2 rounded-lg border p-3 font-semibold text-ink",
              s.ok ? "border-ok bg-ok-soft" : "border-bad bg-bad-soft",
            )}
          >
            <ResultIcon size={18} aria-hidden className={cn("mt-0.5 shrink-0", s.ok ? "text-ok" : "text-bad")} />
            <span>
              <span className="sr-only">Result: </span>
              {s.result}
            </span>
          </p>

          <div className="rounded-lg border border-line bg-surface p-3">
            <p className="font-semibold text-ink">What the device keeps inside</p>
            <ul className="mt-2 grid gap-2">
              {STORES.map(({ icon: Icon, name, text }) => (
                <li key={name} className="flex items-start gap-2">
                  <Icon size={17} aria-hidden className="mt-0.5 shrink-0 text-ink-3" />
                  <span className="text-sm text-ink-2">
                    <strong className="block text-[0.95rem] text-ink">{name}</strong>
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
            <p className="font-semibold text-ink">What to notice</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Each side checks the other's certificate against a CA it already trusts.</li>
              <li>The private key never travels. The signature proves the device holds it.</li>
              <li>Revoking one certificate shuts out one device. Every other device keeps working.</li>
              <li>Each device needs its own certificate. A shared key would let one stolen device pose as all of them.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function CloudSecurityVisual() {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-10">
      <SharedResponsibility />
      <MutualTls />
    </div>
  );
}
