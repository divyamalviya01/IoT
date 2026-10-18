import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Line, RoundedBox } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Matrix4,
  Plane,
  QuadraticBezierCurve3,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  Vector3,
  type Group,
  type InstancedMesh,
  type MeshBasicMaterial,
} from "three";
import { LORAWAN_OVERHEAD, airtime, rangeKm, type SF } from "~/labs/l19-lora-airtime/engine";
import { usePalette } from "~/lib/palette";
import {
  AssetFrame,
  CloudServer,
  Gateway,
  GlowMaterial,
  InstancedParts,
  Label3D,
  Link3D,
  Phone,
  Scene3D,
  arcControlPoint,
  mixColor,
  useFitScale,
  useSceneMotion,
  type AssetProps,
  type PartInstance,
  type Vec3,
} from "~/components/three";

export type FarmPart = "device" | "gateway" | "server" | "app";

export interface FarmSceneProps {
  sf: SF;
  active?: FarmPart | null;
  onSelect?: (id: FarmPart) => void;
}

/* ------------------------------------------------------------------ */
/* The farm, in kilometres                                             */
/* ------------------------------------------------------------------ */

/** World units per kilometre. Sensors, masts and houses are drawn far larger than life. */
const KM = 0.4;
const GROUND_W = 10;
const GROUND_D = 6.4;
/** Size of the map, km. */
export const MAP_KM = { width: GROUND_W / KM, depth: GROUND_D / KM };

/** LoRaWAN uplinks in India (IN865) use 125 kHz channels. */
export const BANDWIDTH_KHZ = 125;
/** Each soil reading: 10 bytes of data plus 13 bytes of LoRaWAN header and check. */
export const APP_BYTES = 10;
export const PHY_BYTES = APP_BYTES + LORAWAN_OVERHEAD;

type Km = readonly [number, number];

export const GATEWAYS: readonly { name: string; km: Km }[] = [
  { name: "Gateway A", km: [-4.5, 1.5] },
  { name: "Gateway B", km: [6, -1] },
];

/** Soil sensors, km from the middle of the map (x to the east, y towards the viewer). */
export const SENSORS: readonly Km[] = [
  [1, 3],
  [-2.5, -0.5],
  [8, 2],
  [-9.5, -3.5],
  [3.5, -5.2],
  [-11, 6.5],
  [-1.5, -4.8],
  [10.5, -5],
  [-12, -7.8],
  [-6.8, 4.4],
  [11, 6.5],
  [2, 6.5],
];

/** Indicative radius each gateway hears over open farmland, km (illustrative). */
export function coverageKm(sf: SF): number {
  return rangeKm(sf, BANDWIDTH_KHZ, "rural");
}

/** For each sensor, the gateways close enough to hear it. */
export function hearing(sf: SF): number[][] {
  const r = coverageKm(sf);
  return SENSORS.map(([x, y]) =>
    GATEWAYS.flatMap((g, i) => (Math.hypot(x - g.km[0], y - g.km[1]) <= r ? [i] : [])),
  );
}

export function coverage(sf: SF): { total: number; heard: number; byBoth: number } {
  const ears = hearing(sf);
  return {
    total: SENSORS.length,
    heard: ears.filter((e) => e.length > 0).length,
    byBoth: ears.filter((e) => e.length > 1).length,
  };
}

/** "61.7 ms", "371 ms", "1.48 s" */
export function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  if (ms >= 100) return `${Math.round(ms)} ms`;
  return `${ms.toFixed(1)} ms`;
}

/* ------------------------------------------------------------------ */
/* Layout in world units                                               */
/* ------------------------------------------------------------------ */

const toWorld = ([x, y]: Km): [number, number] => [x * KM, y * KM];

/** Height the camera looks at; the fit scale shrinks the diorama around it. */
const VIEW_Y = 0.2;
const FIT_WIDTH = 10.4;
const MAST_H = 1.0;
const GATEWAY_SCALE = 0.38;
const HEAD_Y = 0.36;

const GW_AT = GATEWAYS.map((g) => toWorld(g.km));
const SENSOR_AT = SENSORS.map(toWorld);

/** The internet side: a tile behind the farm with the network server and the application. */
const TILE = { x: 1.0, z: -4.3, w: 4.2, d: 1.4, top: 0.25 };
const SERVER_AT: Vec3 = [0.1, TILE.top, TILE.z];
const APP_AT: Vec3 = [2.3, TILE.top, TILE.z + 0.05];

