import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  BoxGeometry,
  EdgesGeometry,
  type Group,
  type LineBasicMaterial,
  type MeshStandardMaterial,
} from "three";
import { usePalette, type Palette } from "~/lib/palette";
import {
  Label3D,
  Link3D,
  Scene3D,
  mixColor,
  useFitScale,
  useSceneMotion,
  type Label3DTone,
  type Vec3,
} from "~/components/three";
import { buildStack, type StackId } from "~/content/unit-1/protocols-overview/stacks";

/* ------------------------------------------------------------------ */
/* Stack data                                                          */
/* ------------------------------------------------------------------ */

export type LayerId = "application" | "transport" | "network" | "adaptation" | "link";

/** The sensor reading every stack carries. */
export const PAYLOAD = "28.5";

export interface LayerSpec {
  id: LayerId;
  /** Layer name, e.g. "Transport". */
  name: string;
  /** Protocol at this layer in the chosen stack, e.g. "UDP". */
  protocol: string;
  /** Bytes of header the sender adds at this layer (0 for the adaptation layer). */
  bytes: number;
}

export interface StackSpec {
  stack: StackId;
  compress: boolean;
  /** Top layer first. */
  layers: LayerSpec[];
  payloadBytes: number;
  /** Size of the 6LoWPAN compressed IPv6 + UDP header, when compression is on. */
  compressedBytes: number | null;
  /** Bytes that cross the link. */
  totalBytes: number;
}

const LAYER_NAME: Record<LayerId, string> = {
  application: "Application",
  transport: "Transport",
  network: "Network",
  adaptation: "Adaptation",
  link: "Link + physical",
};

const PROTOCOL: Record<StackId, Record<Exclude<LayerId, "adaptation">, string>> = {
  mqtt: { application: "MQTT", transport: "TCP", network: "IPv4", link: "Wi-Fi" },
  coap: { application: "CoAP", transport: "UDP", network: "IPv6", link: "IEEE 802.15.4" },
  http: { application: "HTTP", transport: "TCP", network: "IPv4", link: "Ethernet" },
};

const PART_LAYER: Record<string, Exclude<LayerId, "adaptation">> = {
  Application: "application",
  Transport: "transport",
  Network: "network",
  Link: "link",
};

const utf8 = (s: string) => new TextEncoder().encode(s).length;

/** The layers of one stack with their protocols and header sizes, from the shared 1.7 data. */
export function describeStack(stack: StackId, compress: boolean): StackSpec {
  const useCompression = stack === "coap" && compress;
  const full = buildStack(stack, PAYLOAD, false);
  const sent = buildStack(stack, PAYLOAD, useCompression);
  const payloadBytes = utf8(PAYLOAD);

  const layers: LayerSpec[] = [];
  for (const part of full) {
    const id = PART_LAYER[part.layer];
    if (!id) continue;
    if (id === "link" && stack === "coap") {
      layers.push({ id: "adaptation", name: LAYER_NAME.adaptation, protocol: "6LoWPAN", bytes: 0 });
    }
    layers.push({ id, name: LAYER_NAME[id], protocol: PROTOCOL[stack][id], bytes: part.bytes });
  }

  const compressed = useCompression ? sent.find((p) => p.layer === "Network + transport") : undefined;
  return {
    stack,
    compress: useCompression,
    layers,
    payloadBytes,
    compressedBytes: compressed ? compressed.bytes : null,
    totalBytes: payloadBytes + sent.reduce((sum, p) => sum + p.bytes, 0),
  };
}

/** Layer colours, the same as the 1.7 encapsulation bar (which has no adaptation layer). */
export function layerColor(p: Palette, id: LayerId): string {
  switch (id) {
    case "application":
      return p.u3;
    case "transport":
      return p.u2;
    case "network":
      return p.u1;
    case "adaptation":
      return p.warn;
    case "link":
      return p.ink3;
  }
}

const LABEL_TONE: Record<LayerId, Label3DTone> = {
  application: "u3",
  transport: "u2",
  network: "u1",
  adaptation: "default",
  link: "muted",
};

const RECEIVER: Record<StackId, string> = {
  mqtt: "Broker (receiver)",
  coap: "Gateway (receiver)",
  http: "Server (receiver)",
};

const MEDIUM: Record<StackId, string> = {
  mqtt: "Wi-Fi radio link",
  coap: "802.15.4 radio link",
  http: "Ethernet cable",
};

