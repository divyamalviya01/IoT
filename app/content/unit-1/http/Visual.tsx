import { Readouts } from "~/components/lab/Readouts";
import { Slider } from "~/components/ui/Slider";
import { useState } from "react";
import { handle, initialState, requestText, responseText, sizes } from "~/labs/l07-rest-api/engine";

/** Ten minutes, in seconds. */
const WINDOW = 600;
/** Moments when the door sensor actually changes. */
const EVENTS = [47, 212, 238, 451];
/** Bytes for one small HTTP request plus its response (typical, illustrative). */
const EXCHANGE_BYTES = 450;

function simulate(interval: number) {
  const polls: { t: number; useful: boolean }[] = [];
  let last = 0;
  for (let t = interval; t <= WINDOW; t += interval) {
    const useful = EVENTS.some((e) => e > last && e <= t);
    polls.push({ t, useful });
    last = t;
  }
  const delays = EVENTS.map((e) => {
    const next = polls.find((p) => p.t >= e);
    return next ? next.t - e : WINDOW - e;
  });
  const useful = polls.filter((p) => p.useful).length;
  return {
    polls,
    useful,
    wasted: polls.length - useful,
    avgDelay: delays.reduce((s, d) => s + d, 0) / delays.length,
    bytes: polls.length * EXCHANGE_BYTES,
  };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
      <span className="text-sm font-semibold text-ink-2">{label}</span>
      <svg viewBox={`0 0 ${WINDOW} 28`} preserveAspectRatio="none" className="h-7 w-full overflow-visible" aria-hidden>
        <rect x="0" y="13" width={WINDOW} height="2" fill="var(--line)" />
        {children}
      </svg>
    </div>
  );
}

/** One real exchange with the lab L07 device, measured byte for byte. */
const EXCHANGE = (() => {
  const req = { method: "GET" as const, path: "/sensors/temperature" };
  const { res } = handle(initialState(), req);
  return [
    { label: "Request", line: `GET ${req.path}`, ...sizes(requestText(req)) },
    { label: "Response", line: `${res.status} ${res.statusText}, body ${res.body}`, ...sizes(responseText(res)) },
  ];
})();

/** Headers vs body for one request and its response, as proportional bars. */
function HeaderBars() {
  const max = Math.max(...EXCHANGE.map((e) => e.total));
  const headers = EXCHANGE.reduce((s, e) => s + e.headerBytes, 0);
  const total = EXCHANGE.reduce((s, e) => s + e.total, 0);
  return (
    <figure
      className="grid gap-3 rounded-lg border border-line bg-surface p-4"
      aria-label={`One request and response: ${total} bytes, of which ${headers} are headers. The reading itself is 4 bytes.`}
    >
      <figcaption className="font-bold">What one poll costs: headers vs body</figcaption>
      {EXCHANGE.map((e) => (
        <div key={e.label} className="grid gap-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
            <span>
              <span className="font-semibold">{e.label}</span> <span className="font-mono text-ink-3">{e.line}</span>
            </span>
            <span className="tabular-nums text-ink-2">
              {e.headerBytes} B headers + {e.bodyBytes} B body
            </span>
          </div>
          <div className="flex h-5 overflow-hidden rounded" style={{ width: `${(e.total / max) * 100}%` }} aria-hidden>
            <span className="bg-line-strong" style={{ flexGrow: e.headerBytes }} />
            {e.bodyBytes > 0 && <span className="bg-brand" style={{ flexGrow: e.bodyBytes }} />}
          </div>
        </div>
      ))}
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-line-strong" aria-hidden /> Headers
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-brand" aria-hidden /> Body
        </span>
      </p>
      <p className="text-sm text-ink-2">
        {Math.round((headers / total) * 100)}% of the {total} bytes are headers, and the reading itself, 28.5, is only 4 bytes. TCP and IP add
        another 40 bytes to every packet. Try more requests in lab L07.
      </p>
    </figure>
  );
}