const GW_TOP: Vec3[] = GW_AT.map(([x, z]) => [x, MAST_H + 0.17, z]);
const SENSOR_TOP: Vec3[] = SENSOR_AT.map(([x, z]) => [x, HEAD_Y + 0.08, z]);
const SERVER_IN: Vec3 = [SERVER_AT[0], TILE.top + 0.62, SERVER_AT[2]];
const APP_IN: Vec3 = [APP_AT[0], TILE.top + 0.55, APP_AT[2]];

const RADIO_ARC = 0.25;
const BACKHAUL_ARC = 1.1;
const DELIVER_ARC = 0.45;

function bezier(from: Vec3, to: Vec3, arc: number) {
  return new QuadraticBezierCurve3(
    new Vector3(...from),
    new Vector3(...arcControlPoint(from, to, arc)),
    new Vector3(...to),
  );
}

// Packets follow the same curves as the lines drawn for them.
const RADIO = SENSOR_TOP.map((s) => GW_TOP.map((g) => bezier(s, g, RADIO_ARC)));
const BACKHAUL = GW_TOP.map((g) => bezier(g, SERVER_IN, BACKHAUL_ARC));
const DELIVER = bezier(SERVER_IN, APP_IN, DELIVER_ARC);
const INTERNET_LABEL_AT = BACKHAUL[0].getPoint(0.55);

/** The closest gateway to each sensor, where a packet that nobody hears heads before it fades. */
const NEAREST = SENSORS.map(([x, y]) => {
  let best = 0;
  GATEWAYS.forEach((g, i) => {
    const b = GATEWAYS[best].km;
    if (Math.hypot(x - g.km[0], y - g.km[1]) < Math.hypot(x - b[0], y - b[1])) best = i;
  });
  return best;
});

/* ------------------------------------------------------------------ */
/* Scenery: fields, trees, a village and a farmhouse (instanced)       */
/* ------------------------------------------------------------------ */

const COLS = 6;
const ROWS = 4;
const CELL_W = GROUND_W / COLS;
const CELL_D = GROUND_D / ROWS;
const ROAD = 0.06;

/** The map cell the village (and Gateway A) sits in. */
const VILLAGE_CELL = {
  c: Math.floor((GW_AT[0][0] + GROUND_W / 2) / CELL_W),
  r: Math.floor((GW_AT[0][1] + GROUND_D / 2) / CELL_D),
};

/** A patchwork of fields in three crops, one list per crop. */
const FIELDS: PartInstance[][] = (() => {
  const out: PartInstance[][] = [[], [], []];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (c === VILLAGE_CELL.c && r === VILLAGE_CELL.r) continue;
      const x0 = -GROUND_W / 2 + c * CELL_W;
      const z0 = -GROUND_D / 2 + r * CELL_D;
      const across = (c + r) % 2 === 0;
      for (let k = 0; k < 2; k++) {
        const w = across ? CELL_W / 2 : CELL_W;
        const d = across ? CELL_D : CELL_D / 2;
        const x = across ? x0 + w * (k + 0.5) : x0 + CELL_W / 2;
        const z = across ? z0 + CELL_D / 2 : z0 + d * (k + 0.5);
        out[(c * 2 + r * 3 + k) % 3].push({
          position: [x, 0.008, z],
          scale: [w - ROAD * 2, 0.016, d - ROAD * 2],
        });
      }
    }
  }
  return out;
})();

const HOUSES: Array<[number, number, number]> = [
  [-3.0, 0.35, 0.3],
  [-2.6, 0.28, -0.2],
  [-2.25, 0.62, 0.5],
  [-2.9, 0.9, 0.1],
  [-2.45, 1.12, -0.4],
  [-3.15, 1.35, 0.6],
  [-2.0, 1.3, 0.2],
  // Farmhouse beside Gateway B
  [GW_AT[1][0] + 0.42, GW_AT[1][1] + 0.22, -0.3],
];
const VILLAGE_LABEL_AT: Vec3 = [-2.6, 0.55, 0.85];

const HOUSE_PARTS = (() => {
  const walls: PartInstance[] = [];
  const roofs: PartInstance[] = [];
  for (const [x, z, turn] of HOUSES) {
    const h = 0.14;
    const d = 0.17;
    walls.push({ position: [x, h / 2, z], scale: [0.24, h, d], rotation: [0, turn, 0] });
    // A box turned 45° about its long axis, half sunk into the walls, reads as a pitched roof.
    roofs.push({ position: [x, h, z], scale: [0.27, d * 0.74, d * 0.74], rotation: [Math.PI / 4, turn, 0] });
  }
  return { walls, roofs };
})();