/* ------------------------------------------------------------------ */
/* Headers wrapped around the packet                                   */
/* ------------------------------------------------------------------ */

type HeaderKey = "application" | "transport" | "network" | "compressed" | "link";

/** Inner to outer: the order the shells nest in. */
const KEY_ORDER: HeaderKey[] = ["application", "transport", "network", "compressed", "link"];

function headerBytes(spec: StackSpec, key: HeaderKey): number {
  if (key === "compressed") return spec.compressedBytes ?? 0;
  return spec.layers.find((l) => l.id === key)?.bytes ?? 0;
}

function headerColor(p: Palette, key: HeaderKey): string {
  // The compressed header is made by the adaptation layer, so it wears that colour.
  return layerColor(p, key === "compressed" ? "adaptation" : key);
}

/** Short name of each header, for the readout. */
function headerName(spec: StackSpec, key: HeaderKey): string {
  if (key === "compressed") return "6LoWPAN (IPv6 + UDP)";
  return spec.layers.find((l) => l.id === key)?.protocol ?? key;
}

/** Bytes of the IPv6 and UDP headers together: what 6LoWPAN compresses. */
export function ipUdpBytes(spec: StackSpec): number {
  return headerBytes(spec, "transport") + headerBytes(spec, "network");
}

/** Headers present after the sender's layer `id` has done its job, inner first. */
function senderAfter(spec: StackSpec, id: LayerId, before: HeaderKey[]): HeaderKey[] {
  if (id !== "adaptation") return [...before, id];
  if (!spec.compress) return before;
  return [...before.filter((k) => k !== "transport" && k !== "network"), "compressed"];
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

interface Layout {
  /** Centre of each stack from the middle. */
  sx: number;
  /** Slab width and depth. */
  w: number;
  d: number;
  /** Height between slabs. */
  gap: number;
  /** Height of the stack's middle. */
  midY: number;
  /** How far below the bottom slab the link runs. */
  drop: number;
  /** Width the fit scale keeps in view, allowing for perspective and labels. */
  fitWidth: number;
}

/** Wide views: broad slabs, close together. */
const WIDE: Layout = { sx: 2.15, w: 2.0, d: 1.1, gap: 0.66, midY: 1.7, drop: 0.6, fitWidth: 7.6 };
/** Phones: narrower slabs, spaced further apart so the two-line labels don't touch. */
const NARROW: Layout = { sx: 1.62, w: 1.45, d: 1.0, gap: 0.82, midY: 1.75, drop: 0.8, fitWidth: 6.0 };
/** Canvas width below which the narrow layout is used. */
const NARROW_BELOW = 520;

const SLAB_T = 0.12;
/** Height the camera looks at; the fit scale shrinks the scene around it. */
const VIEW_Y = 1.65;
/** The shells are flattened boxes: height = width × FLAT. */
const FLAT = 0.5;
const CORE = 0.26;
/** Each shell is at least this much wider than the one inside it, so thin headers still show. */
const MIN_STEP = 0.05;

function slabY(index: number, count: number, layout: Layout): number {
  return layout.midY + ((count - 1) / 2 - index) * layout.gap;
}

function linkY(count: number, layout: Layout): number {
  return slabY(count - 1, count, layout) - layout.drop;
}

/** Width of the packet box for a total size: volume grows with the byte count. */
function sideFor(bytes: number, payloadBytes: number): number {
  return CORE * Math.cbrt(bytes / Math.max(payloadBytes, 1));
}

interface Shell {
  side: number;
  alpha: number;
}

type Shape = Record<HeaderKey, Shell>;

/** Sizes of every shell for a set of headers; missing shells collapse onto the next one inside. */
function shapeOf(spec: StackSpec, present: HeaderKey[]): { shells: Shape; outer: number; bytes: number } {
  let bytes = spec.payloadBytes;
  let prev = CORE;
  const sideOf: Partial<Record<HeaderKey, number>> = {};
  for (const key of KEY_ORDER) {
    if (!present.includes(key)) continue;
    bytes += headerBytes(spec, key);
    const side = Math.max(sideFor(bytes, spec.payloadBytes), prev + MIN_STEP);
    sideOf[key] = side;
    prev = side;
  }
  const shells = {} as Shape;
  let inner = CORE;
  for (const key of KEY_ORDER) {
    const side = sideOf[key];
    if (side !== undefined) {
      shells[key] = { side, alpha: 1 };
      inner = side;
    } else {
      shells[key] = { side: inner, alpha: 0 };
    }
  }
  return { shells, outer: prev, bytes };
}

/* ------------------------------------------------------------------ */
/* Timeline: down the sender, across the link, up the receiver         */
/* ------------------------------------------------------------------ */

export type Side = "sender" | "receiver" | "link";

export interface Step {
  kind: "start" | "move" | "layer" | "cross" | "end";
  side: Side;
  layer: LayerId | null;
  duration: number;
  from: Vec3;
  to: Vec3;
  before: Shape;
  after: Shape;
  /** Headers present once the step is done, inner first. */
  headers: HeaderKey[];
  /** Packet size once the step is done. */
  bytes: number;
  /** Outer box width before and after, for placing the size label. */
  outerBefore: number;
  outerAfter: number;
  /** What is happening, for the readout. */
  title: string;
  note: string;
}

export interface Timeline {
  steps: Step[];
  starts: number[];
  total: number;
  /** The step shown in a scene that has never played: fully wrapped at the bottom of the sender. */
  idle: number;
}

/** How far above the top slab the reading starts and ends. */
const START_RISE = 0.5;
const START_HOLD = 1.0;
const MOVE = 0.45;
const LAYER_HOLD = 1.25;
/** Part of a layer step spent adding or removing the header. */
const CHANGE = 0.5;
const DROP = 0.4;
const CROSS = 1.4;
const END_HOLD = 1.8;

function buildTimeline(spec: StackSpec, layout: Layout): Timeline {
  const n = spec.layers.length;
  const steps: Step[] = [];
  const top = slabY(0, n, layout);
  const low = linkY(n, layout);
  const left = (y: number): Vec3 => [-layout.sx, y, 0];
  const right = (y: number): Vec3 => [layout.sx, y, 0];

  // Headers after each sender layer: states[0] is the bare reading, states[i + 1] after layer i.
  const states: HeaderKey[][] = [[]];
  spec.layers.forEach((layer, i) => states.push(senderAfter(spec, layer.id, states[i])));

  let lastTitle = "";
  let lastNote = "";
  const push = (
    kind: Step["kind"],
    side: Side,
    layer: LayerId | null,
    duration: number,
    from: Vec3,
    to: Vec3,
    before: HeaderKey[],
    after: HeaderKey[],
    title?: string,
    note?: string,
  ) => {
    const a = shapeOf(spec, before);
    const b = shapeOf(spec, after);
    if (title !== undefined) lastTitle = title;
    if (note !== undefined) lastNote = note;
    steps.push({
      kind,
      side,
      layer,
      duration,
      from,
      to,
      before: a.shells,
      after: b.shells,
      headers: after,
      bytes: b.bytes,
      outerBefore: a.outer,
      outerAfter: b.outer,
      title: lastTitle,
      note: lastNote,
    });
  };

  const reading = `“${PAYLOAD}”`;
  push("start", "sender", null, START_HOLD, left(top + START_RISE), left(top + START_RISE), [], [], "Sensor", `The sensor has a reading, ${reading}: ${spec.payloadBytes} bytes of data.`);

  // Down the sender's stack, gaining a header at each layer.
  let y = top + START_RISE;
  let idle = 0;
  spec.layers.forEach((layer, i) => {
    const ly = slabY(i, n, layout);
    push("move", "sender", null, MOVE, left(y), left(ly), states[i], states[i]);
    y = ly;
    const before = states[i];
    const after = states[i + 1];
    const size = shapeOf(spec, after).bytes;
    let note: string;
    if (layer.id === "adaptation") {
      note = spec.compress
        ? `6LoWPAN squeezes the ${ipUdpBytes(spec)} bytes of IPv6 and UDP headers into ${spec.compressedBytes}. The packet shrinks to ${size} bytes.`
        : `Compression is off, so 6LoWPAN passes the ${ipUdpBytes(spec)} bytes of IPv6 and UDP headers through unchanged. The packet stays ${size} bytes.`;
    } else {
      note = `${layer.protocol} adds its header (${layer.bytes} bytes). The packet is now ${size} bytes.`;
    }
    push("layer", "sender", layer.id, LAYER_HOLD, left(ly), left(ly), before, after, `Sender · ${layer.name}`, note);
    if (i === n - 1) idle = steps.length - 1;
  });

  // Across the link.
  const wrapped = states[n];
  push("move", "sender", null, DROP, left(y), left(low), wrapped, wrapped);
  push("cross", "link", null, CROSS, left(low), right(low), wrapped, wrapped, "On the link", `The ${spec.totalBytes}-byte frame crosses the ${MEDIUM[spec.stack]}.`);
  y = slabY(n - 1, n, layout);
  push("move", "receiver", null, DROP, right(low), right(y), wrapped, wrapped);

  // Up the receiver's stack, shedding a header at each layer.
  for (let i = n - 1; i >= 0; i--) {
    const layer = spec.layers[i];
    const ly = slabY(i, n, layout);
    if (i < n - 1) push("move", "receiver", null, MOVE, right(y), right(ly), states[i + 1], states[i + 1]);
    y = ly;
    const size = shapeOf(spec, states[i]).bytes;
    let note: string;
    if (layer.id === "adaptation") {
      note = spec.compress
        ? `6LoWPAN rebuilds the full ${ipUdpBytes(spec)} bytes of IPv6 and UDP headers from the ${spec.compressedBytes}-byte compressed one. The packet grows back to ${size} bytes.`
        : `The IPv6 and UDP headers arrived at full size, so 6LoWPAN has nothing to rebuild. The packet stays ${size} bytes.`;
    } else if (layer.id === "link") {
      note = `${layer.protocol} checks the frame for errors and removes its header (${layer.bytes} bytes). ${size} bytes are left.`;
    } else {
      note = `${layer.protocol} reads and removes its header (${layer.bytes} bytes). ${size} bytes are left.`;
    }
    push("layer", "receiver", layer.id, LAYER_HOLD, right(ly), right(ly), states[i + 1], states[i], `Receiver · ${layer.name}`, note);
  }

  push("move", "receiver", null, MOVE, right(y), right(top + START_RISE), [], []);
  push("end", "receiver", null, END_HOLD, right(top + START_RISE), right(top + START_RISE), [], [], "Delivered", `The receiver's app gets ${reading}: ${spec.payloadBytes} bytes of data, out of the ${spec.totalBytes} bytes that were sent.`);

  const starts: number[] = [];
  let total = 0;
  for (const step of steps) {
    starts.push(total);
    total += step.duration;
  }
  return { steps, starts, total, idle };
}

/* ------------------------------------------------------------------ */
/* Geometry shared by every slab and shell                             */
/* ------------------------------------------------------------------ */

function slabShape(layout: Layout) {
  const geometry = new BoxGeometry(layout.w, SLAB_T, layout.d);
  return { geometry, edges: new EdgesGeometry(geometry) };
}

const SLAB_SHAPES = { wide: slabShape(WIDE), narrow: slabShape(NARROW) };
type SlabShape = (typeof SLAB_SHAPES)["wide"];
const unitBox = new BoxGeometry(1, 1, 1);
const unitEdges = new EdgesGeometry(unitBox);

const MAX_STEP = 0.1;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (u: number) => u * u * (3 - 2 * u);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ------------------------------------------------------------------ */
/* A layer slab                                                        */
/* ------------------------------------------------------------------ */

function Slab({
  shape,
  position,
  color,
  edge,
  active,
  busy,
  onSelect,
}: {
  shape: SlabShape;
  position: Vec3;
  color: string;
  edge: string;
  active: boolean;
  busy: boolean;
  onSelect?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hoverRef = useRef(false);
  const selectable = onSelect !== undefined;

  // Restore the cursor if this slab unmounts or stops being selectable while hovered.
  useEffect(() => {
    if (!selectable) return;
    return () => {
      if (hoverRef.current) {
        hoverRef.current = false;
        document.body.style.cursor = "";
      }
    };
  }, [selectable]);

  const handlers = onSelect
    ? {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          hoverRef.current = true;
          setHovered(true);
          document.body.style.cursor = "pointer";
        },
        onPointerOut: () => {
          hoverRef.current = false;
          setHovered(false);
          document.body.style.cursor = "";
        },
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          // Ignore the click that ends an orbit drag.
          if (e.delta > 6) return;
          onSelect();
        },
      }
    : undefined;

  const opacity = active ? 0.5 : busy ? 0.36 : hovered ? 0.3 : 0.2;
  const glow = active ? 0.45 : busy ? 0.25 : hovered ? 0.15 : 0.04;

  return (
    <group position={position}>
      <mesh geometry={shape.geometry} renderOrder={1} {...handlers}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={glow}
          roughness={0.6}
          transparent
          opacity={opacity}
          depthWrite={false}
        />
      </mesh>
      <lineSegments geometry={shape.edges}>
        <lineBasicMaterial color={active || busy ? color : edge} />
      </lineSegments>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* The packet: a payload core inside one shell per header              */
/* ------------------------------------------------------------------ */

function Packet({
  spec,
  timeline,
  onStep,
  label,
  labelVisible,
}: {
  spec: StackSpec;
  timeline: Timeline;
  /** Called with the step index when it changes; -1 while the scene has never played. */
  onStep: (index: number) => void;
  label: string;
  labelVisible: boolean;
}) {
  const p = usePalette();
  const { paused } = useSceneMotion();
  const packet = useRef<Group>(null);
  const pill = useRef<Group>(null);
  const shells = useRef<Partial<Record<HeaderKey, Group | null>>>({});
  const faces = useRef<Partial<Record<HeaderKey, MeshStandardMaterial | null>>>({});
  const lines = useRef<Partial<Record<HeaderKey, LineBasicMaterial | null>>>({});
  const time = useRef(0);
  const started = useRef(false);
  const last = useRef<number | null>(null);

  // Only the headers this stack can ever carry get a shell.
  const keys = useMemo(
    () => KEY_ORDER.filter((k) => (k === "compressed" ? spec.compress : spec.layers.some((l) => l.id === k))),
    [spec],
  );

  useFrame((_, delta) => {
    const group = packet.current;
    if (!group) return;
    if (!paused) {
      time.current += Math.min(delta, MAX_STEP);
      started.current = true;
    }

    let index = timeline.idle;
    let u = 1;
    if (started.current) {
      const t = time.current % timeline.total;
      index = timeline.steps.length - 1;
      for (let i = 0; i < timeline.steps.length; i++) {
        if (t < timeline.starts[i] + timeline.steps[i].duration) {
          index = i;
          break;
        }
      }
      u = clamp01((t - timeline.starts[index]) / timeline.steps[index].duration);
    }
    const step = timeline.steps[index];

    const reported = started.current ? index : -1;
    if (reported !== last.current) {
      last.current = reported;
      onStep(reported);
    }

    // Position: glide between the step's two points.
    const m = ease(u);
    group.position.set(
      lerp(step.from[0], step.to[0], m),
      lerp(step.from[1], step.to[1], m),
      lerp(step.from[2], step.to[2], m),
    );

    // Shells: grow, shrink or fade during the first part of a layer step.
    const change = step.kind === "layer" ? ease(clamp01((u * step.duration) / CHANGE)) : 1;
    for (const key of keys) {
      const shell = shells.current[key];
      const face = faces.current[key];
      const line = lines.current[key];
      if (!shell || !face || !line) continue;
      const a = step.before[key];
      const b = step.after[key];
      const side = lerp(a.side, b.side, change);
      const alpha = lerp(a.alpha, b.alpha, change);
      shell.visible = alpha > 0.01;
      shell.scale.set(side, side * FLAT, side);
      face.opacity = 0.24 * alpha;
      line.opacity = 0.95 * alpha;
    }

    const outer = lerp(step.outerBefore, step.outerAfter, change);
    pill.current?.position.set(0, (outer * FLAT) / 2 + 0.2, 0);
  });

  return (
    <group ref={packet}>
      <mesh geometry={unitBox} scale={[CORE, CORE * FLAT, CORE]}>
        <meshStandardMaterial color={p.brand} emissive={p.brand} emissiveIntensity={0.35} roughness={0.5} />
      </mesh>
      {keys.map((key) => {
        const order = KEY_ORDER.indexOf(key);
        const color = headerColor(p, key);
        return (
          <group
            key={key}
            visible={false}
            ref={(g) => {
              shells.current[key] = g;
            }}
          >
            <mesh geometry={unitBox} renderOrder={10 + order}>
              <meshStandardMaterial
                ref={(m) => {
                  faces.current[key] = m;
                }}
                color={color}
                emissive={color}
                emissiveIntensity={0.15}
                roughness={0.6}
                transparent
                opacity={0}
                depthWrite={false}
              />
            </mesh>
            <lineSegments geometry={unitEdges} renderOrder={20 + order}>
              <lineBasicMaterial
                ref={(m) => {
                  lines.current[key] = m;
                }}
                color={color}
                transparent
                opacity={0}
                depthWrite={false}
              />
            </lineSegments>
          </group>
        );
      })}
      <group ref={pill}>
        <Label3D position={[0, 0, 0]} tone="accent" visible={labelVisible}>
          <span className="font-semibold">{label}</span>
        </Label3D>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export interface StackSceneProps {
  stack: StackId;
  compress: boolean;
  active?: LayerId | null;
  onSelect?: (id: LayerId) => void;
}

function Stacks({
  spec,
  step,
  onStep,
  active,
  onSelect,
}: {
  spec: StackSpec;
  /** Index of the step to draw; the same in every layout. */
  step: number;
  onStep: (index: number) => void;
  active: LayerId | null;
  onSelect?: (id: LayerId) => void;
}) {
  const p = usePalette();
  // Phones get narrower, taller stacks, and drop the link label; the readout below names the link.
  const narrow = useThree((s) => s.size.width) < NARROW_BELOW;
  const layout = narrow ? NARROW : WIDE;
  const shape = narrow ? SLAB_SHAPES.narrow : SLAB_SHAPES.wide;
  const timeline = useMemo(() => buildTimeline(spec, layout), [spec, layout]);
  const fit = useFitScale(layout.fitWidth);
  const { sx, w } = layout;
  const n = spec.layers.length;
  const top = slabY(0, n, layout);
  const low = linkY(n, layout);
  const bottom = slabY(n - 1, n, layout) - SLAB_T / 2;
  const current = timeline.steps[step] ?? timeline.steps[timeline.idle];
  const busySide = current.kind === "layer" ? current.side : null;
  const busyLayer = current.kind === "layer" ? current.layer : null;

  const colors = useMemo(() => {
    const out = {} as Record<LayerId, { slab: string; edge: string; peer: string }>;
    for (const id of ["application", "transport", "network", "adaptation", "link"] as LayerId[]) {
      const c = layerColor(p, id);
      out[id] = { slab: c, edge: mixColor(c, p.surface, 0.35), peer: mixColor(c, p.surface, 0.3) };
    }
    return out;
  }, [p]);

  const radio = spec.stack !== "http";
  const linkColor = colors.link.slab;
  const pillLabel =
    current.kind === "start" || current.kind === "end" || current.bytes === spec.payloadBytes
      ? `“${PAYLOAD}” · ${current.bytes} bytes`
      : `${current.bytes} bytes`;

  return (
    <group position={[0, VIEW_Y * (1 - fit), 0]} scale={fit}>
      {spec.layers.map((layer, i) => {
        const y = slabY(i, n, layout);
        const isActive = active === layer.id;
        const c = colors[layer.id];
        const select = onSelect ? () => onSelect(layer.id) : undefined;
        return (
          <group key={layer.id}>
            <Slab
              shape={shape}
              position={[-sx, y, 0]}
              color={c.slab}
              edge={c.edge}
              active={isActive}
              busy={busySide === "sender" && busyLayer === layer.id}
              onSelect={select}
            />
            <Slab
              shape={shape}
              position={[sx, y, 0]}
              color={c.slab}
              edge={c.edge}
              active={isActive}
              busy={busySide === "receiver" && busyLayer === layer.id}
              onSelect={select}
            />
            {/* Each layer talks only to the same layer on the other side. */}
            <Link3D
              from={[-sx + w / 2, y, 0]}
              to={[sx - w / 2, y, 0]}
              color={isActive ? c.slab : c.peer}
              lineWidth={isActive ? 2 : 1.25}
              dashed
            />
            <Label3D position={[0, y, 0]} tone={isActive ? "accent" : LABEL_TONE[layer.id]}>
              <span className="block text-center text-[11px] leading-tight opacity-90">{layer.name}</span>
              <span className="block text-center font-semibold">{layer.protocol}</span>
            </Label3D>
          </group>
        );
      })}

      {/* The link joins the bottom of the two stacks. */}
      <Link3D from={[-sx, bottom, 0]} to={[-sx, low, 0]} color={linkColor} lineWidth={radio ? 1.5 : 3} />
      <Link3D
        from={[-sx, low, 0]}
        to={[sx, low, 0]}
        color={linkColor}
        lineWidth={radio ? 2 : 3.5}
        dashed={radio}
        animated={radio}
      />
      <Link3D from={[sx, low, 0]} to={[sx, bottom, 0]} color={linkColor} lineWidth={radio ? 1.5 : 3} />
      <Label3D position={[0, low - 0.62, 0]} tone="muted" visible={!narrow}>
        {MEDIUM[spec.stack]}
      </Label3D>

      {/* Who is who */}
      <Label3D position={[-sx, top + START_RISE + 0.5, 0]}>Sensor (sender)</Label3D>
      <Label3D position={[sx, top + START_RISE + 0.5, 0]}>{RECEIVER[spec.stack]}</Label3D>

      <Packet
        key={`${spec.stack}-${spec.compress}`}
        spec={spec}
        timeline={timeline}
        onStep={onStep}
        label={pillLabel}
        labelVisible={current.kind !== "cross"}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Readout under the scene                                             */
/* ------------------------------------------------------------------ */

function Readout({ spec, step, idle }: { spec: StackSpec; step: Step; idle: boolean }) {
  const p = usePalette();
  const chips = [...step.headers].reverse().map((key) => ({
    key,
    name: headerName(spec, key),
    bytes: headerBytes(spec, key),
    color: headerColor(p, key),
  }));

  const title = idle ? "Sender · ready to send" : step.title;
  const note = idle
    ? `Every layer of the sensor has added its header: ${spec.totalBytes} bytes are ready to cross the ${MEDIUM[spec.stack]}. Press “Play animation” to watch the trip.`
    : step.note;

  return (
    <div className="mt-3 grid min-w-0 gap-2 rounded-lg border border-line bg-surface p-3 text-sm">
      <p className="min-h-[2.75rem] text-ink-2">
        <span className="font-semibold text-ink">{title}: </span>
        {note}
      </p>
      <div
        role="group"
        aria-label="The packet now, outermost header first"
        className="flex min-w-0 flex-wrap items-center gap-1.5"
      >
        <span className="text-ink-3">{idle || step.kind === "layer" ? "At this layer:" : "Packet:"}</span>
        {chips.map((chip) => (
          <span
            key={chip.key}
            className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-ink"
            style={{ borderColor: chip.color }}
          >
            <span aria-hidden="true" className="inline-block size-2 rounded-sm" style={{ backgroundColor: chip.color }} />
            {chip.name} <span className="tabular-nums text-ink-3">{chip.bytes}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1 rounded border border-brand px-1.5 py-0.5 text-ink">
          <span aria-hidden="true" className="inline-block size-2 rounded-sm bg-brand" />
          <span className="font-mono">{PAYLOAD}</span> <span className="tabular-nums text-ink-3">{spec.payloadBytes}</span>
        </span>
        <span className="font-semibold text-ink tabular-nums">= {step.bytes} bytes</span>
      </div>
      <p className="text-ink-3">Select a layer in the scene or the list to read its job. Drag to turn the scene.</p>
    </div>
  );
}

/**
 * Topic 2.3: the sender's and receiver's protocol stacks side by side. A
 * reading travels down the sender's stack gaining a header at each layer,
 * crosses the link, and goes up the receiver's stack losing them again.
 */
export default function StackScene({ stack, compress, active = null, onSelect }: StackSceneProps) {
  const spec = useMemo(() => describeStack(stack, compress), [stack, compress]);
  // The steps' words and sizes are the same in every layout; the scene places them for its own size.
  const timeline = useMemo(() => buildTimeline(spec, WIDE), [spec]);
  const [step, setStep] = useState(-1);
  const shown = timeline.steps[step] ?? timeline.steps[timeline.idle];
  const idle = step < 0 || step >= timeline.steps.length;

  return (
    <div className="min-w-0">
      <Scene3D
        label={`The ${spec.layers.map((l) => l.protocol).join(", ")} protocol stack on a sender and a receiver, with a packet gaining headers on the way down and losing them on the way up`}
        height="clamp(360px, 100vw, 480px)"
        camera={{ position: [0, 3.65, 7.5], fov: 40, target: [0, VIEW_Y, 0] }}
        orbitLimits={{ minAzimuthAngle: -1, maxAzimuthAngle: 1 }}
      >
        <Stacks
          spec={spec}
          step={idle ? timeline.idle : step}
          onStep={setStep}
          active={active}
          onSelect={onSelect}
        />
      </Scene3D>
      <Readout spec={spec} step={shown} idle={idle} />
    </div>
  );
}