export default function PollingVisual() {
  const [interval, setInterval] = useState(30);
  const r = simulate(interval);

  return (
    <div className="grid grid-cols-1 gap-6">
      <p className="max-w-[70ch] text-ink-2">
        A phone app wants to know when a door opens or closes. Over ten minutes the door changes {EVENTS.length} times.
        Compare an app that polls the device over HTTP with one that is told through a webhook.
      </p>

      <div className="rounded-lg border border-line bg-surface p-4">
        <Slider
          label="Polling interval"
          value={interval}
          min={2}
          max={120}
          step={1}
          unit="s"
          onChange={setInterval}
          hint="How often the app sends GET /door to ask for the latest state."
        />
      </div>

      <figure
        className="grid gap-3 rounded-lg border border-line bg-surface p-4"
        aria-label={`Over ten minutes: ${r.polls.length} polling requests, of which ${r.useful} found a change. A webhook sends ${EVENTS.length} calls.`}
      >
        <figcaption className="font-bold">Ten minutes on a timeline</figcaption>
        <Row label="Door changes">
          {EVENTS.map((e) => (
            <rect key={e} x={e - 2.5} y="4" width="5" height="20" rx="1" fill="var(--warn)" />
          ))}
        </Row>
        <Row label="Polling">
          {r.polls.map((p) => (
            <rect
              key={p.t}
              x={p.t - 1.25}
              y={p.useful ? 2 : 7}
              width="2.5"
              height={p.useful ? 24 : 14}
              fill={p.useful ? "var(--brand)" : "var(--line-strong)"}
            />
          ))}
        </Row>
        <Row label="Webhook">
          {EVENTS.map((e) => (
            <rect key={e} x={e - 1.25} y="2" width="2.5" height="24" fill="var(--brand)" />
          ))}
        </Row>
        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 text-xs text-ink-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
          <span />
          <span className="flex justify-between">
            <span>0 min</span>
            <span>5 min</span>
            <span>10 min</span>
          </span>
        </div>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-3">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-1.5 rounded-sm bg-warn" aria-hidden /> The door changed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-1 bg-brand" aria-hidden /> Request that brought news
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-1 bg-line-strong" aria-hidden /> Wasted request
          </span>
        </p>
      </figure>

      <div className="grid gap-3 lg:grid-cols-2">
        <section aria-label="Polling results" className="grid gap-2">
          <h2 className="font-bold">Polling every {interval} s</h2>
          <Readouts
            columns={2}
            items={[
              { label: "Requests sent", value: r.polls.length },
              { label: "Wasted", value: `${Math.round((r.wasted / Math.max(1, r.polls.length)) * 100)}%`, tone: r.wasted > r.useful ? "bad" : "default" },
              { label: "Average delay to notice", value: Math.round(r.avgDelay), unit: "s" },
              { label: "Data used", value: (r.bytes / 1000).toFixed(1), unit: "KB" },
            ]}
          />
        </section>
        <section aria-label="Webhook results" className="grid gap-2">
          <h2 className="font-bold">Webhook</h2>
          <Readouts
            columns={2}
            items={[
              { label: "Calls sent", value: EVENTS.length },
              { label: "Wasted", value: "0%", tone: "ok" },
              { label: "Average delay to notice", value: "< 1", unit: "s" },
              { label: "Data used", value: ((EVENTS.length * EXCHANGE_BYTES) / 1000).toFixed(1), unit: "KB" },
            ]}
          />
        </section>
      </div>
      <p className="text-sm text-ink-3">Data sizes assume about 450 bytes per HTTP request and response, for illustration.</p>

      <HeaderBars />

      <section aria-labelledby="poll-notice" className="max-w-[70ch]">
        <h2 id="poll-notice" className="text-h3 font-bold">
          What to notice
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2 marker:text-ink-3">
          <li>Polling often wastes most of its requests, because nothing has changed.</li>
          <li>Polling faster notices changes sooner, but wastes even more requests and battery.</li>
          <li>Polling slower saves requests, but the app can be minutes late.</li>
          <li>A webhook sends exactly one call per change, almost instantly. MQTT subscriptions give the same benefit.</li>
        </ul>
      </section>
    </div>
  );
}