const TREE_PARTS = (() => {
  const trunks: PartInstance[] = [];
  const crowns: PartInstance[] = [];
  const blocked = (x: number, z: number) =>
    SENSOR_AT.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 0.35) ||
    GW_AT.some(([gx, gz]) => Math.hypot(x - gx, z - gz) < 0.45) ||
    HOUSES.some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 0.3);
  for (let c = 1; c < COLS; c++) {
    for (let r = 1; r < ROWS; r++) {
      const x = -GROUND_W / 2 + c * CELL_W;
      const z = -GROUND_D / 2 + r * CELL_D;
      const spots: Array<[number, number]> =
        (c + r) % 2 === 0 ? [[x + 0.12, z + 0.1], [x - 0.1, z + 0.16], [x + 0.02, z - 0.14]] : [[x + 0.1, z - 0.1]];
      for (const [tx, tz] of spots) {
        if (blocked(tx, tz)) continue;
        trunks.push({ position: [tx, 0.07, tz], scale: [0.025, 0.14, 0.025] });
        crowns.push({ position: [tx, 0.24, tz], scale: [0.1, 0.15, 0.1] });
      }
    }
  }
  return { trunks, crowns };
})();

/** A 5 km scale bar near the back left corner, clear of the toolbar. */
const BAR = { x0: -4.2, z: -2.95, length: 5 * KM };
const BAR_PARTS: PartInstance[] = [
  { position: [BAR.x0 + BAR.length / 2, 0.025, BAR.z], scale: [BAR.length, 0.02, 0.035] },
  { position: [BAR.x0, 0.05, BAR.z], scale: [0.025, 0.08, 0.06] },
  { position: [BAR.x0 + BAR.length, 0.05, BAR.z], scale: [0.025, 0.08, 0.06] },
];

