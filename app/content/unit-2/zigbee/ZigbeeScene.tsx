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
  type BufferGeometry,
  type InstancedMesh,
  type MeshBasicMaterial,
} from "three";
import {
  DEFAULT_NODES,
  DEFAULT_RANGE,
  FLOOR,
  buildMesh,
  nodeLabel,
  type Mesh,
  type Role,
  type ZNode,
} from "~/labs/l16-zigbee-mesh/engine";
import { usePalette } from "~/lib/palette";
import {
  AssetFrame,
  Gateway,
  GlowMaterial,
  Label3D,
  Link3D,
  Scene3D,
  SignalRings,
  mixColor,
  useFitScale,
  useSceneMotion,
  type AssetProps,
  type Vec3,
} from "~/components/three";

export type ZigbeePart = "coordinator" | "router" | "end" | "link";

export interface ZigbeeSceneProps {
  active?: ZigbeePart | null;
  onSelect?: (id: ZigbeePart) => void;
  /** Id of the router that is unplugged, or null. */
  failed?: number | null;
}

/* ------------------------------------------------------------------ */
/* What each node of the lab's floor plan is in this house             */
/* ------------------------------------------------------------------ */

export type DeviceKind = "hub" | "plug" | "bulb" | "door" | "window" | "motion" | "temp";

export const DEVICE_KIND: Record<number, DeviceKind> = {
  0: "hub",
  1: "plug",
  2: "bulb",
  3: "bulb",
  4: "plug",
  5: "window",
  6: "motion",
  7: "temp",
  8: "door",
  9: "door",
  10: "temp",
};

export const KIND_NAME: Record<DeviceKind, string> = {
  hub: "hub",
  plug: "smart plug",
  bulb: "smart bulb",
  door: "door sensor",
  window: "window sensor",
  motion: "motion sensor",
  temp: "temperature sensor",
};

const SHORT_NAME: Record<DeviceKind, string> = {
  hub: "hub",
  plug: "plug",
  bulb: "bulb",
  door: "door",
  window: "window",
  motion: "motion",
  temp: "temp",
};

const NODE_BY_ID = new Map<number, ZNode>(DEFAULT_NODES.map((n) => [n.id, n]));

export function nodeName(id: number): string {
  const node = NODE_BY_ID.get(id);
  return node ? nodeLabel(node) : `#${id}`;
}

/** The lab's mesh with one router unplugged, or none. */
export function meshFor(failed: number | null): Mesh {
  return buildMesh(DEFAULT_NODES, DEFAULT_RANGE, failed === null ? undefined : new Set([failed]));
}

const PART_OF_ROLE: Record<Role, ZigbeePart> = { coordinator: "coordinator", router: "router", end: "end" };

/* ------------------------------------------------------------------ */
/* Floor plan: the lab's 34 × 20 m plan, 0.2 scene units per metre     */
/* ------------------------------------------------------------------ */

const S = 0.2;
const toX = (x: number) => (x - FLOOR.width / 2) * S;
const toZ = (y: number) => (y - FLOOR.height / 2) * S;

const WALL_H = 0.2;
const WALL_T = 0.06;
const FLOOR_Y = 0.03;

type WallKind = "wall" | "door" | "glass";

/** Wall runs in metres: [x1, y1, x2, y2, kind]. Each run is straight along x or y. */
const WALLS: [number, number, number, number, WallKind][] = [
  // Outside walls. The living room's front is set back to make a porch.
  [0, 0, 15.5, 0, "wall"],
  [15.5, 0, 18.5, 0, "glass"],
  [18.5, 0, 34, 0, "wall"],
  [34, 0, 34, 20, "wall"],
  [10, 20, 26.5, 20, "wall"],
  [26.5, 20, 29.5, 20, "door"],
  [29.5, 20, 34, 20, "wall"],
  [0, 18.6, 4, 18.6, "wall"],
  [4, 18.6, 6, 18.6, "door"],
  [6, 18.6, 10, 18.6, "wall"],
  [0, 0, 0, 18.6, "wall"],
  // Inside walls, with gaps for doorways
  [10, 0, 10, 8, "wall"],
  [10, 12, 10, 20, "wall"],
  [10, 8, 14, 8, "wall"],
  [16, 8, 20, 8, "wall"],
  [10, 12, 15, 12, "wall"],
  [17, 12, 20, 12, "wall"],
  [20, 0, 20, 8, "wall"],
  [20, 12, 20, 20, "wall"],
  [20, 10, 34, 10, "wall"],
];

