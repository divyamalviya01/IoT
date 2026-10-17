import { motion, useReducedMotion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { Slider } from "~/components/ui/Slider";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import {
  CODES,
  OPTION,
  codeText,
  encode,
  exchange,
  notificationsFor,
  uintBytes,
  uriPath,
  type CoapMessage,
  type CoapOption,
  type Code,
  type ExchangeResult,
  type MsgType,
} from "./engine";

const lab = getLab("l08-coap")!;
const BATCH = 100;

const steps = [
  "Keep Confirmable (CON) and 0% loss, and press Send request. The ACK comes back long before the timeout runs out.",
  "Raise the loss to 40% and press Send request several times. Watch lost messages being resent, with the wait doubling each time.",
  "Choose Non-confirmable (NON) and send again: a lost NON message is never resent.",
  "Compare the results of 100 requests for CON and NON. Press Record observation at 0%, 20% and 40% loss.",
  "Build messages in the header inspector below and compare their size with the same request in HTTP.",
  "In the Observe section, compare polling with Observe for a steady room and a changing room.",
];

type ReqType = "CON" | "NON";
const TYPE_LABEL: Record<ReqType, string> = { CON: "Confirmable (CON)", NON: "Non-confirmable (NON)" };

interface BatchStats {
  success: number;
  avgTimeMs: number;
  avgTries: number;
  avgBytes: number;
}

function batch(type: ReqType, lossPct: number, delayMs: number): BatchStats {
  let success = 0;
  let time = 0;
  let tries = 0;
  let bytes = 0;
  for (let seed = 1; seed <= BATCH; seed++) {
    const r = exchange({ type, lossPct, delayMs, seed });
    if (r.success) {
      success++;
      time += r.timeMs;
    }
    tries += r.requestsSent;
    bytes += r.bytesSent;
  }
  return { success, avgTimeMs: success ? time / success : 0, avgTries: tries / BATCH, avgBytes: bytes / BATCH };
}

const fmtTime = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(ms >= 10_000 ? 0 : 1)} s` : `${Math.round(ms)} ms`);

function summarise(rows: ObservationRow[]): string {
  const runs: { con: ObservationRow; non: ObservationRow }[] = [];
  for (let i = 0; i + 1 < rows.length; i++) {
    if (rows[i].type === "CON" && rows[i + 1].type === "NON") runs.push({ con: rows[i], non: rows[i + 1] });
  }
  if (!runs.length) return "";
  const byLoss = new Map<number, (typeof runs)[number]>();
  for (const r of runs) byLoss.set(Number(r.con.loss), r);
  const sorted = [...byLoss.entries()].sort((a, b) => a[0] - b[0]);
  const sentences = sorted.map(
    ([loss, { con, non }]) =>
      `At ${loss}% loss, CON got an answer for ${con.success} of ${BATCH} requests (${con.tries} tries on average, ${con.time} on average), while NON got ${non.success}.`,
  );
  const lossy = sorted.filter(([loss]) => loss > 0).map(([, r]) => r);
  if (lossy.length && lossy.every((r) => Number(r.con.success) > Number(r.non.success))) {
    sentences.push(
      "On a lossy link, confirmable messages were far more reliable because the client resends until it gets an ACK, waiting twice as long before each new try. Non-confirmable messages were never resent, so they used fewer bytes but lost more requests.",
    );
  }
  return sentences.join(" ");
}

export default function CoapLab() {
  const [type, setType] = useState<ReqType>("CON");
  const [loss, setLoss] = useState(0);
  const [delay, setDelay] = useState(50);
  const [seed, setSeed] = useState(0);
  const run = useMemo(() => (seed ? exchange({ type, lossPct: loss, delayMs: delay, seed }) : null), [type, loss, delay, seed]);
  const stats = useMemo(() => ({ CON: batch("CON", loss, delay), NON: batch("NON", loss, delay) }), [loss, delay]);
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");

  const changeSetting = (fn: () => void) => {
    fn();
    // A new setting clears the old timeline.
    setSeed(0);
  };

  const record = () => {
    const made = (["CON", "NON"] as ReqType[]).map(
      (t): ObservationRow => ({
        loss,
        delay,
        type: t,
        success: stats[t].success,
        time: stats[t].success ? fmtTime(stats[t].avgTimeMs) : "—",
        tries: stats[t].avgTries.toFixed(2),
        bytes: Math.round(stats[t].avgBytes),
      }),
    );
    made.forEach(addRow);
    const auto = summarise([...rows, ...made]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordHint={`Adds one row for CON and one for NON, each from ${BATCH} requests at the current loss and delay.`}
      controls={
        <>
          <Segmented<ReqType>
            label="Message type"
            value={type}
            onChange={(v) => changeSetting(() => setType(v))}
            options={[
              { value: "CON", label: "CON" },
              { value: "NON", label: "NON" },
            ]}
          />
          <p className="-mt-3 text-sm text-ink-3">
            {type === "CON"
              ? "Confirmable: the server must reply with an ACK, and the client resends until it gets one."
              : "Non-confirmable: sent once, no ACK, never resent."}
          </p>
          <Slider label="Packet loss" value={loss} min={0} max={60} step={5} unit="%" onChange={(v) => changeSetting(() => setLoss(v))} />
          <Slider label="One-way delay" value={delay} min={20} max={500} step={10} unit="ms" onChange={(v) => changeSetting(() => setDelay(v))} />
          <Button variant="primary" onClick={() => setSeed((s) => s + 1)}>
            Send request
          </Button>
          <p className="text-sm text-ink-3">
            The client sends GET /temp. Timing follows the CoAP standard: the first wait is 2 to 3 seconds, then it doubles, with at most 4 resends.
          </p>
        </>
      }
      stage={<Timeline run={run} type={type} delay={delay} />}
      readouts={
        <>
          <Readouts
            items={[
              { label: "This request", value: run ? (run.success ? "Answered" : "Failed") : "—", tone: run ? (run.success ? "ok" : "bad") : "default" },
              { label: "Times sent", value: run ? run.requestsSent : "—" },
              { label: run?.success === false ? "Gave up after" : "Answer after", value: run ? fmtTime(run.timeMs) : "—" },
              { label: "Bytes sent", value: run ? run.bytesSent : "—" },
            ]}
          />
          <div className="relative overflow-x-auto rounded-lg border border-line">
            <table className="w-full border-collapse text-[0.95rem]">
              <caption className="border-b border-line px-3 py-2 text-left font-bold">
                {BATCH} requests at {loss}% loss and {delay} ms delay
              </caption>
              <thead className="bg-surface-2">
                <tr>
                  {["Type", "Answered", "Average tries", "Average time to answer", "Average bytes"].map((h) => (
                    <th key={h} scope="col" className="border-b border-line-strong px-3 py-2 text-left font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["CON", "NON"] as ReqType[]).map((t) => (
                  <tr key={t} className={cn("border-b border-line last:border-b-0", t === type && "bg-brand-soft")}>
                    <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-semibold">
                      {TYPE_LABEL[t]}
                    </th>
                    <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums">
                      {stats[t].success} / {BATCH}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums">{stats[t].avgTries.toFixed(2)}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums">{stats[t].success ? fmtTime(stats[t].avgTimeMs) : "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums">{Math.round(stats[t].avgBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      }
      log={
        <>
          <HeaderInspector />
          <ObserveDemo />
        </>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Timeline of one exchange                                            */
/* ------------------------------------------------------------------ */

const TICK_STEPS = [50, 100, 200, 500, 1000, 2000, 5000, 10_000, 20_000];

function Timeline({ run, type, delay }: { run: ExchangeResult | null; type: ReqType; delay: number }) {
  const reduced = useReducedMotion() ?? false;
  if (!run) {
    return (
      <div className="grid h-64 place-items-center p-4 text-center text-ink-3">
        <p>Press Send request to send GET /temp and see what happens over time.</p>
      </div>
    );
  }

  const firstTimeout = run.transmissions[0].timeout ?? 0;
  const lastT = Math.max(...run.transmissions.map((t) => t.t + delay));
  const span = Math.max(run.timeMs, lastT, type === "CON" ? firstTimeout : 4 * delay) * 1.06;
  // A left gutter keeps the lane names clear of the timeline.
  const G = 13;
  const x = (t: number) => G + (t / span) * (100 - G);
  const tickStep = TICK_STEPS.find((s) => span / s <= 6) ?? 20_000;
  const ticks = Array.from({ length: Math.floor(span / tickStep) + 1 }, (_, i) => i * tickStep);
  const LANE_C = 32;
  const LANE_S = 68;
  const WAIT_Y = LANE_C - 11;

  const requests = run.transmissions.filter((t) => t.kind === "request");
  const describe = run.success
    ? `Answered after ${fmtTime(run.timeMs)}${run.requestsSent > 1 ? `, on try ${run.requestsSent}` : ""}.`
    : type === "NON"
      ? "The message was lost and NON never resends, so the client got nothing."
      : `Every try failed, so the client gave up after ${fmtTime(run.timeMs)}.`;

  return (
    <div className="grid grid-cols-1 gap-2 p-3 sm:p-4">
      <div className="relative h-64" role="img" aria-label={`Timeline of a ${type} request. ${describe}`}>
        <span className="absolute left-0 -translate-y-1/2 text-xs font-semibold text-ink-2" style={{ top: `${LANE_C}%` }}>
          Client
        </span>
        <span className="absolute left-0 -translate-y-1/2 text-xs font-semibold text-ink-2" style={{ top: `${LANE_S}%` }}>
          Server
        </span>
        <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <line x1={G} x2={100} y1={LANE_C} y2={LANE_C} stroke="var(--line-strong)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <line x1={G} x2={100} y1={LANE_S} y2={LANE_S} stroke="var(--line-strong)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          {ticks.map((t) => (
            <line key={t} x1={x(t)} x2={x(t)} y1={LANE_S + 12} y2={LANE_S + 15} stroke="var(--line-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          {run.transmissions.map((tr, i) => {
            const up = tr.kind === "request";
            const x1 = x(tr.t);
            const x2 = x(tr.t + delay);
            const y1 = up ? LANE_C : LANE_S;
            const y2 = up ? LANE_S : LANE_C;
            const end = tr.lost ? { x: (x1 + x2) / 2, y: (y1 + y2) / 2 } : { x: x2, y: y2 };
            return (
              <motion.line
                key={`${run.timeMs}-${i}`}
                x1={x1}
                y1={y1}
                x2={end.x}
                y2={end.y}
                stroke={tr.lost ? "var(--bad)" : up ? "var(--brand)" : "var(--u2)"}
                strokeWidth={2.5}
                vectorEffect="non-scaling-stroke"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduced ? 0 : i * 0.35 }}
              />
            );
          })}
          {type === "CON" &&
            requests.map((tr, i) =>
              tr.timeout ? (
                <motion.g
                  key={`to-${run.timeMs}-${i}`}
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 0.9 }}
                  transition={{ delay: reduced ? 0 : i * 0.35 }}
                >
                  <line
                    x1={x(tr.t)}
                    x2={Math.min(100, x(tr.t + tr.timeout))}
                    y1={WAIT_Y}
                    y2={WAIT_Y}
                    stroke="var(--warn)"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* Start of each wait, so back-to-back waits read as separate */}
                  <line x1={x(tr.t)} x2={x(tr.t)} y1={WAIT_Y - 3} y2={WAIT_Y + 3} stroke="var(--warn)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                </motion.g>
              ) : null,
            )}
        </svg>

        {/* Markers and labels in HTML so text is never stretched */}
        {run.transmissions.map((tr, i) => {
          const up = tr.kind === "request";
          const lostX = x(tr.t + delay / 2);
          return tr.lost ? (
            <motion.span
              key={`x-${run.timeMs}-${i}`}
              className="absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-bad-soft text-xs font-bold text-bad"
              style={{ left: `${lostX}%`, top: `${(LANE_C + LANE_S) / 2}%` }}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduced ? 0 : i * 0.35 + 0.15 }}
              aria-hidden
            >
              ✕
            </motion.span>
          ) : (
            <motion.span
              key={`l-${run.timeMs}-${i}`}
              className={cn(
                "absolute -translate-x-1/2 whitespace-nowrap rounded bg-surface px-1 font-mono text-[0.7rem]",
                up ? "text-brand" : "text-u2",
              )}
              style={{ left: `${x(tr.t + delay)}%`, top: `${up ? LANE_S + 4 : LANE_C - 5}%`, transform: "translateX(-50%) translateY(-50%)" }}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduced ? 0 : i * 0.35 + 0.15 }}
              aria-hidden
            >
              {up ? "GET" : type === "CON" ? "ACK 2.05" : "2.05"}
            </motion.span>
          );
        })}
        {type === "CON" &&
          requests.map((tr, i) =>
            tr.timeout && Math.min(100, x(tr.t + tr.timeout)) - x(tr.t) >= 10 ? (
              <span
                key={`tl-${run.timeMs}-${i}`}
                className="absolute -translate-x-1/2 -translate-y-full whitespace-nowrap text-[0.7rem] text-warn"
                style={{ left: `${x(tr.t + Math.min(tr.timeout, span - tr.t) / 2)}%`, top: `${WAIT_Y - 1}%` }}
                aria-hidden
              >
                wait {fmtTime(tr.timeout)}
              </span>
            ) : null,
          )}
        {ticks.map((t) => (
          <span
            key={`tick-${t}`}
            className="absolute -translate-x-1/2 text-[0.7rem] tabular-nums text-ink-3"
            style={{ left: `${x(t)}%`, top: `${LANE_S + 16}%` }}
            aria-hidden
          >
            {fmtTime(t)}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-3" aria-hidden>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-brand" /> request
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-u2" /> response
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-bad" /> lost
        </span>
        {type === "CON" && (
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t border-dashed border-warn" /> client waits for the ACK
          </span>
        )}
      </div>
      <p className="text-sm text-ink-2" aria-live="polite">
        {describe}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header inspector                                                    */
/* ------------------------------------------------------------------ */

const CODE_CHOICES: { label: string; code: Code }[] = [
  { label: "0.01 GET", code: CODES.GET },
  { label: "0.02 POST", code: CODES.POST },
  { label: "0.03 PUT", code: CODES.PUT },
  { label: "0.04 DELETE", code: CODES.DELETE },
  { label: "2.01 Created", code: CODES.Created },
  { label: "2.04 Changed", code: CODES.Changed },
  { label: "2.05 Content", code: CODES.Content },
  { label: "4.04 Not Found", code: CODES.NotFound },
];
const TOKEN_BYTES = [0x7d, 0x34, 0xa1, 0xc9, 0x05, 0x6e, 0x22, 0xb8];
const OPTION_NAME: Record<number, string> = { [OPTION.Observe]: "Observe", [OPTION.UriPath]: "Uri-Path", [OPTION.ContentFormat]: "Content-Format", [OPTION.UriQuery]: "Uri-Query" };
const hex2 = (b: number) => b.toString(16).padStart(2, "0");
const bits = (n: number, width: number) => n.toString(2).padStart(width, "0");
const TYPE_NUM: Record<MsgType, number> = { CON: 0, NON: 1, ACK: 2, RST: 3 };

interface Group {
  name: string;
  bytes: number[];
  meaning: string;
  tone: string;
}

function annotate(m: CoapMessage): Group[] {
  const all = encode(m);
  const groups: Group[] = [
    {
      name: "Version, type, token length",
      bytes: all.slice(0, 1),
      meaning: `Bits ${bits(1, 2)} ${bits(TYPE_NUM[m.type], 2)} ${bits(m.token.length, 4)}: version 1, type ${m.type}, ${m.token.length}-byte token`,
      tone: "bg-u1-soft",
    },
    { name: "Code", bytes: all.slice(1, 2), meaning: `${codeText(m.code)} (class ${m.code.cls}, detail ${m.code.detail})`, tone: "bg-u1-soft" },
    { name: "Message ID", bytes: all.slice(2, 4), meaning: `${m.mid}: matches an ACK to its CON and spots duplicates`, tone: "bg-u1-soft" },
  ];
  let at = 4;
  if (m.token.length) {
    groups.push({ name: "Token", bytes: all.slice(at, at + m.token.length), meaning: "Matches a response to its request", tone: "bg-u2-soft" });
    at += m.token.length;
  }
  // Each option's size depends on the one before it (delta encoding), so measure by encoding one more at a time.
  const sorted = [...m.options].sort((a, b) => a.number - b.number);
  let prevLen = at;
  sorted.forEach((o, k) => {
    const len = encode({ ...m, options: sorted.slice(0, k + 1), payload: undefined }).length;
    const value = o.number === OPTION.UriPath || o.number === OPTION.UriQuery ? `"${new TextDecoder().decode(new Uint8Array(o.value))}"` : o.value.length ? String(o.value.reduce((a, b) => a * 256 + b, 0)) : "0 (empty)";
    groups.push({ name: `Option: ${OPTION_NAME[o.number] ?? o.number}`, bytes: all.slice(prevLen, len), meaning: `Option ${o.number}, value ${value}. The first byte holds the change in option number and the value length.`, tone: "bg-u3-soft" });
    prevLen = len;
  });
  if (m.payload) {
    groups.push({ name: "Payload marker", bytes: [0xff], meaning: "Says the payload starts next", tone: "bg-surface-2" });
    groups.push({ name: "Payload", bytes: all.slice(prevLen + 1), meaning: `"${m.payload}"`, tone: "bg-surface-2" });
  }
  return groups;
}

function HeaderInspector() {
  const [type, setType] = useState<MsgType>("CON");
  const [codeIdx, setCodeIdx] = useState(0);
  const [mid, setMid] = useState("1a2b");
  const [tokenLen, setTokenLen] = useState("2");
  const [path, setPath] = useState("/temp");
  const [observe, setObserve] = useState(false);
  const [payload, setPayload] = useState("");
  const midOk = /^[0-9a-f]{1,4}$/i.test(mid);
  const code = CODE_CHOICES[codeIdx].code;
  const isRequest = code.cls === 0;

  const options: CoapOption[] = [...uriPath(isRequest ? path : "")];
  if (observe) options.push({ number: OPTION.Observe, value: uintBytes(0) });
  if (!isRequest && payload) options.push({ number: OPTION.ContentFormat, value: uintBytes(0) });
  const msg: CoapMessage = {
    type,
    code,
    mid: midOk ? parseInt(mid, 16) : 0,
    token: TOKEN_BYTES.slice(0, Number(tokenLen)),
    options,
    payload: payload || undefined,
  };
  const groups = midOk ? annotate(msg) : [];
  const total = groups.reduce((a, g) => a + g.bytes.length, 0);
  const method = CODE_CHOICES[codeIdx].label.split(" ")[1];
  const httpText = isRequest
    ? `${method} ${path || "/"} HTTP/1.1\r\nHost: device.local\r\n${payload ? `Content-Length: ${new TextEncoder().encode(payload).length}\r\n` : ""}\r\n${payload}`
    : `HTTP/1.1 ${code.cls === 2 ? "200 OK" : "404 Not Found"}\r\nContent-Type: text/plain\r\nContent-Length: ${new TextEncoder().encode(payload).length}\r\n\r\n${payload}`;
  const httpBytes = new TextEncoder().encode(httpText).length;
  const input = "h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3 font-mono";

  return (
    <section aria-labelledby="l08-inspector" className="grid grid-cols-1 gap-4 rounded-lg border border-line bg-surface p-4">
      <div className="grid gap-1">
        <h3 id="l08-inspector" className="text-h3 font-bold">
          Header inspector
        </h3>
        <p className="max-w-[70ch] text-ink-2">Build a CoAP message and see every byte. The fixed header is only 4 bytes.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Segmented<MsgType> label="Type" size="sm" value={type} onChange={setType} options={(["CON", "NON", "ACK"] as MsgType[]).map((t) => ({ value: t, label: t }))} />
        <label className="grid min-w-0 gap-1.5">
          <span className="text-[0.95rem] font-semibold">Code</span>
          <select className={input} value={codeIdx} onChange={(e) => setCodeIdx(Number(e.target.value))}>
            {CODE_CHOICES.map((c, i) => (
              <option key={c.label} value={i}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-1.5">
          <span className="text-[0.95rem] font-semibold">Message ID (hex)</span>
          <input className={input} value={mid} maxLength={4} onChange={(e) => setMid(e.target.value.trim())} aria-invalid={!midOk} spellCheck={false} />
          {!midOk && <span className="text-sm text-bad">Use 1 to 4 hex digits, for example 1a2b.</span>}
        </label>
        <Segmented label="Token length" size="sm" value={tokenLen} onChange={setTokenLen} options={["0", "2", "4", "8"].map((n) => ({ value: n, label: `${n} B`, ariaLabel: `${n} bytes` }))} />
        <label className="grid min-w-0 gap-1.5">
          <span className="text-[0.95rem] font-semibold">Path (requests only)</span>
          <input className={input} value={path} disabled={!isRequest} maxLength={40} onChange={(e) => setPath(e.target.value.trim())} spellCheck={false} />
        </label>
        <label className="grid min-w-0 gap-1.5">
          <span className="text-[0.95rem] font-semibold">Payload</span>
          <input className={input} value={payload} maxLength={24} onChange={(e) => setPayload(e.target.value)} spellCheck={false} placeholder="(none)" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={observe} onChange={(e) => setObserve(e.target.checked)} />
          <span>Add the Observe option</span>
        </label>
      </div>

      {midOk && (
        <>
          <p className="flex flex-wrap gap-1 font-mono text-sm" aria-label={`Encoded message, ${total} bytes`}>
            {groups.flatMap((g, gi) =>
              g.bytes.map((b, bi) => (
                <span key={`${gi}-${bi}`} className={cn("rounded px-1 py-0.5", g.tone)}>
                  {hex2(b)}
                </span>
              )),
            )}
          </p>
          <div className="relative overflow-x-auto rounded-lg border border-line">
            <table className="w-full border-collapse text-[0.95rem]">
              <caption className="sr-only">Meaning of each part of the message</caption>
              <thead className="bg-surface-2">
                <tr>
                  {["Part", "Bytes (hex)", "Meaning"].map((h) => (
                    <th key={h} scope="col" className="border-b border-line-strong px-3 py-2 text-left font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g, i) => (
                  <tr key={i} className="border-b border-line last:border-b-0">
                    <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-semibold">
                      <span className={cn("mr-2 inline-block size-2.5 rounded-sm", g.tone)} aria-hidden />
                      {g.name}
                    </th>
                    <td className="px-3 py-2 font-mono">{g.bytes.map(hex2).join(" ")}</td>
                    <td className="min-w-64 px-3 py-2 text-ink-2">{g.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Readouts
            columns={2}
            items={[
              { label: "CoAP message", value: total, unit: "bytes" },
              { label: `Same ${isRequest ? "request" : "response"} in HTTP/1.1`, value: httpBytes, unit: "bytes", hint: "Minimal HTTP text, before TCP and IP headers" },
            ]}
          />
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Observe vs polling                                                  */
/* ------------------------------------------------------------------ */

/** Readings every 5 minutes for 2 hours. */
const ROOMS = {
  steady: {
    label: "Steady room",
    values: [28.5, 28.5, 28.5, 28.5, 28.5, 28.6, 28.6, 28.6, 28.6, 28.6, 28.6, 28.6, 28.5, 28.5, 28.5, 28.5, 28.5, 28.5, 28.5, 28.5, 28.6, 28.6, 28.6, 28.6],
  },
  changing: {
    label: "Sunny afternoon",
    values: [28.5, 28.7, 29.0, 29.2, 29.2, 29.5, 29.8, 30.1, 30.1, 30.4, 30.6, 30.9, 31.0, 31.0, 31.2, 31.1, 30.8, 30.5, 30.5, 30.1, 29.8, 29.6, 29.6, 29.3],
  },
};
type Room = keyof typeof ROOMS;

function ObserveDemo() {
  const [room, setRoom] = useState<Room>("steady");
  const values = ROOMS[room].values;
  const notes = notificationsFor(values);
  const sentAt = new Set(notes.map((n) => n.index));
  const polling = values.length * 2;
  const observe = 1 + notes.length;
  const saved = Math.round((1 - observe / polling) * 100);

  return (
    <section aria-labelledby="l08-observe" className="grid grid-cols-1 gap-4 rounded-lg border border-line bg-surface p-4">
      <div className="grid gap-1">
        <h3 id="l08-observe" className="text-h3 font-bold">
          Observe vs polling
        </h3>
        <p className="max-w-[70ch] text-ink-2">
          A phone wants the temperature every 5 minutes for 2 hours. With polling it asks every time. With Observe it registers once
          (GET /temp with Observe = 0) and the server sends a notification only when the value changes.
        </p>
      </div>
      <Segmented<Room> label="Room" size="sm" value={room} onChange={setRoom} options={(Object.keys(ROOMS) as Room[]).map((r) => ({ value: r, label: ROOMS[r].label }))} />
      <ol className="grid grid-cols-6 gap-1 sm:grid-cols-12" aria-label="Readings, with notifications marked">
        {values.map((v, i) => (
          <li
            key={i}
            className={cn(
              "grid gap-0.5 rounded-md border px-1 py-1 text-center",
              sentAt.has(i) ? "border-brand bg-brand-soft" : "border-line text-ink-3",
            )}
          >
            <span className="text-[0.65rem] text-ink-3">{i * 5} min</span>
            <span className="font-mono text-xs tabular-nums">{v.toFixed(1)}</span>
            <span className="sr-only">{sentAt.has(i) ? "notification sent" : "no message"}</span>
          </li>
        ))}
      </ol>
      <p className="text-sm text-ink-3">Highlighted readings are the ones the server sends as notifications (sent as NON messages here).</p>
      <Readouts
        items={[
          { label: "Polling messages", value: polling, hint: "A request and a response for every reading" },
          { label: "Observe messages", value: observe, hint: "One registration plus one notification per change" },
          { label: "Notifications", value: notes.length },
          { label: "Messages saved", value: `${saved}%`, tone: saved > 50 ? "ok" : "default" },
        ]}
      />
    </section>
  );
}
