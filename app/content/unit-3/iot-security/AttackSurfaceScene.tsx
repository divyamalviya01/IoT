import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { RoundedBox } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { useReducedMotion } from "motion/react";
import {
  BoxGeometry,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Matrix4,
  Quaternion,
  Shape,
  Vector3,
  type BufferGeometry,
  type InstancedMesh,
} from "three";
import { cn } from "~/lib/cn";
import { usePalette } from "~/lib/palette";
import {
  AssetFrame,
  CloudServer,
  GlowMaterial,
  House,
  Label3D,
  Led,
  Link3D,
  PacketParticle,
  Phone,
  Router,
  Scene3D,
  SignalRings,
  Tree,
  mixColor,
  useFitScale,
  useSceneMotion,
  type AssetProps,
  type Vec3,
} from "~/components/three";
import {
  DEVICE_NAME,
  THREATS,
  threatsIn,
  type DeviceId,
  type LayerChoice,
  type Threat,
  type ThreatId,
} from "./threats";

export interface AttackSurfaceSceneProps {
  layer: LayerChoice;
  active: ThreatId;
  defended: boolean;
  onSelect?: (id: ThreatId) => void;
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

interface DeviceSpec {
  position: Vec3;
  rotation?: Vec3;
  scale?: number;
  /** Where links and packets meet the device. */
  anchor: Vec3;
  /** Where a warning sign floats over the device. */
  mark: Vec3;
  /** Where the device's name sits, at its foot. */
  nameAt: Vec3;
  pad: number;
}

const CLOUD_LIFT = 0.75;
/** Height the camera looks at; the fit scale shrinks the diorama around it. */
const VIEW_Y = 0.6;
const MARK_GAP = 0.3;
const PILL_GAP = 0.36;

interface Layout {
  fitWidth: number;
  devices: Record<DeviceId, DeviceSpec>;
  house: Vec3;
  ground: [number, number];
  trees: Vec3[];
}

/** Wide views spread the home out; phones pack it closer so each part is drawn bigger. */
function makeLayout(squeeze: number, fitWidth: number, cloudMark: Vec3): Layout {
  const x = (v: number) => v * squeeze;
  const device = (
    px: number,
    pz: number,
    top: number,
    anchorY: number,
    extra: Partial<DeviceSpec> & { lift?: number; nameDz?: number } = {},
  ): DeviceSpec => {
    const lift = extra.lift ?? 0;
    const pad = extra.pad ?? 0.42;
    return {
      position: [x(px), lift, pz],
      rotation: extra.rotation,
      scale: extra.scale,
      anchor: [x(px), lift + anchorY, pz],
      mark: [x(px), lift + top + MARK_GAP, pz],
      nameAt: [x(px), 0.02, pz + pad + (extra.nameDz ?? 0.16)],
      pad,
    };
  };
  const cloud = device(3.0, -1.45, 2.35, 1.0, { lift: CLOUD_LIFT, rotation: [0, -0.3, 0], scale: 0.85, pad: 0.7 });
  return {
    fitWidth,
    devices: {
      camera: device(-3.1, 0.6, 1.2, 1.0, { rotation: [0, 0.3, 0] }),
      lock: device(-1.65, 1.45, 1.08, 0.58, { rotation: [0, 0.1, 0], pad: 0.5 }),
      thermostat: device(-0.3, 0.3, 1.0, 0.72, { rotation: [0, -0.05, 0] }),
      router: device(1.0, -0.8, 0.82, 0.45, { rotation: [0, -0.15, 0], scale: 1.05, pad: 0.6 }),
      cloud: {
        ...cloud,
        // The cloud's signs sit by the server, not high above its cloud.
        mark: [x(3.0) + cloudMark[0], CLOUD_LIFT + cloudMark[1], -1.45 + cloudMark[2]],
        nameAt: [x(3.0), CLOUD_LIFT - 0.05, -1.45 + 0.85],
      },
      phone: device(2.4, 1.35, 1.18, 1.05, { rotation: [0, -0.3, 0], scale: 1.05, pad: 0.45 }),
    },
    house: [x(-2.2), 0, -1.55],
    ground: [x(8.2) + 0.2, 5.0],
    trees: [
      [x(-3.85), 0, -1.95],
      [x(3.9), 0, 0.45],
    ],
  };
}

const WIDE = makeLayout(1, 9.0, [0.85, 0.75, 0.05]);
const NARROW = makeLayout(0.78, 7.0, [-0.15, 1.05, 0.5]);
/** On phones the home tips towards the camera so the front and back rows spread apart. */
const NARROW_TILT = 0.2;
/** On phones, labels near the edges move inwards so they are not cut off. */
const PILL_LIMIT = 1.9;

type LinkSpec = [DeviceId, DeviceId, number];

const LINKS: LinkSpec[] = [
  ["camera", "router", 0.75],
  ["lock", "router", 0.6],
  ["thermostat", "router", 0.45],
  ["router", "cloud", 0.6],
  ["cloud", "phone", 0.45],
];

const linkKey = (a: DeviceId, b: DeviceId) => `${a}-${b}`;

function arcOf(a: DeviceId, b: DeviceId): number {
  const found = LINKS.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
  return found ? found[2] : 0.5;
}

/** Point half-way along a link's curve (a quadratic curve raised by `arc`). */
function linkMiddle(from: Vec3, to: Vec3, arc: number): Vec3 {
  return [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + arc / 2, (from[2] + to[2]) / 2];
}

/** Each threat's sign and label belong to one spot: a device, or a link. */
function spotKey(t: Threat): string {
  return "device" in t.spot ? t.spot.device : linkKey(t.spot.link[0], t.spot.link[1]);
}

function spotMark(t: Threat, L: Layout): Vec3 {
  if ("device" in t.spot) return L.devices[t.spot.device].mark;
  const [a, b] = t.spot.link;
  const [x, y, z] = linkMiddle(L.devices[a].anchor, L.devices[b].anchor, arcOf(a, b));
  return [x, y + 0.24, z];
}

/* ------------------------------------------------------------------ */
/* Packets: video goes up to the phone, an unlock command comes back   */
/* ------------------------------------------------------------------ */

const HOP = 1.1;
const VIDEO: DeviceId[] = ["camera", "router", "cloud", "phone"];
const COMMAND: DeviceId[] = ["phone", "cloud", "router", "lock"];
const READING: DeviceId[] = ["thermostat", "router"];
const COMMAND_START = HOP * 3 + 0.5;
const CYCLE = COMMAND_START + HOP * 3 + 0.9;

function Route({ stops, start, color, L }: { stops: DeviceId[]; start: number; color?: string; L: Layout }) {
  return (
    <>
      {stops.slice(0, -1).map((id, i) => {
        const next = stops[i + 1];
        return (
          <PacketParticle
            key={`${id}-${next}`}
            from={L.devices[id].anchor}
            to={L.devices[next].anchor}
            arc={arcOf(id, next)}
            duration={HOP}
            delay={start + i * HOP}
            repeatDelay={CYCLE - HOP}
            color={color}
            size={0.08}
            idleProgress={0.35}
          />
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Devices that the shared assets don't have                           */
/* ------------------------------------------------------------------ */

/** An outdoor door camera on a short post. About 1.2 tall. */
function DoorCamera(props: AssetProps) {
  const p = usePalette();
  return (
    <AssetFrame {...props} labelHeight={1.4}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.18, 0.21, 0.04, 20]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.47, 0]}>
        <boxGeometry args={[0.12, 0.9, 0.12]} />
        <meshStandardMaterial color={p.casing} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.94, 0.05]}>
        <boxGeometry args={[0.08, 0.08, 0.14]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.6} />
      </mesh>
      {/* Housing, tipped down towards the gate */}
      <group position={[0, 1.02, 0.12]} rotation={[0.28, 0, 0]}>
        <RoundedBox args={[0.24, 0.2, 0.42]} radius={0.05} smoothness={2}>
          <GlowMaterial color={p.silk} roughness={0.5} />
        </RoundedBox>
        <mesh position={[0, 0.115, 0.03]}>
          <boxGeometry args={[0.28, 0.025, 0.48]} />
          <GlowMaterial color={p.casing} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.01, 0.214]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.02, 20]} />
          <meshStandardMaterial color={p.casingDark} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.01, 0.226]}>
          <sphereGeometry args={[0.042, 14, 10]} />
          <meshStandardMaterial color={p.u2} emissive={p.u2} emissiveIntensity={0.35} roughness={0.2} />
        </mesh>
        <Led position={[0.085, 0.055, 0.212]} color={p.signal} size={0.016} period={1.6} />
      </group>
    </AssetFrame>
  );
}