type RoomTint = "wood" | "tile" | "plain" | "cool";

/** Rooms in metres: [x1, y1, x2, y2, tint]. */
const ROOMS: [number, number, number, number, RoomTint][] = [
  [0, 0, 10, 18.6, "wood"], // living room
  [10, 0, 20, 8, "tile"], // kitchen
  [10, 8, 20, 12, "plain"], // hall
  [10, 12, 20, 20, "wood"], // study
  [20, 0, 34, 10, "cool"], // bedroom
  [20, 10, 34, 20, "cool"], // second bedroom
];

/** Each mains-powered node is plugged into a socket on the wall to its left (metres). */
const SOCKETS: Record<number, [number, number]> = {
  0: [0, 10],
  1: [10, 5],
  2: [10, 15],
  3: [20, 5],
  4: [20, 15],
};

/** Devices are drawn larger than life so they stay visible on a 34 m plan. */
const NODE_SCALE = 1.6;
const HUB_SCALE = 0.5;

/** Height of each kind of node's radio, where links and packets meet it. */
const ANCHOR_Y: Record<DeviceKind, number> = {
  hub: 0.2,
  plug: 0.226 * NODE_SCALE,
  bulb: 0.315 * NODE_SCALE,
  door: 0.14 * NODE_SCALE,
  window: 0.14 * NODE_SCALE,
  motion: 0.14 * NODE_SCALE,
  temp: 0.14 * NODE_SCALE,
};

/** Height of the floating label above each kind of node. */
const LABEL_Y: Record<DeviceKind, number> = {
  hub: 0.62,
  plug: 0.62,
  bulb: 0.82,
  door: 0.52,
  window: 0.52,
  motion: 0.52,
  temp: 0.52,
};

const ANCHORS = new Map<number, Vec3>(
  DEFAULT_NODES.map((n) => [n.id, [toX(n.x), ANCHOR_Y[DEVICE_KIND[n.id]], toZ(n.y)]]),
);

const anchorOf = (id: number): Vec3 => ANCHORS.get(id) ?? [0, 0, 0];

const GROUND_W = 7.5;
const GROUND_D = 4.7;
const FIT_WIDTH = 8.4;
/** Height the camera looks at; the fit scale shrinks the diorama around it. */
const VIEW_Y = 0.1;
/** On phones the house tips towards the camera so the floor plan uses more of the short view. */
const NARROW_TILT = 0.38;

/* ------------------------------------------------------------------ */
/* Shared geometry and scratch objects                                 */
/* ------------------------------------------------------------------ */

const boxGeometry = new BoxGeometry(1, 1, 1);
const discGeometry = new CylinderGeometry(1, 1, 1, 28);
const packetGeometry = new SphereGeometry(1, 14, 10);

const tmpMatrix = new Matrix4();
const tmpPos = new Vector3();
const tmpScale = new Vector3();
const noTurn = new Quaternion();
const tmpColor = new Color();

interface ShapeItem {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  color: string;
}

