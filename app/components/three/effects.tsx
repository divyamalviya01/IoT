import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { QuadraticBezierLine, type QuadraticBezierLineRef } from "@react-three/drei";
import {
  DoubleSide,
  QuadraticBezierCurve3,
  RingGeometry,
  SphereGeometry,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
} from "three";
import { usePalette } from "~/lib/palette";
import { useSceneMotion } from "./Scene3D";
import type { Vec3 } from "./types";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

// Shared, low-poly geometries. Plain three objects, safe to create during pre-render.
const packetGeometry = new SphereGeometry(1, 16, 12);
const ringGeometry = new RingGeometry(0.86, 1, 24);

const ORIGIN: Vec3 = [0, 0, 0];
const FLAT: Vec3 = [-Math.PI / 2, 0, 0];

/** Longest step an animation takes in one frame, so a stalled tab doesn't make things jump. */
const MAX_STEP = 0.1;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Control point used by Link3D and PacketParticle: the midpoint raised by `arc`. */
export function arcControlPoint(from: Vec3, to: Vec3, arc: number): Vec3 {
  return [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + arc, (from[2] + to[2]) / 2];
}

interface Route {
  sample(progress: number, out: Vector3): Vector3;
}

function arcRoute(from: Vec3, to: Vec3, arc: number): Route {
  const curve = new QuadraticBezierCurve3(
    new Vector3(...from),
    new Vector3(...arcControlPoint(from, to, arc)),
    new Vector3(...to),
  );
  return { sample: (u, out) => curve.getPoint(clamp01(u), out) };
}

/** Moves along a polyline at constant speed. */
function polylineRoute(points: readonly Vec3[]): Route {
  const pts = points.map((p) => new Vector3(...p));
  const lengths = [0];
  for (let i = 1; i < pts.length; i++) {
    lengths.push(lengths[i - 1] + pts[i].distanceTo(pts[i - 1]));
  }
  const total = lengths[lengths.length - 1];
  return {
    sample(u, out) {
      if (pts.length === 0) return out.set(0, 0, 0);
      if (pts.length === 1 || total === 0) return out.copy(pts[0]);
      const d = clamp01(u) * total;
      let i = 1;
      while (i < lengths.length - 1 && lengths[i] < d) i++;
      const seg = lengths[i] - lengths[i - 1];
      return out.lerpVectors(pts[i - 1], pts[i], seg > 0 ? (d - lengths[i - 1]) / seg : 0);
    },
  };
}

/* ------------------------------------------------------------------ */
/* PacketParticle                                                      */
/* ------------------------------------------------------------------ */

interface PacketTiming {
  /** Seconds to travel the whole route. Default 1.6. */
  duration?: number;
  /** Seconds before the first trip starts. Default 0. */
  delay?: number;
  /** Seconds hidden between trips when looping. Default 0. */
  repeatDelay?: number;
  /** Default palette.signal. */
  color?: string;
  /** Radius of the bright core. Default 0.12. */
  size?: number;
  /** Default true. When false the packet makes one trip and then hides. */
  loop?: boolean;
  /** Called every time the packet reaches the end of its route. */
  onArrive?: () => void;
  /**
   * Where the packet waits (0 to 1 along the route) in a scene that starts
   * paused and has never played, so still images still show the flow. Default 0.5.
   */
  idleProgress?: number;
}

export type PacketParticleProps = PacketTiming &
  (
    | {
        from: Vec3;
        to: Vec3;
        /** Height the curve's control point is raised by. Default 1. */
        arc?: number;
        path?: undefined;
      }
    | {
        /** Follow these points in order at constant speed (for example a PCB trace with bends). */
        path: readonly Vec3[];
        from?: undefined;
        to?: undefined;
        arc?: undefined;
      }
  );

