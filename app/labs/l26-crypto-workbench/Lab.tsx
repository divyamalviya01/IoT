import { CheckCircle2, Eye, KeyRound, Lock, LockOpen, Repeat, Search, Shuffle, Undo2, User, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { EventLog, type SimEvent } from "~/components/sim/EventLog";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import {
  AES_IV_BYTES,
  AES_TAG_BYTES,
  aesGcmDecrypt,
  aesGcmEncrypt,
  bitDiff,
  bytesText,
  diffieHellman,
  flipBit,
  gcd,
  hexBits,
  isPrime,
  modPow,
  randomBytes,
  rsaDecrypt,
  rsaEncrypt,
  rsaKeys,
  rsaSign,
  rsaVerify,
  sha256Hex,
  textBytes,
  toHex,
  type Bytes,
  type DhRun,
  type RsaKeys,
  type Sealed,
} from "./engine";

const lab = getLab("l26-crypto-workbench")!;

const steps = [
  "SHA-256: keep the text abc. Its hash must begin ba7816bf, the official test value. Press Record observation.",
  "Type a reading such as temp=31.2 and press Change one character. Count the changed bits, then record.",
  "AES-GCM: press Encrypt, then Decrypt, and record. Change one bit of the ciphertext, decrypt again and record.",
  "Undo the change, press Use a different key, decrypt and record. Read why each attempt failed.",
  "Toy RSA: keep p = 61, q = 53, e = 17. Follow the working to d, check 65 → 2790 → 65, and record. Change the signed message and record again.",
  "Toy Diffie–Hellman: keep p = 23, g = 5, a = 6, b = 15. Check that both sides get 2, let Eve try every secret, and record. Then open the lab record.",
];

type Tool = "sha" | "aes" | "rsa" | "dh";
type Log = (text: string, tone?: SimEvent["tone"]) => void;
type Report = (row: ObservationRow | null) => void;
interface ToolProps {
  log: Log;
  report: Report;
}

const TOOLS: Record<Tool, { label: string; kind: string; text: string; notReady: string }> = {
  sha: {
    label: "SHA-256",
    kind: "Hash: no key",
    text: "Turns any text into a fixed 256-bit fingerprint. Devices use it to check that data or firmware has not changed.",
    notReady: "Wait for the hash to appear.",
  },
  aes: {
    label: "AES-GCM",
    kind: "Symmetric: one shared key",
    text: "Encrypts data with a secret key that both sides already share. The tag proves nothing was changed.",
    notReady: "Press Encrypt first.",
  },
  rsa: {
    label: "Toy RSA",
    kind: "Asymmetric: public and private key",
    text: "Anyone can encrypt with the public key, but only the private key decrypts. The private key also signs.",
    notReady: "Fix the numbers first: the key and the round trip must work.",
  },
  dh: {
    label: "Toy DH",
    kind: "Key agreement (Diffie–Hellman)",
    text: "Two devices agree on a shared secret over an open network without ever sending the secret.",
    notReady: "Fix the numbers first.",
  },
};

const TOOL_ORDER: Tool[] = ["sha", "aes", "rsa", "dh"];

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const short = (s: string, n = 14) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const list = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);
/** A whole number typed in a box, or null; digits only so BigInt never throws. */
const parseNum = (s: string, digits = 4): bigint | null => (new RegExp(`^\\d{1,${digits}}$`).test(s) ? BigInt(s) : null);
const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

const inputClass = "h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3 font-mono text-ink";

/** Hex in groups of 8 digits (4 bytes) so it wraps neatly on a phone. Changed bytes are marked. */
function HexView({ hex, changed }: { hex: string; changed?: number }) {
  const bytes = hex.match(/../g) ?? [];
  const groups: string[][] = [];
  for (let i = 0; i < bytes.length; i += 4) groups.push(bytes.slice(i, i + 4));
  return (
    <p className="flex min-w-0 flex-wrap gap-x-2 gap-y-0.5 font-mono text-sm text-ink">
      {groups.map((g, gi) => (
        <span key={gi} className="whitespace-nowrap">
          {g.map((b, bi) =>
            gi * 4 + bi === changed ? (
              <mark key={bi} className="rounded-sm bg-bad-soft font-bold text-bad underline decoration-2">
                {b}
              </mark>
            ) : (
              <span key={bi}>{b}</span>
            ),
          )}
        </span>
      ))}
      {!bytes.length && <span className="text-ink-3">(empty)</span>}
    </p>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1">
      <p className="text-sm font-semibold text-ink-2">
        {label}
        {hint && <span className="font-normal text-ink-3"> · {hint}</span>}
      </p>
      <div className="min-w-0 rounded-md border border-line bg-surface-2 px-3 py-2">{children}</div>
    </div>
  );
}