/** Many plain boxes or discs in one draw call, each with its own size and colour. */
function InstancedShapes({
  items,
  geometry,
  capacity,
  roughness = 0.8,
}: {
  items: readonly ShapeItem[];
  geometry: BufferGeometry;
  capacity: number;
  roughness?: number;
}) {
  const ref = useRef<InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const count = Math.min(items.length, capacity);
    for (let i = 0; i < count; i++) {
      const b = items[i];
      tmpMatrix.compose(tmpPos.set(b.x, b.y, b.z), noTurn, tmpScale.set(b.sx, b.sy, b.sz));
      mesh.setMatrixAt(i, tmpMatrix);
      mesh.setColorAt(i, tmpColor.set(b.color));
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [items, capacity, invalidate]);

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, capacity]} frustumCulled={false}>
      <meshStandardMaterial roughness={roughness} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
/* Models                                                              */
/* ------------------------------------------------------------------ */

/** A router: a smart plug on a side table, or a floor lamp with a smart bulb. Dark when unplugged. */
function RouterNode({ kind, on, ...props }: AssetProps & { kind: "plug" | "bulb"; on: boolean }) {
  const p = usePalette();
  const tones = useMemo(
    () => ({ warm: mixColor(p.silk, p.warn, 0.55), table: mixColor(p.copper, p.casing, 0.45) }),
    [p.silk, p.warn, p.copper, p.casing],
  );
  const warm = tones.warm;
  const off = p.casingDark;

  if (kind === "bulb") {
    return (
      <AssetFrame {...props} labelHeight={0.5}>
        <mesh position={[0, 0.012, 0]}>
          <cylinderGeometry args={[0.075, 0.085, 0.024, 18]} />
          <meshStandardMaterial color={p.casingDark} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.17, 0]}>
          <cylinderGeometry args={[0.011, 0.011, 0.3, 8]} />
          <meshStandardMaterial color={p.casingDark} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.315, 0]}>
          <sphereGeometry args={[0.048, 14, 10]} />
          <meshStandardMaterial
            color={on ? warm : off}
            emissive={on ? warm : off}
            emissiveIntensity={on ? 0.85 : 0}
            roughness={0.35}
          />
        </mesh>
        <mesh position={[0, 0.37, 0]}>
          <cylinderGeometry args={[0.05, 0.095, 0.08, 18, 1, true]} />
          <GlowMaterial color={p.casing} roughness={0.7} />
        </mesh>
      </AssetFrame>
    );
  }

  return (
    <AssetFrame {...props} labelHeight={0.45}>
      {/* Side table */}
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.022, 0.03, 0.14, 8]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.022, 20]} />
        <meshStandardMaterial color={tones.table} roughness={0.7} />
      </mesh>
      {/* Smart plug with its status ring */}
      <RoundedBox args={[0.13, 0.13, 0.1]} radius={0.025} smoothness={2} position={[0, 0.226, 0]}>
        <GlowMaterial color={p.casing} />
      </RoundedBox>
      <mesh position={[0, 0.226, 0.051]}>
        <torusGeometry args={[0.032, 0.008, 6, 20]} />
        <meshStandardMaterial
          color={on ? p.ok : off}
          emissive={on ? p.ok : off}
          emissiveIntensity={on ? 0.9 : 0}
          roughness={0.4}
        />
      </mesh>
    </AssetFrame>
  );
}