/** A glowing data packet moving along an arc (from/to) or along a polyline (path). */
export function PacketParticle(props: PacketParticleProps) {
  const {
    duration = 1.6,
    delay = 0,
    repeatDelay = 0,
    color,
    size = 0.12,
    loop = true,
    onArrive,
    idleProgress = 0.5,
    path,
    from,
    to,
    arc,
  } = props;
  const palette = usePalette();
  const { paused } = useSceneMotion();
  const tint = color ?? palette.signal;

  const routeKey = JSON.stringify(path ?? [from, to, arc ?? 1]);
  const route = useMemo(
    () => (path ? polylineRoute(path) : arcRoute(from ?? ORIGIN, to ?? ORIGIN, arc ?? 1)),
    // The key captures every value the route depends on, so new arrays with
    // the same numbers don't rebuild it.
    [routeKey],
  );

  const groupRef = useRef<Group>(null);
  const time = useRef(0);
  const started = useRef(false);
  const arrivals = useRef(0);
  const point = useMemo(() => new Vector3(), []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    if (!paused) {
      time.current += Math.min(delta, MAX_STEP);
      started.current = true;
    }

    if (!started.current) {
      group.position.copy(route.sample(idleProgress, point));
      group.visible = true;
      return;
    }

    const local = time.current - delay;
    if (local < 0) {
      group.visible = false;
      return;
    }

    const travel = Math.max(duration, 0.01);
    let progress: number | null;
    let arrived: number;
    if (loop) {
      const period = travel + Math.max(repeatDelay, 0);
      const within = local % period;
      progress = within <= travel ? within / travel : null;
      arrived = local >= travel ? Math.floor((local - travel) / period) + 1 : 0;
    } else {
      progress = local <= travel ? local / travel : null;
      arrived = local >= travel ? 1 : 0;
    }

    if (arrived > arrivals.current) {
      arrivals.current = arrived;
      onArrive?.();
    }

    if (progress === null) {
      group.visible = false;
      return;
    }
    group.position.copy(route.sample(progress, point));
    group.visible = true;
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh geometry={packetGeometry} scale={size}>
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.9} roughness={0.4} />
      </mesh>
      <mesh geometry={packetGeometry} scale={size * 2.2}>
        <meshBasicMaterial color={tint} transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* SignalRings                                                         */
/* ------------------------------------------------------------------ */

export interface SignalRingsProps {
  position?: Vec3;
  /** Default palette.signal. */
  color?: string;
  count?: number;
  maxRadius?: number;
  /** Seconds for one ring to grow and fade. */
  period?: number;
  /** Default lies flat (rings spread out horizontally). */
  rotation?: Vec3;
}

/** Expanding, fading rings, like a radio signal spreading out. */
export function SignalRings({
  position = ORIGIN,
  color,
  count = 3,
  maxRadius = 1.2,
  period = 2,
  rotation = FLAT,
}: SignalRingsProps) {
  const palette = usePalette();
  const { paused } = useSceneMotion();
  const tint = color ?? palette.signal;
  const meshes = useRef<Array<Mesh | null>>([]);
  const time = useRef(0);

  useFrame((_, delta) => {
    if (!paused) time.current += Math.min(delta, MAX_STEP);
    const minRadius = maxRadius * 0.12;
    const span = Math.max(period, 0.1);
    for (let i = 0; i < count; i++) {
      const mesh = meshes.current[i];
      if (!mesh) continue;
      const phase = (time.current / span + i / count) % 1;
      mesh.scale.setScalar(minRadius + phase * (maxRadius - minRadius));
      (mesh.material as MeshBasicMaterial).opacity = 0.7 * (1 - phase);
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            meshes.current[i] = mesh;
          }}
          geometry={ringGeometry}
        >
          <meshBasicMaterial
            color={tint}
            transparent
            opacity={0.5}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Link3D                                                              */
/* ------------------------------------------------------------------ */

export interface Link3DProps {
  from: Vec3;
  to: Vec3;
  /** Height the curve's control point is raised by. 0 draws a straight line. */
  arc?: number;
  /** Default palette.ink3. */
  color?: string;
  dashed?: boolean;
  /** With `dashed`, the dashes flow from `from` to `to`. */
  animated?: boolean;
  /** In screen pixels. */
  lineWidth?: number;
}

/** A connection line between two points, straight or arched. */
export function Link3D({
  from,
  to,
  arc = 0,
  color,
  dashed = false,
  animated = false,
  lineWidth = 1.5,
}: Link3DProps) {
  const palette = usePalette();
  const { paused } = useSceneMotion();
  const ref = useRef<QuadraticBezierLineRef>(null);

  const key = `${from.join(",")}|${to.join(",")}|${arc}`;
  const points = useMemo(
    () => ({
      start: [from[0], from[1], from[2]] as Vec3,
      end: [to[0], to[1], to[2]] as Vec3,
      mid: arcControlPoint(from, to, arc),
    }),
    [key],
  );

  useFrame((_, delta) => {
    if (!animated || !dashed || paused) return;
    const line = ref.current;
    if (line) line.material.dashOffset -= Math.min(delta, MAX_STEP) * 0.5;
  });

  return (
    <QuadraticBezierLine
      ref={ref}
      start={points.start}
      end={points.end}
      mid={points.mid}
      color={color ?? palette.ink3}
      lineWidth={lineWidth}
      dashed={dashed}
      dashSize={0.16}
      gapSize={0.12}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Label3D (lives in labels.tsx with the overlay that draws it)        */
/* ------------------------------------------------------------------ */

export { Label3D } from "./labels";
export type { Label3DProps, Label3DTone } from "./labels";