const slatX = [-0.24, -0.12, 0, 0.12, 0.24];

/** A garden gate with a smart lock and keypad. About 1.1 tall. */
function SmartLockGate(props: AssetProps) {
  const p = usePalette();
  const wood = useMemo(() => mixColor(p.copper, p.casing, 0.45), [p.copper, p.casing]);
  return (
    <AssetFrame {...props} labelHeight={1.3}>
      {/* Posts */}
      {[-0.42, 0.42].map((px) => (
        <group key={px}>
          <mesh position={[px, 0.53, 0]}>
            <boxGeometry args={[0.1, 1.06, 0.1]} />
            <meshStandardMaterial color={p.casingDark} roughness={0.7} />
          </mesh>
          <mesh position={[px, 1.08, 0]}>
            <boxGeometry args={[0.14, 0.04, 0.14]} />
            <meshStandardMaterial color={p.casing} roughness={0.7} />
          </mesh>
        </group>
      ))}
      {/* Gate: rails and slats */}
      {[0.22, 0.86].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[0.74, 0.07, 0.04]} />
          <GlowMaterial color={wood} roughness={0.75} />
        </mesh>
      ))}
      {slatX.map((sx) => (
        <mesh key={sx} position={[sx, 0.54, 0.02]}>
          <boxGeometry args={[0.085, 0.78, 0.03]} />
          <GlowMaterial color={wood} roughness={0.75} />
        </mesh>
      ))}
      {/* Smart lock with keypad and status light */}
      <RoundedBox args={[0.16, 0.27, 0.07]} radius={0.025} smoothness={2} position={[0.25, 0.56, 0.06]}>
        <GlowMaterial color={p.casingDark} roughness={0.4} />
      </RoundedBox>
      {[0, 1, 2].map((row) =>
        [-1, 1].map((col) => (
          <mesh key={`${row}${col}`} position={[0.25 + col * 0.035, 0.6 - row * 0.05, 0.097]}>
            <boxGeometry args={[0.04, 0.03, 0.008]} />
            <meshStandardMaterial color={p.silk} roughness={0.5} />
          </mesh>
        )),
      )}
      <Led position={[0.25, 0.47, 0.097]} color={p.signal} size={0.014} period={2} />
    </AssetFrame>
  );
}

