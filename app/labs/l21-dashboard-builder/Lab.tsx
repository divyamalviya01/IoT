import { useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUp, CircleCheck, LayoutDashboard, LoaderCircle, Pencil, Trash2, TriangleAlert, Wifi, WifiOff, X } from "lucide-react";
import { memo, useCallback, useEffect, useId, useMemo, useReducer, useRef, useState, type MouseEvent, type Ref } from "react";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { EventLog, type SimEvent } from "~/components/sim/EventLog";
import { SimControls } from "~/components/sim/SimControls";
import { useSimClock } from "~/components/sim/useSimClock";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { Slider } from "~/components/ui/Slider";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import {
  MAX_WIDGETS,
  STREAMS,
  WIDGETS,
  WIDGET_KINDS,
  bulbStatus,
  canBind,
  createBulb,
  formatValue,
  generateStreams,
  getStream,
  makeWidget,
  preset,
  reviewDashboard,
  sendCommand,
  tickBulb,
  type AlertRun,
  type Bulb,
  type StreamId,
  type Streams,
  type Tip,
  type UpdateMode,
  type Widget,
  type WidgetKind,
} from "./engine";
import { Bulb as BulbPicture, KIND_ICON, LiveWidget, alertRun, dashboardCost, valueAt, type BulbView } from "./widgets";

const lab = getLab("l21-dashboard-builder")!;

const steps = [
  "Press Start streams. Under Add a widget, tap Gauge, Line chart, Alert and Switch to build a small dashboard.",
  "Tap each widget (or its pencil) and connect it to a stream. Greyed-out streams say why they cannot be used.",
  "Connect the alert to Room temperature: above 34 °C with 0.5 °C hysteresis. Wait for ALERT, then press Record observation.",
  "Connect the switch to the Porch bulb. Untick Device online and press the switch: the bulb stays “turning on”. Tick Device online again and watch it confirm. Record.",
  "Change Update to Poll every 30 s. Watch “updated … ago” grow and compare messages per minute with Push. Record both.",
  "Load the Cluttered example and fix every design tip: remove a duplicate, add a title and a range, move the alert up. Record, then open the lab record.",
];

/** The dashboard opens with this many seconds of history already in the streams. */
const T0 = 80;
const RUN_S = 3600;
const SEED = 1;
/** Hard limit on widgets; the design review already warns above MAX_WIDGETS. */
const LIMIT = 12;

const MODE_SHORT: Record<UpdateMode, string> = { push: "Push", poll1: "Poll 1 s", poll5: "Poll 5 s", poll30: "Poll 30 s" };
const MODE_HINT: Record<UpdateMode, string> = {
  push: "The cloud pushes each new value to the browser (MQTT over WebSocket) as soon as it changes.",
  poll1: "The browser asks the cloud for new values every second, even when nothing has changed.",
  poll5: "The browser asks every 5 s. Values can be up to 5 s old.",
  poll30: "The browser asks every 30 s. Few messages, but values can be up to 30 s old.",
};
const POLL_PHRASE: Record<string, string> = { poll1: "Polling every 1 s", poll5: "Polling every 5 s", poll30: "Polling every 30 s" };

const inputClass = "h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3";

const widgetName = (w: Widget) => w.title.trim() || WIDGETS[w.kind].label;
const average = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Binds a widget to a stream with sensible settings, keeping a title the student typed. */
function bindStream(w: Widget, stream: StreamId | undefined): Widget {
  const fresh = makeWidget(w.id, w.kind, stream);
  const autoTitle = !w.title.trim() || w.title === WIDGETS[w.kind].label || (w.stream !== undefined && w.title === getStream(w.stream).label);
  return { ...fresh, size: w.size, title: autoTitle ? fresh.title : w.title };
}

