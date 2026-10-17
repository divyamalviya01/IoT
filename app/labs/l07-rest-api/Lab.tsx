import { motion, useReducedMotion } from "motion/react";
import { Cpu, Laptop } from "lucide-react";
import { useRef, useState } from "react";
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
  HOST,
  LAB_TOKEN,
  METHODS,
  ROUTES,
  handle,
  initialState,
  requestText,
  responseText,
  sizes,
  type DeviceState,
  type Method,
  type Request,
  type Response,
} from "./engine";

const lab = getLab("l07-rest-api")!;

const steps = [
  "Press the example Read temperature, then Send request. Read the request and the response, and press Record observation.",
  "Turn the LED on with PUT /actuators/led and watch the device. Then read it back with GET.",
  "Add a reading with POST /readings. Notice the 201 Created status and the Location header.",
  "Try the mistakes: a wrong path, a wrong method and a bad body. Record the 404, 405 and 400 you get.",
  "Tick Device requires a token and send a request without one (401). Then tick Send token and try again.",
  "Compare header bytes with body bytes in your rows, then open the lab record.",
];

/** One-click starting points, including the mistakes students should try. */
const EXAMPLES: { label: string; method: Method; path: string; body?: string }[] = [
  { label: "Read temperature", method: "GET", path: "/sensors/temperature" },
  { label: "Turn LED on", method: "PUT", path: "/actuators/led", body: '{"state":"on"}' },
  { label: "Turn LED off", method: "PUT", path: "/actuators/led", body: '{"state":"off"}' },
  { label: "Add a reading", method: "POST", path: "/readings", body: '{"value":27.9}' },
  { label: "Wrong path", method: "GET", path: "/sensors/pressure" },
  { label: "Wrong method", method: "DELETE", path: "/sensors/temperature" },
  { label: "Bad body", method: "PUT", path: "/actuators/led", body: '{"state":"blue"}' },
];

const DEFAULT_BODY: Partial<Record<Method, string>> = { PUT: '{"state":"on"}', POST: '{"value":27.9}' };

const STATUS_INFO: { code: number; text: string; meaning: string }[] = [
  { code: 200, text: "OK", meaning: "The request worked. The body holds the answer." },
  { code: 201, text: "Created", meaning: "A new resource was made. The Location header says where it is." },
  { code: 400, text: "Bad Request", meaning: "The server could not understand the body or its values." },
  { code: 401, text: "Unauthorized", meaning: "A valid token is needed before the device will answer." },
  { code: 404, text: "Not Found", meaning: "There is no resource at that path." },
  { code: 405, text: "Method Not Allowed", meaning: "The path exists but does not accept that method. The Allow header lists the ones it does." },
];

const statusTone = (code: number): "ok" | "warn" | "bad" => (code < 300 ? "ok" : code === 401 || code === 405 ? "warn" : "bad");
const toneText = { ok: "text-ok", warn: "text-warn", bad: "text-bad" };

interface Exchange {
  id: number;
  req: Request;
  res: Response;
}

function summarise(rows: ObservationRow[]): string {
  if (!rows.length) return "";
  const codes = [...new Set(rows.map((r) => Number(r.status)))].sort((a, b) => a - b);
  const sentences = [`The device answered with ${codes.length === 1 ? "status" : "statuses"} ${codes.join(", ")}.`];
  const changed = rows.filter((r) => (r.method === "PUT" || r.method === "POST") && Number(r.status) < 300);
  const reads = rows.filter((r) => r.method === "GET" && Number(r.status) === 200);
  if (reads.length && changed.length) {
    sentences.push("GET only read data, while successful PUT and POST requests changed the device: PUT set the LED and POST created a new reading.");
  }
  const errors = rows.filter((r) => Number(r.status) >= 400);
  if (errors.length) {
    sentences.push(`${errors.length} request${errors.length === 1 ? "" : "s"} failed with a 4xx status, meaning the mistake was in the request, not the device.`);
  }
  const avgHeader = Math.round(rows.reduce((a, r) => a + Number(r.headerPct), 0) / rows.length);
  sentences.push(`On average, headers made up ${avgHeader}% of each response, so HTTP carries a lot of overhead for a tiny sensor value.`);
  return sentences.join(" ");
}