function Scenery() {
  const p = usePalette();
  const c = useMemo(() => {
    const ground = mixColor(p.surface2, p.lineStrong, 0.35);
    return {
      crops: [mixColor(ground, p.ok, 0.32), mixColor(ground, p.warn, 0.28), mixColor(ground, p.copper, 0.22)],
      bark: mixColor(p.copper, p.casingDark, 0.4),
    };
  }, [p]);
  return (
    <>
      {FIELDS.map((items, i) => (
        <InstancedParts key={i} items={items} color={c.crops[i]} roughness={0.95} />
      ))}
      <InstancedParts items={TREE_PARTS.trunks} shape="cylinder" color={c.bark} roughness={0.9} />
      <InstancedParts items={TREE_PARTS.crowns} shape="sphere" color={p.ok} roughness={0.85} />
      <InstancedParts items={HOUSE_PARTS.walls} color={p.casing} roughness={0.8} />
      <InstancedParts items={HOUSE_PARTS.roofs} color={p.copper} roughness={0.7} />
      <InstancedParts items={BAR_PARTS} color={p.ink2} roughness={0.6} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Shared geometry and scratch objects                                 */
/* ------------------------------------------------------------------ */

const CIRCLE_POINTS = 128;
const UNIT_CIRCLE: Vec3[] = Array.from({ length: CIRCLE_POINTS + 1 }, (_, i) => {
  const a = (i / CIRCLE_POINTS) * Math.PI * 2;
  return [Math.cos(a), 0, Math.sin(a)];
});

const discGeometry = new CircleGeometry(1, 96);
const pulseGeometry = new RingGeometry(0.8, 1, 40);
const unitCylinder = new CylinderGeometry(1, 1, 1, 10);
const unitBox = new BoxGeometry(1, 1, 1);
const packetGeometry = new SphereGeometry(1, 14, 10);

const tmpMatrix = new Matrix4();
const tmpPos = new Vector3();
const tmpScale = new Vector3();
const tmpQuat = new Quaternion();
const tmpEuler = new Euler();
const noTurn = new Quaternion();
const tmpColor = new Color();

const MAX_STEP = 0.1;
const N = SENSORS.length;

/* ------------------------------------------------------------------ */
/* Timing: one sensor at a time sends an uplink                        */
/* ------------------------------------------------------------------ */

type Phase = "air" | "forward" | "server" | "deliver" | "rest";

/** Gateway to network server over the internet, the server's check, then on to the application. */
const FORWARD = 0.9;
const AT_SERVER = 0.7;
const DELIVER_S = 0.8;
const REST = 0.6;
const LOST_REST = 0.5;
/** Part of the way to the nearest gateway a lost packet gets before it fades out. */
const LOST_AT = 0.45;
/** Seconds between on-air pulses at the sending sensor. */
const PULSE = 0.55;

/** Seconds a packet is shown on air: grows with its real time on air (slowed down). */
export function screenAirSeconds(sf: SF): number {
  return 0.35 + (airtime(sf, BANDWIDTH_KHZ, PHY_BYTES).totalMs / 1000) * 2.5;
}

interface Slot {
  sensor: number;
  start: number;
  ears: number[];
  phases: Array<[Phase, number]>;
  length: number;
}

interface Plan {
  slots: Slot[];
  cycle: number;
  /** The slot a still (never played) scene shows: a sensor heard by the most gateways. */
  idle: number;
}

function planUplinks(sf: SF): Plan {
  const ears = hearing(sf);
  const air = screenAirSeconds(sf);
  const slots: Slot[] = [];
  let start = 0;
  let idle = 0;
  ears.forEach((heardBy, sensor) => {
    const phases: Array<[Phase, number]> = heardBy.length
      ? [
          ["air", air],
          ["forward", FORWARD],
          ["server", AT_SERVER],
          ["deliver", DELIVER_S],
          ["rest", REST],
        ]
      : [
          ["air", air],
          ["rest", LOST_REST],
        ];
    const length = phases.reduce((sum, [, d]) => sum + d, 0);
    slots.push({ sensor, start, ears: heardBy, phases, length });
    if (heardBy.length > ears[idle].length) idle = sensor;
    start += length;
  });
  return { slots, cycle: start, idle };
}

interface Moment {
  slot: Slot;
  phase: Phase;
  /** 0 to 1 through the phase. */
  u: number;
  /** Seconds since the phase began. */
  since: number;
}

function momentAt(time: number, plan: Plan): Moment {
  const t = time % plan.cycle;
  const slot = plan.slots.find((s) => t < s.start + s.length) ?? plan.slots[plan.slots.length - 1];
  let local = t - slot.start;
  for (const [phase, d] of slot.phases) {
    if (local < d) return { slot, phase, u: local / d, since: local };
    local -= d;
  }
  return { slot, phase: "rest", u: 1, since: 0 };
}

export interface FlowState {
  sensor: number;
  phase: Phase;
  ears: number[];
}

function idleFlow(plan: Plan): FlowState {
  const slot = plan.slots[plan.idle];
  return { sensor: slot.sensor, phase: "air", ears: slot.ears };
}

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ------------------------------------------------------------------ */
/* Packets                                                             */
/* ------------------------------------------------------------------ */

const MAX_PACKETS = 4;
const CORE = 0.085;
const HALO = 0.2;

function Uplinks({ sf, onFlow }: { sf: SF; onFlow: (flow: FlowState) => void }) {
  const p = usePalette();
  const { paused } = useSceneMotion();
  const plan = useMemo(() => planUplinks(sf), [sf]);
  const core = useRef<InstancedMesh>(null);
  const halo = useRef<InstancedMesh>(null);
  const pulse = useRef<Group>(null);
  const pulseMat = useRef<MeshBasicMaterial>(null);
  const time = useRef(0);
  const started = useRef(false);
  const last = useRef("");
  const point = useMemo(() => new Vector3(), []);
  const tints = useMemo(() => ({ ok: new Color(p.signal), lost: new Color(p.bad) }), [p.signal, p.bad]);

  // Give both meshes per-packet colours before the first frame.
  useLayoutEffect(() => {
    for (const mesh of [core.current, halo.current]) {
      if (!mesh) continue;
      for (let i = 0; i < MAX_PACKETS; i++) mesh.setColorAt(i, tints.ok);
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [tints]);

  useFrame((_, delta) => {
    const c = core.current;
    const h = halo.current;
    if (!c || !h) return;
    if (!paused) {
      time.current += Math.min(delta, MAX_STEP);
      started.current = true;
    }

    let m: Moment;
    if (started.current) {
      m = momentAt(time.current, plan);
    } else {
      const slot = plan.slots[plan.idle];
      m = { slot, phase: "air", u: 0.5, since: slot.phases[0][1] * 0.5 };
    }
    const { slot, phase, u } = m;
    const s = slot.sensor;

    const flow: FlowState = started.current ? { sensor: s, phase, ears: slot.ears } : idleFlow(plan);
    const key = `${flow.sensor}|${flow.phase}`;
    if (key !== last.current) {
      last.current = key;
      onFlow(flow);
    }

    let k = 0;
    const put = (at: Vector3, size: number, color: Color) => {
      if (k >= MAX_PACKETS) return;
      tmpMatrix.compose(at, noTurn, tmpScale.setScalar(CORE * size));
      c.setMatrixAt(k, tmpMatrix);
      tmpMatrix.compose(at, noTurn, tmpScale.setScalar(HALO * size));
      h.setMatrixAt(k, tmpMatrix);
      c.setColorAt(k, color);
      h.setColorAt(k, color);
      k++;
    };

    if (phase === "air") {
      if (slot.ears.length) {
        // The same transmission reaches every gateway in range.
        for (const g of slot.ears) put(RADIO[s][g].getPoint(u, point), 1, tints.ok);
      } else {
        put(RADIO[s][NEAREST[s]].getPoint(u * LOST_AT, point), 1 - smooth(0.55, 1, u), tints.lost);
      }
    } else if (phase === "forward") {
      for (const g of slot.ears) put(BACKHAUL[g].getPoint(u, point), 1, tints.ok);
    } else if (phase === "server") {
      // Every copy arrives; the network server keeps one and drops the rest.
      slot.ears.forEach((_, i) => {
        const spread = slot.ears.length > 1 ? (i === 0 ? -0.13 : 0.13) * (1 - smooth(0, 0.5, u) * (i === 0 ? 1 : 0)) : 0;
        point.set(SERVER_IN[0] + spread, SERVER_IN[1], SERVER_IN[2]);
        if (i === 0) put(point, 1, tints.ok);
        else put(point, 1 - smooth(0.2, 0.9, u), tmpColor.copy(tints.ok).lerp(tints.lost, smooth(0, 0.3, u)));
      });
    } else if (phase === "deliver") {
      put(DELIVER.getPoint(u, point), 1, tints.ok);
    }

    c.count = k;
    h.count = k;
    c.instanceMatrix.needsUpdate = true;
    h.instanceMatrix.needsUpdate = true;
    if (c.instanceColor) c.instanceColor.needsUpdate = true;
    if (h.instanceColor) h.instanceColor.needsUpdate = true;

    // Rings spread from the sensor for as long as it is on air.
    const ring = pulse.current;
    const mat = pulseMat.current;
    if (ring && mat) {
      ring.visible = phase === "air";
      if (ring.visible) {
        const ph = (m.since / PULSE) % 1;
        ring.position.set(SENSOR_AT[s][0], 0.05, SENSOR_AT[s][1]);
        ring.scale.setScalar(0.12 + ph * 0.5);
        mat.opacity = 0.75 * (1 - ph);
      }
    }
  });

  return (
    <>
      <instancedMesh ref={core} args={[packetGeometry, undefined, MAX_PACKETS]} frustumCulled={false}>
        <meshBasicMaterial />
      </instancedMesh>
      <instancedMesh ref={halo} args={[packetGeometry, undefined, MAX_PACKETS]} frustumCulled={false}>
        <meshBasicMaterial transparent opacity={0.26} depthWrite={false} />
      </instancedMesh>
      <group ref={pulse} visible={false}>
        <mesh geometry={pulseGeometry} rotation={[-Math.PI / 2, 0, 0]}>
          <meshBasicMaterial ref={pulseMat} color={p.signal} transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Sensors (instanced)                                                 */
/* ------------------------------------------------------------------ */

function Sensors({
  ears,
  sender,
  highlighted,
  onSelect,
}: {
  ears: number[][];
  sender: number;
  highlighted: boolean;
  onSelect?: () => void;
}) {
  const p = usePalette();
  const invalidate = useThree((s) => s.invalidate);
  const stakes = useRef<InstancedMesh>(null);
  const heads = useRef<InstancedMesh>(null);
  const pads = useRef<InstancedMesh>(null);
  const crosses = useRef<InstancedMesh>(null);
  const hovering = useRef(false);

  const colors = useMemo(() => {
    const ground = mixColor(p.surface2, p.lineStrong, 0.35);
    return {
      heard: mixColor(ground, p.signal, 0.75),
      lost: mixColor(ground, p.bad, 0.75),
      head: p.casing,
      sending: mixColor(p.casing, p.signal, 0.65),
    };
  }, [p]);

  // Place every part once.
  useLayoutEffect(() => {
    const st = stakes.current;
    const hd = heads.current;
    const pd = pads.current;
    if (!st || !hd || !pd) return;
    SENSOR_AT.forEach(([x, z], i) => {
      tmpMatrix.compose(tmpPos.set(x, 0.17, z), noTurn, tmpScale.set(0.018, 0.34, 0.018));
      st.setMatrixAt(i, tmpMatrix);
      tmpMatrix.compose(tmpPos.set(x + 0.07, HEAD_Y + 0.14, z - 0.03), noTurn, tmpScale.set(0.007, 0.17, 0.007));
      st.setMatrixAt(N + i, tmpMatrix);
      tmpMatrix.compose(tmpPos.set(x, HEAD_Y, z), noTurn, tmpScale.set(0.2, 0.12, 0.14));
      hd.setMatrixAt(i, tmpMatrix);
      tmpMatrix.compose(tmpPos.set(x, 0.026, z), noTurn, tmpScale.set(0.15, 0.014, 0.15));
      pd.setMatrixAt(i, tmpMatrix);
    });
    for (const mesh of [st, hd, pd]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, []);

  // Colours and "not heard" crosses follow the spreading factor and the sender.
  useLayoutEffect(() => {
    const hd = heads.current;
    const pd = pads.current;
    const cr = crosses.current;
    if (!hd || !pd || !cr) return;
    let k = 0;
    ears.forEach((heardBy, i) => {
      const [x, z] = SENSOR_AT[i];
      pd.setColorAt(i, tmpColor.set(heardBy.length ? colors.heard : colors.lost));
      hd.setColorAt(i, tmpColor.set(i === sender ? colors.sending : colors.head));
      if (heardBy.length) return;
      for (const turn of [Math.PI / 4, -Math.PI / 4]) {
        tmpQuat.setFromEuler(tmpEuler.set(0, 0, turn));
        tmpMatrix.compose(tmpPos.set(x, HEAD_Y + 0.32, z), tmpQuat, tmpScale.set(0.24, 0.045, 0.045));
        cr.setMatrixAt(k++, tmpMatrix);
      }
    });
    cr.count = k;
    cr.instanceMatrix.needsUpdate = true;
    cr.computeBoundingSphere();
    for (const mesh of [hd, pd]) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [ears, sender, colors, invalidate]);

  useEffect(
    () => () => {
      if (hovering.current) document.body.style.cursor = "";
    },
    [],
  );

  const handlers = onSelect
    ? {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          hovering.current = true;
          document.body.style.cursor = "pointer";
        },
        onPointerOut: () => {
          hovering.current = false;
          document.body.style.cursor = "";
        },
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (e.delta > 6) return;
          onSelect();
        },
      }
    : {};

  return (
    <>
      <instancedMesh ref={pads} args={[unitCylinder, undefined, N]} {...handlers}>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={stakes} args={[unitCylinder, undefined, N * 2]}>
        <meshStandardMaterial color={p.casingDark} roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[unitBox, undefined, N]} {...handlers}>
        <meshStandardMaterial emissive={p.brand} emissiveIntensity={highlighted ? 0.5 : 0} roughness={0.55} />
      </instancedMesh>
      <instancedMesh ref={crosses} args={[unitBox, undefined, N * 2]}>
        <meshStandardMaterial color={p.bad} emissive={p.bad} emissiveIntensity={0.35} roughness={0.5} />
      </instancedMesh>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Coverage circles, clipped to the edge of the map                    */
/* ------------------------------------------------------------------ */

function Coverage({ sf, planes }: { sf: SF; planes: Plane[] }) {
  const p = usePalette();
  const { paused } = useSceneMotion();
  const invalidate = useThree((s) => s.invalidate);
  const target = coverageKm(sf) * KM;
  const radius = useRef(target);
  const groups = useRef<Array<Group | null>>([]);

  useLayoutEffect(() => {
    if (paused) radius.current = target;
    invalidate();
    // `paused` is read only when the spreading factor changes.
  }, [target, invalidate]);

  useFrame((_, delta) => {
    const diff = target - radius.current;
    if (paused || Math.abs(diff) < 1e-4) radius.current = target;
    else radius.current += diff * (1 - Math.exp(-Math.min(delta, MAX_STEP) * 4));
    for (const g of groups.current) g?.scale.set(radius.current, 1, radius.current);
  });

  return (
    <>
      {GW_AT.map(([x, z], i) => (
        <group
          key={i}
          ref={(g) => {
            groups.current[i] = g;
          }}
          position={[x, 0.03 + i * 0.004, z]}
          scale={[target, 1, target]}
        >
          <mesh geometry={discGeometry} rotation={[-Math.PI / 2, 0, 0]}>
            <meshBasicMaterial
              color={p.signal}
              transparent
              opacity={0.14}
              depthWrite={false}
              clippingPlanes={planes}
            />
          </mesh>
          <Line points={UNIT_CIRCLE} color={p.signal} lineWidth={2} clippingPlanes={planes} />
        </group>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Models                                                              */
/* ------------------------------------------------------------------ */

/** A gateway on a pole, the way they sit on rooftops and towers to hear far. */
function GatewayMast(props: AssetProps) {
  const p = usePalette();
  return (
    <AssetFrame {...props} labelHeight={MAST_H + 0.6}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.04, 16]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.7} />
      </mesh>
      <mesh position={[0, MAST_H / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.045, MAST_H, 8]} />
        <GlowMaterial color={p.casingDark} roughness={0.6} />
      </mesh>
      <mesh position={[0, MAST_H, 0]}>
        <boxGeometry args={[0.5, 0.03, 0.32]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.7} />
      </mesh>
      <Gateway position={[0, MAST_H + 0.015, 0]} scale={GATEWAY_SCALE} />
    </AssetFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

function Farm({ sf, active = null, onSelect }: FarmSceneProps) {
  const p = usePalette();
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const roomy = useThree((s) => s.size.width) >= 520;
  const fit = useFitScale(FIT_WIDTH);
  const ears = useMemo(() => hearing(sf), [sf]);
  const airMs = useMemo(() => airtime(sf, BANDWIDTH_KHZ, PHY_BYTES).totalMs, [sf]);
  const [flow, setFlow] = useState<FlowState>(() => idleFlow(planUplinks(sf)));

  const colors = useMemo(() => {
    const ground = mixColor(p.surface2, p.lineStrong, 0.35);
    return { ground, tile: mixColor(p.surface2, p.u3, 0.18) };
  }, [p]);

  // World-space planes at the map's edges, so coverage never spills off the farm.
  const planes = useMemo(
    () => [
      new Plane(new Vector3(-1, 0, 0), 0),
      new Plane(new Vector3(1, 0, 0), 0),
      new Plane(new Vector3(0, 0, -1), 0),
      new Plane(new Vector3(0, 0, 1), 0),
    ],
    [],
  );
  useLayoutEffect(() => {
    gl.localClippingEnabled = true;
    planes[0].constant = planes[1].constant = (GROUND_W / 2) * fit;
    planes[2].constant = planes[3].constant = (GROUND_D / 2) * fit;
    invalidate();
  }, [gl, planes, fit, invalidate]);

  const select = (id: FarmPart) => (onSelect ? () => onSelect(id) : undefined);
  const gatewayLit = (g: number) => flow.phase === "forward" && flow.ears.includes(g);
  const serverLit = flow.phase === "server";
  const appLit = flow.phase === "rest" && flow.ears.length > 0;

  const sender = flow.sensor;
  const [sx, sz] = SENSOR_AT[sender];
  const heard = flow.ears.length > 0;
  const showSender = roomy && (flow.phase === "air" || (!heard && flow.phase === "rest"));

  return (
    <group position={[0, VIEW_Y * (1 - fit), 0]} scale={fit}>
      {/* The farm */}
      <RoundedBox args={[GROUND_W, 0.14, GROUND_D]} radius={0.06} smoothness={2} position={[0, -0.07, 0]}>
        <meshStandardMaterial color={colors.ground} roughness={0.9} />
      </RoundedBox>
      <Scenery />
      <Coverage sf={sf} planes={planes} />

      {/* The internet side */}
      <RoundedBox
        args={[TILE.w, TILE.top + 0.14, TILE.d]}
        radius={0.06}
        smoothness={2}
        position={[TILE.x, (TILE.top - 0.14) / 2, TILE.z]}
      >
        <meshStandardMaterial color={colors.tile} roughness={0.85} />
      </RoundedBox>
      <CloudServer
        position={SERVER_AT}
        scale={0.5}
        highlighted={active === "server" || serverLit}
        accent={serverLit ? p.signal : p.brand}
        onSelect={select("server")}
      />
      <Phone
        position={APP_AT}
        scale={0.75}
        rotation={[0, -0.25, 0]}
        highlighted={active === "app" || appLit}
        accent={appLit ? p.signal : p.brand}
        onSelect={select("app")}
      />

      {/* Gateways: forward everything they hear over the internet */}
      {GW_AT.map(([x, z], g) => (
        <GatewayMast
          key={g}
          position={[x, 0, z]}
          highlighted={active === "gateway" || gatewayLit(g)}
          accent={gatewayLit(g) ? p.signal : p.brand}
          onSelect={select("gateway")}
        />
      ))}
      {GW_TOP.map((top, g) => (
        <Link3D key={g} from={top} to={SERVER_IN} arc={BACKHAUL_ARC} dashed lineWidth={1.5} />
      ))}
      <Link3D from={SERVER_IN} to={APP_IN} arc={DELIVER_ARC} lineWidth={1.5} />

      {/* Soil sensors */}
      <Sensors ears={ears} sender={sender} highlighted={active === "device"} onSelect={select("device")} />

      {/* Uplinks; restart when the spreading factor changes */}
      <Uplinks key={sf} sf={sf} onFlow={setFlow} />

      {/* Labels */}
      {GATEWAYS.map((g, i) => (
        <Label3D
          key={g.name}
          position={[GW_AT[i][0], MAST_H + 0.62, GW_AT[i][1]]}
          tone={active === "gateway" ? "accent" : "default"}
        >
          {active === "gateway" ? <strong>{g.name}</strong> : g.name}
        </Label3D>
      ))}
      <Label3D
        position={[SERVER_AT[0] - (roomy ? 0 : 0.7), TILE.top + 1.5, SERVER_AT[2]]}
        tone={active === "server" ? "accent" : "default"}
      >
        {active === "server" ? <strong>Network server</strong> : "Network server"}
      </Label3D>
      <Label3D
        position={[APP_AT[0] + (roomy ? 0 : 0.5), TILE.top + 1.12, APP_AT[2]]}
        tone={active === "app" ? "accent" : "default"}
      >
        {active === "app" ? <strong>Application</strong> : "Application"}
      </Label3D>
      <Label3D position={VILLAGE_LABEL_AT} tone="muted" visible={roomy}>
        Village
      </Label3D>
      <Label3D position={[BAR.x0 + BAR.length / 2, 0.22, BAR.z]} tone="muted">
        <span className="text-[12px]">5 km</span>
      </Label3D>
      <Label3D
        position={[INTERNET_LABEL_AT.x, INTERNET_LABEL_AT.y + 0.05, INTERNET_LABEL_AT.z]}
        tone="muted"
        visible={roomy}
      >
        <span className="text-[12px]">Internet (4G or fibre)</span>
      </Label3D>
      {/* Below the sensor, so it never sits on a gateway's label */}
      <Label3D position={[sx, 0.02, sz + 0.36]} tone={active === "device" ? "accent" : "default"} visible={showSender}>
        {heard ? (
          <>
            Soil sensor: on air <span className="font-mono">{formatMs(airMs)}</span>
          </>
        ) : (
          <>
            Soil sensor: <span className="font-semibold text-bad">not heard</span>
          </>
        )}
      </Label3D>
      <Label3D
        position={[SERVER_AT[0] - 1.25, TILE.top + 0.75, SERVER_AT[2] + 0.2]}
        tone="accent"
        visible={roomy && serverLit && flow.ears.length > 1}
      >
        {flow.ears.length} copies in, 1 kept
      </Label3D>
    </group>
  );
}

/**
 * Topic 2.10: soil sensors spread over a farm send LoRa uplinks. Every gateway
 * in range hears each packet and forwards it to the network server, which
 * keeps one copy: a star of stars, not a mesh.
 */
export default function FarmScene({ sf, active = null, onSelect }: FarmSceneProps) {
  return (
    <Scene3D
      label={`A farm with ${SENSORS.length} LoRa soil sensors, two gateways and a network server, at spreading factor ${sf}`}
      height="clamp(340px, 90vw, 470px)"
      camera={{ position: [0, 9.3, 8.3], fov: 34, target: [0, VIEW_Y, -0.95] }}
    >
      <Farm sf={sf} active={active} onSelect={onSelect} />
    </Scene3D>
  );
}