function Status({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <div className={cn("flex min-w-0 items-start gap-2 rounded-md border px-3 py-2 text-sm text-ink", ok ? "border-ok bg-ok-soft" : "border-bad bg-bad-soft")}>
      {ok ? <CheckCircle2 size={18} aria-hidden className="mt-0.5 shrink-0 text-ok" /> : <XCircle size={18} aria-hidden className="mt-0.5 shrink-0 text-bad" />}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function NumberBox({ label, value, onChange, digits = 4, hint }: { label: string; value: string; onChange: (v: string) => void; digits?: number; hint?: string }) {
  return (
    <label className="grid min-w-0 content-start gap-1">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input className={inputClass} inputMode="numeric" value={value} maxLength={digits} spellCheck={false} onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))} />
      {hint && <span className="text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

const Pow = ({ b, e }: { b: bigint | string; e: bigint | string }) => (
  <>
    {String(b)}
    <sup>{String(e)}</sup>
  </>
);

function Note({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink-2">{children}</p>;
}

/** Logs a message once it settles on a new value (after typing stops), never on the first render. */
function useLogChange(message: string, tone: SimEvent["tone"], log: Log) {
  const prev = useRef(message);
  useEffect(() => {
    if (message === prev.current) return;
    const id = window.setTimeout(() => {
      prev.current = message;
      log(message, tone);
    }, 800);
    return () => window.clearTimeout(id);
  }, [message, tone, log]);
}

/* ------------------------------------------------------------------ */
/* 1. SHA-256 and the avalanche effect                                 */
/* ------------------------------------------------------------------ */

/** Changes the last character to its neighbour: 2 → 3, c → d, 9 → 0. */
function changeOneChar(text: string): string {
  const chars = [...text];
  const last = chars.pop();
  if (last === undefined) return "a";
  let next: string;
  if (last === "9") next = "0";
  else if (last === "z") next = "a";
  else if (last === "Z") next = "A";
  else if (/[0-8a-yA-Y]/.test(last)) next = String.fromCharCode(last.charCodeAt(0) + 1);
  else next = last === "!" ? "?" : "!";
  return chars.join("") + next;
}

function BitGrid({ before, after }: { before: string; after: string | null }) {
  const a = hexBits(before);
  const b = after ? hexBits(after) : null;
  const shown = b ?? a;
  const changed = b ? bitDiff(before, after!) : 0;
  return (
    <div
      role="img"
      aria-label={b ? `The 256 bits of the new hash. ${changed} of them changed.` : "The 256 bits of the hash."}
      className="grid w-full max-w-[24rem] grid-cols-16 gap-px overflow-hidden rounded-md border border-line-strong bg-line-strong"
    >
      {[...shown].map((bit, i) => {
        const diff = b !== null && a[i] !== b[i];
        return (
          <span
            key={i}
            className={cn(
              "flex aspect-square items-center justify-center font-mono text-[0.6rem] leading-none transition-colors sm:text-[0.7rem]",
              diff ? "bg-u3 font-bold text-surface" : "bg-surface text-ink-3",
            )}
          >
            {bit}
          </span>
        );
      })}
    </div>
  );
}

interface Compare {
  from: string;
  to: string;
  before: string;
  after: string;
  bits: number;
}

function ShaTool({ log, report }: ToolProps) {
  const [text, setText] = useState("abc");
  const [hashed, setHashed] = useState<{ text: string; hash: string } | null>(null);
  const [cmp, setCmp] = useState<Compare | null>(null);
  const [again, setAgain] = useState<boolean | null>(null);
  const hash = hashed?.text === text ? hashed.hash : "";

  // Web Crypto only runs in the browser, so hash in an effect.
  useEffect(() => {
    let live = true;
    sha256Hex(text).then((h) => live && setHashed({ text, hash: h }));
    return () => {
      live = false;
    };
  }, [text]);

  const edit = (value: string) => {
    setText(value);
    setCmp(null);
    setAgain(null);
  };

  const changeOne = async () => {
    const to = changeOneChar(text);
    const [before, after] = await Promise.all([sha256Hex(text), sha256Hex(to)]);
    const bits = bitDiff(before, after);
    setCmp({ from: text, to, before, after, bits });
    log(`SHA-256: "${short(text)}" → "${short(to)}" changed ${bits} of 256 hash bits.`, "ok");
  };

  const hashAgain = async () => {
    const h = await sha256Hex(text);
    setAgain(h === hash);
    log(`SHA-256: hashed "${short(text)}" again and got the ${h === hash ? "same" : "a different"} hash.`, h === hash ? "ok" : "bad");
  };

  const isTestVector = text === "abc" && hash.startsWith("ba7816bf");

  const row = useMemo<ObservationRow | null>(() => {
    if (!hash) return null;
    if (cmp)
      return {
        tool: "SHA-256",
        input: `"${short(cmp.from, 10)}" → "${short(cmp.to, 10)}"`,
        params: "No key",
        output: `${cmp.before.slice(0, 8)}… → ${cmp.after.slice(0, 8)}…`,
        check: `Avalanche ${cmp.bits}/256`,
        kind: "sha",
        bitsN: cmp.bits,
      };
    return {
      tool: "SHA-256",
      input: `"${short(text)}"`,
      params: "No key",
      output: `${hash.slice(0, 12)}…`,
      check: isTestVector ? "Matches test value" : again ? "Same hash again" : "64 hex digits",
      kind: "sha",
      bitsN: -1,
    };
  }, [hash, cmp, text, isTestVector, again]);
  useEffect(() => report(row), [row, report]);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <label className="grid min-w-0 gap-1">
        <span className="text-sm font-semibold text-ink">Text to hash</span>
        <input className={inputClass} value={text} maxLength={120} spellCheck={false} onChange={(e) => edit(e.target.value)} />
      </label>

      <Field label="SHA-256 hash" hint="64 hex digits = 256 bits">
        {hash ? <HexView hex={hash} /> : <p className="font-mono text-sm text-ink-3">Hashing…</p>}
      </Field>
      {isTestVector && (
        <Status ok>
          <strong>Matches the standard.</strong> The official SHA-256 test value for “abc” begins ba7816bf, and so does this one.
        </Status>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={changeOne} disabled={!hash} icon={<Shuffle size={16} aria-hidden />}>
          Change one character
        </Button>
        <Button onClick={hashAgain} disabled={!hash} icon={<Repeat size={16} aria-hidden />}>
          Hash it again
        </Button>
      </div>
      {again !== null && !cmp && (
        <Status ok={again}>
          {again ? (
            <>
              <strong>Same input, same hash.</strong> All 64 digits are identical, every time, on every device.
            </>
          ) : (
            "The hash changed, which should never happen."
          )}
        </Status>
      )}

      {cmp && (
        <div className="grid min-w-0 gap-3">
          <Field label={`After changing one character: "${short(cmp.to, 24)}"`}>
            <HexView hex={cmp.after} />
          </Field>
          <p className="text-ink" aria-live="polite">
            <strong className="font-mono text-lg tabular-nums">{cmp.bits}</strong> of 256 bits changed ({Math.round((cmp.bits / 256) * 100)} %). About half is what a good hash gives.
          </p>
        </div>
      )}

      <div className="grid min-w-0 gap-2">
        <p className="text-sm font-semibold text-ink-2">{cmp ? "Avalanche view: the 256 bits of the new hash" : "The 256 bits of the hash"}</p>
        {hash && <BitGrid before={cmp ? cmp.before : hash} after={cmp ? cmp.after : null} />}
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-3">
          <span className="flex items-center gap-1.5">
            <span className="size-3.5 rounded-sm border border-line-strong bg-surface" aria-hidden /> Bit kept
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3.5 rounded-sm bg-u3" aria-hidden /> Bit changed (filled, bold)
          </span>
        </p>
      </div>

      <Note>The same input always gives the same hash. You cannot work back from a hash to the input; you can only guess and compare.</Note>

      <Readouts
        items={[
          { label: "Input", value: textBytes(text).length, unit: "bytes" },
          { label: "Hash", value: 256, unit: "bits" },
          { label: "Bits changed", value: cmp ? `${cmp.bits}/256` : "–" },
          { label: "Share changed", value: cmp ? `${Math.round((cmp.bits / 256) * 100)} %` : "–", tone: cmp ? "ok" : "default" },
        ]}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. AES-GCM                                                          */
/* ------------------------------------------------------------------ */

type AesResult = { ok: true; text: string } | { ok: false; why: "tamper" | "key" | "both" };

const AES_WHY: Record<"tamper" | "key" | "both", ReactNode> = {
  tamper: (
    <>
      <strong>Refused: the data was changed.</strong> GCM works out the tag again from the ciphertext. One flipped bit gives a different tag, so nothing is released.
    </>
  ),
  key: (
    <>
      <strong>Refused: wrong key.</strong> The tag worked out with this key does not match the one sent, so no garbage plaintext comes out.
    </>
  ),
  both: (
    <>
      <strong>Refused.</strong> The ciphertext was changed and the key is wrong, so the tag cannot match.
    </>
  ),
};

function AesTool({ log, report }: ToolProps) {
  const [message, setMessage] = useState("unlock door 3");
  const [key, setKey] = useState<Bytes | null>(null);
  const [iv, setIv] = useState<Bytes | null>(null);
  const [sealed, setSealed] = useState<Sealed | null>(null);
  const [tampered, setTampered] = useState(false);
  const [wrongKey, setWrongKey] = useState<Bytes | null>(null);
  const [result, setResult] = useState<AesResult | null>(null);

  // Random numbers only in the browser, never while pre-rendering.
  useEffect(() => {
    setKey(randomBytes(16));
    setIv(randomBytes(AES_IV_BYTES));
  }, []);

  const clearRun = () => {
    setSealed(null);
    setTampered(false);
    setWrongKey(null);
    setResult(null);
  };

  const newKey = () => {
    setKey(randomBytes(16));
    setIv(randomBytes(AES_IV_BYTES));
    clearRun();
    log("AES: made a new random 128-bit key and 96-bit IV.");
  };

  const encrypt = async () => {
    if (!key || !iv) return;
    const s = await aesGcmEncrypt(key, iv, textBytes(message));
    setSealed(s);
    setTampered(false);
    setWrongKey(null);
    setResult(null);
    log(`AES: encrypted "${short(message)}" into ${s.ciphertext.length} bytes of ciphertext and a ${AES_TAG_BYTES}-byte tag.`);
  };

  const decrypt = async () => {
    if (!sealed || !key || !iv) return;
    const data = tampered ? { ...sealed, ciphertext: flipBit(sealed.ciphertext) } : sealed;
    try {
      const plain = bytesText(await aesGcmDecrypt(wrongKey ?? key, iv, data));
      setResult({ ok: true, text: plain });
      log(`AES: decrypted "${short(plain)}". The tag matched.`, "ok");
    } catch {
      const why = tampered && wrongKey ? "both" : tampered ? "tamper" : "key";
      setResult({ ok: false, why });
      log(`AES: decryption refused (${why === "key" ? "wrong key" : why === "tamper" ? "one bit changed" : "changed data and wrong key"}).`, "bad");
    }
  };

  const toggleTamper = () => {
    setTampered((t) => !t);
    setResult(null);
    log(tampered ? "AES: put the original ciphertext back." : "AES: an attacker flips one bit of the ciphertext on the way.", tampered ? "info" : "warn");
  };

  const toggleWrongKey = () => {
    setWrongKey(wrongKey ? null : randomBytes(16));
    setResult(null);
    log(wrongKey ? "AES: back to the right key." : "AES: trying to decrypt with a different random key.", wrongKey ? "info" : "warn");
  };

  const sent = sealed ? (tampered ? flipBit(sealed.ciphertext) : sealed.ciphertext) : null;

  const row = useMemo<ObservationRow | null>(() => {
    if (!sealed || !key) return null;
    const aes = result === null ? "enc" : result.ok ? "ok" : result.why;
    const usedKey = result && !result.ok && wrongKey ? wrongKey : key;
    return {
      tool: "AES-GCM",
      input: `"${short(message)}"`,
      params: `${usedKey === key ? "Key" : "Wrong key"} ${toHex(usedKey).slice(0, 6)}…`,
      output: `${toHex(sealed.ciphertext).slice(0, 12)}…`,
      check: aes === "enc" ? "Encrypted, tag made" : aes === "ok" ? "Decrypted OK" : aes === "key" ? "Wrong key refused" : "Tamper refused",
      kind: "aes",
      aes,
    };
  }, [sealed, key, wrongKey, message, result]);
  useEffect(() => report(row), [row, report]);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Key" hint="128 bits, random">
          {key ? <HexView hex={toHex(key)} /> : <p className="font-mono text-sm text-ink-3">Making a key…</p>}
        </Field>
        <Field label="IV (nonce)" hint="96 bits, random">
          {iv ? <HexView hex={toHex(iv)} /> : <p className="font-mono text-sm text-ink-3">…</p>}
        </Field>
      </div>
      <div>
        <Button size="sm" onClick={newKey} icon={<KeyRound size={14} aria-hidden />}>
          New key and IV
        </Button>
      </div>

      <label className="grid min-w-0 gap-1">
        <span className="text-sm font-semibold text-ink">Message (plaintext)</span>
        <input
          className={inputClass}
          value={message}
          maxLength={48}
          spellCheck={false}
          onChange={(e) => {
            setMessage(e.target.value);
            clearRun();
          }}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={encrypt} disabled={!key || !message} icon={<Lock size={16} aria-hidden />}>
          Encrypt
        </Button>
        <Button variant={sealed && !result ? "primary" : "secondary"} onClick={decrypt} disabled={!sealed} icon={<LockOpen size={16} aria-hidden />}>
          Decrypt
        </Button>
      </div>

      {sealed && sent && (
        <div className="grid min-w-0 gap-3">
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Ciphertext"
              hint={tampered ? `byte 1 changed: ${toHex(sealed.ciphertext.slice(0, 1))} → ${toHex(sent.slice(0, 1))}` : `${sealed.ciphertext.length} bytes, same length as the message`}
            >
              <HexView hex={toHex(sent)} changed={tampered ? 0 : undefined} />
            </Field>
            <Field label="Authentication tag" hint={`${AES_TAG_BYTES} bytes`}>
              <HexView hex={toHex(sealed.tag)} />
            </Field>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={toggleTamper} aria-pressed={tampered} icon={tampered ? <Undo2 size={14} aria-hidden /> : <Shuffle size={14} aria-hidden />}>
              {tampered ? "Undo the bit change" : "Change one bit of the ciphertext"}
            </Button>
            <Button size="sm" onClick={toggleWrongKey} aria-pressed={!!wrongKey} icon={wrongKey ? <Undo2 size={14} aria-hidden /> : <KeyRound size={14} aria-hidden />}>
              {wrongKey ? "Back to the right key" : "Use a different key"}
            </Button>
          </div>
          {wrongKey && (
            <Field label="Key used to decrypt" hint="not the key used to encrypt">
              <HexView hex={toHex(wrongKey)} />
            </Field>
          )}

          <div aria-live="polite">
            {result?.ok && (
              <Status ok>
                <strong>Decrypted: “{result.text}”.</strong> The tag matched, so the message is genuine and unchanged.
              </Status>
            )}
            {result && !result.ok && <Status ok={false}>{AES_WHY[result.why]}</Status>}
            {!result && <p className="text-sm text-ink-3">Press Decrypt to try to open the ciphertext.</p>}
          </div>
        </div>
      )}

      <Note>
        AES is symmetric: the same key locks and unlocks, so both sides must already share it. Never reuse an IV with the same key; real systems use a fresh IV for every message.
      </Note>

      <Readouts
        items={[
          { label: "Key", value: 128, unit: "bits" },
          { label: "IV", value: 96, unit: "bits" },
          { label: "Ciphertext", value: sealed ? sealed.ciphertext.length : "–", unit: sealed ? "bytes" : undefined },
          {
            label: "Last decrypt",
            value: result ? (result.ok ? "OK" : "Refused") : "–",
            tone: result ? (result.ok ? "ok" : "bad") : "default",
          },
        ]}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Toy RSA                                                          */
/* ------------------------------------------------------------------ */

interface RsaCalc {
  P: bigint | null;
  Q: bigint | null;
  E: bigint | null;
  primes: boolean;
  keys: RsaKeys | null;
  error: string | null;
}

const TYPE_NUMBERS = "Type a whole number in each box.";

/** Why p or q is not prime, e.g. "52 = 2 × 26." */
function notPrimeWhy(P: bigint, Q: bigint): string {
  const bad = !isPrime(P) ? P : !isPrime(Q) ? Q : null;
  if (bad === null) return "";
  if (bad < 2n) return `${bad} is not prime.`;
  for (let d = 2n; d * d <= bad; d++) if (bad % d === 0n) return `${bad} = ${d} × ${bad / d}.`;
  return "";
}

function WorkStep({ n, title, ok, children }: { n: number; title: string; ok?: boolean; children: ReactNode }) {
  return (
    <li className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] gap-2">
      <span className="flex size-7 items-center justify-center rounded-full border border-line-strong bg-surface-2 font-mono text-sm font-bold text-ink-2" aria-hidden>
        {n}
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 font-semibold text-ink">
          <span className="sr-only">Step {n}: </span>
          {title}
          {ok === true && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-ok">
              <CheckCircle2 size={14} aria-hidden /> OK
            </span>
          )}
          {ok === false && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-bad">
              <XCircle size={14} aria-hidden /> Problem
            </span>
          )}
        </p>
        <div className="font-mono text-sm text-ink-2 [overflow-wrap:anywhere]">{children}</div>
      </div>
    </li>
  );
}

function RsaTool({ log, report }: ToolProps) {
  const [p, setP] = useState("61");
  const [q, setQ] = useState("53");
  const [e, setE] = useState("17");
  const [m, setM] = useState("65");
  const [h, setH] = useState("123");
  const [forged, setForged] = useState(false);

  const calc = useMemo<RsaCalc>(() => {
    const P = parseNum(p);
    const Q = parseNum(q);
    const E = parseNum(e, 5);
    const primes = P !== null && Q !== null && isPrime(P) && isPrime(Q) && P !== Q;
    if (P === null || Q === null || E === null) return { P, Q, E, primes, keys: null, error: TYPE_NUMBERS };
    try {
      return { P, Q, E, primes, keys: rsaKeys(P, Q, E), error: null };
    } catch (err) {
      return { P, Q, E, primes, keys: null, error: errorText(err) };
    }
  }, [p, q, e]);
  const k = calc.keys;

  const enc = useMemo(() => {
    if (!k) return null;
    const M = parseNum(m, 8);
    if (M === null) return { error: "Type a whole number to encrypt." } as const;
    try {
      const c = rsaEncrypt(M, k);
      return { M, c, back: rsaDecrypt(c, k) } as const;
    } catch (err) {
      return { error: errorText(err) } as const;
    }
  }, [k, m]);

  const sig = useMemo(() => {
    if (!k) return null;
    const H = parseNum(h, 8);
    if (H === null) return { error: "Type a whole number to sign." } as const;
    try {
      const s = rsaSign(H, k);
      const H2 = H + 1n < k.n ? H + 1n : H - 1n;
      return { H, s, H2, check: rsaEncrypt(s, k), okOriginal: rsaVerify(H, s, k), okChanged: rsaVerify(H2, s, k) } as const;
    } catch (err) {
      return { error: errorText(err) } as const;
    }
  }, [k, h]);

  useLogChange(k ? `RSA: key made with p = ${k.p}, q = ${k.q}, e = ${k.e}: n = ${k.n}, d = ${k.d}.` : `RSA: ${calc.error}`, k ? "ok" : "warn", log);

  const toggleForge = () => {
    if (!sig || "error" in sig) return;
    setForged(!forged);
    log(forged ? `RSA: back to the signed message ${sig.H}.` : `RSA: the message is changed to ${sig.H2}, but the old signature is kept. Verify fails.`, forged ? "info" : "warn");
  };

  const row = useMemo<ObservationRow | null>(() => {
    if (!k || !enc || "error" in enc) return null;
    const sigOk = sig && !("error" in sig);
    return {
      tool: "Toy RSA",
      input: `m = ${enc.M}`,
      params: `p ${k.p}, q ${k.q}, e ${k.e}`,
      output: `c ${enc.c}, d ${k.d}`,
      check: `${enc.M} → ${enc.c} → ${enc.back}${sigOk ? (forged ? ", changed msg refused" : ", signature OK") : ""}`,
      kind: "rsa",
      pN: String(k.p),
      qN: String(k.q),
      eN: String(k.e),
      nN: String(k.n),
      dN: String(k.d),
      mN: String(enc.M),
      cN: String(enc.c),
      backN: String(enc.back),
      sig: sigOk ? (forged ? "refused" : "ok") : "none",
    };
  }, [k, enc, sig, forged]);
  useEffect(() => report(row), [row, report]);

  const { P, Q, E } = calc;
  const n = P !== null && Q !== null ? P * Q : null;
  const phi = P !== null && Q !== null ? (P - 1n) * (Q - 1n) : null;
  const eStepOk = !!k;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <div className="grid min-w-0 grid-cols-3 gap-3">
        <NumberBox label="Prime p" value={p} onChange={setP} />
        <NumberBox label="Prime q" value={q} onChange={setQ} />
        <NumberBox label="Public e" value={e} onChange={setE} digits={5} />
      </div>
      <p className="text-sm text-ink-3">Try p = 52 (not prime) or e = 3 (shares a factor with φ) to see the checks fail.</p>

      <ol className="grid min-w-0 gap-3 rounded-md border border-line bg-surface p-3" aria-label="Key generation, step by step">
        <WorkStep n={1} title="Pick two different primes p and q" ok={P !== null && Q !== null ? calc.primes : false}>
          {P === null || Q === null ? (
            <span className="font-sans text-bad">Type p and q.</span>
          ) : calc.primes ? (
            `${P} and ${Q} are both prime.`
          ) : (
            <span className="font-sans text-bad">
              {calc.error && calc.error !== TYPE_NUMBERS ? calc.error : P === Q ? "p and q must be different primes." : "p and q must both be prime."} {notPrimeWhy(P, Q)}
            </span>
          )}
        </WorkStep>
        {calc.primes && n !== null && phi !== null && (
          <>
            <WorkStep n={2} title="n = p × q">
              n = {String(P)} × {String(Q)} = <strong className="text-ink">{String(n)}</strong>
            </WorkStep>
            <WorkStep n={3} title="φ(n) = (p − 1) × (q − 1)">
              φ(n) = {String(P! - 1n)} × {String(Q! - 1n)} = <strong className="text-ink">{String(phi)}</strong>
            </WorkStep>
            <WorkStep n={4} title="Check that gcd(e, φ(n)) = 1" ok={eStepOk}>
              {E === null ? (
                <span className="font-sans text-bad">Type e.</span>
              ) : (
                <>
                  gcd({String(E)}, {String(phi)}) = {String(gcd(E, phi))}
                  {eStepOk ? ": e shares no factor with φ(n)." : <span className="block font-sans text-bad">{calc.error}</span>}
                </>
              )}
            </WorkStep>
            {k && (
              <WorkStep n={5} title="d = e⁻¹ mod φ(n)">
                d = <strong className="text-ink">{String(k.d)}</strong>, because {String(k.e)} × {String(k.d)} = {String(k.e * k.d)} = {String((k.e * k.d) / k.phi)} × {String(k.phi)} + 1
              </WorkStep>
            )}
          </>
        )}
      </ol>

      {k && (
        <>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Public key (e, n)" hint="share it with anyone">
              <p className="font-mono text-ink">
                ({String(k.e)}, {String(k.n)})
              </p>
            </Field>
            <Field label="Private key (d, n)" hint="keep it secret">
              <p className="flex items-center gap-1.5 font-mono text-ink">
                <Lock size={14} aria-hidden className="text-ink-3" /> ({String(k.d)}, {String(k.n)})
              </p>
            </Field>
          </div>

          <section className="grid min-w-0 gap-3 rounded-md border border-line p-3" aria-label="Encrypt and decrypt">
            <h4 className="font-bold text-ink">Encrypt and decrypt a number</h4>
            <div className="max-w-[14rem]">
              <NumberBox label={`Message m (below ${k.n})`} value={m} onChange={setM} digits={8} />
            </div>
            {enc && "error" in enc ? (
              <Status ok={false}>{enc.error}</Status>
            ) : (
              enc && (
                <div className="grid min-w-0 gap-1.5 font-mono text-sm text-ink-2 [overflow-wrap:anywhere]">
                  <p>
                    <span className="font-sans font-semibold text-ink">Encrypt with the public key: </span>c = m<sup>e</sup> mod n = <Pow b={enc.M} e={k.e} /> mod {String(k.n)} ={" "}
                    <strong className="text-ink">{String(enc.c)}</strong>
                  </p>
                  <p>
                    <span className="font-sans font-semibold text-ink">Decrypt with the private key: </span>m = c<sup>d</sup> mod n = <Pow b={enc.c} e={k.d} /> mod {String(k.n)} ={" "}
                    <strong className="text-ink">{String(enc.back)}</strong>
                  </p>
                  <Status ok={enc.back === enc.M}>
                    <span className="font-sans">
                      {String(enc.M)} → {String(enc.c)} → {String(enc.back)}: {enc.back === enc.M ? "back to the original number." : "the round trip failed."}
                    </span>
                  </Status>
                </div>
              )
            )}
          </section>

          <section className="grid min-w-0 gap-3 rounded-md border border-line p-3" aria-label="Sign and verify">
            <h4 className="font-bold text-ink">Sign and verify</h4>
            <div className="max-w-[14rem]">
              <NumberBox
                label="Number to sign"
                value={h}
                onChange={(v) => {
                  setH(v);
                  setForged(false);
                }}
                digits={8}
                hint="Stands for the hash of a message."
              />
            </div>
            {sig && "error" in sig ? (
              <Status ok={false}>{sig.error}</Status>
            ) : (
              sig && (
                <div className="grid min-w-0 gap-1.5 font-mono text-sm text-ink-2 [overflow-wrap:anywhere]">
                  <p>
                    <span className="font-sans font-semibold text-ink">Sign with the private key: </span>s = <Pow b={sig.H} e={k.d} /> mod {String(k.n)} ={" "}
                    <strong className="text-ink">{String(sig.s)}</strong>
                  </p>
                  <p>
                    <span className="font-sans font-semibold text-ink">Anyone verifies with the public key: </span>
                    <Pow b={sig.s} e={k.e} /> mod {String(k.n)} = {String(sig.check)}
                    {forged ? ` ≠ ${sig.H2}` : ` = ${sig.H}`}
                  </p>
                  <div aria-live="polite">
                    {forged ? (
                      <Status ok={false}>
                        <span className="font-sans">
                          <strong>Refused.</strong> The message was changed to {String(sig.H2)}, so the signature no longer fits. Only the owner of d could sign the new message.
                        </span>
                      </Status>
                    ) : (
                      <Status ok={sig.okOriginal}>
                        <span className="font-sans">
                          <strong>Signature verified.</strong> It was made with d, and it matches message {String(sig.H)}.
                        </span>
                      </Status>
                    )}
                  </div>
                  <div className="font-sans">
                    <Button size="sm" onClick={toggleForge} aria-pressed={forged} icon={forged ? <Undo2 size={14} aria-hidden /> : <Shuffle size={14} aria-hidden />}>
                      {forged ? `Back to ${sig.H}` : `Change the message to ${sig.H2}`}
                    </Button>
                  </div>
                </div>
              )
            )}
          </section>
        </>
      )}

      <Note>
        Real RSA uses primes hundreds of digits long: n has 2048 bits, about 617 digits. Here n is tiny, so anyone could split {n !== null ? String(n) : "n"} into p × q and find d.
      </Note>

      <Readouts
        items={[
          { label: "n", value: k ? String(k.n) : "–" },
          { label: "φ(n)", value: k ? String(k.phi) : "–" },
          { label: "Private d", value: k ? String(k.d) : "–" },
          { label: "Size of n", value: k ? k.n.toString(2).length : "–", unit: "bits", hint: "Real RSA keys use 2048 bits or more." },
        ]}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Toy Diffie–Hellman                                               */
/* ------------------------------------------------------------------ */

interface DhCalc {
  P: bigint;
  G: bigint;
  a: bigint;
  b: bigint;
  run: DhRun;
}

function PartyCard({ name, role, icon, children }: { name: string; role: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="grid min-w-0 content-start gap-2 rounded-md border border-line bg-surface p-3" aria-label={name}>
      <h4 className="flex items-center gap-1.5 font-bold text-ink">
        {icon}
        {name} <span className="text-sm font-normal text-ink-3">{role}</span>
      </h4>
      <div className="grid min-w-0 gap-1.5 text-sm text-ink-2">{children}</div>
    </section>
  );
}

const Mono = ({ children }: { children: ReactNode }) => <span className="font-mono text-ink [overflow-wrap:anywhere]">{children}</span>;
/** A worked calculation on its own line, so it does not break in the middle of "mod 23". */
const Calc = ({ children }: { children: ReactNode }) => <span className="block font-mono text-ink [overflow-wrap:anywhere]">{children}</span>;

function DhTool({ log, report }: ToolProps) {
  const [p, setP] = useState("23");
  const [g, setG] = useState("5");
  const [a, setA] = useState("6");
  const [b, setB] = useState("15");
  const [eve, setEve] = useState<{ tries: number; found: bigint; secret: bigint } | null>(null);

  const calc = useMemo<{ ok: DhCalc | null; error: string | null }>(() => {
    const P = parseNum(p);
    const G = parseNum(g);
    const A = parseNum(a);
    const B = parseNum(b);
    if (P === null || G === null || A === null || B === null) return { ok: null, error: "Type a whole number in each box." };
    try {
      return { ok: { P, G, a: A, b: B, run: diffieHellman(P, G, A, B) }, error: null };
    } catch (err) {
      return { ok: null, error: errorText(err) };
    }
  }, [p, g, a, b]);
  const c = calc.ok;

  const edit = (set: (v: string) => void) => (v: string) => {
    set(v);
    setEve(null);
  };

  useLogChange(
    c ? `DH: p = ${c.P}, g = ${c.G}: Alice sends ${c.run.A}, Bob sends ${c.run.B}; both get ${c.run.aliceSecret}.` : `DH: ${calc.error}`,
    c ? "ok" : "warn",
    log,
  );

  const eveTry = () => {
    if (!c) return;
    // Eve tries every possible secret x until g^x mod p equals Alice's public value A.
    let value = 1n;
    for (let x = 1n; x < c.P; x++) {
      value = (value * c.G) % c.P;
      if (value === c.run.A) {
        const secret = modPow(c.run.B, x, c.P);
        setEve({ tries: Number(x), found: x, secret });
        log(`DH: Eve tried ${x} secret${x === 1n ? "" : "s"} and found ${x}, which gives her the shared secret ${secret}.`, "bad");
        return;
      }
    }
  };

  const same = c ? c.run.aliceSecret === c.run.bobSecret : false;

  const row = useMemo<ObservationRow | null>(() => {
    if (!c) return null;
    return {
      tool: "Toy DH",
      input: `a ${c.a}, b ${c.b}`,
      params: `p ${c.P}, g ${c.G}`,
      output: `A ${c.run.A}, B ${c.run.B}`,
      check: `${same ? `Both get ${c.run.aliceSecret}` : "Secrets differ"}${eve ? `; Eve cracks it in ${eve.tries} tries` : ""}`,
      kind: "dh",
      pN: String(c.P),
      gN: String(c.G),
      AN: String(c.run.A),
      BN: String(c.run.B),
      sN: same ? String(c.run.aliceSecret) : "",
      eveTries: eve ? eve.tries : 0,
    };
  }, [c, same, eve]);
  useEffect(() => report(row), [row, report]);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
        <NumberBox label="Public prime p" value={p} onChange={edit(setP)} />
        <NumberBox label="Public base g" value={g} onChange={edit(setG)} />
        <NumberBox label="Alice's secret a" value={a} onChange={edit(setA)} />
        <NumberBox label="Bob's secret b" value={b} onChange={edit(setB)} />
      </div>

      {!c && <Status ok={false}>{calc.error}</Status>}

      {c && (
        <>
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
            <PartyCard name="Alice" role="(sensor)" icon={<User size={16} aria-hidden className="text-u3" />}>
              <p className="flex flex-wrap items-center gap-1">
                <Lock size={14} aria-hidden className="text-ink-3" /> Secret a = <Mono>{String(c.a)}</Mono> <span className="text-ink-3">(never sent)</span>
              </p>
              <p>
                Sends A = g<sup>a</sup> mod p<Calc>= <Pow b={c.G} e={c.a} /> mod {String(c.P)} = <strong>{String(c.run.A)}</strong></Calc>
              </p>
              <p>
                Gets B = <Mono>{String(c.run.B)}</Mono> from Bob
              </p>
              <p>
                Secret = B<sup>a</sup> mod p<Calc>= <Pow b={c.run.B} e={c.a} /> mod {String(c.P)} = <strong>{String(c.run.aliceSecret)}</strong></Calc>
              </p>
            </PartyCard>

            <PartyCard name="Network" role="(Eve sees this)" icon={<Eye size={16} aria-hidden className="text-warn" />}>
              <p>
                Public: p = <Mono>{String(c.P)}</Mono>, g = <Mono>{String(c.G)}</Mono>
              </p>
              <p>
                A = <Mono>{String(c.run.A)}</Mono> (from Alice)
              </p>
              <p>
                B = <Mono>{String(c.run.B)}</Mono> (from Bob)
              </p>
              <p className="text-ink-3">Not seen: a, b or the shared secret.</p>
              <div>
                <Button size="sm" onClick={eveTry} disabled={!!eve} icon={<Search size={14} aria-hidden />}>
                  Let Eve try every secret
                </Button>
              </div>
            </PartyCard>

            <PartyCard name="Bob" role="(gateway)" icon={<User size={16} aria-hidden className="text-u2" />}>
              <p className="flex flex-wrap items-center gap-1">
                <Lock size={14} aria-hidden className="text-ink-3" /> Secret b = <Mono>{String(c.b)}</Mono> <span className="text-ink-3">(never sent)</span>
              </p>
              <p>
                Sends B = g<sup>b</sup> mod p<Calc>= <Pow b={c.G} e={c.b} /> mod {String(c.P)} = <strong>{String(c.run.B)}</strong></Calc>
              </p>
              <p>
                Gets A = <Mono>{String(c.run.A)}</Mono> from Alice
              </p>
              <p>
                Secret = A<sup>b</sup> mod p<Calc>= <Pow b={c.run.A} e={c.b} /> mod {String(c.P)} = <strong>{String(c.run.bobSecret)}</strong></Calc>
              </p>
            </PartyCard>
          </div>

          <div aria-live="polite" className="grid min-w-0 gap-2">
            <Status ok={same}>
              {same ? (
                <>
                  <strong>Both get {String(c.run.aliceSecret)}.</strong> The shared secret itself never crossed the network.
                </>
              ) : (
                "The two secrets differ."
              )}
            </Status>
            {eve && (
              <Status ok={false}>
                <strong>Eve cracked the toy.</strong> She tried {eve.tries} secret{eve.tries === 1 ? "" : "s"} and found x = {String(eve.found)}, because{" "}
                <span className="font-mono">
                  <Pow b={c.G} e={eve.found} /> mod {String(c.P)} = {String(c.run.A)}
                </span>
                . Then <span className="font-mono"><Pow b={c.run.B} e={eve.found} /> mod {String(c.P)} = {String(eve.secret)}</span>, the secret.
              </Status>
            )}
          </div>
        </>
      )}

      <Note>
        With p = {c ? String(c.P) : "23"}, Eve can simply try every secret. Real systems use a 2048-bit p, or elliptic curves (X25519 in TLS 1.3), so this search would take far too long.
      </Note>

      <Readouts
        items={[
          { label: "Alice sends A", value: c ? String(c.run.A) : "–" },
          { label: "Bob sends B", value: c ? String(c.run.B) : "–" },
          { label: "Shared secret", value: c && same ? String(c.run.aliceSecret) : "–", tone: c && same ? "ok" : "default" },
          { label: "Eve's tries", value: eve ? eve.tries : "–", tone: eve ? "bad" : "default", hint: "How many secrets Eve tried before she found one that works" },
        ]}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Result summary                                                      */
/* ------------------------------------------------------------------ */

function summarise(rows: ObservationRow[]): string {
  const parts: string[] = [];
  const sha = rows.find((r) => r.kind === "sha" && Number(r.bitsN) >= 0);
  if (sha) parts.push(`Changing one character of the input changed ${sha.bitsN} of the 256 bits of the SHA-256 hash, about half: the avalanche effect.`);

  const aesOk = rows.some((r) => r.kind === "aes" && r.aes === "ok");
  const aesTamper = rows.some((r) => r.kind === "aes" && (r.aes === "tamper" || r.aes === "both"));
  const aesKey = rows.some((r) => r.kind === "aes" && r.aes === "key");
  const aesParts = [aesOk && "decrypted the message with the right key", aesTamper && "refused a ciphertext with one bit changed", aesKey && "refused a wrong key"].filter(
    (x): x is string => !!x,
  );
  if (aesParts.length) parts.push(`AES-GCM ${list(aesParts)}${aesTamper || aesKey ? ", because the 16-byte tag did not match" : ""}.`);

  const rsa = rows.find((r) => r.kind === "rsa");
  if (rsa) {
    parts.push(`Toy RSA with p = ${rsa.pN}, q = ${rsa.qN} and e = ${rsa.eN} gave n = ${rsa.nN} and d = ${rsa.dN}; ${rsa.mN} encrypted to ${rsa.cN} and decrypted back to ${rsa.backN}.`);
  }
  if (rows.some((r) => r.kind === "rsa" && r.sig === "refused")) parts.push("An RSA signature checked against a changed message failed, so the change was caught.");

  const dh = rows.find((r) => r.kind === "dh" && r.sN !== "");
  if (dh) parts.push(`In Diffie–Hellman with p = ${dh.pN} and g = ${dh.gN}, both sides got the secret ${dh.sN}, while an eavesdropper saw only p, g, A = ${dh.AN} and B = ${dh.BN}.`);
  const eve = rows.find((r) => r.kind === "dh" && Number(r.eveTries) > 0);
  if (eve) parts.push(`With such a small p, Eve found a working secret in ${eve.eveTries} tries, which is why real keys are huge.`);

  if (parts.length < 2) return "";
  parts.push("AES protects the data with one shared key, while RSA and Diffie–Hellman solve how to share and trust keys.");
  return parts.join(" ");
}

/* ------------------------------------------------------------------ */

export default function CryptoWorkbenchLab() {
  const [tool, setTool] = useState<Tool>("sha");
  const [ready, setReady] = useState<Record<Tool, ObservationRow | null>>({ sha: null, aes: null, rsa: null, dh: null });
  const [events, setEvents] = useState<SimEvent[]>([]);
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");
  const started = useRef(0);
  const eventId = useRef(0);

  useEffect(() => {
    started.current = Date.now();
  }, []);

  const log = useCallback<Log>((text, tone = "info") => {
    setEvents((list) => [...list, { id: eventId.current++, t: Date.now() - started.current, text, tone }]);
  }, []);

  const reports = useMemo(() => {
    const make = (t: Tool): Report => (row) => setReady((r) => (r[t] === row ? r : { ...r, [t]: row }));
    return { sha: make("sha"), aes: make("aes"), rsa: make("rsa"), dh: make("dh") };
  }, []);

  const record = () => {
    const row = ready[tool];
    if (!row) return;
    addRow(row);
    const auto = summarise([...rows, row]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  const info = TOOLS[tool];

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordDisabled={!ready[tool]}
      recordHint={ready[tool] ? `Adds what the ${info.label} tool shows now to the observation table.` : info.notReady}
      controls={
        <>
          <Segmented<Tool> label="Tool" value={tool} onChange={setTool} options={TOOL_ORDER.map((t) => ({ value: t, label: TOOLS[t].label }))} />
          <div className="grid gap-1.5">
            <p className="text-sm font-semibold text-u3">{info.kind}</p>
            <p className="text-sm text-ink-2">{info.text}</p>
          </div>
          <p className="text-sm text-ink-3">
            SHA-256 and AES-GCM are real, from your browser's Web Crypto. RSA and Diffie–Hellman use tiny numbers so you can check every step by hand.
          </p>
        </>
      }
      stage={
        <div className="p-3 sm:p-4">
          <h3 className="mb-3 font-bold text-ink">{tool === "dh" ? "Toy Diffie–Hellman" : info.label}</h3>
          <div hidden={tool !== "sha"}>
            <ShaTool log={log} report={reports.sha} />
          </div>
          <div hidden={tool !== "aes"}>
            <AesTool log={log} report={reports.aes} />
          </div>
          <div hidden={tool !== "rsa"}>
            <RsaTool log={log} report={reports.rsa} />
          </div>
          <div hidden={tool !== "dh"}>
            <DhTool log={log} report={reports.dh} />
          </div>
        </div>
      }
      log={<EventLog events={events} title="Workbench log" emptyText="Nothing yet. Pick a tool and try it." height={170} />}
    />
  );
}