function summarise(rows: ObservationRow[]): string {
  if (!rows.length) return "";
  const num = (r: ObservationRow, k: string) => Number(r[k] ?? 0);
  const parts: string[] = [];
  const last = rows[rows.length - 1];

  const push = [...rows].reverse().find((r) => r.modeId === "push" && num(r, "messages") > 0);
  const polled = rows.filter((r) => r.modeId !== "push" && num(r, "messages") > 0);
  const slow = polled.length ? polled.reduce((a, b) => (num(b, "age") > num(a, "age") ? b : a)) : undefined;
  if (push) parts.push(`With push, the dashboard needed about ${push.messages} messages a minute and showed every change at once.`);
  if (slow) {
    parts.push(
      `${POLL_PHRASE[String(slow.modeId)] ?? "Polling"} needed ${slow.messages} messages a minute, but values were ${slow.age} s old on average.`,
    );
  }

  const alerts = Math.max(...rows.map((r) => num(r, "alerts")));
  if (alerts > 0) parts.push(`The alert went off ${alerts === 1 ? "once" : `${alerts} times`}, so problems were flagged without anyone watching a chart.`);

  const cmd = [...rows].reverse().find((r) => num(r, "commands") > 0 && r.confirm !== "—");
  if (cmd) {
    parts.push(`The bulb confirmed each command in ${cmd.confirm} s on average.`);
    const extraWait = Math.max(...rows.map((r) => num(r, "maxConfirm") - num(r, "latency")));
    if (extraWait > 1) parts.push("While the bulb was offline, its command waited in the device shadow and was applied when it came back online.");
  }

  const most = Math.max(...rows.map((r) => num(r, "tips")));
  if (most > 0 && num(last, "tips") < most) parts.push(`Fixing the design brought the tips down from ${most} to ${last.tips}.`);
  else if (num(last, "tips") === 0) parts.push("The last dashboard recorded had no design tips left.");
  return parts.join(" ");
}

interface SimState {
  bulb: Bulb;
  raised: number;
}
const freshSim = (): SimState => ({ bulb: createBulb(), raised: 0 });