export default function RestApiLab() {
  const [method, setMethod] = useState<Method>("GET");
  const [path, setPath] = useState("/sensors/temperature");
  const [body, setBody] = useState("");
  const [sendToken, setSendToken] = useState(false);
  const [token, setToken] = useState(LAB_TOKEN);
  const [device, setDevice] = useState<DeviceState>(initialState);
  const [shownLed, setShownLed] = useState<DeviceState["led"]>("off");
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const nextId = useRef(0);
  const start = useRef(0);
  const ledTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reduced = useReducedMotion() ?? false;
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");

  const hasBody = method === "PUT" || method === "POST";

  const chooseMethod = (m: Method) => {
    setMethod(m);
    if ((m === "PUT" || m === "POST") && !body) setBody(DEFAULT_BODY[m] ?? "");
  };

  const applyExample = (e: (typeof EXAMPLES)[number]) => {
    setMethod(e.method);
    setPath(e.path);
    setBody(e.body ?? "");
  };

  const send = () => {
    const req: Request = { method, path: path || "/", body: hasBody ? body : undefined, token: sendToken ? token : undefined };
    const { res, state } = handle(device, req);
    setDevice(state);
    // The LED changes when the request reaches the device, not when it leaves the client.
    clearTimeout(ledTimer.current);
    if (reduced) setShownLed(state.led);
    else ledTimer.current = setTimeout(() => setShownLed(state.led), 600);
    setExchange({ id: ++nextId.current, req, res });
    setSeen((prev) => new Set(prev).add(res.status));
    if (!start.current) start.current = performance.now();
    setEvents((prev) => [
      ...prev,
      {
        id: nextId.current,
        t: performance.now() - start.current,
        kind: res.status < 300 ? "ok" : "error",
        tone: statusTone(res.status),
        text: `${req.method} ${req.path} → ${res.status} ${res.statusText}${res.status >= 400 ? `: ${JSON.parse(res.body).error}` : ""}`,
      },
    ]);
  };

  const reqText = exchange ? requestText(exchange.req) : "";
  const resText = exchange ? responseText(exchange.res) : "";
  const reqSize = sizes(reqText);
  const resSize = sizes(resText);

  const record = () => {
    if (!exchange) return;
    const row: ObservationRow = {
      method: exchange.req.method,
      path: exchange.req.path,
      status: exchange.res.status,
      meaning: exchange.res.statusText,
      bytes: reqSize.total + resSize.total,
      headerPct: resSize.overheadPct,
    };
    addRow(row);
    const auto = summarise([...rows, row]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
  };

  const input = "h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3 font-mono";

  return (
    <LabLayout
      lab={lab}
      steps={steps}
      onRecord={record}
      recordDisabled={!exchange}
      recordHint={exchange ? `Records ${exchange.req.method} ${exchange.req.path} → ${exchange.res.status}.` : "Send a request first."}
      controls={
        <>
          <div className="grid gap-2">
            <p className="text-[0.95rem] font-semibold">Examples</p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((e) => (
                <Button key={e.label} size="sm" variant="ghost" onClick={() => applyExample(e)}>
                  {e.label}
                </Button>
              ))}
            </div>
          </div>
          <Segmented label="Method" value={method} onChange={chooseMethod} options={METHODS.map((m) => ({ value: m, label: m }))} />
          <label className="grid gap-1.5">
            <span className="text-[0.95rem] font-semibold">Path</span>
            <input className={input} list="l07-paths" value={path} onChange={(e) => setPath(e.target.value.trim())} spellCheck={false} />
            <datalist id="l07-paths">
              {ROUTES.map((r) => (
                <option key={r.path} value={r.path}>
                  {r.describe}
                </option>
              ))}
            </datalist>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[0.95rem] font-semibold">Body (JSON)</span>
            <textarea
              className="min-h-16 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3 py-2 font-mono disabled:opacity-50"
              value={hasBody ? body : ""}
              disabled={!hasBody}
              placeholder={hasBody ? "" : "GET and DELETE requests have no body"}
              onChange={(e) => setBody(e.target.value)}
              spellCheck={false}
            />
          </label>
          <div className="grid gap-2 rounded-lg border border-line p-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-[var(--brand)]"
                checked={device.requireAuth}
                onChange={(e) => setDevice({ ...device, requireAuth: e.target.checked })}
              />
              <span>Device requires a token</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={sendToken} onChange={(e) => setSendToken(e.target.checked)} />
              <span>Send token</span>
            </label>
            {sendToken && (
              <input className={input} value={token} onChange={(e) => setToken(e.target.value.trim())} aria-label="Token" spellCheck={false} />
            )}
            <p className="text-sm text-ink-3">The correct token is {LAB_TOKEN}.</p>
          </div>
          <Button variant="primary" onClick={send}>
            Send request
          </Button>
        </>
      }
      stage={<Stage exchange={exchange} device={device} led={shownLed} reduced={reduced} />}
      readouts={
        <>
          <Readouts
            items={[
              {
                label: "Status",
                value: exchange ? exchange.res.status : "—",
                tone: exchange ? statusTone(exchange.res.status) : "default",
                hint: exchange?.res.statusText,
              },
              { label: "Request size", value: exchange ? reqSize.total : "—", unit: exchange ? "bytes" : undefined },
              { label: "Response size", value: exchange ? resSize.total : "—", unit: exchange ? "bytes" : undefined },
              { label: "Response headers", value: exchange ? `${resSize.overheadPct}%` : "—", hint: "Share of the response that is headers" },
            ]}
          />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <WireView title="Request" text={reqText} size={reqSize} empty="Send a request to see the exact text that goes to the device." />
            <WireView title="Response" text={resText} size={resSize} empty="The device's reply appears here." />
          </div>
        </>
      }
      log={
        <>
          <EventLog
            title="Request log"
            events={events}
            filters={[
              { kind: "ok", label: "2xx success" },
              { kind: "error", label: "4xx error" },
            ]}
            emptyText="Send a request to start the log."
          />
          <section aria-labelledby="l07-codes" className="grid grid-cols-1 gap-3">
            <h3 id="l07-codes" className="text-h3 font-bold">
              Status codes ({STATUS_INFO.filter((s) => seen.has(s.code)).length} of {STATUS_INFO.length} seen)
            </h3>
            <div className="relative overflow-x-auto rounded-lg border border-line">
              <table className="w-full border-collapse text-[0.95rem]">
                <caption className="sr-only">HTTP status codes in this lab</caption>
                <thead className="bg-surface-2">
                  <tr>
                    {["Code", "Name", "Meaning", "Seen"].map((h) => (
                      <th key={h} scope="col" className="border-b border-line-strong px-3 py-2 text-left font-bold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {STATUS_INFO.map((s) => (
                    <tr key={s.code} className="border-b border-line last:border-b-0">
                      <th scope="row" className={cn("px-3 py-2 text-left font-mono font-bold", toneText[statusTone(s.code)])}>
                        {s.code}
                      </th>
                      <td className="whitespace-nowrap px-3 py-2">{s.text}</td>
                      <td className="min-w-56 px-3 py-2 text-ink-2">{s.meaning}</td>
                      <td className="px-3 py-2">{seen.has(s.code) ? "Yes" : "Not yet"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Stage: client on the left, device on the right                      */
/* ------------------------------------------------------------------ */

const chipTone = { ok: "border-ok bg-ok-soft", warn: "border-warn bg-warn-soft", bad: "border-bad bg-bad-soft" };

function Stage({ exchange, device, led, reduced }: { exchange: Exchange | null; device: DeviceState; led: DeviceState["led"]; reduced: boolean }) {
  const on = led === "on";
  return (
    <div className="grid grid-cols-1 gap-2 p-3 sm:p-4">
      <div
        className="relative h-56"
        role="img"
        aria-label={`Client app and IoT device ${HOST}. LED is ${led}. Temperature ${device.temperature} °C, humidity ${device.humidity}%, ${device.readings.length} stored readings.`}
      >
        <span className="absolute left-[16%] right-[16%] top-1/2 h-0.5 -translate-y-1/2 bg-line-strong" aria-hidden />

        <div className="absolute left-[10%] top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" aria-hidden>
          <span className="flex size-14 items-center justify-center rounded-xl border-2 border-line-strong bg-surface">
            <Laptop size={26} className="text-ink-2" />
          </span>
          <span className="mt-1 text-sm font-semibold">Client app</span>
        </div>

        <div className="absolute right-[2%] top-1/2 grid w-32 -translate-y-1/2 gap-1.5 rounded-xl border-2 border-line-strong bg-surface p-2.5 sm:w-40" aria-hidden>
          <div className="flex items-center gap-1.5">
            <Cpu size={16} className="text-ink-3" />
            <span className="truncate font-mono text-xs text-ink-3">{HOST}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn("size-5 rounded-full border-2 transition-colors", on ? "border-bad bg-bad" : "border-line-strong bg-surface-2")}
              style={on ? { boxShadow: "0 0 14px 5px color-mix(in oklab, var(--bad) 55%, transparent)" } : undefined}
            />
            <span className="text-sm font-semibold">LED {on ? "on" : "off"}</span>
          </div>
          <div className="rounded-md bg-surface-2 px-2 py-1 font-mono text-xs leading-5">
            <div>{device.temperature} °C</div>
            <div>{device.humidity} % RH</div>
            <div className="text-ink-3">{device.readings.length} stored</div>
          </div>
        </div>

        {exchange && !reduced && (
          <>
            <motion.span
              key={`req-${exchange.id}`}
              className="absolute top-[34%] z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-brand bg-brand-soft px-1.5 font-mono text-xs leading-5"
              initial={{ left: "18%", opacity: 1 }}
              animate={{ left: ["18%", "62%"], opacity: [1, 1, 0] }}
              transition={{ duration: 0.6, ease: "easeIn", opacity: { duration: 0.7, times: [0, 0.85, 1] } }}
              aria-hidden
            >
              {exchange.req.method} {exchange.req.path.length > 18 ? `${exchange.req.path.slice(0, 17)}…` : exchange.req.path}
            </motion.span>
            <motion.span
              key={`res-${exchange.id}`}
              className={cn(
                "absolute top-[66%] z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border px-1.5 font-mono text-xs leading-5",
                chipTone[statusTone(exchange.res.status)],
              )}
              initial={{ left: "62%", opacity: 0 }}
              animate={{ left: ["62%", "62%", "18%", "18%"], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2.2, times: [0, 0.3, 0.6, 1], ease: "easeOut" }}
              aria-hidden
            >
              {exchange.res.status} {exchange.res.statusText}
            </motion.span>
          </>
        )}
      </div>
      <p className="text-sm text-ink-2" aria-live="polite">
        {exchange
          ? `${exchange.req.method} ${exchange.req.path} → ${exchange.res.status} ${exchange.res.statusText}. ${STATUS_INFO.find((s) => s.code === exchange.res.status)?.meaning ?? ""}`
          : "Choose a method and path, then press Send request."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Raw HTTP text, with headers and body told apart                     */
/* ------------------------------------------------------------------ */

function WireView({ title, text, size, empty }: { title: string; text: string; size: ReturnType<typeof sizes>; empty: string }) {
  const split = text.indexOf("\r\n\r\n");
  const head = split >= 0 ? text.slice(0, split) : text;
  const body = split >= 0 ? text.slice(split + 4) : "";
  return (
    <section aria-label={title} className="grid min-w-0 content-start gap-1.5 rounded-lg border border-line bg-surface p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-bold">{title}</h4>
        {text && (
          <span className="text-sm text-ink-3">
            headers {size.headerBytes} B + body {size.bodyBytes} B = {size.total} B
          </span>
        )}
      </div>
      {text ? (
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-surface-2 p-2.5 font-mono text-xs leading-5">
          <span className="text-ink-2">{head.replace(/\r\n/g, "\n")}</span>
          {"\n\n"}
          {body ? <span className="font-semibold text-ink">{body}</span> : <span className="text-ink-3">(no body)</span>}
        </pre>
      ) : (
        <p className="text-sm text-ink-3">{empty}</p>
      )}
    </section>
  );
}
