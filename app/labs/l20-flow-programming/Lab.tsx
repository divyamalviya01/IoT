import "@xyflow/react/dist/style.css";
import "./flow.css";
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlow,
  getBezierPath,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeProps,
  type FitViewOptions,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import {
  ArrowRightLeft,
  BellRing,
  Braces,
  Bug,
  CircleAlert,
  CircleCheck,
  CircleX,
  Eraser,
  Funnel,
  Gauge,
  Lightbulb,
  Mail,
  MessageSquare,
  RadioTower,
  Rocket,
  Split,
  Thermometer,
  Trash2,
  TriangleAlert,
  Unplug,
  type LucideIcon,
} from "lucide-react";
import { useReducedMotion } from "motion/react";
import { createContext, memo, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { LabLayout } from "~/components/lab/LabLayout";
import { Readouts } from "~/components/lab/Readouts";
import { EventLog, type SimEvent } from "~/components/sim/EventLog";
import { SimControls } from "~/components/sim/SimControls";
import { useSimClock } from "~/components/sim/useSimClock";
import { Button } from "~/components/ui/Button";
import { Segmented } from "~/components/ui/Segmented";
import { getLab } from "~/content/registry";
import type { ObservationRow } from "~/content/types";
import { cn } from "~/lib/cn";
import { useObservations } from "~/lib/observations";
import { useResolvedTheme } from "~/lib/theme";
import { useHydrated } from "~/lib/useHydrated";
import {
  CHALLENGES,
  DEFAULT_TICKS,
  KINDS,
  PALETTE,
  describeNode,
  getChallenge,
  makeNode,
  simulate,
  validateFlow,
  wire,
  type Flow,
  type FlowNode,
  type Message,
  type NodeConfig,
  type NodeGroup,
  type NodeKind,
  type Problem,
  type RunResult,
  type Wire,
} from "./engine";
import { TICK_MS, buildReplay, countsAt, fromView, hopProgress, hotCount, nextId, nextSpot, shortResult, summarise, toView, type Replay, type ReplayTick } from "./replay";

const lab = getLab("l20-flow-programming")!;

const steps = [
  "Challenge 1, Live gauge: press Dashboard gauge in the palette. Wire the sensor's output port to the gauge's input port: drag between them, or tap one port and then the other.",
  "Press Deploy. The replay of the first minute starts: choose 4× to go faster, or press Step. Read the verdict, then press Record observation.",
  "Choose challenge 2, Heat alert, and press Clear canvas. Add a Threshold (> 35) and an Alert, and wire the Yes port to the Alert. Wire the No port to a Debug node. Deploy, replay and record.",
  "Choose challenge 3, Fahrenheit to MQTT. Build Sensor → °C → °F → Template → MQTT out, and set the topic to home/temp/f. Deploy, replay and record.",
  "Choose challenge 4, Save data. Build Sensor → Report by exception (0.5) → MQTT out on home/temp. Deploy, replay and record. Compare its MQTT count with challenge 3.",
  "Stuck? Press Load example to see a flow that works. Then delete a wire and press Deploy to see how errors are shown. Open the lab record when you are done.",
];

const RUN_MS = DEFAULT_TICKS * TICK_MS;
/** Canvases narrower than this show the flow top to bottom. */
const VERTICAL_BELOW = 560;
/** Room on the left for the zoom buttons, and above nodes for their message counts. */
const FIT: FitViewOptions = { padding: { top: "30px", right: "24px", bottom: "30px", left: "60px" }, maxZoom: 1 };
const DELETE_KEYS = ["Backspace", "Delete"];
const NO_PROBLEMS: Problem[] = [];
const noop = () => {};

const startFlow = (): Flow => ({ nodes: [makeNode("n1", "sensor", {}, 40, 120)], wires: [] });

const GROUP: Record<NodeGroup, { label: string; color: string; soft: string }> = {
  input: { label: "Input", color: "var(--u1)", soft: "var(--u1-soft)" },
  function: { label: "Function", color: "var(--u2)", soft: "var(--u2-soft)" },
  output: { label: "Output", color: "var(--u3)", soft: "var(--u3-soft)" },
};
const GROUPS: NodeGroup[] = ["input", "function", "output"];

const ICON: Record<NodeKind, LucideIcon> = {
  sensor: Thermometer,
  convert: ArrowRightLeft,
  threshold: Split,
  filter: Funnel,
  template: Braces,
  mqtt: RadioTower,
  dashboard: Gauge,
  alert: BellRing,
  debug: Bug,
};

const nodeName = (n: FlowNode) => `${KINDS[n.kind].label} (${n.id})`;
const subtitle = (n: FlowNode) => describeNode(n).replace("NaN", "?");
const hasSettings = (kind: NodeKind) => Object.keys(KINDS[kind].defaults).length > 0;
const idNumber = (id: string) => Number(id.replace(/\D/g, "")) || 0;
const portOf = (handle?: string | null) => Number(handle?.replace("out-", "") ?? 0) || 0;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function nameOf(flow: Flow, id: string) {
  const n = flow.nodes.find((x) => x.id === id);
  return n ? nodeName(n) : id;
}

function wireText(flow: Flow, w: Wire) {
  const from = flow.nodes.find((n) => n.id === w.from);
  const port = from ? KINDS[from.kind].outputLabels?.[w.port] : undefined;
  return `${nameOf(flow, w.from)}${port ? ` ${port} port` : ""} → ${nameOf(flow, w.to)}`;
}

/* ------------------------------------------------------------------ */
/* Replay frame, shared with the canvas nodes and wires                */
/* ------------------------------------------------------------------ */

interface Frame {
  /** Running message counts; null before a deploy */
  wires: Record<string, number> | null;
  nodes: Record<string, number> | null;
  /** The tick whose messages are moving now */
  tick: ReplayTick | null;
  frac: number;
  animate: boolean;
}
const NO_FRAME: Frame = { wires: null, nodes: null, tick: null, frac: 0, animate: false };
const FrameContext = createContext<Frame>(NO_FRAME);

interface Run {
  flow: Flow;
  result: RunResult;
  replay: Replay;
  challengeId: string;
  warnings: Problem[];
}

type Size = { width: number; height: number };
type RFNodeData = { node: FlowNode; problems: Problem[]; vertical: boolean };
type RFNode = Node<RFNodeData, "flow">;
type RFEdge = Edge<Record<string, never>, "wire">;

function useWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/* ------------------------------------------------------------------ */
/* Lab                                                                 */
/* ------------------------------------------------------------------ */

export default function FlowProgrammingLab() {
  const [flow, setFlow] = useState<Flow>(startFlow);
  const [challengeId, setChallengeId] = useState(CHALLENGES[0].id);
  const [selNode, setSelNode] = useState<string | null>(null);
  const [selWire, setSelWire] = useState<string | null>(null);
  const [measured, setMeasured] = useState<Record<string, Size>>({});
  const [run, setRun] = useState<Run | null>(null);
  const [changed, setChanged] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  const [status, setStatus] = useState("Only the sensor is on the canvas. Add nodes from the palette and wire them up.");
  const [fitKey, setFitKey] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const hydrated = useHydrated();
  const theme = useResolvedTheme();
  const reduced = useReducedMotion() ?? false;
  const wrapRef = useRef<HTMLDivElement>(null);
  const width = useWidth(wrapRef);
  const vertical = width > 0 && width < VERTICAL_BELOW;
  const { rows, summary, addRow, setSummary } = useObservations(lab.slug);
  const lastAuto = useRef("");

  const clock = useSimClock({ onTick: noop, stepMs: TICK_MS, maxTimeMs: RUN_MS });
  const { reset, play } = clock;

  // Read by stable callbacks, which may run before React re-renders.
  const flowRef = useRef(flow);
  flowRef.current = flow;
  const runRef = useRef(run);
  runRef.current = run;
  const verticalRef = useRef(vertical);
  verticalRef.current = vertical;
  const idSeq = useRef(1);

  // A new canvas (turned, or a fresh flow loaded) measures its nodes again.
  const canvasKey = `${vertical ? "v" : "h"}-${epoch}`;
  const [measuredFor, setMeasuredFor] = useState(canvasKey);
  if (measuredFor !== canvasKey) {
    setMeasuredFor(canvasKey);
    setMeasured({});
  }

  const challenge = getChallenge(challengeId);
  const challengeNo = CHALLENGES.indexOf(challenge) + 1;
  const problems = useMemo(() => validateFlow(flow), [flow]);
  const errorCount = problems.filter((p) => p.level === "error").length;

  /* ---------------- editing ---------------- */

  /** Any change to the flow itself means it must be deployed again. */
  const invalidate = useCallback(() => {
    if (runRef.current) {
      setRun(null);
      setChanged(true);
    }
    reset();
  }, [reset]);

  const updateFlow = useCallback(
    (fn: (f: Flow) => Flow) => {
      setFlow(fn);
      invalidate();
    },
    [invalidate],
  );

  const addNode = useCallback(
    (kind: NodeKind) => {
      const f = flowRef.current;
      const num = Math.max(idNumber(nextId(f.nodes)), idSeq.current + 1);
      idSeq.current = num;
      const spot = nextSpot(f, kind);
      const node = makeNode(`n${num}`, kind, {}, spot.x, spot.y);
      updateFlow((cur) => ({ ...cur, nodes: [...cur.nodes, node] }));
      setSelNode(node.id);
      setSelWire(null);
      setFitKey((k) => k + 1);
      setStatus(`Added ${nodeName(node)}. Wire it into the flow${hasSettings(kind) ? ", then check its settings below the canvas" : ""}.`);
    },
    [updateFlow],
  );

  const connect = useCallback(
    (from: string, to: string, port: number) => {
      const f = flowRef.current;
      const w = wire(from, to, port);
      if (from === to || f.wires.some((x) => x.id === w.id)) return;
      updateFlow((cur) => (cur.wires.some((x) => x.id === w.id) ? cur : { ...cur, wires: [...cur.wires, w] }));
      setStatus(`Wire added: ${wireText(f, w)}.`);
    },
    [updateFlow],
  );

  const remove = useCallback(
    (nodeIds: string[], wireIds: string[]) => {
      const f = flowRef.current;
      const gone = new Set(nodeIds);
      const cut = new Set(wireIds);
      updateFlow((cur) => ({
        nodes: cur.nodes.filter((n) => !gone.has(n.id)),
        wires: cur.wires.filter((w) => !cut.has(w.id) && !gone.has(w.from) && !gone.has(w.to)),
      }));
      setSelNode((s) => (s && gone.has(s) ? null : s));
      setSelWire((s) => (s && cut.has(s) ? null : s));
      if (nodeIds.length) setStatus(`Deleted ${nodeIds.map((id) => nameOf(f, id)).join(", ")} and the wires joined to it.`);
      else if (wireIds.length) {
        const texts = wireIds.map((id) => f.wires.find((w) => w.id === id)).filter((w): w is Wire => !!w).map((w) => wireText(f, w));
        setStatus(`Deleted the wire ${texts.join(", ")}.`);
      }
    },
    [updateFlow],
  );

  const setConfig = useCallback(
    (id: string, patch: NodeConfig) =>
      updateFlow((cur) => ({ ...cur, nodes: cur.nodes.map((n) => (n.id === id ? { ...n, config: { ...n.config, ...patch } } : n)) })),
    [updateFlow],
  );

  const selectNode = useCallback((id: string | null) => {
    setSelNode(id);
    setSelWire(null);
  }, []);

  /* ---------------- React Flow events ---------------- */

  const onNodesChange = useCallback((changes: NodeChange<RFNode>[]) => {
    const moved = new Map<string, { x: number; y: number }>();
    const dims: Record<string, Size> = {};
    for (const c of changes) {
      if (c.type === "position" && c.position) moved.set(c.id, fromView(c.position, verticalRef.current));
      else if (c.type === "dimensions" && c.dimensions) dims[c.id] = c.dimensions;
      else if (c.type === "select") {
        if (c.selected) {
          setSelNode(c.id);
          setSelWire(null);
        } else setSelNode((s) => (s === c.id ? null : s));
      }
    }
    // Moving a node changes only the drawing, so the deployed run stays.
    if (moved.size) {
      setFlow((f) => ({
        ...f,
        nodes: f.nodes.map((n) => {
          const p = moved.get(n.id);
          return p ? { ...n, x: p.x, y: p.y } : n;
        }),
      }));
    }
    if (Object.keys(dims).length) {
      setMeasured((m) => (Object.entries(dims).every(([id, d]) => m[id]?.width === d.width && m[id]?.height === d.height) ? m : { ...m, ...dims }));
    }
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<RFEdge>[]) => {
    for (const c of changes) {
      if (c.type !== "select") continue;
      if (c.selected) {
        setSelWire(c.id);
        setSelNode(null);
      } else setSelWire((s) => (s === c.id ? null : s));
    }
  }, []);

  const onConnect = useCallback((c: Connection) => connect(c.source, c.target, portOf(c.sourceHandle)), [connect]);

  const isValidConnection = useCallback((c: Connection | RFEdge) => {
    const f = flowRef.current;
    if (!c.source || !c.target || c.source === c.target) return false;
    const to = f.nodes.find((n) => n.id === c.target);
    if (!to || KINDS[to.kind].inputs === 0) return false;
    return !f.wires.some((w) => w.id === wire(c.source, c.target, portOf(c.sourceHandle)).id);
  }, []);

  const onDelete = useCallback(
    ({ nodes, edges }: { nodes: RFNode[]; edges: RFEdge[] }) =>
      remove(
        nodes.map((n) => n.id),
        edges.map((e) => e.id),
      ),
    [remove],
  );

  const onClickConnectStart = useCallback(() => setStatus("Port picked. Now tap the port you want to wire it to."), []);

  /* ---------------- challenge, deploy, record ---------------- */

  const chooseChallenge = (id: string) => {
    const c = getChallenge(id);
    setChallengeId(c.id);
    setRun(null);
    setChanged(false);
    setShowProblems(false);
    reset();
    setStatus(`Challenge ${CHALLENGES.indexOf(c) + 1}, ${c.title}. Build the flow on the canvas, or press Load example.`);
  };

  const loadFlow = (f: Flow, message: string) => {
    idSeq.current = Math.max(idSeq.current, ...f.nodes.map((n) => idNumber(n.id)));
    updateFlow(() => f);
    selectNode(null);
    setShowProblems(false);
    setEpoch((e) => e + 1);
    setStatus(message);
  };

  const loadExample = () => loadFlow(challenge.example(), `Example loaded for ${challenge.title}. Press Deploy to test it.`);
  const clearCanvas = () => loadFlow(startFlow(), "Canvas cleared: only the sensor is left.");

  const deploy = () => {
    const f = flowRef.current;
    const found = validateFlow(f);
    const errors = found.filter((p) => p.level === "error").length;
    if (errors) {
      setRun(null);
      reset();
      setShowProblems(true);
      setStatus(`Deploy stopped by ${plural(errors, "error")}. The list below says what to fix.`);
      return;
    }
    const result = simulate(f);
    setRun({ flow: f, result, replay: buildReplay(f, result), challengeId, warnings: found });
    setChanged(false);
    setShowProblems(false);
    reset();
    play();
    setStatus(
      reduced
        ? "The number on each wire counts the messages that have crossed it."
        : "Each moving dot is a message. The number on each wire counts the messages that have crossed it.",
    );
  };

  const done = run ? Math.min(DEFAULT_TICKS, Math.floor(clock.timeMs / TICK_MS)) : 0;
  const frac = run && done < DEFAULT_TICKS ? clock.timeMs / TICK_MS - done : 0;
  const finished = run !== null && clock.timeMs >= RUN_MS;
  const animate = clock.running && !reduced;
  const verdict = useMemo(() => (run ? getChallenge(run.challengeId).check(run.result) : null), [run]);

  const frame = useMemo<Frame>(() => {
    if (!run) return NO_FRAME;
    const c = countsAt(run.replay, done, frac);
    return { wires: c.wires, nodes: c.nodes, tick: run.replay.ticks[done] ?? null, frac, animate };
  }, [run, done, frac, animate]);

  const record = () => {
    if (!run || !finished || !verdict) return;
    const r = run.result;
    const c = getChallenge(run.challengeId);
    const row: ObservationRow = {
      challenge: `${CHALLENGES.indexOf(c) + 1}. ${c.title}`,
      nodes: run.flow.nodes.length,
      wires: run.flow.wires.length,
      readings: r.readings.length,
      mqtt: r.mqtt.length,
      alerts: r.alerts.length,
      dashboard: r.dashboard.length,
      result: shortResult(c.id, r, verdict),
      challengeId: c.id,
      passed: verdict.pass ? 1 : 0,
      hot: hotCount(r),
    };
    addRow(row);
    const auto = summarise([...rows, row]);
    if (auto && (summary === "" || summary === lastAuto.current)) {
      setSummary(auto);
      lastAuto.current = auto;
    }
    setStatus(`Recorded challenge ${CHALLENGES.indexOf(c) + 1} in the observation table.`);
  };

  /* ---------------- React Flow nodes and edges ---------------- */

  const problemsByNode = useMemo(() => {
    const m = new Map<string, Problem[]>();
    for (const p of problems) if (p.node) m.set(p.node, [...(m.get(p.node) ?? []), p]);
    return m;
  }, [problems]);

  const rfNodes = useMemo<RFNode[]>(
    () =>
      flow.nodes.map((n) => {
        const own = problemsByNode.get(n.id) ?? NO_PROBLEMS;
        const errors = own.filter((p) => p.level === "error");
        const warnings = own.filter((p) => p.level === "warning");
        const sub = subtitle(n);
        const notes = [errors.length ? `Error: ${errors.map((p) => p.text).join(" ")}` : "", warnings.length ? `Warning: ${warnings.map((p) => p.text).join(" ")}` : ""];
        return {
          id: n.id,
          type: "flow",
          position: toView(n.x ?? 0, n.y ?? 0, vertical),
          data: { node: n, problems: own, vertical },
          selected: n.id === selNode,
          measured: measured[n.id],
          ariaLabel: [`${nodeName(n)}${sub ? `, ${sub}` : ""}.`, ...notes].filter(Boolean).join(" "),
        };
      }),
    [flow.nodes, problemsByNode, vertical, selNode, measured],
  );

  const rfEdges = useMemo<RFEdge[]>(
    () =>
      flow.wires.map((w) => ({
        id: w.id,
        type: "wire",
        source: w.from,
        sourceHandle: `out-${w.port}`,
        target: w.to,
        targetHandle: "in",
        selected: w.id === selWire,
        ariaLabel: `Wire ${wireText(flow, w)}`,
      })),
    [flow, selWire],
  );

  /* ---------------- page slots ---------------- */

  const controls = useMemo(
    () => (
      <>
        <Segmented<string>
          label="Challenge"
          size="sm"
          value={challengeId}
          onChange={chooseChallenge}
          options={CHALLENGES.map((c, i) => ({ value: c.id, label: `${i + 1}. ${c.title}` }))}
        />
        <div className="grid gap-2 rounded-lg border border-line bg-surface-2 p-3 text-sm">
          <p className="text-ink">
            <span className="font-semibold">Goal: </span>
            {challenge.goal}
          </p>
          <p className="text-ink-2">
            <span className="font-semibold text-ink">Hint: </span>
            {challenge.hint}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={loadExample} icon={<Lightbulb size={16} aria-hidden />}>
            Load example
          </Button>
          <Button size="sm" variant="ghost" onClick={clearCanvas} icon={<Eraser size={16} aria-hidden />}>
            Clear canvas
          </Button>
        </div>
        <p className="text-sm text-ink-3">
          To wire two nodes, drag from an output port to an input port, or tap one port and then the other.{" "}
          {vertical
            ? "Here the flow runs downwards: inputs are at the top of a node, outputs at the bottom."
            : "The flow runs left to right: inputs are on the left of a node, outputs on the right."}
        </p>
      </>
    ),
    // chooseChallenge, loadExample and clearCanvas only use setters and the challenge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [challengeId, challenge, vertical],
  );

  const selectedNode = flow.nodes.find((n) => n.id === selNode) ?? null;
  const selectedWire = flow.wires.find((w) => w.id === selWire) ?? null;
  const deployed = run !== null;

  const stage = useMemo(
    () => (
      <div className="grid grid-cols-1 gap-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button variant="primary" onClick={deploy} icon={<Rocket size={16} aria-hidden />}>
            Deploy
          </Button>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-2">
            {deployed ? (
              <>
                <CircleCheck size={16} className="shrink-0 text-ok" aria-hidden />
                {finished ? "Deployed. Replay finished." : "Deployed. Replaying the first minute."}
              </>
            ) : changed ? (
              <>
                <TriangleAlert size={16} className="shrink-0 text-warn" aria-hidden />
                Changed since the last deploy. Press Deploy again.
              </>
            ) : (
              "Not deployed yet."
            )}
          </p>
        </div>
        <p className="min-h-6 text-sm text-ink" aria-live="polite">
          {status}
        </p>
        {showProblems && <ProblemList problems={problems} errorCount={errorCount} onSelect={selectNode} />}
        {run && run.warnings.length > 0 && <ProblemList problems={run.warnings} errorCount={0} onSelect={selectNode} deployed />}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[11rem_minmax(0,1fr)]">
          <Palette onAdd={addNode} />
          <div
            ref={wrapRef}
            role="region"
            aria-label="Flow canvas"
            className="l20-flow relative h-80 w-full min-w-0 overflow-hidden rounded-lg border border-line-strong bg-surface sm:h-96"
          >
            {hydrated && width > 0 ? (
              <FlowCanvas
                key={canvasKey}
                nodes={rfNodes}
                edges={rfEdges}
                theme={theme}
                fitKey={`${fitKey}-${Math.round(width / 40)}`}
                reduced={reduced}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                isValidConnection={isValidConnection}
                onDelete={onDelete}
                onClickConnectStart={onClickConnectStart}
              />
            ) : (
              <div className="grid h-full place-items-center p-4 text-center text-sm text-ink-3">Loading the flow editor…</div>
            )}
          </div>
        </div>

        <Inspector flow={flow} node={selectedNode} wire={selectedWire} problems={problems} onConfig={setConfig} onRemove={remove} onConnect={connect} />
        <Legend />
      </div>
    ),
    // deploy reads the flow through flowRef; the other handlers are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      deployed,
      run,
      finished,
      changed,
      status,
      showProblems,
      problems,
      errorCount,
      hydrated,
      width,
      canvasKey,
      rfNodes,
      rfEdges,
      theme,
      fitKey,
      reduced,
      flow,
      selectedNode,
      selectedWire,
      challengeId,
    ],
  );

  const outputs = useMemo(() => {
    if (!run) return null;
    const r = run.result;
    const before = <T extends { t: number }>(xs: T[]) => xs.filter((x) => x.t < done);
    const dashIds = new Set(run.flow.nodes.filter((n) => n.kind === "dashboard").map((n) => n.id));
    let gauge: Message | null = null;
    for (let t = done - 1; t >= 0 && !gauge; t--) {
      const hops = run.replay.ticks[t].hops;
      for (let i = hops.length - 1; i >= 0; i--) {
        if (dashIds.has(hops[i].to)) {
          gauge = hops[i].msg;
          break;
        }
      }
    }
    const readings = before(r.readings);
    return {
      readings,
      hot: readings.filter((x) => x.value > 35).length,
      mqtt: before(r.mqtt),
      alerts: before(r.alerts),
      dashboard: before(r.dashboard),
      debug: before(r.debug),
      gauge,
      wireTotal: Object.values(run.replay.wireBefore[done]).reduce((a, b) => a + b, 0),
    };
  }, [run, done]);

  const readouts = useMemo(() => {
    if (!run || !outputs) {
      return (
        <p className="text-sm text-ink-3">
          Challenge {challengeNo}, {challenge.title}: press Deploy to run the flow. A replay of its first minute, one reading a second, then
          fills the MQTT broker, alerts, gauge and debug log.
        </p>
      );
    }
    const o = outputs;
    return (
      <>
        {finished && verdict ? (
          <div role="status" className={cn("flex items-start gap-3 rounded-lg border p-3", verdict.pass ? "border-ok bg-ok-soft" : "border-bad bg-bad-soft")}>
            {verdict.pass ? <CircleCheck size={22} className="mt-0.5 shrink-0 text-ok" aria-hidden /> : <CircleX size={22} className="mt-0.5 shrink-0 text-bad" aria-hidden />}
            <div className="grid min-w-0 gap-0.5">
              <p className="font-bold text-ink">
                {verdict.pass ? "Passed" : "Not passed yet"}: challenge {CHALLENGES.findIndex((c) => c.id === run.challengeId) + 1}, {getChallenge(run.challengeId).title}
              </p>
              <p className="text-sm text-ink-2">{verdict.text}</p>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-line bg-surface p-3 text-sm text-ink-2">
            The verdict for {getChallenge(run.challengeId).title} appears when the replay reaches 60 s.
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <OutputPanel title="MQTT broker" icon={RadioTower} count={o.mqtt.length} unit="published">
            {o.mqtt.length ? (
              <ol className="grid gap-1.5" aria-label="Newest MQTT messages">
                {o.mqtt
                  .slice(-5)
                  .reverse()
                  .map((m, i) => (
                    <li key={`${m.t}-${i}`} className="grid min-w-0 gap-0.5 border-b border-line pb-1.5 last:border-0 last:pb-0">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="shrink-0 font-mono text-xs text-ink-3">{m.t} s</span>
                        <span className="min-w-0 font-mono text-sm font-semibold break-all text-ink">{m.topic}</span>
                      </span>
                      <span className="font-mono text-sm break-all text-ink-2">{m.payload}</span>
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="text-sm text-ink-3">Nothing published yet.</p>
            )}
          </OutputPanel>
          <OutputPanel title="Alerts" icon={BellRing} count={o.alerts.length} unit="sent">
            {o.alerts.length ? (
              <ol className="grid gap-1.5" aria-label="Newest alerts">
                {o.alerts
                  .slice(-4)
                  .reverse()
                  .map((a, i) => {
                    const Icon = a.channel === "Email" ? Mail : MessageSquare;
                    return (
                      <li key={`${a.t}-${i}`} className="grid min-w-0 gap-0.5 border-b border-line pb-1.5 last:border-0 last:pb-0">
                        <span className="flex items-center gap-1.5 text-xs text-ink-3">
                          <Icon size={13} className="shrink-0" aria-hidden />
                          <span className="font-mono">{a.t} s</span>
                          <span className="font-semibold">{a.channel}</span>
                        </span>
                        <span className="min-w-0 text-sm break-words text-ink">{a.text}</span>
                      </li>
                    );
                  })}
              </ol>
            ) : (
              <p className="text-sm text-ink-3">No alert sent yet.</p>
            )}
          </OutputPanel>
          <OutputPanel title="Dashboard gauge" icon={Gauge} count={o.dashboard.length} unit="updates">
            <GaugeDial msg={o.gauge} />
          </OutputPanel>
        </div>
        <Readouts
          items={[
            { label: "Readings taken", value: o.readings.length },
            { label: "Above 35 °C", value: o.hot },
            { label: "Messages on wires", value: o.wireTotal, hint: "Every time a message crossed a wire" },
            { label: "MQTT published", value: o.mqtt.length },
            { label: "Alerts sent", value: o.alerts.length },
            { label: "Gauge updates", value: o.dashboard.length },
            { label: "Debug lines", value: o.debug.length },
            { label: "Nodes / wires", value: `${run.flow.nodes.length} / ${run.flow.wires.length}` },
          ]}
        />
      </>
    );
  }, [run, outputs, finished, verdict, challengeNo, challenge]);

  const log = useMemo(() => {
    const names = new Map((run?.flow.nodes ?? []).map((n) => [n.id, nodeName(n)]));
    const events: SimEvent[] = (outputs?.debug ?? []).map((d, i) => ({
      id: i,
      t: d.t * TICK_MS,
      text: `${names.get(d.node) ?? d.node}: ${d.text}`,
      tone: d.text.includes("not a number") ? "warn" : "info",
    }));
    return (
      <EventLog
        title="Debug log"
        events={events}
        height={180}
        emptyText={run ? "Nothing printed yet. A Debug node prints every message it receives here." : "Deploy the flow to see what the Debug nodes print."}
      />
    );
  }, [run, outputs]);

  return (
    <FrameContext.Provider value={frame}>
      <LabLayout
        lab={lab}
        steps={steps}
        onRecord={record}
        recordDisabled={!finished}
        recordHint={
          finished
            ? `Adds challenge ${CHALLENGES.findIndex((c) => c.id === run?.challengeId) + 1} and its result to the observation table.`
            : "Deploy the flow and let the replay reach 60 s first."
        }
        controls={controls}
        stage={stage}
        toolbar={run ? <SimControls clock={clock} playLabel="Play" /> : undefined}
        readouts={readouts}
        log={log}
      />
    </FrameContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Canvas                                                              */
/* ------------------------------------------------------------------ */

interface CanvasProps {
  nodes: RFNode[];
  edges: RFEdge[];
  theme: "light" | "dark";
  /** Changes when a node is added or the canvas is resized: the view fits again */
  fitKey: string;
  reduced: boolean;
  onNodesChange: (changes: NodeChange<RFNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<RFEdge>[]) => void;
  onConnect: (c: Connection) => void;
  isValidConnection: (c: Connection | RFEdge) => boolean;
  onDelete: (p: { nodes: RFNode[]; edges: RFEdge[] }) => void;
  onClickConnectStart: () => void;
}

const FlowCanvas = memo(function FlowCanvas(p: CanvasProps) {
  return (
    <ReactFlow<RFNode, RFEdge>
      nodes={p.nodes}
      edges={p.edges}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      onNodesChange={p.onNodesChange}
      onEdgesChange={p.onEdgesChange}
      onConnect={p.onConnect}
      isValidConnection={p.isValidConnection}
      onDelete={p.onDelete}
      onClickConnectStart={p.onClickConnectStart}
      colorMode={p.theme}
      fitView
      fitViewOptions={FIT}
      minZoom={0.3}
      maxZoom={1.6}
      connectOnClick
      deleteKeyCode={DELETE_KEYS}
      selectionKeyCode={null}
      multiSelectionKeyCode={null}
      zoomOnDoubleClick={false}
      zoomOnScroll={false}
      preventScrolling={false}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} />
      <Controls showInteractive={false} fitViewOptions={FIT} />
      <FitOnSignal signal={p.fitKey} reduced={p.reduced} />
    </ReactFlow>
  );
});

/** Fits the view again after a node is added or the canvas resizes, so no node is off screen. */
function FitOnSignal({ signal, reduced }: { signal: string; reduced: boolean }) {
  const { fitView } = useReactFlow();
  const first = useRef(signal);
  useEffect(() => {
    if (signal === first.current) return;
    // Wait a moment so React Flow has measured a resized canvas first.
    const timer = window.setTimeout(() => void fitView({ ...FIT, duration: reduced ? 0 : 250 }), 120);
    return () => window.clearTimeout(timer);
  }, [signal, reduced, fitView]);
  return null;
}

/** Position of a point part-way (0 to 1) along a cubic Bézier path "M x,y C x,y x,y x,y". */
function bezierPoint(path: string, p: number) {
  const n = path.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
  if (n.length < 8) return null;
  const [x0, y0, x1, y1, x2, y2, x3, y3] = n;
  const u = 1 - p;
  const a = u * u * u;
  const b = 3 * u * u * p;
  const c = 3 * u * p * p;
  const d = p * p * p;
  return { x: a * x0 + b * x1 + c * x2 + d * x3, y: a * y0 + b * y1 + c * y2 + d * y3 };
}

function WireEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected }: EdgeProps<RFEdge>) {
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const frame = useContext(FrameContext);
  const count = frame.wires?.[id];
  const tick = frame.tick;
  const dots =
    frame.animate && tick
      ? tick.hops
          .filter((h) => h.wire === id)
          .map((h) => hopProgress(h.depth, tick.levels, frame.frac))
          .filter((q) => q > 0 && q < 1)
      : [];
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={26}
        style={{ stroke: selected ? "var(--brand)" : count ? "var(--ink-2)" : "var(--ink-3)", strokeWidth: selected ? 4 : 2 }}
      />
      {dots.map((q, i) => {
        const pt = bezierPoint(path, q);
        return pt ? <circle key={i} cx={pt.x} cy={pt.y} r={5.5} fill="var(--brand)" stroke="var(--surface)" strokeWidth={2} className="pointer-events-none" /> : null;
      })}
      {count !== undefined && (
        <EdgeLabelRenderer>
          <div
            className="absolute rounded-full border border-line-strong bg-surface px-1.5 font-mono text-[11px] leading-4 tabular-nums text-ink"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            aria-hidden
          >
            {count}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

function FlowNodeView({ id, data, selected }: NodeProps<RFNode>) {
  const { node, problems, vertical } = data;
  const info = KINDS[node.kind];
  const g = GROUP[info.group];
  const Icon = ICON[node.kind];
  const frame = useContext(FrameContext);
  const count = frame.nodes?.[id];
  const errors = problems.filter((p) => p.level === "error");
  const warnings = problems.filter((p) => p.level === "warning");
  const sub = subtitle(node);
  const two = info.outputs === 2;
  const portAt = (i: number) => (two ? (i === 0 ? "25%" : "75%") : "50%");

  return (
    <div
      className={cn("l20-node relative flex w-[10.5rem] rounded-lg border-2", !vertical && two ? "min-h-[4.5rem]" : "min-h-14")}
      style={{
        background: g.soft,
        borderColor: selected ? "var(--brand)" : g.color,
        boxShadow: [errors.length ? "0 0 0 2px var(--surface), 0 0 0 5px var(--bad)" : "", selected ? "0 4px 14px rgb(0 0 0 / 0.18)" : "0 1px 2px rgb(0 0 0 / 0.12)"]
          .filter(Boolean)
          .join(", "),
      }}
      title={problems.map((p) => p.text).join("\n") || info.help}
    >
      {info.inputs > 0 && (
        <Handle type="target" id="in" position={vertical ? Position.Top : Position.Left} title="Input port" aria-label={`Input port of ${nodeName(node)}`} />
      )}
      <span className="flex w-8 shrink-0 items-center justify-center rounded-l-[6px]" style={{ background: `color-mix(in srgb, ${g.color} 20%, transparent)` }}>
        <Icon size={17} style={{ color: g.color }} aria-hidden />
      </span>
      <span className="grid min-w-0 flex-1 content-center gap-0.5 px-2 py-1.5">
        <span className="text-[13px] leading-tight font-semibold text-ink">{info.label}</span>
        {sub && <span className="truncate font-mono text-[11px] leading-tight text-ink-2">{sub}</span>}
      </span>

      {count !== undefined && (
        <span className="absolute -top-2.5 left-2 inline-flex items-center gap-1 rounded-full border border-line-strong bg-surface px-1.5 font-mono text-[11px] leading-4 text-ink">
          <Mail size={11} aria-hidden />
          {count}
          <span className="sr-only"> messages</span>
        </span>
      )}
      {(errors.length > 0 || warnings.length > 0) && (
        <span className="absolute -top-2.5 -right-2.5 grid size-5 place-items-center rounded-full bg-surface" aria-hidden>
          {errors.length ? <CircleAlert size={18} className="text-bad" /> : <TriangleAlert size={16} className="text-warn" />}
        </span>
      )}

      {Array.from({ length: info.outputs }, (_, i) => {
        const at = portAt(i);
        const label = info.outputLabels?.[i];
        return (
          <span key={i}>
            <Handle
              type="source"
              id={`out-${i}`}
              position={vertical ? Position.Bottom : Position.Right}
              style={vertical ? { left: at } : { top: at }}
              title={label ? `${label} output port` : "Output port"}
              aria-label={`${label ? `${label} output port` : "Output port"} of ${nodeName(node)}`}
            />
            {label && (
              <span
                className="pointer-events-none absolute text-[11px] leading-none font-bold text-ink-2"
                style={
                  vertical
                    ? { top: "calc(100% + 6px)", ...(i === 0 ? { right: "calc(75% + 10px)" } : { left: "calc(75% + 10px)" }) }
                    : { left: "calc(100% + 9px)", top: i === 0 ? `calc(${at} - 15px)` : `calc(${at} + 5px)` }
                }
              >
                {label}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

const NODE_TYPES = { flow: memo(FlowNodeView) };
const EDGE_TYPES = { wire: memo(WireEdge) };

/* ------------------------------------------------------------------ */
/* Palette, settings, problems                                         */
/* ------------------------------------------------------------------ */

const Palette = memo(function Palette({ onAdd }: { onAdd: (kind: NodeKind) => void }) {
  return (
    <section aria-labelledby="l20-palette" className="grid min-w-0 content-start gap-2">
      <h3 id="l20-palette" className="text-sm font-bold">
        Palette <span className="font-normal text-ink-3">(tap to add)</span>
      </h3>
      {GROUPS.map((group) => (
        <div key={group} className="grid min-w-0 gap-1">
          <p className="text-xs font-semibold tracking-wide text-ink-3 uppercase">{GROUP[group].label}</p>
          <div className="flex min-w-0 flex-wrap gap-1.5 lg:flex-col">
            {PALETTE.filter((k) => KINDS[k].group === group).map((kind) => {
              const Icon = ICON[kind];
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => onAdd(kind)}
                  aria-label={`Add ${KINDS[kind].label} node`}
                  title={KINDS[kind].help}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-md border-2 px-2 py-1 text-left text-sm leading-tight font-semibold text-ink transition-[filter] hover:brightness-95 lg:w-full"
                  style={{ background: GROUP[group].soft, borderColor: GROUP[group].color }}
                >
                  <Icon size={15} className="shrink-0" style={{ color: GROUP[group].color }} aria-hidden />
                  {KINDS[kind].label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
});

function ProblemList({ problems, errorCount, onSelect, deployed }: { problems: Problem[]; errorCount: number; onSelect: (id: string) => void; deployed?: boolean }) {
  const warnings = problems.length - errorCount;
  const heading = deployed
    ? `Deployed with ${plural(warnings, "warning")}:`
    : errorCount
      ? `Not deployed. Fix ${errorCount === 1 ? "this error" : `these ${errorCount} errors`} first:`
      : `No errors left. Press Deploy${warnings ? ` (${plural(warnings, "warning")} below)` : ""}.`;
  return (
    <div role={deployed ? undefined : "alert"} className={cn("grid gap-2 rounded-lg border p-3", errorCount ? "border-bad bg-bad-soft" : "border-warn bg-warn-soft")}>
      <p className="flex items-center gap-2 font-semibold text-ink">
        {errorCount ? <CircleX size={18} className="shrink-0 text-bad" aria-hidden /> : <TriangleAlert size={18} className="shrink-0 text-warn" aria-hidden />}
        {heading}
      </p>
      {problems.length > 0 && (
        <ul className="grid gap-1.5">
          {[...problems]
            .sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1))
            .map((p, i) => (
              <li key={`${p.text}-${i}`} className="flex min-w-0 items-start gap-2 text-sm text-ink">
                {p.level === "error" ? <CircleAlert size={16} className="mt-0.5 shrink-0 text-bad" aria-hidden /> : <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden />}
                <span className="min-w-0">
                  <span className="font-semibold">{p.level === "error" ? "Error" : "Warning"}: </span>
                  {p.text}
                  {p.node && (
                    <>
                      {" "}
                      <button type="button" onClick={() => onSelect(p.node!)} className="font-semibold text-ink underline underline-offset-2 hover:text-brand">
                        Select {p.node}
                      </button>
                    </>
                  )}
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

interface InspectorProps {
  flow: Flow;
  node: FlowNode | null;
  wire: Wire | null;
  problems: Problem[];
  onConfig: (id: string, patch: NodeConfig) => void;
  onRemove: (nodeIds: string[], wireIds: string[]) => void;
  onConnect: (from: string, to: string, port: number) => void;
}

function Inspector({ flow, node, wire: selected, problems, onConfig, onRemove, onConnect }: InspectorProps) {
  const box = "grid min-w-0 gap-3 rounded-lg border border-line bg-surface-2 p-3";
  if (selected) {
    return (
      <section aria-labelledby="l20-inspector" className={box}>
        <h3 id="l20-inspector" className="font-bold">
          Wire selected
        </h3>
        <p className="text-sm break-words text-ink-2">{wireText(flow, selected)}</p>
        <Button className="w-fit" onClick={() => onRemove([], [selected.id])} icon={<Unplug size={16} aria-hidden />}>
          Delete wire
        </Button>
      </section>
    );
  }
  if (!node) {
    return (
      <section aria-labelledby="l20-inspector" className={box}>
        <h3 id="l20-inspector" className="font-bold">
          Settings
        </h3>
        <p className="text-sm text-ink-2">Tap a node on the canvas to change its settings. Tap a wire to select it, then press Delete wire.</p>
      </section>
    );
  }

  const info = KINDS[node.kind];
  const Icon = ICON[node.kind];
  const c = node.config;
  const set = (patch: NodeConfig) => onConfig(node.id, patch);
  const own = problems.filter((p) => p.node === node.id);
  const joined = flow.wires.filter((w) => w.from === node.id || w.to === node.id);

  return (
    <section aria-labelledby="l20-inspector" className={box}>
      <div className="flex flex-wrap items-center gap-2">
        <Icon size={18} style={{ color: GROUP[info.group].color }} aria-hidden />
        <h3 id="l20-inspector" className="font-bold">
          {info.label} <span className="font-mono text-sm font-normal text-ink-3">({node.id})</span>
        </h3>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => onRemove([node.id], [])} icon={<Trash2 size={16} aria-hidden />}>
          Delete node
        </Button>
      </div>
      <p className="text-sm text-ink-2">
        {info.help}
        {info.outputLabels && ` On the canvas its output ports are labelled ${info.outputLabels.join(" and ")}.`}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" key={node.id}>
        {node.kind === "sensor" && (
          <Segmented<string>
            label="Reading every"
            size="sm"
            value={String(c.interval ?? 1)}
            onChange={(v) => set({ interval: Number(v) as 1 | 2 | 5 })}
            options={[1, 2, 5].map((s) => ({ value: String(s), label: `${s} s` }))}
          />
        )}
        {node.kind === "threshold" && (
          <>
            <Segmented<string>
              label="Yes when the reading is"
              size="sm"
              value={c.op ?? ">"}
              onChange={(v) => set({ op: v === "<" ? "<" : ">" })}
              options={[
                { value: ">", label: "above (>)" },
                { value: "<", label: "below (<)" },
              ]}
            />
            <NumberField label="Compare with" unit="°C" value={c.value} step={0.5} onChange={(v) => set({ value: v })} />
          </>
        )}
        {node.kind === "filter" && (
          <NumberField
            label="Smallest change to pass on"
            unit="°C"
            value={c.minChange}
            step={0.1}
            min={0}
            onChange={(v) => set({ minChange: v })}
            hint="A reading is sent only if it differs this much from the last one sent."
          />
        )}
        {node.kind === "template" && (
          <TextField label="Format" value={c.format ?? ""} onChange={(v) => set({ format: v })} hint="{{payload}} is replaced by the reading." />
        )}
        {node.kind === "mqtt" && (
          <TextField label="Topic" value={c.topic ?? ""} onChange={(v) => set({ topic: v })} hint="Publish to an exact topic, such as home/temp. + and # are only for subscribing." />
        )}
        {node.kind === "alert" && (
          <Segmented<string>
            label="Send by"
            size="sm"
            value={c.channel ?? "SMS"}
            onChange={(v) => set({ channel: v === "Email" ? "Email" : "SMS" })}
            options={[
              { value: "SMS", label: "SMS" },
              { value: "Email", label: "Email" },
            ]}
          />
        )}
        {Array.from({ length: info.outputs }, (_, port) => {
          const targets = flow.nodes.filter(
            (t) => t.id !== node.id && KINDS[t.kind].inputs > 0 && !flow.wires.some((w) => w.from === node.id && w.port === port && w.to === t.id),
          );
          const label = info.outputLabels ? `Wire the ${info.outputLabels[port]} port to` : "Wire the output to";
          return <WireSelect key={port} label={label} targets={targets} onPick={(to) => onConnect(node.id, to, port)} />;
        })}
      </div>

      {joined.length > 0 && (
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-ink">Wires</p>
          <ul className="grid gap-1">
            {joined.map((w) => (
              <li key={w.id} className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm text-ink-2">
                <span className="min-w-0 break-words">{wireText(flow, w)}</span>
                <Button size="sm" variant="ghost" onClick={() => onRemove([], [w.id])} aria-label={`Remove the wire ${wireText(flow, w)}`}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {own.length > 0 && (
        <ul className="grid gap-1">
          {own.map((p, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-ink">
              {p.level === "error" ? <CircleAlert size={16} className="mt-0.5 shrink-0 text-bad" aria-hidden /> : <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden />}
              <span>
                <span className="font-semibold">{p.level === "error" ? "Error" : "Warning"}: </span>
                {p.text}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function WireSelect({ label, targets, onPick }: { label: string; targets: FlowNode[]; onPick: (id: string) => void }) {
  const id = useId();
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className="text-[0.95rem] font-semibold text-ink">
        {label}
      </label>
      <select
        id={id}
        value=""
        disabled={!targets.length}
        onChange={(e) => {
          if (e.target.value) onPick(e.target.value);
        }}
        className="h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3 text-ink disabled:opacity-60"
      >
        <option value="">{targets.length ? "Choose a node…" : "No node to wire to"}</option>
        {targets.map((t) => (
          <option key={t.id} value={t.id}>
            {nodeName(t)}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const id = useId();
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className="text-[0.95rem] font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        spellCheck={false}
        autoComplete="off"
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3 font-mono text-sm text-ink"
      />
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink-3">
          {hint}
        </p>
      )}
    </div>
  );
}

function NumberField({
  label,
  unit,
  value,
  step,
  min,
  onChange,
  hint,
}: {
  label: string;
  unit: string;
  value: number | undefined;
  step: number;
  min?: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  const id = useId();
  // Local text, so a half-typed number such as "3" or "" is not overwritten.
  const [text, setText] = useState(value !== undefined && Number.isFinite(value) ? String(value) : "");
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className="text-[0.95rem] font-semibold text-ink">
        {label}
      </label>
      <span className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={text}
          step={step}
          min={min}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => {
            setText(e.target.value);
            onChange(e.target.value.trim() === "" ? Number.NaN : Number(e.target.value));
          }}
          className="h-10 w-28 rounded-lg border border-line-strong bg-surface px-3 font-mono text-ink"
        />
        <span className="text-sm text-ink-3">{unit}</span>
      </span>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink-3">
          {hint}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Outputs                                                             */
/* ------------------------------------------------------------------ */

function OutputPanel({ title, icon: Icon, count, unit, children }: { title: string; icon: LucideIcon; count: number; unit: string; children: ReactNode }) {
  return (
    <section className="grid min-w-0 content-start gap-2 rounded-lg border border-line bg-surface p-3">
      <h3 className="flex flex-wrap items-center gap-x-2 font-bold">
        <Icon size={17} className="shrink-0 text-ink-3" aria-hidden />
        {title}
        <span className="text-sm font-normal text-ink-3">
          {count} {unit}
        </span>
      </h3>
      {children}
    </section>
  );
}

/** A half-circle gauge with the latest number in the middle. */
function GaugeDial({ msg }: { msg: Message | null }) {
  const num = msg && typeof msg.payload === "number" ? msg.payload : null;
  const unit = msg?.unit ?? "°C";
  const [lo, hi] = unit === "°F" ? [86, 104] : [30, 40];
  const p = num === null ? 0 : Math.min(1, Math.max(0, (num - lo) / (hi - lo)));
  const R = 46;
  const CX = 60;
  const CY = 56;
  const pt = (q: number) => [CX + R * Math.cos(Math.PI * (1 - q)), CY - R * Math.sin(Math.PI * (1 - q))] as const;
  const [x0, y0] = pt(0);
  const [x1, y1] = pt(1);
  const [xp, yp] = pt(p);
  const said = num !== null ? `${num.toFixed(1)} ${unit}` : msg ? `text: ${String(msg.payload)}` : "no value yet";
  return (
    <figure className="grid justify-items-center gap-1">
      <svg viewBox="0 0 120 70" className="w-full max-w-[13rem]" role="img" aria-label={`The gauge shows ${said}.`}>
        <path d={`M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}`} fill="none" stroke="var(--line)" strokeWidth={10} strokeLinecap="round" />
        {num !== null && p > 0 && <path d={`M ${x0} ${y0} A ${R} ${R} 0 0 1 ${xp} ${yp}`} fill="none" stroke="var(--u3)" strokeWidth={10} strokeLinecap="round" />}
        <text x={CX} y={CY - 8} textAnchor="middle" className="fill-ink font-mono text-[17px] font-bold">
          {num !== null ? num.toFixed(1) : "—"}
        </text>
        <text x={CX} y={CY + 6} textAnchor="middle" className="fill-ink-3 text-[9px]">
          {num !== null ? unit : ""}
        </text>
        <text x={x0} y={69} textAnchor="middle" className="fill-ink-3 text-[8px]">
          {lo}
        </text>
        <text x={x1} y={69} textAnchor="middle" className="fill-ink-3 text-[8px]">
          {hi}
        </text>
      </svg>
      {msg && num === null && <figcaption className="text-sm break-all text-ink-2">Got text, not a number: {String(msg.payload)}</figcaption>}
      {!msg && <figcaption className="text-sm text-ink-3">No value yet.</figcaption>}
    </figure>
  );
}

function Legend() {
  const item = "flex items-center gap-1.5";
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-3" aria-label="Legend">
      {GROUPS.map((g) => (
        <li key={g} className={item}>
          <span className="h-3.5 w-5 rounded-sm border-2" style={{ background: GROUP[g].soft, borderColor: GROUP[g].color }} aria-hidden />
          {GROUP[g].label} node
        </li>
      ))}
      <li className={item}>
        <span className="size-3 rounded-[3px] border-2 border-ink-3 bg-surface" aria-hidden />
        Port
      </li>
      <li className={item}>
        <Mail size={13} aria-hidden />
        Messages a node handled
      </li>
      <li>Number on a wire: messages that crossed it</li>
      <li className={item}>
        <span className="size-2.5 rounded-full bg-brand" aria-hidden />
        Message moving
      </li>
      <li className={item}>
        <CircleAlert size={14} className="text-bad" aria-hidden />
        Error
      </li>
      <li className={item}>
        <TriangleAlert size={14} className="text-warn" aria-hidden />
        Warning
      </li>
    </ul>
  );
}