/** A round smart thermostat on a stand, with a glowing display. About 1 tall. */
function Thermostat(props: AssetProps) {
  const p = usePalette();
  return (
    <AssetFrame {...props} labelHeight={1.2}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.18, 0.21, 0.04, 20]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.03, 0.035, 0.46, 10]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.27, 0.27, 0.1, 32]} />
        <GlowMaterial color={p.casing} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.72, 0.05]}>
        <torusGeometry args={[0.25, 0.025, 8, 32]} />
        <GlowMaterial color={p.copper} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.72, 0.052]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.01, 32]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.74, 0.06]}>
        <boxGeometry args={[0.18, 0.09, 0.006]} />
        <meshStandardMaterial color={p.signal} emissive={p.signal} emissiveIntensity={0.55} roughness={0.4} />
      </mesh>
      <Led position={[0, 0.62, 0.06]} color={p.copper} size={0.018} blink={false} />
    </AssetFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Instanced pads under the devices                                    */
/* ------------------------------------------------------------------ */

const discGeometry = new CylinderGeometry(1, 1, 1, 28);
const tmpMatrix = new Matrix4();
const tmpPos = new Vector3();
const tmpScale = new Vector3();
const noTurn = new Quaternion();

function Pads({ items, color }: { items: { at: Vec3; r: number }[]; color: string }) {
  const ref = useRef<InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => {
      tmpMatrix.compose(tmpPos.set(it.at[0], 0.012, it.at[2]), noTurn, tmpScale.set(it.r, 0.024, it.r));
      mesh.setMatrixAt(i, tmpMatrix);
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [items, invalidate]);
  return (
    <instancedMesh ref={ref} args={[discGeometry, undefined, 8]} frustumCulled={false}>
      <meshStandardMaterial color={color} roughness={0.85} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
/* Threat markers: a warning sign per threat, or a shield when defended */
/* ------------------------------------------------------------------ */

const MAX_MARKERS = THREATS.length;
const MARK_SIZE = 0.62;

function triangleShape(): Shape {
  const s = new Shape();
  s.moveTo(0, 0.27);
  s.lineTo(0.3, -0.22);
  s.lineTo(-0.3, -0.22);
  s.closePath();
  return s;
}

function shieldShape(): Shape {
  const s = new Shape();
  s.moveTo(-0.22, 0.25);
  s.quadraticCurveTo(0, 0.31, 0.22, 0.25);
  s.lineTo(0.22, 0.04);
  s.quadraticCurveTo(0.21, -0.17, 0, -0.29);
  s.quadraticCurveTo(-0.21, -0.17, -0.22, 0.04);
  s.closePath();
  return s;
}

const EXTRUDE = { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.025, bevelSegments: 2, curveSegments: 10 };
const triangleGeometry = new ExtrudeGeometry(triangleShape(), EXTRUDE).translate(0, 0, -0.025);
const shieldGeometry = new ExtrudeGeometry(shieldShape(), EXTRUDE).translate(0, 0, -0.025);
const unitBox = new BoxGeometry(1, 1, 1);

function partMatrix(x: number, y: number, angle: number, w: number, h: number): Matrix4 {
  return new Matrix4().compose(
    new Vector3(x, y, 0.055),
    new Quaternion().setFromEuler(new Euler(0, 0, angle)),
    new Vector3(w, h, 0.02),
  );
}

/** The "!" on the warning sign. */
const WARN_FACE = [partMatrix(0, 0.025, 0, 0.055, 0.2), partMatrix(0, -0.135, 0, 0.055, 0.055)];
/** The tick on the shield. */
const SHIELD_FACE = [partMatrix(-0.065, -0.03, 0.72, 0.05, 0.13), partMatrix(0.04, 0.015, -0.69, 0.05, 0.25)];

interface MarkerItem {
  id: ThreatId;
  position: Vec3;
  /** 0 hides the marker. */
  size: number;
}

const markerBase = new Matrix4();
const markerPart = new Matrix4();
const markerQuat = new Quaternion();
const markerEuler = new Euler();
const markerPos = new Vector3();
const markerScale = new Vector3();
const eyeLocal = new Vector3();

function Markers({
  items,
  defended,
  onPick,
}: {
  items: MarkerItem[];
  defended: boolean;
  onPick?: (id: ThreatId) => void;
}) {
  const p = usePalette();
  const { paused } = useSceneMotion();
  const reduced = useReducedMotion() ?? false;
  const invalidate = useThree((s) => s.invalidate);

  const signRef = useRef<InstancedMesh>(null);
  const bangRef = useRef<InstancedMesh>(null);
  const bangDotRef = useRef<InstancedMesh>(null);
  const shieldRef = useRef<InstancedMesh>(null);
  const tickRef = useRef<InstancedMesh>(null);
  const tickLongRef = useRef<InstancedMesh>(null);

  const warnScale = useRef(new Float32Array(MAX_MARKERS));
  const shieldScale = useRef(new Float32Array(MAX_MARKERS));
  const time = useRef(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const defendedRef = useRef(defended);
  defendedRef.current = defended;
  const snapRef = useRef(reduced);
  snapRef.current = reduced;

  useEffect(() => {
    invalidate();
  }, [items, defended, invalidate]);

  useFrame((state, delta) => {
    const meshes = [signRef.current, bangRef.current, bangDotRef.current, shieldRef.current, tickRef.current, tickLongRef.current];
    if (meshes.some((m) => !m)) return;
    const [sign, bang, bangDot, shield, tick, tickLong] = meshes as InstancedMesh[];
    const step = Math.min(delta, 0.1);
    if (!paused) time.current += step;

    // The camera's position in the diorama's own (scaled) space, so signs can turn to face it.
    const parent = sign.parent;
    eyeLocal.copy(state.camera.position);
    if (parent) parent.worldToLocal(eyeLocal);

    const ease = snapRef.current ? 1 : 1 - Math.exp(-step * 12);
    const list = itemsRef.current;
    let moving = false;

    const place = (
      scales: Float32Array,
      i: number,
      target: number,
      base: InstancedMesh,
      faces: InstancedMesh[],
      faceMats: Matrix4[],
      x: number,
      y: number,
      z: number,
    ) => {
      const current = scales[i];
      let next = current + (target - current) * ease;
      if (Math.abs(target - next) < 1e-3) next = target;
      else moving = true;
      scales[i] = next;
      const bob = paused ? 0 : Math.sin(time.current * 2.2 + i * 1.3) * 0.04;
      markerQuat.setFromEuler(markerEuler.set(0, Math.atan2(eyeLocal.x - x, eyeLocal.z - z), 0));
      markerBase.compose(markerPos.set(x, y + bob, z), markerQuat, markerScale.setScalar(next * MARK_SIZE));
      base.setMatrixAt(i, markerBase);
      faces.forEach((face, k) => face.setMatrixAt(i, markerPart.multiplyMatrices(markerBase, faceMats[k])));
    };

    for (let i = 0; i < MAX_MARKERS; i++) {
      const item = list[i];
      const size = item ? item.size : 0;
      const [x, y, z] = item ? item.position : [0, 0, 0];
      place(warnScale.current, i, defendedRef.current ? 0 : size, sign, [bang, bangDot], WARN_FACE, x, y, z);
      place(shieldScale.current, i, defendedRef.current ? size : 0, shield, [tick, tickLong], SHIELD_FACE, x, y, z);
    }
    for (const m of meshes as InstancedMesh[]) {
      m.count = MAX_MARKERS;
      m.instanceMatrix.needsUpdate = true;
    }
    if (moving) invalidate();
  });

  const pick = (e: ThreatEvent) => {
    e.stopPropagation();
    if (e.delta > 6 || e.instanceId === undefined) return;
    const item = itemsRef.current[e.instanceId];
    if (item && item.size > 0) onPick?.(item.id);
  };
  const handlers = onPick
    ? {
        onClick: pick,
        onPointerOver: (e: ThreatEvent) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        },
        onPointerOut: () => {
          document.body.style.cursor = "";
        },
      }
    : {};

  useEffect(
    () => () => {
      document.body.style.cursor = "";
    },
    [],
  );

  const instanced = (ref: RefObject<InstancedMesh | null>, geometry: BufferGeometry, color: string, glow: number, clickable: boolean) => (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, MAX_MARKERS]}
      frustumCulled={false}
      {...(clickable ? handlers : {})}
    >
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} roughness={0.45} />
    </instancedMesh>
  );

  return (
    <>
      {instanced(signRef, triangleGeometry, p.bad, 0.3, true)}
      {instanced(bangRef, unitBox, p.surface, 0.2, false)}
      {instanced(bangDotRef, unitBox, p.surface, 0.2, false)}
      {instanced(shieldRef, shieldGeometry, p.ok, 0.3, true)}
      {instanced(tickRef, unitBox, p.surface, 0.2, false)}
      {instanced(tickLongRef, unitBox, p.surface, 0.2, false)}
    </>
  );
}