/** A small battery sensor on a short post. The top shows what it senses. */
function SensorPuck({ kind, ...props }: AssetProps & { kind: "door" | "window" | "motion" | "temp" }) {
  const p = usePalette();
  return (
    <AssetFrame {...props} labelHeight={0.38}>
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.018, 0.04, 0.09, 8]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.7} />
      </mesh>
      <RoundedBox args={[0.15, 0.1, 0.08]} radius={0.02} smoothness={2} position={[0, 0.14, 0]}>
        <GlowMaterial color={p.silk} roughness={0.5} />
      </RoundedBox>
      {kind === "motion" && (
        <mesh position={[0, 0.19, 0]}>
          <sphereGeometry args={[0.045, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <GlowMaterial color={p.casing} roughness={0.3} />
        </mesh>
      )}
      {kind === "temp" && (
        <mesh position={[0, 0.145, 0.041]}>
          <boxGeometry args={[0.09, 0.05, 0.004]} />
          <meshStandardMaterial color={p.casingDark} emissive={p.u1} emissiveIntensity={0.25} roughness={0.4} />
        </mesh>
      )}
      {(kind === "door" || kind === "window") && (
        <mesh position={[0.1, 0.14, 0]}>
          <boxGeometry args={[0.035, 0.09, 0.06]} />
          <GlowMaterial color={p.casing} roughness={0.5} />
        </mesh>
      )}
    </AssetFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Packets: each sensor's reading travels its path to the hub          */
/* ------------------------------------------------------------------ */

const MAX_STEP = 0.1;
/** World units per second, and the pause at each router the packet passes through. */
const SPEED = 1.5;
const HOP_HOLD = 0.3;
/** Seconds between one sensor sending and the next. */
const STAGGER = 0.8;
const REST = 1.0;
const ARRIVE_GLOW = 0.6;
const MAX_PACKETS = DEFAULT_NODES.length;

interface Key {
  t: number;
  x: number;
  y: number;
  z: number;
}

interface Trip {
  keys: Key[];
  start: number;
  duration: number;
}

function planTrips(mesh: Mesh): { trips: Trip[]; cycle: number } {
  const trips: Trip[] = [];
  let start = 0;
  let end = 0;
  for (const node of DEFAULT_NODES) {
    if (node.role !== "end") continue;
    const path = mesh.paths[node.id];
    if (!path) continue;
    const keys: Key[] = [];
    let t = 0;
    path.forEach((id, j) => {
      const [x, y, z] = anchorOf(id);
      const prev = keys[keys.length - 1];
      if (prev) t += Math.hypot(x - prev.x, y - prev.y, z - prev.z) / SPEED;
      keys.push({ t, x, y, z });
      // A router in the middle of the path receives the packet and sends it on: one hop.
      if (j > 0 && j < path.length - 1) {
        t += HOP_HOLD;
        keys.push({ t, x, y, z });
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
  return out.set(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u);
}

function Packets({
  mesh,
  color,
  ringRef,
}: {
  mesh: Mesh;
  color: string;
  ringRef: RefObject<MeshBasicMaterial | null>;
}) {
  const { paused } = useSceneMotion();
  const plan = useMemo(() => planTrips(mesh), [mesh]);
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
    // Nothing has moved yet (a change made while paused): show no packets rather than parked ones.
    const count = time.current > 0 ? trips.length : 0;
    const within = time.current % cycle;
    let since = Infinity;
    for (let k = 0; k < count; k++) {
      const trip = trips[k];
      const local = within - trip.start;
      const moving = local >= 0 && local <= trip.duration;
      const size = moving ? 1 : 0;
      sampleTrip(trip.keys, moving ? local : 0, point);
      tmpMatrix.compose(point, noTurn, tmpScale.setScalar(0.05 * size));
      c.setMatrixAt(k, tmpMatrix);
      tmpMatrix.compose(point, noTurn, tmpScale.setScalar(0.11 * size));
      h.setMatrixAt(k, tmpMatrix);
      let after = local - trip.duration;
      if (after < 0) after += cycle;
      if (time.current >= trip.start + trip.duration) since = Math.min(since, after);
    }
    c.count = count;
    h.count = count;
    c.instanceMatrix.needsUpdate = true;
    h.instanceMatrix.needsUpdate = true;
    const ring = ringRef.current;
    if (ring) ring.opacity = since < ARRIVE_GLOW ? 0.65 * (1 - since / ARRIVE_GLOW) : 0;
  });

  return (
    <>
      <instancedMesh ref={core} args={[packetGeometry, undefined, MAX_PACKETS]} frustumCulled={false}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} roughness={0.4} />
      </instancedMesh>
      <instancedMesh ref={halo} args={[packetGeometry, undefined, MAX_PACKETS]} frustumCulled={false}>
        <meshBasicMaterial color={color} transparent opacity={0.25} depthWrite={false} />
      </instancedMesh>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* The house and its mesh                                              */
/* ------------------------------------------------------------------ */

const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

function House({ active = null, onSelect, failed = null }: ZigbeeSceneProps) {
  const p = usePalette();
  const { paused } = useSceneMotion();
  const roomy = useThree((s) => s.size.width) >= 520;
  const fit = useFitScale(FIT_WIDTH);
  const ringRef = useRef<MeshBasicMaterial>(null);

  const base = useMemo(() => meshFor(null), []);
  const mesh = useMemo(() => meshFor(failed), [failed]);

  // Packets start only once the scene has played, so a still scene shows the links alone.
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!paused) setLive(true);
  }, [paused]);

  const colors = useMemo(() => {
    const ground = mixColor(p.surface2, p.lineStrong, 0.35);
    const floor = mixColor(p.surface, p.surface2, 0.6);
    return {
      ground,
      floor,
      tint: {
        wood: mixColor(floor, p.copper, 0.08),
        tile: mixColor(floor, p.u2, 0.05),
        plain: mixColor(floor, p.lineStrong, 0.2),
        cool: mixColor(floor, p.u3, 0.05),
      } satisfies Record<RoomTint, string>,
      wall: {
        wall: p.casing,
        door: mixColor(p.copper, p.casing, 0.35),
        glass: mixColor(p.silk, p.u2, 0.45),
      } satisfies Record<WallKind, string>,
      cord: mixColor(floor, p.ink3, 0.5),
      socket: p.silk,
      pad: {
        coordinator: mixColor(floor, p.brand, 0.5),
        router: mixColor(floor, p.brand, 0.28),
        end: mixColor(floor, p.ink3, 0.25),
        rejoined: mixColor(floor, p.warn, 0.6),
        lost: mixColor(floor, p.bad, 0.6),
      },
      inUse: p.brand,
      spare: mixColor(p.ink3, p.ink2, 0.5),
      child: mixColor(p.ink2, p.brand, 0.35),
      rejoined: p.warn,
    };
  }, [p]);

  /* Static house: floors and walls, one draw call each */
  const floors = useMemo<ShapeItem[]>(
    () =>
      ROOMS.map(([x1, y1, x2, y2, tint]) => ({
        x: toX((x1 + x2) / 2),
        y: FLOOR_Y / 2,
        z: toZ((y1 + y2) / 2),
        sx: (x2 - x1) * S,
        sy: FLOOR_Y,
        sz: (y2 - y1) * S,
        color: colors.tint[tint],
      })),
    [colors],
  );

  const walls = useMemo<ShapeItem[]>(
    () =>
      WALLS.map(([x1, y1, x2, y2, kind]) => {
        const along = kind === "wall" ? WALL_T : 0;
        const horizontal = y1 === y2;
        return {
          x: toX((x1 + x2) / 2),
          y: FLOOR_Y + WALL_H / 2,
          z: toZ((y1 + y2) / 2),
          sx: horizontal ? Math.abs(x2 - x1) * S + along : WALL_T,
          sy: WALL_H,
          sz: horizontal ? WALL_T : Math.abs(y2 - y1) * S + along,
          color: colors.wall[kind],
        };
      }),
    [colors],
  );

  /* Power: every mains node has a cord to a wall socket; the unplugged one has its plug out */
  const fixtures = useMemo<ShapeItem[]>(() => {
    const out: ShapeItem[] = [];
    for (const [idText, [wx, wy]] of Object.entries(SOCKETS)) {
      const id = Number(idText);
      const node = NODE_BY_ID.get(id);
      if (!node) continue;
      const socketX = toX(wx) + WALL_T / 2 + 0.012;
      const z = toZ(wy);
      const deviceX = toX(node.x);
      out.push({ x: socketX, y: FLOOR_Y + 0.05, z, sx: 0.024, sy: 0.06, sz: 0.07, color: colors.socket });
      const unplugged = id === failed;
      const endX = unplugged ? deviceX + (socketX - deviceX) * 0.5 : socketX;
      const length = Math.abs(deviceX - endX);
      out.push({
        x: (deviceX + endX) / 2,
        y: FLOOR_Y + (unplugged ? 0.005 : 0.02),
        z: z + 0.03,
        sx: length,
        sy: 0.01,
        sz: 0.012,
        color: colors.cord,
      });
      if (unplugged) {
        out.push({ x: endX, y: FLOOR_Y + 0.015, z: z + 0.03, sx: 0.045, sy: 0.03, sz: 0.04, color: colors.socket });
      }
    }
    return out;
  }, [colors, failed]);

  /* What changed compared with the full mesh */
  const status = useMemo(() => {
    const rejoined = new Set(
      Object.keys(mesh.parent)
        .map(Number)
        .filter((e) => base.parent[e] !== undefined && base.parent[e] !== mesh.parent[e]),
    );
    const lost = new Set<number>([...mesh.orphans, ...mesh.cutOffRouters]);
    const used = new Set<string>();
    for (const path of Object.values(mesh.paths)) {
      for (let i = 1; i < path.length; i++) used.add(edgeKey(path[i - 1], path[i]));
    }
    return { rejoined, lost, used };
  }, [base, mesh]);

  const pads = useMemo<ShapeItem[]>(
    () =>
      DEFAULT_NODES.map((n) => {
        const r = n.role === "coordinator" ? 0.3 : n.role === "router" ? 0.22 : 0.17;
        let color = colors.pad[n.role];
        if (n.id === failed || status.lost.has(n.id)) color = colors.pad.lost;
        else if (status.rejoined.has(n.id)) color = colors.pad.rejoined;
        return { x: toX(n.x), y: FLOOR_Y + 0.006, z: toZ(n.y), sx: r, sy: 0.012, sz: r, color };
      }),
    [colors, failed, status],
  );

  const select = (id: ZigbeePart) => (onSelect ? () => onSelect(id) : undefined);
  const linkActive = active === "link";

  return (
    <group position={[0, VIEW_Y * (1 - fit), 0]} rotation={[roomy ? 0 : NARROW_TILT, 0, 0]} scale={fit}>
      {/* Garden and house */}
      <RoundedBox args={[GROUND_W, 0.12, GROUND_D]} radius={0.05} smoothness={2} position={[0, -0.06, 0]}>
        <meshStandardMaterial color={colors.ground} roughness={0.9} />
      </RoundedBox>
      <InstancedShapes items={floors} geometry={boxGeometry} capacity={ROOMS.length} roughness={0.9} />
      <InstancedShapes items={walls} geometry={boxGeometry} capacity={WALLS.length} roughness={0.75} />
      <InstancedShapes items={fixtures} geometry={boxGeometry} capacity={16} roughness={0.6} />
      <InstancedShapes items={pads} geometry={discGeometry} capacity={DEFAULT_NODES.length} roughness={0.85} />

      {/* Nodes */}
      {DEFAULT_NODES.map((n) => {
        const kind = DEVICE_KIND[n.id];
        const position: Vec3 = [toX(n.x), FLOOR_Y, toZ(n.y)];
        const common: AssetProps = {
          position,
          highlighted: active === PART_OF_ROLE[n.role],
          accent: p.brand,
          onSelect: select(PART_OF_ROLE[n.role]),
        };
        if (kind === "hub") {
          return (
            <group key={n.id}>
              <Gateway {...common} scale={HUB_SCALE} />
              <mesh position={[position[0], FLOOR_Y + 0.02, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.34, 0.024, 6, 36]} />
                <meshBasicMaterial ref={ringRef} color={p.signal} transparent opacity={0} depthWrite={false} />
              </mesh>
            </group>
          );
        }
        if (kind === "plug" || kind === "bulb") {
          return <RouterNode key={n.id} {...common} scale={NODE_SCALE} kind={kind} on={n.id !== failed} />;
        }
        return <SensorPuck key={n.id} {...common} scale={NODE_SCALE} kind={kind} />;
      })}

      {/* Router-to-router links: solid ones carry traffic now, dashed ones are spare paths */}
      {mesh.routerLinks.map(([a, b]) => {
        const inUse = status.used.has(edgeKey(a, b));
        return (
          <Link3D
            key={`${edgeKey(a, b)}-${inUse}`}
            from={anchorOf(a)}
            to={anchorOf(b)}
            color={inUse ? colors.inUse : colors.spare}
            dashed={!inUse}
            lineWidth={(inUse ? 2.2 : 1.8) * (linkActive ? 1.6 : 1)}
          />
        );
      })}

      {/* Each sensor's link to the parent it joined */}
      {Object.entries(mesh.parent).map(([eText, parent]) => {
        const e = Number(eText);
        const moved = status.rejoined.has(e);
        return (
          <Link3D
            key={`${e}-${parent}`}
            from={anchorOf(e)}
            to={anchorOf(parent)}
            color={moved ? colors.rejoined : colors.child}
            lineWidth={(moved ? 2.4 : 1.4) * (linkActive ? 1.4 : 1)}
          />
        );
      })}

      {/* Orphaned sensors keep calling for a parent that never answers */}
      {mesh.orphans.map((id) => {
        const [x, , z] = anchorOf(id);
        return <SignalRings key={id} position={[x, FLOOR_Y + 0.03, z]} color={p.bad} count={2} maxRadius={0.46} period={1.8} />;
      })}

      {/* Labels */}
      {DEFAULT_NODES.map((n) => {
        const kind = DEVICE_KIND[n.id];
        const name = nodeLabel(n);
        const [x, , z] = anchorOf(n.id);
        const position: Vec3 = [x, LABEL_Y[kind], z];
        if (n.id === failed) {
          return (
            <Label3D key={n.id} position={position}>
              <span className="font-semibold text-bad">{name} {roomy ? "unplugged" : "off"}</span>
            </Label3D>
          );
        }
        if (status.lost.has(n.id)) {
          return (
            <Label3D key={n.id} position={position}>
              <span className="font-semibold text-bad">
                {name} {n.role === "end" ? (roomy ? "orphaned" : "orphan") : "cut off"}
              </span>
            </Label3D>
          );
        }
        const on = active === PART_OF_ROLE[n.role];
        const text = roomy ? `${name} ${SHORT_NAME[kind]}` : name;
        return (
          <Label3D key={n.id} position={position} tone={on ? "accent" : status.rejoined.has(n.id) ? "u1" : "default"}>
            {on ? <strong>{text}</strong> : text}
          </Label3D>
        );
      })}

      {/* Packets, once the scene has played */}
      {live && <Packets key={failed ?? "none"} mesh={mesh} color={p.signal} ringRef={ringRef} />}
    </group>
  );
}

/**
 * Topic 2.6: a Zigbee mesh laid over a house. Battery sensors send to their
 * parent, routers pass messages on to the hub, and unplugging a router makes
 * the mesh heal around the gap.
 */
export default function ZigbeeScene({ active = null, onSelect, failed = null }: ZigbeeSceneProps) {
  const label =
    failed === null
      ? "A Zigbee mesh across a house: sensors send to their nearest router, and routers pass the messages on to the hub"
      : `A Zigbee mesh across a house with router ${nodeName(failed)} unplugged, showing how messages re-route to the hub`;
  return (
    <Scene3D
      label={label}
      height="clamp(280px, 60vw, 400px)"
      camera={{ position: [0, 5.6, 5.9], fov: 32, target: [0, VIEW_Y, 0.2] }}
    >
      <House active={active} onSelect={onSelect} failed={failed} />
    </Scene3D>
  );
}