export default function DashboardBuilderLab() {
  const reduced = useReducedMotion() ?? false;
  const streams = useMemo(() => generateStreams(T0 + RUN_S + 1, SEED), []);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [focusWidget, setFocusWidget] = useState<string | null>(null);
  const [mode, setMode] = useState<UpdateMode>("push");
  const [online, setOnline] = useState(true);
  const [latency, setLatency] = useState(2);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const sim = useRef<SimState | null>(null);
  sim.current ??= freshSim();
  const nextId = useRef(1);
  const eventId = useRef(0);
  const editorRef = useRef<HTMLElement>(null);
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");

  const runs = useMemo(() => {
    const m = new Map<string, AlertRun>();
    for (const w of widgets) {
      const r = alertRun(w, streams);
      if (r) m.set(w.id, r);
    }
    return m;
  }, [widgets, streams]);
  const tips = useMemo(() => reviewDashboard(widgets), [widgets]);
  const tipIndex = useMemo(() => {
    const m = new Map<string, number[]>();
    tips.forEach((t, i) => {
      if (t.widget) m.set(t.widget, [...(m.get(t.widget) ?? []), i + 1]);
    });
    return m;
  }, [tips]);
  const cost = useMemo(() => dashboardCost(widgets, streams, mode, T0), [widgets, streams, mode]);

  const pushEvents = (list: Omit<SimEvent, "id">[]) => {
    const withIds = list.map((e) => ({ ...e, id: ++eventId.current }));
    setEvents((prev) => [...prev, ...withIds].slice(-200));
  };

  const onTick = (dt: number, t: number) => {
    const from = T0 + Math.floor((t - dt) / 1000);
    const to = T0 + Math.floor(t / 1000);
    if (to === from) return;
    const s = sim.current!;
    const out: Omit<SimEvent, "id">[] = [];
    for (let k = from + 1; k <= to; k++) {
      const ms = (k - T0) * 1000;
      const before = s.bulb;
      s.bulb = tickBulb(before, k, { online, latency });
      if (s.bulb.confirmTimes.length > before.confirmTimes.length) {
        out.push({
          t: ms,
          kind: "bulb",
          tone: "ok",
          text: `The bulb reported power = ${s.bulb.shadow.reported.power} after ${s.bulb.confirmTimes.at(-1)} s. Desired and reported match again.`,
        });
      }
      for (const w of widgets) {
        const r = runs.get(w.id);
        if (!r || !w.stream) continue;
        const v = formatValue(w.stream, valueAt(streams, w.stream, k));
        if (r.states[k] && !r.states[k - 1]) {
          s.raised++;
          out.push({ t: ms, kind: "alert", tone: "bad", text: `Alert “${widgetName(w)}” went off: ${v}.` });
        } else if (!r.states[k] && r.states[k - 1]) {
          out.push({ t: ms, kind: "alert", tone: "info", text: `Alert “${widgetName(w)}” cleared: ${v}.` });
        }
      }
    }
    if (out.length) pushEvents(out);
  };

  const onReset = () => {
    sim.current = freshSim();
    setEvents([]);
  };

  const clock = useSimClock({ onTick, onReset, stepMs: 1000, maxTimeMs: RUN_S * 1000 });
  const tick = T0 + Math.floor(clock.timeMs / 1000);
  const s = sim.current;
  const bulb = s.bulb;
  const status: BulbView = bulbStatus(bulb);

  const log = (text: string, kind: string, tone: SimEvent["tone"] = "info") => pushEvents([{ t: clock.timeMs, text, kind, tone }]);

  /* Bulb commands (stable callback so the memoised dashboard does not redraw every frame) */
  const sendSwitch = (on: boolean) => {
    const st = sim.current!;
    const next = sendCommand(st.bulb, on ? "on" : "off", tick);
    st.bulb = next;
    rerender();
    let text = `Switch pressed: desired power = ${on ? "on" : "off"} (shadow version ${next.shadow.version}).`;
    if (next.sentAt === undefined) text += " The bulb already reports that, so nothing has to wait.";
    else if (!online) text += " The device is offline, so the command waits in the shadow.";
    else text += ` The bulb should confirm in about ${latency} s.`;
    if (next.sentAt !== undefined && !clock.running) text += " Press Start streams so time can run.";
    log(text, "bulb", next.sentAt !== undefined && !online ? "warn" : "info");
  };
  const switchRef = useRef(sendSwitch);
  switchRef.current = sendSwitch;
  const onSwitch = useCallback((on: boolean) => switchRef.current(on), []);

  const onEdit = useCallback((id: string) => setSelected((cur) => (cur === id ? null : id)), []);
  const showTip = useCallback((id: string) => setSelected(id), []);

  useEffect(() => {
    if (selected) editorRef.current?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [selected, reduced]);

  /* Building the dashboard */
  const add = (kind: WidgetKind) => {
    if (widgets.length >= LIMIT) return;
    const w = makeWidget(`n${nextId.current++}`, kind);
    setWidgets([...widgets, w]);
    log(`Added a ${WIDGETS[kind].label.toLowerCase()}. Tap it to connect it to a stream.`, "dash");
  };

  const load = (name: "empty" | "clean" | "cluttered") => {
    setWidgets(name === "empty" ? [] : preset(name));
    setSelected(null);
    setFocusWidget(null);
    log(name === "empty" ? "Started an empty dashboard." : `Loaded the ${name} example dashboard.`, "dash");
  };

  const update = (id: string, patch: Partial<Widget>) => setWidgets((ws) => ws.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  const bind = (id: string, stream: StreamId | undefined) => {
    setWidgets((ws) => ws.map((w) => (w.id === id ? bindStream(w, stream) : w)));
    const w = widgets.find((x) => x.id === id);
    if (w) log(stream ? `${WIDGETS[w.kind].label} connected to ${getStream(stream).label.toLowerCase()}.` : `${WIDGETS[w.kind].label} disconnected.`, "dash");
  };
  const move = (id: string, by: -1 | 1) =>
    setWidgets((ws) => {
      const i = ws.findIndex((w) => w.id === id);
      const j = i + by;
      if (i < 0 || j < 0 || j >= ws.length) return ws;
      const next = [...ws];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const remove = (id: string) => {
    const w = widgets.find((x) => x.id === id);
    setWidgets((ws) => ws.filter((x) => x.id !== id));
    setSelected(null);
    setFocusWidget(null);
    if (w) log(`Removed “${widgetName(w)}”.`, "dash");
  };

  const changeMode = (m: UpdateMode) => {
    setMode(m);
    log(`Update mode: ${MODE_SHORT[m]}. ${MODE_HINT[m]}`, "dash");
  };
  const changeOnline = (v: boolean) => {
    setOnline(v);
    log(
      v ? "The bulb is back online. It reads any waiting change from the shadow." : "The bulb went offline. New commands will wait in the shadow.",
      "bulb",
      v ? "info" : "warn",
    );
  };

  /* Numbers for readouts and the record */
  const distinct = new Set(widgets.flatMap((w) => (w.stream ? [w.stream] : []))).size;
  const confirmAvg = average(bulb.confirmTimes);
  const activeNow = widgets.some((w) => runs.get(w.id)?.states[tick]);
  const selectedWidget = widgets.find((w) => w.id === selected);
  const selectedIndex = widgets.findIndex((w) => w.id === selected);

  const record = () => {
    const row: ObservationRow = {
      widgets: widgets.length,
      streams: distinct,
      update: MODE_SHORT[mode],
      alerts: s.raised,
      commands: bulb.commands,
      confirm: confirmAvg === null ? "—" : confirmAvg.toFixed(1),
      messages: Math.round(cost.perMinute),
      tips: tips.length,
      modeId: mode,
      age: Math.round(cost.avgAgeS * 10) / 10,
      latency,
      maxConfirm: bulb.confirmTimes.length ? Math.max(...bulb.confirmTimes) : 0,
    };
    addRow(row);
    const auto = summarise([...rows, row]);
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
      recordDisabled={widgets.length === 0}
      recordHint={
        widgets.length === 0
          ? "Add at least one widget first."
          : "Adds the dashboard, the update mode, the alerts, the bulb commands and the tips left to the observation table."
      }
      controls={
        <>
          <div className="grid gap-1.5">
            <p className="text-[0.95rem] font-semibold">Start from</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => load("empty")}>
                Empty
              </Button>
              <Button size="sm" onClick={() => load("clean")}>
                Clean example
              </Button>
              <Button size="sm" onClick={() => load("cluttered")}>
                Cluttered example
              </Button>
            </div>
          </div>
          <div className="grid gap-1.5">
            <p className="text-[0.95rem] font-semibold">Add a widget</p>
            <div className="grid grid-cols-2 gap-2">
              {WIDGET_KINDS.map((k) => {
                const Icon = KIND_ICON[k];
                return (
                  <Button key={k} size="sm" onClick={() => add(k)} disabled={widgets.length >= LIMIT} icon={<Icon size={16} aria-hidden />} className="justify-start">
                    {WIDGETS[k].label}
                  </Button>
                );
              })}
            </div>
            <p className="text-sm text-ink-3">
              {widgets.length >= LIMIT ? `That is the limit of ${LIMIT} widgets.` : `${widgets.length} on the dashboard. Good dashboards keep to ${MAX_WIDGETS} or fewer.`}
            </p>
          </div>
          <div className="grid gap-1.5">
            <Segmented<UpdateMode>
              label="Update"
              size="sm"
              value={mode}
              onChange={changeMode}
              options={(Object.keys(MODE_SHORT) as UpdateMode[]).map((m) => ({ value: m, label: MODE_SHORT[m] }))}
            />
            <p className="text-sm text-ink-3">{MODE_HINT[mode]}</p>
          </div>
          <p className="text-sm text-ink-3">
            Alert rules run in the cloud on every reading. The update mode only changes when the dashboard shows the result.
          </p>
        </>
      }
      stage={
        <div className="@container grid grid-cols-1 gap-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="flex items-center gap-2 font-bold">
              <LayoutDashboard size={18} className="text-u3" aria-hidden /> Home dashboard
            </h3>
            <span className="text-sm text-ink-3">
              {widgets.length} widget{widgets.length === 1 ? "" : "s"} · {MODE_SHORT[mode]}
            </span>
          </div>
          <Dashboard
            widgets={widgets}
            streams={streams}
            tick={tick}
            mode={mode}
            bulb={status}
            onSwitch={onSwitch}
            selected={selected}
            onEdit={onEdit}
            tipIndex={tipIndex}
            focus={focusWidget}
          />
          {selectedWidget ? (
            <Editor
              ref={editorRef}
              widget={selectedWidget}
              index={selectedIndex}
              count={widgets.length}
              onChange={(patch) => update(selectedWidget.id, patch)}
              onBind={(stream) => bind(selectedWidget.id, stream)}
              onMove={(by) => move(selectedWidget.id, by)}
              onRemove={() => remove(selectedWidget.id)}
              onClose={() => setSelected(null)}
            />
          ) : (
            widgets.length > 0 && <p className="text-sm text-ink-3">Tap a widget, or its pencil button, to edit it.</p>
          )}
        </div>
      }
      toolbar={<SimControls clock={clock} playLabel="Start streams" />}
      readouts={
        <div className="@container grid grid-cols-1 gap-3">
          <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-2">
            <TipsPanel tips={tips} onShow={showTip} onFocus={setFocusWidget} />
            <DevicePanel
              bulb={bulb}
              status={status}
              tick={tick}
              online={online}
              latency={latency}
              running={clock.running}
              onOnline={changeOnline}
              onLatency={setLatency}
            />
          </div>
          <Readouts
            items={[
              {
                label: "Widgets",
                value: widgets.length,
                tone: widgets.length > MAX_WIDGETS ? "warn" : "default",
                unit: widgets.length > MAX_WIDGETS ? "too many" : undefined,
                hint: `Keep to ${MAX_WIDGETS} or fewer`,
              },
              { label: "Streams bound", value: distinct, unit: `of ${STREAMS.length}` },
              {
                label: "Alerts raised",
                value: s.raised,
                tone: activeNow ? "bad" : "default",
                unit: activeNow ? "alert on" : undefined,
                hint: "Times an alert rule went off since the streams started",
              },
              { label: "Bulb commands", value: bulb.commands },
              {
                label: "Average confirm time",
                value: confirmAvg === null ? "—" : confirmAvg.toFixed(1),
                unit: confirmAvg === null ? undefined : "s",
                hint: "From pressing the switch until the bulb reported the new state",
              },
              {
                label: "Messages per minute",
                value: Math.round(cost.perMinute),
                hint: "Sum over the bound widgets: push sends only changes, polling asks every interval",
              },
              { label: "Average data age", value: cost.avgAgeS.toFixed(1), unit: "s", hint: "How old a shown value is, on average" },
              { label: "Design tips left", value: tips.length, tone: tips.length ? "warn" : "ok" },
            ]}
          />
        </div>
      }
      log={
        <EventLog
          events={events}
          filters={[
            { kind: "alert", label: "Alerts" },
            { kind: "bulb", label: "Bulb" },
            { kind: "dash", label: "Dashboard" },
          ]}
          emptyText="Nothing yet. Press Start streams, then add widgets."
        />
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard grid                                                      */
/* ------------------------------------------------------------------ */

const Dashboard = memo(function Dashboard({
  widgets,
  streams,
  tick,
  mode,
  bulb,
  onSwitch,
  selected,
  onEdit,
  tipIndex,
  focus,
}: {
  widgets: Widget[];
  streams: Streams;
  tick: number;
  mode: UpdateMode;
  bulb: BulbView;
  onSwitch: (on: boolean) => void;
  selected: string | null;
  onEdit: (id: string) => void;
  tipIndex: Map<string, number[]>;
  focus: string | null;
}) {
  if (!widgets.length) {
    return (
      <div className="grid place-items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-4 py-10 text-center text-ink-3">
        <LayoutDashboard size={28} aria-hidden />
        <p className="font-semibold text-ink-2">The dashboard is empty.</p>
        <p className="text-sm">Tap a widget under Add a widget, or load an example.</p>
      </div>
    );
  }

  const tapCard = (e: MouseEvent<HTMLLIElement>, id: string) => {
    if ((e.target as HTMLElement).closest("button, a, input, label")) return;
    onEdit(id);
  };

  return (
    <ul className="grid grid-cols-2 gap-3 @2xl:grid-cols-4" aria-label="Dashboard widgets">
      {widgets.map((w) => {
        const nums = tipIndex.get(w.id) ?? [];
        const isSel = selected === w.id;
        return (
          <li key={w.id} className={cn("min-w-0 cursor-pointer", w.size === 2 && "col-span-2")} onClick={(e) => tapCard(e, w.id)}>
            <LiveWidget
              widget={w}
              streams={streams}
              tick={tick}
              mode={mode}
              bulb={bulb}
              onSwitch={onSwitch}
              className={cn(isSel && "border-u3 ring-2 ring-u3", focus === w.id && "border-warn ring-2 ring-warn")}
              actions={
                <button
                  type="button"
                  aria-pressed={isSel}
                  aria-label={`Edit ${widgetName(w)}`}
                  onClick={() => onEdit(w.id)}
                  className={cn(
                    "grid size-8 place-items-center rounded-md",
                    isSel ? "bg-u3-soft text-u3" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  <Pencil size={15} aria-hidden />
                </button>
              }
              badges={
                (isSel || nums.length > 0) && (
                  <>
                    {isSel && (
                      <span className="inline-flex items-center gap-1 rounded bg-u3-soft px-1.5 py-0.5 text-xs font-semibold text-u3">
                        <Pencil size={12} aria-hidden />
                        Editing
                      </span>
                    )}
                    {nums.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded bg-warn-soft px-1.5 py-0.5 text-xs font-semibold text-warn">
                        <TriangleAlert size={12} aria-hidden />
                        Tip {nums.join(", ")}
                      </span>
                    )}
                  </>
                )
              }
            />
          </li>
        );
      })}
    </ul>
  );
});

/* ------------------------------------------------------------------ */
/* Widget editor                                                       */
/* ------------------------------------------------------------------ */

function NumberField({
  label,
  value,
  step = 1,
  min,
  onChange,
}: {
  label: string;
  value: number | undefined;
  step?: number;
  min?: number;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="text-sm font-semibold text-ink-2">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className={cn(inputClass, "font-mono")}
      />
    </label>
  );
}

function Editor({
  ref,
  widget: w,
  index,
  count,
  onChange,
  onBind,
  onMove,
  onRemove,
  onClose,
}: {
  ref: Ref<HTMLElement>;
  widget: Widget;
  index: number;
  count: number;
  onChange: (patch: Partial<Widget>) => void;
  onBind: (stream: StreamId | undefined) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const id = useId();
  const info = w.stream ? getStream(w.stream) : undefined;
  const unit = info?.unit ? ` (${info.unit})` : "";
  const Icon = KIND_ICON[w.kind];

  return (
    <section ref={ref} aria-labelledby={`${id}-h`} className="grid grid-cols-1 gap-4 rounded-lg border-2 border-u3 bg-surface p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={`${id}-h`} className="flex min-w-0 items-center gap-2 font-bold">
          <Icon size={18} className="shrink-0 text-u3" aria-hidden />
          Edit the {WIDGETS[w.kind].label.toLowerCase()}
        </h3>
        <Button size="sm" variant="ghost" onClick={onClose} icon={<X size={16} aria-hidden />} className="ml-auto">
          Close
        </Button>
      </div>
      <p className="-mt-2 text-sm text-ink-3">Use it for: {WIDGETS[w.kind].useFor}</p>

      <div className="grid grid-cols-1 gap-5 @2xl:grid-cols-2">
        <div className="grid min-w-0 content-start gap-4">
          <label className="grid min-w-0 gap-1.5">
            <span className="text-sm font-semibold text-ink-2">Title</span>
            <input className={inputClass} value={w.title} maxLength={40} onChange={(e) => onChange({ title: e.target.value })} placeholder="What does it show?" />
          </label>

          {w.kind === "gauge" && (
            <div className="grid grid-cols-2 gap-3">
              <NumberField label={`Minimum${unit}`} value={w.min} onChange={(v) => onChange({ min: v })} />
              <NumberField label={`Maximum${unit}`} value={w.max} onChange={(v) => onChange({ max: v })} />
            </div>
          )}

          {w.kind === "alert" && !info && <p className="text-sm text-ink-3">Connect a stream first, then set when the alert goes off.</p>}
          {w.kind === "alert" && info?.kind === "boolean" && info.states && (
            <Segmented<"above" | "below">
              label={`Goes off while ${info.label.toLowerCase()} is`}
              size="sm"
              value={w.dir ?? "above"}
              onChange={(dir) => onChange({ dir })}
              options={[
                { value: "above", label: info.states[0] },
                { value: "below", label: info.states[1] },
              ]}
            />
          )}
          {w.kind === "alert" && info?.kind === "number" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <NumberField label={`Threshold${unit}`} value={w.threshold} step={info.decimals ? 0.5 : 10} onChange={(v) => onChange({ threshold: v })} />
                <NumberField
                  label={`Hysteresis${unit}`}
                  value={w.hysteresis}
                  step={info.decimals ? 0.1 : 5}
                  min={0}
                  onChange={(v) => onChange({ hysteresis: v === undefined ? undefined : Math.max(0, v) })}
                />
              </div>
              <Segmented<"above" | "below">
                label="Goes off when the value is"
                size="sm"
                value={w.dir ?? "above"}
                onChange={(dir) => onChange({ dir })}
                options={[
                  { value: "above", label: "Above the threshold" },
                  { value: "below", label: "Below the threshold" },
                ]}
              />
              <p className="text-sm text-ink-3">Hysteresis: once on, the alert clears only when the value is back past the threshold by this much.</p>
            </>
          )}

          <Segmented<string>
            label="Size"
            size="sm"
            value={String(w.size)}
            onChange={(v) => onChange({ size: v === "2" ? 2 : 1 })}
            options={[
              { value: "1", label: "1 column" },
              { value: "2", label: "2 columns" },
            ]}
          />

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onMove(-1)} disabled={index <= 0} icon={<ArrowUp size={16} aria-hidden />}>
              Move up
            </Button>
            <Button size="sm" onClick={() => onMove(1)} disabled={index >= count - 1} icon={<ArrowDown size={16} aria-hidden />}>
              Move down
            </Button>
            <Button size="sm" variant="ghost" onClick={onRemove} icon={<Trash2 size={16} aria-hidden />}>
              Remove
            </Button>
          </div>
          <p className="-mt-2 text-sm text-ink-3">
            Position {index + 1} of {count}. People look at the top left first.
          </p>
        </div>

        <fieldset className="grid min-w-0 content-start gap-1">
          <legend className="mb-1.5 text-[0.95rem] font-semibold text-ink">Data stream</legend>
          <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-surface-2">
            <input type="radio" name={`${id}-stream`} checked={!w.stream} onChange={() => onBind(undefined)} className="mt-1 size-4 shrink-0 accent-[var(--brand)]" />
            <span className="font-semibold">Not connected</span>
          </label>
          {STREAMS.map((s) => {
            const r = canBind(w.kind, s.id);
            return (
              <label key={s.id} className={cn("flex items-start gap-2 rounded-md px-2 py-1.5", r.ok ? "cursor-pointer hover:bg-surface-2" : "cursor-not-allowed")}>
                <input
                  type="radio"
                  name={`${id}-stream`}
                  checked={w.stream === s.id}
                  disabled={!r.ok}
                  onChange={() => onBind(s.id)}
                  className="mt-1 size-4 shrink-0 accent-[var(--brand)]"
                />
                <span className="grid min-w-0">
                  <span className={cn("font-semibold", !r.ok && "text-ink-3")}>
                    {s.label}
                    {s.unit && <span className="font-normal text-ink-3"> ({s.unit})</span>}
                  </span>
                  {!r.ok && <span className="text-sm text-ink-3">{r.reason}</span>}
                </span>
              </label>
            );
          })}
        </fieldset>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Design tips                                                         */
/* ------------------------------------------------------------------ */

function TipsPanel({ tips, onShow, onFocus }: { tips: Tip[]; onShow: (id: string) => void; onFocus: (id: string | null) => void }) {
  return (
    <section aria-labelledby="l21-tips" className="grid content-start gap-2.5 rounded-lg border border-line bg-surface p-4">
      <h3 id="l21-tips" className="flex flex-wrap items-baseline gap-x-2 font-bold">
        Design tips
        <span className="text-sm font-normal text-ink-3">{tips.length ? `${tips.length} to fix` : "none"}</span>
      </h3>
      {tips.length === 0 ? (
        <p className="flex items-start gap-2 text-sm text-ink">
          <CircleCheck size={18} className="shrink-0 text-ok" aria-hidden />
          Nothing to fix: this dashboard follows the design rules.
        </p>
      ) : (
        <ol className="grid gap-1.5">
          {tips.map((t, i) => (
            <li
              key={t.id}
              className="flex items-start gap-2 rounded-md border border-line px-2.5 py-2 text-sm"
              onMouseEnter={() => onFocus(t.widget ?? null)}
              onMouseLeave={() => onFocus(null)}
            >
              <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-warn">
                <TriangleAlert size={14} aria-hidden />
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 text-ink">{t.text}</span>
              {t.widget && (
                <button
                  type="button"
                  onClick={() => onShow(t.widget!)}
                  onFocus={() => onFocus(t.widget ?? null)}
                  onBlur={() => onFocus(null)}
                  className="shrink-0 rounded-md px-1.5 font-semibold text-brand underline underline-offset-2 hover:bg-surface-2"
                >
                  Edit it
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
      <p className="text-sm text-ink-3">Hover over a tip to highlight its widget. The same number appears on the widget.</p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The device: porch bulb and its shadow                               */
/* ------------------------------------------------------------------ */

function DevicePanel({
  bulb,
  status,
  tick,
  online,
  latency,
  running,
  onOnline,
  onLatency,
}: {
  bulb: Bulb;
  status: BulbView;
  tick: number;
  online: boolean;
  latency: number;
  running: boolean;
  onOnline: (v: boolean) => void;
  onLatency: (v: number) => void;
}) {
  const pending = bulb.sentAt !== undefined;
  const waited = pending ? tick - bulb.sentAt! : 0;
  const lastConfirm = bulb.confirmTimes.at(-1);
  const row = "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-line py-1.5 last:border-0";

  return (
    <section aria-labelledby="l21-device" className="grid content-start gap-3 rounded-lg border border-line bg-surface p-4">
      <h3 id="l21-device" className="font-bold">
        Porch bulb (the device)
      </h3>
      <div className="flex flex-wrap items-start gap-4">
        <BulbPicture status={status} width={76} />
        <div className="grid min-w-0 flex-1 basis-48 gap-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={online} onChange={(e) => onOnline(e.target.checked)} />
            <span className="font-semibold">Device online</span>
          </label>
          <p className="-mt-1.5 flex items-start gap-1.5 text-sm text-ink-2">
            {online ? <Wifi size={16} className="mt-0.5 shrink-0 text-ok" aria-hidden /> : <WifiOff size={16} className="mt-0.5 shrink-0 text-bad" aria-hidden />}
            {online ? "Connected: it checks its shadow every second." : "Offline: commands wait in the shadow."}
          </p>
          <Slider
            label="Network delay"
            value={latency}
            min={1}
            max={10}
            step={1}
            unit="s"
            onChange={onLatency}
            hint="Time for a command to reach the bulb and the reply to come back."
          />
        </div>
      </div>
      <div className="grid gap-1">
        <p className="text-sm font-semibold text-ink-2">Device shadow in the cloud</p>
        <dl className="text-sm">
          <div className={row}>
            <dt className="text-ink-2">Desired (set by the switch)</dt>
            <dd className="font-mono text-ink">power: {String(bulb.shadow.desired.power)}</dd>
          </div>
          <div className={row}>
            <dt className="text-ink-2">Reported (by the bulb)</dt>
            <dd className="font-mono text-ink">power: {String(bulb.shadow.reported.power)}</dd>
          </div>
          <div className={row}>
            <dt className="text-ink-2">Delta (still to apply)</dt>
            <dd className="flex items-center gap-1 font-mono text-ink">
              {pending ? (
                <>
                  <LoaderCircle size={14} className="text-ink-2 motion-safe:animate-spin" aria-hidden />
                  power: {String(bulb.shadow.desired.power)}
                </>
              ) : (
                <>
                  <CircleCheck size={14} className="text-ok" aria-hidden />
                  none
                </>
              )}
            </dd>
          </div>
          <div className={row}>
            <dt className="text-ink-2">{pending ? "Waiting for the bulb" : "Last confirm time"}</dt>
            <dd className="font-mono text-ink">{pending ? `${waited} s` : lastConfirm === undefined ? "—" : `${lastConfirm} s`}</dd>
          </div>
          <div className={row}>
            <dt className="text-ink-2">Shadow version</dt>
            <dd className="font-mono text-ink">{bulb.shadow.version}</dd>
          </div>
        </dl>
        {pending && !running && <p className="text-sm text-warn">Time is paused. Press Start streams so the bulb can check in.</p>}
      </div>
    </section>
  );
}