type ThreatEvent = ThreeEvent<MouseEvent | PointerEvent>;

/* ------------------------------------------------------------------ */
/* Labels: one pill per spot, listing its threats (or defences)         */
/* ------------------------------------------------------------------ */

function SpotPill({ threats, active, defended }: { threats: Threat[]; active: ThreatId; defended: boolean }) {
  return (
    <span className="grid gap-0.5">
      {threats.map((t) => (
        <span
          key={t.id}
          className={cn(
            "inline-flex items-center gap-1",
            defended ? "text-ok" : "text-bad",
            t.id === active ? "font-bold" : "font-semibold",
          )}
        >
          {defended ? <ShieldCheck size={13} aria-hidden /> : <TriangleAlert size={13} aria-hidden />}
          {defended ? t.defence : t.short}
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

const DEVICE_IDS: DeviceId[] = ["camera", "lock", "thermostat", "router", "cloud", "phone"];

function Home({ layer, active, defended, onSelect }: AttackSurfaceSceneProps) {
  const p = usePalette();
  const roomy = useThree((s) => s.size.width) >= 560;
  const L = roomy ? WIDE : NARROW;
  const fit = useFitScale(L.fitWidth);

  const visible = useMemo(() => threatsIn(layer), [layer]);
  const visibleIds = useMemo(() => new Set(visible.map((t) => t.id)), [visible]);
  const activeThreat = THREATS.find((t) => t.id === active) ?? visible[0];
  const activeSpot = activeThreat ? spotKey(activeThreat) : null;

  const colors = useMemo(() => {
    const ground = mixColor(p.surface2, p.lineStrong, 0.35);
    return {
      ground,
      yard: mixColor(p.ok, p.surface2, 0.74),
      pad: mixColor(ground, p.ink3, 0.28),
      cloudPad: mixColor(p.surface2, p.ink3, 0.3),
    };
  }, [p]);

  /* Threats grouped by spot, in list order */
  const spots = useMemo(() => {
    const map = new Map<string, Threat[]>();
    for (const t of visible) {
      const key = spotKey(t);
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return map;
  }, [visible]);

  /* One marker per threat. Two threats on one device stand side by side. */
  const markers = useMemo<MarkerItem[]>(
    () =>
      THREATS.map((t) => {
        const shown = visibleIds.has(t.id);
        const group = spots.get(spotKey(t)) ?? [t];
        const index = group.findIndex((g) => g.id === t.id);
        const [x, y, z] = spotMark(t, L);
        const dx = group.length > 1 ? (index - (group.length - 1) / 2) * 0.36 : 0;
        return { id: t.id, position: [x + dx, y, z] as Vec3, size: shown ? (t.id === active ? 1.3 : 1) : 0 };
      }),
    [visibleIds, spots, L, active],
  );

  /* Clicking a device picks its next threat in the chosen layer */
  const pickOnDevice = (id: DeviceId) => {
    if (!onSelect) return;
    const own = visible.filter((t) => "device" in t.spot && t.spot.device === id);
    const near = own.length > 0 ? own : visible.filter((t) => "link" in t.spot && t.spot.link.includes(id));
    if (near.length === 0) return;
    const at = near.findIndex((t) => t.id === active);
    onSelect(near[(at + 1) % near.length].id);
  };

  const activeDevice = activeThreat && "device" in activeThreat.spot ? activeThreat.spot.device : null;
  const accent = defended ? p.ok : p.bad;

  const deviceProps = (id: DeviceId): AssetProps => {
    const spec = L.devices[id];
    return {
      position: spec.position,
      rotation: spec.rotation,
      scale: spec.scale,
      highlighted: activeDevice === id,
      accent,
      onSelect: onSelect ? () => pickOnDevice(id) : undefined,
    };
  };

  const pads = useMemo(
    () => DEVICE_IDS.filter((id) => id !== "cloud").map((id) => ({ at: L.devices[id].position, r: L.devices[id].pad })),
    [L],
  );

  const jamShown = visibleIds.has("jam");
  const router = L.devices.router;
  /* With all layers, or on phones, only the selected spot is labelled, so the view stays readable. */
  const showPill = (key: string) => (roomy && layer !== "all") || key === activeSpot;

  return (
    <group position={[0, VIEW_Y * (1 - fit), 0]} rotation={[roomy ? 0 : NARROW_TILT, 0, 0]} scale={fit}>
      {/* Ground and garden */}
      <RoundedBox args={[L.ground[0], 0.14, L.ground[1]]} radius={0.06} smoothness={2} position={[0, -0.07, 0]}>
        <meshStandardMaterial color={colors.ground} roughness={0.9} />
      </RoundedBox>
      <mesh position={[L.house[0] + 0.3, 0.006, -0.05]}>
        <boxGeometry args={[L.ground[0] * 0.48, 0.012, 4.15]} />
        <meshStandardMaterial color={colors.yard} roughness={0.95} />
      </mesh>
      <House position={L.house} rotation={[0, 0.12, 0]} scale={0.95} />
      {L.trees.map((t, i) => (
        <Tree key={i} position={t} scale={0.45} />
      ))}

      <Pads items={pads} color={colors.pad} />

      {/* Devices */}
      <DoorCamera {...deviceProps("camera")} />
      <SmartLockGate {...deviceProps("lock")} />
      <Thermostat {...deviceProps("thermostat")} />
      <Router {...deviceProps("router")} />
      <SignalRings
        position={[router.position[0], 0.95, router.position[2]]}
        color={jamShown && !defended ? p.bad : p.signal}
        maxRadius={jamShown && !defended ? 1.25 : 0.8}
        period={jamShown && !defended ? 1.1 : 2.2}
        count={jamShown && !defended ? 4 : 3}
      />
      <mesh position={[L.devices.cloud.position[0], CLOUD_LIFT - 0.05, L.devices.cloud.position[2]]}>
        <cylinderGeometry args={[0.68, 0.58, 0.1, 28]} />
        <meshStandardMaterial color={colors.cloudPad} roughness={0.7} />
      </mesh>
      <Link3D
        from={[L.devices.cloud.position[0], 0.02, L.devices.cloud.position[2]]}
        to={[L.devices.cloud.position[0], CLOUD_LIFT - 0.1, L.devices.cloud.position[2]]}
        color={p.lineStrong}
        dashed
      />
      <CloudServer {...deviceProps("cloud")} />
      <Phone {...deviceProps("phone")} />

      {/* Links: red where a shown threat sits, green and solid once it is defended */}
      {LINKS.map(([a, b, arc]) => {
        const key = linkKey(a, b);
        const threat = visible.find((t) => spotKey(t) === key);
        const on = threat?.id === active;
        const color = threat ? (defended ? p.ok : p.bad) : undefined;
        return (
          <Link3D
            key={`${key}-${threat ? "t" : "n"}-${defended}`}
            from={L.devices[a].anchor}
            to={L.devices[b].anchor}
            arc={arc}
            color={color}
            dashed={!threat || !defended}
            lineWidth={threat ? (on ? 3 : 2.2) : 1.5}
          />
        );
      })}

      {/* Video goes up to the phone; an unlock command comes back to the gate */}
      <Route stops={VIDEO} start={0} L={L} />
      <Route stops={READING} start={HOP} L={L} />
      <Route stops={COMMAND} start={COMMAND_START} color={p.copper} L={L} />

      <Markers items={markers} defended={defended} onPick={onSelect} />

      {/* Device names, at their feet */}
      {DEVICE_IDS.map((id) => (
        <Label3D key={id} position={L.devices[id].nameAt} tone={activeDevice === id ? "accent" : "default"}>
          {activeDevice === id ? <strong>{DEVICE_NAME[id]}</strong> : DEVICE_NAME[id]}
        </Label3D>
      ))}

      {/* Threat (or defence) labels, one per spot */}
      {[...spots.entries()].map(([key, threats]) => {
        const [x, y, z] = spotMark(threats[0], L);
        const lift = PILL_GAP + (threats.length - 1) * 0.14;
        const px = roomy ? x : Math.max(-PILL_LIMIT, Math.min(PILL_LIMIT, x));
        return (
          <Label3D
            key={key}
            position={[px, y + lift, z]}
            tone={key === activeSpot ? "accent" : "default"}
            visible={showPill(key)}
          >
            <SpotPill threats={threats} active={active} defended={defended} />
          </Label3D>
        );
      })}
    </group>
  );
}

/**
 * Topic 3.8: the attack surface of a smart home. Pick a layer to light up its
 * attack points on the devices and links; turn defences on to see each threat
 * matched by its fix.
 */
export default function AttackSurfaceScene({ layer, active, defended, onSelect }: AttackSurfaceSceneProps) {
  const count = threatsIn(layer).length;
  const label = `A smart home with a door camera, smart lock, thermostat, Wi-Fi router, cloud server and phone app. ${count} ${
    defended ? "threats are shown with their defences as shields" : "attack points are marked with warning signs"
  }.`;
  return (
    <Scene3D
      label={label}
      height="clamp(330px, 86vw, 450px)"
      camera={{ position: [0.3, 5.4, 7.3], fov: 38, target: [0, VIEW_Y, 0] }}
    >
      <Home layer={layer} active={active} defended={defended} onSelect={onSelect} />
    </Scene3D>
  );
}
