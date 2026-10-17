import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { RoundedBox } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Group,
  type InstancedMesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from "three";
import {
  buildTopology,
  cablePath,
  routeToGateway,
  type FailureItem,
  type LinkKind,
  type Topology,
  type TopologyKind,
} from "~/lib/sim/graph";
import { usePalette } from "~/lib/palette";
import {
  Gateway,
  Label3D,
  Scene3D,
  SensorNode,
  mixColor,
  useFitScale,
  useSceneMotion,
} from "~/components/three";

export interface TopologySceneProps {
  kind: TopologyKind;
  /** Gateway plus devices, 5 to 12. */
  n: number;
  /** A link or node to draw in red as the worst single failure, if any. */
  weak?: FailureItem | null;
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

/** World size of the graph's [-1, 1] box. Wider than deep, because the camera looks down at an angle. */
const SX = 2.9;
const SZ = 2.0;
/** Most gateway + device nodes this view shows. */
const MAX_N = 12;
/** One slot per device (0 is the gateway), then one per bus tap (tap of device i is MAX_N + i). */
const SLOTS = MAX_N * 2;
const MAX_LINKS = 96;

const GROUND_W = 6.7;
const GROUND_D = 4.5;
const FIT_WIDTH = 7.1;
/** Height the camera looks at; the fit scale shrinks the diorama around it. */
const VIEW_Y = 0.2;

const DEVICE_SCALE = 0.58;
const GATEWAY_SCALE = 0.62;
const PAD_R = 0.27;
const GATEWAY_PAD_R = 0.56;
const CABLE_Y = 0.05;
const PACKET_Y = 0.17;
const RADIUS: Record<LinkKind, number> = { link: 0.03, segment: 0.06, drop: 0.024 };

/* ------------------------------------------------------------------ */
/* Timing                                                              */
/* ------------------------------------------------------------------ */

const MAX_STEP = 0.1;
/** Seconds for nodes to glide to a new layout. */
const MORPH = 1.3;
/** Old cables are gone by this point of the morph; new ones start to appear at the next. */
const FADE_OUT_END = 0.35;
const FADE_IN_START = 0.55;
/** Packet speed in world units per second, and the pause at each device it passes through. */
const SPEED = 1.5;
const HOP_HOLD = 0.3;
/** Seconds between one device sending and the next. */
const STAGGER = 0.7;
const REST = 1.0;
/** How long the gateway's ring glows after a packet arrives. */
const ARRIVE_GLOW = 0.6;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const inOpacity = (t: number) => (t <= FADE_IN_START ? 0 : (t - FADE_IN_START) / (1 - FADE_IN_START));
const outFade = (t: number) => Math.max(0, 1 - t / FADE_OUT_END);

/* ------------------------------------------------------------------ */
/* Slots: where every node of a topology lives in the position arrays  */
/* ------------------------------------------------------------------ */

function slotOf(topo: Topology, id: number): number {
  return id < topo.n ? id : MAX_N + (id - topo.n);
}

function hasSlot(topo: Topology, slot: number): boolean {
  if (slot < MAX_N) return slot < topo.n;
  return topo.kind === "bus" && slot - MAX_N < topo.n;
}

/** Write every node's world (x, z) into its slot. */
function writeTargets(topo: Topology, out: Float32Array) {
  for (const node of topo.nodes) {
    const s = slotOf(topo, node.id);
    out[s * 2] = node.x * SX;
    out[s * 2 + 1] = node.y * SZ;
  }
}

/* ------------------------------------------------------------------ */
/* Shared geometry and scratch objects                                 */
/* ------------------------------------------------------------------ */

const cableGeometry = new CylinderGeometry(1, 1, 1, 10);
const padGeometry = new CylinderGeometry(1, 1, 1, 24);
const tapGeometry = new BoxGeometry(1, 1, 1);
const packetGeometry = new SphereGeometry(1, 14, 10);

const UP = new Vector3(0, 1, 0);
const tmpMatrix = new Matrix4();
const tmpPos = new Vector3();
const tmpDir = new Vector3();
const tmpScale = new Vector3();
const tmpQuat = new Quaternion();
const noTurn = new Quaternion();
const tmpColor = new Color();

function writeCables(mesh: InstancedMesh, topo: Topology | null, cur: Float32Array, weak: FailureItem | null) {
  if (!topo) {
    mesh.count = 0;
    return;
  }
  let k = 0;
  for (const l of topo.links) {
    if (k >= MAX_LINKS) break;
    const a = slotOf(topo, l.a);
    const b = slotOf(topo, l.b);
    const ax = cur[a * 2];
    const az = cur[a * 2 + 1];
    const dx = cur[b * 2] - ax;
    const dz = cur[b * 2 + 1] - az;
    const length = Math.hypot(dx, dz);
    const r = RADIUS[l.kind] * (weak?.kind === "link" && weak.id === l.id ? 1.5 : 1);
    if (length > 1e-5) tmpQuat.setFromUnitVectors(UP, tmpDir.set(dx / length, 0, dz / length));
    else tmpQuat.identity();
    tmpMatrix.compose(
      tmpPos.set(ax + dx / 2, CABLE_Y + (l.kind === "segment" ? 0.01 : 0), az + dz / 2),
      tmpQuat,
      tmpScale.set(r, Math.max(length, 1e-4), r),
    );
    mesh.setMatrixAt(k++, tmpMatrix);
  }
  mesh.count = k;
  mesh.instanceMatrix.needsUpdate = true;
}

/** The T-joints where each drop cable meets a bus backbone. */
function writeTaps(mesh: InstancedMesh, topo: Topology | null, cur: Float32Array) {
  if (!topo || topo.kind !== "bus") {
    mesh.count = 0;
    return;
  }
  for (let i = 0; i < topo.n; i++) {
    const s = MAX_N + i;
    tmpMatrix.compose(tmpPos.set(cur[s * 2], CABLE_Y + 0.02, cur[s * 2 + 1]), noTurn, tmpScale.set(0.17, 0.1, 0.13));
    mesh.setMatrixAt(i, tmpMatrix);
  }
  mesh.count = topo.n;
  mesh.instanceMatrix.needsUpdate = true;
}

interface CableColors {
  link: string;
  segment: string;
  drop: string;
  tap: string;
  pad: string;
  weak: string;
}

function paintCables(mesh: InstancedMesh, topo: Topology | null, weak: FailureItem | null, c: CableColors) {
  if (!topo) return;
  let k = 0;
  for (const l of topo.links) {
    if (k >= MAX_LINKS) break;
    const isWeak = weak?.kind === "link" && weak.id === l.id;
    mesh.setColorAt(k++, tmpColor.set(isWeak ? c.weak : c[l.kind]));
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

function paintAll(mesh: InstancedMesh, count: number, color: string) {
  tmpColor.set(color);
  for (let i = 0; i < count; i++) mesh.setColorAt(i, tmpColor);
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

/* ------------------------------------------------------------------ */
/* Packets: every device sends to the gateway along its real route     */
/* ------------------------------------------------------------------ */

interface Key {
  t: number;
  x: number;
  z: number;
}

interface Trip {
  keys: Key[];
  start: number;
  duration: number;
}

function planTrips(topo: Topology): { trips: Trip[]; cycle: number } {
  const trips: Trip[] = [];
  let start = 0;
  let end = 0;
  for (let d = 1; d < topo.n; d++) {
    const route = routeToGateway(topo, d);
    if (!route) continue;
    const ids = cablePath(topo, route);
    const keys: Key[] = [];
    let t = 0;
    ids.forEach((id, j) => {
      const node = topo.nodes[id];
      const x = node.x * SX;
      const z = node.y * SZ;
      const prev = keys[keys.length - 1];
      if (prev) t += Math.hypot(x - prev.x, z - prev.z) / SPEED;
      keys.push({ t, x, z });
      // A device in the middle of the route receives the packet and sends it on: one hop.
      if (j > 0 && j < ids.length - 1 && id < topo.n) {
        t += HOP_HOLD;
        keys.push({ t, x, z });
      }
    });
    trips.push({ keys, start, duration: t });
    end = Math.max(end, start + t);
    start += STAGGER;
  }
  return { trips, cycle: end + REST };
}

function sampleTrip(keys: Key[], t: number, out: Vector3): Vector3 {
  let i = 1;
  while (i < keys.length - 1 && keys[i].t < t) i++;
  const a = keys[i - 1];
  const b = keys[i] ?? a;
  const span = b.t - a.t;
  const u = span > 0 ? Math.min(1, Math.max(0, (t - a.t) / span)) : 1;
  return out.set(a.x + (b.x - a.x) * u, PACKET_Y, a.z + (b.z - a.z) * u);
}

function Packets({
  topo,
  color,
  ringRef,
}: {
  topo: Topology;
  color: string;
  ringRef: RefObject<MeshBasicMaterial | null>;
}) {
  const { paused } = useSceneMotion();
  const plan = useMemo(() => planTrips(topo), [topo]);
  const core = useRef<InstancedMesh>(null);
  const halo = useRef<InstancedMesh>(null);
  const time = useRef(0);
  const point = useMemo(() => new Vector3(), []);

  useEffect(
    () => () => {
      const ring = ringRef.current;
      if (ring) ring.opacity = 0;
    },
    [ringRef],
  );

  useFrame((_, delta) => {
    const c = core.current;
    const h = halo.current;
    if (!c || !h) return;
    if (!paused) time.current += Math.min(delta, MAX_STEP);
    const { trips, cycle } = plan;
    const within = time.current % cycle;
    let since = Infinity;
    trips.forEach((trip, k) => {
      const local = within - trip.start;
      const moving = local >= 0 && local <= trip.duration;
      const size = moving ? 1 : 0;
      sampleTrip(trip.keys, moving ? local : 0, point);
      tmpMatrix.compose(point, noTurn, tmpScale.setScalar(0.085 * size));
      c.setMatrixAt(k, tmpMatrix);
      tmpMatrix.compose(point, noTurn, tmpScale.setScalar(0.2 * size));
      h.setMatrixAt(k, tmpMatrix);
      let after = local - trip.duration;
      if (after < 0) after += cycle;
      if (time.current >= trip.start + trip.duration) since = Math.min(since, after);
    });
    c.count = trips.length;
    h.count = trips.length;
    c.instanceMatrix.needsUpdate = true;
    h.instanceMatrix.needsUpdate = true;
    const ring = ringRef.current;
    if (ring) ring.opacity = since < ARRIVE_GLOW ? 0.6 * (1 - since / ARRIVE_GLOW) : 0;
  });

  return (
    <>
      <instancedMesh ref={core} args={[packetGeometry, undefined, MAX_N]} frustumCulled={false}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} roughness={0.4} />
      </instancedMesh>
      <instancedMesh ref={halo} args={[packetGeometry, undefined, MAX_N]} frustumCulled={false}>
        <meshBasicMaterial color={color} transparent opacity={0.24} depthWrite={false} />
      </instancedMesh>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* The network                                                         */
/* ------------------------------------------------------------------ */

interface Morph {
  /** 0 to 1; 1 means settled. */
  t: number;
  from: Float32Array;
  to: Float32Array;
  cur: Float32Array;
  /** The topology being drawn (or faded in). */
  inTopo: Topology;
  inWeak: FailureItem | null;
  inKey: string;
  /** The topology whose cables are fading out, if any. */
  outTopo: Topology | null;
  outWeak: FailureItem | null;
  /** How visible the outgoing cables were when the change started. */
  outStart: number;
  dirty: boolean;
  colorsDirty: boolean;
}

function Network({ kind, n, weak = null }: TopologySceneProps) {
  const p = usePalette();
  const { paused } = useSceneMotion();
  const invalidate = useThree((s) => s.invalidate);
  const roomy = useThree((s) => s.size.width) >= 520;
  const fit = useFitScale(FIT_WIDTH);
  const topo = useMemo(() => buildTopology(kind, n), [kind, n]);
  const layoutKey = `${kind}-${n}`;

  const colors = useMemo(() => {
    const ground = mixColor(p.surface2, p.lineStrong, 0.35);
    return {
      ground,
      gatewayPad: mixColor(ground, p.brand, 0.45),
      cables: {
        link: mixColor(p.ink3, p.ink2, 0.4),
        segment: p.copper,
        drop: p.ink3,
        tap: p.casingDark,
        pad: mixColor(ground, p.ink3, 0.3),
        weak: p.bad,
      } satisfies CableColors,
    };
  }, [p]);

  const morph = useRef<Morph | null>(null);
  if (morph.current === null) {
    const cur = new Float32Array(SLOTS * 2);
    writeTargets(topo, cur);
    morph.current = {
      t: 1,
      from: cur.slice(),
      to: cur.slice(),
      cur,
      inTopo: topo,
      inWeak: weak,
      inKey: layoutKey,
      outTopo: null,
      outWeak: null,
      outStart: 0,
      dirty: true,
      colorsDirty: true,
    };
  }

  const [settledKey, setSettledKey] = useState(layoutKey);
  const [liveKey, setLiveKey] = useState<string | null>(null);

  const gatewayRef = useRef<Group>(null);
  const deviceRefs = useRef<Array<Group | null>>([]);
  const cablesIn = useRef<InstancedMesh>(null);
  const cablesOut = useRef<InstancedMesh>(null);
  const tapsIn = useRef<InstancedMesh>(null);
  const tapsOut = useRef<InstancedMesh>(null);
  const pads = useRef<InstancedMesh>(null);
  const inMats = useRef<Array<MeshStandardMaterial | null>>([null, null]);
  const outMats = useRef<Array<MeshStandardMaterial | null>>([null, null]);
  const ringRef = useRef<MeshBasicMaterial>(null);

  // A new layout: glide every node from where it is now to its new place.
  useLayoutEffect(() => {
    const m = morph.current!;
    if (m.inTopo !== topo) {
      const prev = m.inTopo;
      const { from, to, cur } = m;
      m.outStart = inOpacity(m.t);
      m.outTopo = prev;
      m.outWeak = m.inWeak;
      from.set(cur);
      // New devices grow out of the gateway; new bus taps start at their device.
      for (let i = 0; i < topo.n; i++) {
        if (!hasSlot(prev, i)) {
          from[i * 2] = cur[0];
          from[i * 2 + 1] = cur[1];
        }
      }
      for (let i = 0; i < topo.n; i++) {
        const s = MAX_N + i;
        if (hasSlot(topo, s) && !hasSlot(prev, s)) {
          from[s * 2] = from[i * 2];
          from[s * 2 + 1] = from[i * 2 + 1];
        }
      }
      to.set(from);
      writeTargets(topo, to);
      m.inTopo = topo;
      m.inKey = layoutKey;
      m.t = paused ? 1 : 0;
      if (paused) setSettledKey(layoutKey);
    }
    m.inWeak = weak;
    m.dirty = true;
    m.colorsDirty = true;
    invalidate();
    // `paused` is read only at the moment the layout changes.
  }, [topo, weak, layoutKey, invalidate]);

  useEffect(() => {
    morph.current!.colorsDirty = true;
    invalidate();
  }, [colors, invalidate]);

  // Packets run only once the nodes have settled, and only after the scene has played.
  useEffect(() => {
    if (!paused && settledKey === layoutKey) setLiveKey(layoutKey);
  }, [paused, settledKey, layoutKey]);

  useFrame((_, delta) => {
    const m = morph.current!;
    if (m.t < 1) {
      m.t = paused ? 1 : Math.min(1, m.t + Math.min(delta, MAX_STEP) / MORPH);
      m.dirty = true;
      if (m.t >= 1) setSettledKey(m.inKey);
    }

    const cIn = cablesIn.current;
    const cOut = cablesOut.current;
    const tIn = tapsIn.current;
    const tOut = tapsOut.current;
    const padMesh = pads.current;
    if (!cIn || !cOut || !tIn || !tOut || !padMesh) return;

    if (m.colorsDirty) {
      m.colorsDirty = false;
      const c = colors.cables;
      paintCables(cIn, m.inTopo, m.inWeak, c);
      paintCables(cOut, m.outTopo, m.outWeak, c);
      paintAll(tIn, MAX_N, c.tap);
      paintAll(tOut, MAX_N, c.tap);
      tmpColor.set(c.pad);
      for (let i = 1; i < MAX_N; i++) {
        const isWeak = m.inWeak?.kind === "node" && m.inWeak.id === i;
        padMesh.setColorAt(i - 1, isWeak ? tmpColor.set(c.weak) : tmpColor.set(c.pad));
      }
      if (padMesh.instanceColor) padMesh.instanceColor.needsUpdate = true;
    }

    if (!m.dirty) return;
    m.dirty = false;

    const { from, to, cur, t } = m;
    const e = ease(t);
    for (let i = 0; i < SLOTS * 2; i++) cur[i] = from[i] + (to[i] - from[i]) * e;

    const topoNow = m.inTopo;
    gatewayRef.current?.position.set(cur[0], 0, cur[1]);
    for (let i = 1; i < topoNow.n; i++) {
      deviceRefs.current[i]?.position.set(cur[i * 2], 0, cur[i * 2 + 1]);
      tmpMatrix.compose(tmpPos.set(cur[i * 2], 0.012, cur[i * 2 + 1]), noTurn, tmpScale.set(PAD_R, 0.024, PAD_R));
      padMesh.setMatrixAt(i - 1, tmpMatrix);
    }
    padMesh.count = topoNow.n - 1;
    padMesh.instanceMatrix.needsUpdate = true;

    if (t >= 1) m.outTopo = null;
    writeCables(cIn, topoNow, cur, m.inWeak);
    writeCables(cOut, m.outTopo, cur, m.outWeak);
    writeTaps(tIn, topoNow, cur);
    writeTaps(tOut, m.outTopo, cur);

    const fadeIn = t >= 1 ? 1 : inOpacity(t);
    const fadeOut = m.outTopo ? m.outStart * outFade(t) : 0;
    for (const mat of inMats.current) if (mat) mat.opacity = fadeIn;
    for (const mat of outMats.current) if (mat) mat.opacity = fadeOut;
    cIn.visible = tIn.visible = fadeIn > 0.001;
    cOut.visible = tOut.visible = fadeOut > 0.001;
  });

  const devices = Array.from({ length: n - 1 }, (_, k) => k + 1);
  // On phones with many nodes the number labels would touch; the readout below still names them.
  const showNumbers = roomy || n <= 8;

  return (
    <group position={[0, VIEW_Y * (1 - fit), 0]} scale={fit}>
      {/* Ground */}
      <RoundedBox args={[GROUND_W, 0.14, GROUND_D]} radius={0.06} smoothness={2} position={[0, -0.07, 0]}>
        <meshStandardMaterial color={colors.ground} roughness={0.9} />
      </RoundedBox>

      {/* Device pads, cables and bus taps: one draw call each */}
      <instancedMesh ref={pads} args={[padGeometry, undefined, MAX_N]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={cablesIn} args={[cableGeometry, undefined, MAX_LINKS]} frustumCulled={false}>
        <meshStandardMaterial
          ref={(mat) => {
            inMats.current[0] = mat;
          }}
          transparent
          roughness={0.55}
        />
      </instancedMesh>
      <instancedMesh ref={tapsIn} args={[tapGeometry, undefined, MAX_N]} frustumCulled={false}>
        <meshStandardMaterial
          ref={(mat) => {
            inMats.current[1] = mat;
          }}
          transparent
          roughness={0.6}
        />
      </instancedMesh>
      <instancedMesh ref={cablesOut} args={[cableGeometry, undefined, MAX_LINKS]} frustumCulled={false}>
        <meshStandardMaterial
          ref={(mat) => {
            outMats.current[0] = mat;
          }}
          transparent
          depthWrite={false}
          roughness={0.55}
        />
      </instancedMesh>
      <instancedMesh ref={tapsOut} args={[tapGeometry, undefined, MAX_N]} frustumCulled={false}>
        <meshStandardMaterial
          ref={(mat) => {
            outMats.current[1] = mat;
          }}
          transparent
          depthWrite={false}
          roughness={0.6}
        />
      </instancedMesh>

      {/* Gateway */}
      <group ref={gatewayRef}>
        <mesh position={[0, 0.012, 0]} geometry={padGeometry} scale={[GATEWAY_PAD_R, 0.024, GATEWAY_PAD_R]}>
          <meshStandardMaterial color={colors.gatewayPad} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[GATEWAY_PAD_R + 0.05, 0.035, 6, 36]} />
          <meshBasicMaterial ref={ringRef} color={p.signal} transparent opacity={0} depthWrite={false} />
        </mesh>
        <Gateway scale={GATEWAY_SCALE} accent={p.brand} />
        <Label3D position={[0, roomy ? 1.0 : 1.4, 0]} tone="accent">
          <strong>Gateway</strong>
        </Label3D>
      </group>

      {/* Devices */}
      {devices.map((i) => (
        <group
          key={i}
          ref={(g) => {
            deviceRefs.current[i] = g;
          }}
        >
          <SensorNode scale={DEVICE_SCALE} />
          <Label3D position={[0, 0.9, 0]} visible={showNumbers}>
            {i}
          </Label3D>
        </group>
      ))}

      {/* Packets, once the layout has settled */}
      {liveKey === layoutKey && settledKey === layoutKey && (
        <Packets key={layoutKey} topo={topo} color={p.signal} ringRef={ringRef} />
      )}
    </group>
  );
}

/**
 * Topic 2.1: a small network of sensor nodes and one gateway that glides
 * between the five topologies, with packets following each device's real
 * route to the gateway.
 */
export default function TopologyScene({ kind, n, weak = null }: TopologySceneProps) {
  return (
    <Scene3D
      label={`${n} nodes wired as a ${kind} topology, with packets travelling from each device to the gateway`}
      height="clamp(300px, 70vw, 440px)"
      camera={{ position: [0, 7.2, 4.5], fov: 34, target: [0, VIEW_Y, 0.4] }}
    >
      <Network kind={kind} n={Math.min(Math.max(n, 5), MAX_N)} weak={weak} />
    </Scene3D>
  );
}
