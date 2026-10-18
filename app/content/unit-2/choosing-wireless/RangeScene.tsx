import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Line } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Vector3,
  type Group,
  type LineBasicMaterial,
} from "three";
import { seriesColor } from "~/components/theory/ChartCard";
import { TECHS, type Tech, type TechId } from "~/labs/l15-wireless-selector/engine";
import { usePalette } from "~/lib/palette";
import { useResolvedTheme } from "~/lib/theme";
import {
  House,
  InstancedParts,
  Label3D,
  Phone,
  Scene3D,
  SensorNode,
  mixColor,
  useFitScale,
  useSceneMotion,
  type PartInstance,
  type Vec3,
} from "~/components/three";

export type RangeScale = "linear" | "log";

export interface RangeSceneProps {
  scale: RangeScale;
  active: TechId;
  onSelect?: (id: TechId) => void;
}

/** The six technologies, from the shortest typical range to the longest. */
export const BY_RANGE: Tech[] = [...TECHS].sort((a, b) => a.typicalRangeM - b.typicalRangeM);

/** Fixed colour per technology, the same one the L15 lab's charts use. */
export function techColor(tech: Tech): string {
  return seriesColor(TECHS.indexOf(tech));
}

/** "4 cm", "15 m", "5 km" */
export function formatRange(m: number): string {
  if (m >= 1000) return `${m / 1000} km`;
  if (m >= 1) return `${m} m`;
  return `${Math.round(m * 100)} cm`;
}

/* ------------------------------------------------------------------ */
/* The two scales                                                      */
/* ------------------------------------------------------------------ */

const LORAWAN = TECHS.find((t) => t.id === "lorawan") ?? TECHS[TECHS.length - 1];

/** Log scale: where 1 cm sits, and how far apart each power of ten is. */
const R_1CM = 0.5;
const DECADE = 0.62;
/** Linear scale: LoRaWAN's typical range lands here. */
const R_LORA_LINEAR = 3.7;

const logRadius = (m: number) => R_1CM + DECADE * (Math.log10(m) + 2);
const linearRadius = (m: number) => (R_LORA_LINEAR * m) / LORAWAN.typicalRangeM;

interface GridRing {
  m: number;
  label: string;
}

const LOG_GRID: GridRing[] = [
  { m: 0.01, label: "1 cm" },
  { m: 0.1, label: "10 cm" },
  { m: 1, label: "1 m" },
  { m: 10, label: "10 m" },
  { m: 100, label: "100 m" },
  { m: 1000, label: "1 km" },
  { m: 10_000, label: "10 km" },
];

const LINEAR_GRID: GridRing[] = [1, 2, 3, 4, 5].map((k) => ({ m: k * 1000, label: `${k} km` }));

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

const GROUND_R = 4.45;
const FIT_WIDTH = 9.4;
const RING_Y = 0.012;

const deg = (d: number) => (d * Math.PI) / 180;

/** Where each technology's label sits on its ring (degrees; 90 faces the camera). */
const LABEL_ANGLE: Record<TechId, number> = {
  nfc: 90,
  classic: 145,
  ble: 115,
  zigbee: 66,
  wifi: 38,
  lorawan: 14,
};

/** On phones only the selected ring is labelled, at the front where it can't run off the edge. */
const NARROW_LABEL_ANGLE = 72;

/** The grid labels run out along this line, behind and to the right of the device. */
const GRID_ANGLE = deg(-60);

/** A ring label shows only once its ring has grown clear of the device. */
const LABEL_MIN_R = 0.6;
/** Clicks within this distance of a ring select it. */
const PICK_GAP = 0.15;

type PropId = "phone" | "house" | "trees" | "village";

interface ScaleProp {
  id: PropId;
  /** Distance from the device, metres. */
  m: number;
  angle: number;
  label: string;
  labelY: number;
}

/** Everyday things at known distances, so the rings mean something. */
const PROPS: ScaleProp[] = [
  { id: "phone", m: 0.3, angle: deg(180), label: "Phone, 30 cm away", labelY: 0.66 },
  { id: "house", m: 30, angle: deg(-128), label: "House, 30 m away", labelY: 0.74 },
  { id: "trees", m: 300, angle: deg(-100), label: "Trees, 300 m away", labelY: 0.62 },
  { id: "village", m: 3000, angle: deg(205), label: "Village, 3 km away", labelY: 0.5 },
];

/* ------------------------------------------------------------------ */
/* Timing                                                              */
/* ------------------------------------------------------------------ */

const MAX_STEP = 0.1;
/** Seconds to move between the two scales. */
const MORPH = 1.4;
const GRID_OPACITY = 0.55;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ------------------------------------------------------------------ */
/* Shared geometry                                                     */
/* ------------------------------------------------------------------ */

const CIRCLE_POINTS = 128;
const UNIT_CIRCLE: Vec3[] = Array.from({ length: CIRCLE_POINTS + 1 }, (_, i) => {
  const a = (i / CIRCLE_POINTS) * Math.PI * 2;
  return [Math.cos(a), 0, Math.sin(a)];
});

/** Several flat circles as one set of line segments: one draw call for a whole grid. */
function circlesGeometry(radii: readonly number[], segments = 96): BufferGeometry {
  const points: number[] = [];
  for (const r of radii) {
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      points.push(r * Math.cos(a0), 0, r * Math.sin(a0), r * Math.cos(a1), 0, r * Math.sin(a1));
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  return geometry;
}

const logGridGeometry = circlesGeometry(LOG_GRID.map((g) => logRadius(g.m)));
const linearGridGeometry = circlesGeometry(LINEAR_GRID.map((g) => linearRadius(g.m)));
const discGeometry = new CircleGeometry(1, 96);
const groundGeometry = new CylinderGeometry(GROUND_R, GROUND_R + 0.06, 0.14, 96);

/* ------------------------------------------------------------------ */
/* Colours                                                             */
/* ------------------------------------------------------------------ */

/**
 * The chart series colours are CSS variables, which three.js cannot read.
 * Look up their current values, again whenever the theme changes.
 */
function useSeriesHex(fallback: string): string[] {
  const theme = useResolvedTheme();
  return useMemo(() => {
    const style = typeof document === "undefined" ? null : getComputedStyle(document.documentElement);
    return BY_RANGE.map((tech) => {
      const name = techColor(tech).replace(/^var\((--[\w-]+)\)$/, "$1");
      return style?.getPropertyValue(name).trim() || fallback;
    });
  }, [theme, fallback]);
}

/* ------------------------------------------------------------------ */
/* Props for scale                                                     */
/* ------------------------------------------------------------------ */

const TREE_SPOTS: Array<[number, number, number]> = [
  [-0.14, 0.02, 1],
  [0.13, -0.08, 0.85],
  [0.04, 0.16, 0.75],
];

const VILLAGE_SPOTS: Array<[number, number, number]> = [
  [-0.2, -0.05, 0.4],
  [0.02, -0.16, -0.2],
  [0.22, 0.02, 0.6],
  [-0.04, 0.15, 0.1],
  [0.26, -0.22, -0.4],
];

function Trees() {
  const p = usePalette();
  const bark = useMemo(() => mixColor(p.copper, p.casingDark, 0.4), [p.copper, p.casingDark]);
  const { trunks, crowns } = useMemo(() => {
    const t: PartInstance[] = [];
    const c: PartInstance[] = [];
    for (const [x, z, s] of TREE_SPOTS) {
      t.push({ position: [x, 0.09 * s, z], scale: [0.025 * s, 0.18 * s, 0.025 * s] });
      c.push({ position: [x, 0.3 * s, z], scale: [0.11 * s, 0.17 * s, 0.11 * s] });
    }
    return { trunks: t, crowns: c };
  }, []);
  return (
    <>
      <InstancedParts items={trunks} shape="cylinder" color={bark} roughness={0.9} />
      <InstancedParts items={crowns} shape="sphere" color={p.ok} roughness={0.85} />
    </>
  );
}

/** A handful of small houses: walls and pitched roofs, two draw calls. */
function Village() {
  const p = usePalette();
  const { walls, roofs } = useMemo(() => {
    const w: PartInstance[] = [];
    const r: PartInstance[] = [];
    for (const [x, z, turn] of VILLAGE_SPOTS) {
      const h = 0.11;
      const d = 0.12;
      w.push({ position: [x, h / 2, z], scale: [0.16, h, d], rotation: [0, turn, 0] });
      // A box turned 45° about its long axis, half sunk into the walls, reads as a pitched roof.
      r.push({ position: [x, h, z], scale: [0.18, d * 0.74, d * 0.74], rotation: [Math.PI / 4, turn, 0] });
    }
    return { walls: w, roofs: r };
  }, []);
  return (
    <>
      <InstancedParts items={walls} color={p.casing} roughness={0.8} />
      <InstancedParts items={roofs} color={p.copper} roughness={0.7} />
    </>
  );
}

function PropModel({ id }: { id: PropId }) {
  if (id === "phone") return <Phone scale={0.42} rotation={[0, 0.7, 0]} />;
  if (id === "house") return <House scale={0.24} rotation={[0, 0.5, 0]} />;
  if (id === "trees") return <Trees />;
  return <Village />;
}

/* ------------------------------------------------------------------ */
/* The diorama                                                         */
/* ------------------------------------------------------------------ */

function RangeRings({ scale, active, onSelect }: RangeSceneProps) {
  const p = usePalette();
  const { paused } = useSceneMotion();
  const invalidate = useThree((s) => s.invalidate);
  const roomy = useThree((s) => s.size.width) >= 520;
  const fit = useFitScale(FIT_WIDTH);
  const hex = useSeriesHex(p.ink3);

  const colors = useMemo(() => {
    const ground = mixColor(p.surface2, p.lineStrong, 0.35);
    return { ground, pad: mixColor(ground, p.ink3, 0.3), grid: p.ink3 };
  }, [p]);

  const activeIndex = Math.max(
    0,
    BY_RANGE.findIndex((t) => t.id === active),
  );
  const target = scale === "log" ? 1 : 0;

  // t runs from 0 (linear) to 1 (log).
  const morph = useRef({ t: target, dirty: true });
  const radii = useRef(new Float32Array(BY_RANGE.length));
  const activeRef = useRef(activeIndex);
  activeRef.current = activeIndex;
  const roomyRef = useRef(roomy);
  roomyRef.current = roomy;

  const root = useRef<Group>(null);
  const rings = useRef<Array<Group | null>>([]);
  const tags = useRef<Array<Group | null>>([]);
  const props = useRef<Array<Group | null>>([]);
  const disc = useRef<Group>(null);
  const logGrid = useRef<LineBasicMaterial>(null);
  const linearGrid = useRef<LineBasicMaterial>(null);
  const logTags = useRef<Group>(null);
  const linearTags = useRef<Group>(null);
  const dotTag = useRef<Group>(null);

  // A paused scene (or reduced motion) jumps straight to the new scale.
  useLayoutEffect(() => {
    const m = morph.current;
    if (paused) m.t = target;
    m.dirty = true;
    invalidate();
    // `paused` is read only at the moment the scale or selection changes.
  }, [target, activeIndex, roomy, invalidate]);

  useFrame((_, delta) => {
    const m = morph.current;
    if (m.t !== target) {
      if (paused) {
        m.t = target;
      } else {
        const step = Math.min(delta, MAX_STEP) / MORPH;
        m.t = target > m.t ? Math.min(target, m.t + step) : Math.max(target, m.t - step);
      }
      m.dirty = true;
    }
    if (!m.dirty) return;
    m.dirty = false;

    const e = ease(m.t);
    BY_RANGE.forEach((tech, i) => {
      const lin = linearRadius(tech.typicalRangeM);
      const r = lin + (logRadius(tech.typicalRangeM) - lin) * e;
      radii.current[i] = r;
      const ring = rings.current[i];
      if (ring) {
        const s = Math.max(r, 1e-3);
        ring.scale.set(s, 1, s);
        ring.visible = r > 0.02;
      }
      const tag = tags.current[i];
      if (tag) {
        const a = deg(roomyRef.current ? LABEL_ANGLE[tech.id] : NARROW_LABEL_ANGLE);
        tag.position.set(r * Math.cos(a), 0, r * Math.sin(a));
        tag.visible = r > LABEL_MIN_R;
      }
    });

    const d = disc.current;
    if (d) {
      const r = Math.max(radii.current[activeRef.current], 1e-3);
      d.scale.set(r, 1, r);
      d.visible = r > 0.02;
    }

    if (logGrid.current) logGrid.current.opacity = GRID_OPACITY * e;
    if (linearGrid.current) linearGrid.current.opacity = GRID_OPACITY * (1 - e);
    if (logTags.current) logTags.current.visible = e >= 0.5;
    if (linearTags.current) linearTags.current.visible = e < 0.5;
    if (dotTag.current) dotTag.current.visible = e < 0.5;

    PROPS.forEach((prop, i) => {
      const g = props.current[i];
      if (!g) return;
      const lin = linearRadius(prop.m);
      const r = lin + (logRadius(prop.m) - lin) * e;
      // Things that would land on top of the device shrink away.
      const s = clamp01((r - 0.7) / 0.5);
      g.position.set(r * Math.cos(prop.angle), 0, r * Math.sin(prop.angle));
      g.scale.setScalar(Math.max(s, 1e-3));
      g.visible = s > 0.02;
    });
  });

  /* Selecting a ring by clicking near it on the ground */
  const local = useMemo(() => new Vector3(), []);
  const hovering = useRef(false);

  const ringAt = (e: ThreeEvent<PointerEvent | MouseEvent>): number => {
    const g = root.current;
    if (!g) return -1;
    g.worldToLocal(local.copy(e.point));
    const d = Math.hypot(local.x, local.z);
    let best = -1;
    let gap = PICK_GAP;
    radii.current.forEach((r, i) => {
      if (r < 0.2) return;
      const off = Math.abs(d - r);
      if (off < gap) {
        best = i;
        gap = off;
      }
    });
    return best;
  };

  const setHover = (on: boolean) => {
    if (hovering.current === on) return;
    hovering.current = on;
    document.body.style.cursor = on ? "pointer" : "";
  };

  useEffect(
    () => () => {
      if (hovering.current) document.body.style.cursor = "";
    },
    [],
  );

  const groundHandlers = onSelect
    ? {
        onPointerMove: (e: ThreeEvent<PointerEvent>) => setHover(ringAt(e) >= 0),
        onPointerOut: () => setHover(false),
        onClick: (e: ThreeEvent<MouseEvent>) => {
          // Ignore the click that ends an orbit drag.
          if (e.delta > 6) return;
          const i = ringAt(e);
          if (i < 0) return;
          e.stopPropagation();
          onSelect(BY_RANGE[i].id);
        },
      }
    : {};

  const gridTag = (ring: GridRing, r: number, i: number) => (
    <Label3D
      key={ring.label}
      position={[r * Math.cos(GRID_ANGLE), 0.04, r * Math.sin(GRID_ANGLE)]}
      tone="muted"
      visible={roomy || i % 2 === 0}
    >
      <span className="text-[12px]">{ring.label}</span>
    </Label3D>
  );

  return (
    <group ref={root} scale={fit}>
      {/* Ground: clicking near a ring selects it */}
      <mesh geometry={groundGeometry} position={[0, -0.07, 0]} {...groundHandlers}>
        <meshStandardMaterial color={colors.ground} roughness={0.9} />
      </mesh>

      {/* Grid rings: one set per scale, cross-faded */}
      <lineSegments geometry={logGridGeometry} position={[0, 0.004, 0]}>
        <lineBasicMaterial ref={logGrid} color={colors.grid} transparent opacity={0} depthWrite={false} />
      </lineSegments>
      <lineSegments geometry={linearGridGeometry} position={[0, 0.004, 0]}>
        <lineBasicMaterial ref={linearGrid} color={colors.grid} transparent opacity={0} depthWrite={false} />
      </lineSegments>
      <group ref={logTags}>{LOG_GRID.map((g, i) => gridTag(g, logRadius(g.m), i))}</group>
      <group ref={linearTags}>{LINEAR_GRID.map((g, i) => gridTag(g, linearRadius(g.m), i + 1))}</group>

      {/* The selected technology's coverage */}
      <group ref={disc} position={[0, 0.007, 0]}>
        <mesh geometry={discGeometry} rotation={[-Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color={hex[activeIndex]} transparent opacity={0.16} depthWrite={false} />
        </mesh>
      </group>

      {/* One ring per technology, at its typical range */}
      {BY_RANGE.map((tech, i) => (
        <group
          key={tech.id}
          ref={(g) => {
            rings.current[i] = g;
          }}
          position={[0, RING_Y + i * 0.002, 0]}
        >
          <Line points={UNIT_CIRCLE} color={hex[i]} lineWidth={i === activeIndex ? 5 : 2.5} />
        </group>
      ))}
      {BY_RANGE.map((tech, i) => (
        <group
          key={tech.id}
          ref={(g) => {
            tags.current[i] = g;
          }}
        >
          <Label3D
            position={[0, 0.06, 0]}
            tone={i === activeIndex ? "accent" : "default"}
            visible={roomy || i === activeIndex}
          >
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: techColor(tech) }}
              />
              {i === activeIndex ? <strong>{tech.name}</strong> : tech.name}
              <span className="text-ink-3">{formatRange(tech.typicalRangeM)}</span>
            </span>
          </Label3D>
        </group>
      ))}

      {/* The device everything is measured from */}
      <mesh position={[0, 0.012, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.024, 28]} />
        <meshStandardMaterial color={colors.pad} roughness={0.85} />
      </mesh>
      <SensorNode scale={0.55} />
      <group ref={dotTag}>
        <Label3D position={[0, 0.05, 0.62]} tone="accent">
          {roomy ? "NFC, Bluetooth, BLE, Zigbee and Wi-Fi: all inside this dot" : "5 rings inside this dot"}
        </Label3D>
      </group>

      {/* Everyday things for scale */}
      {PROPS.map((prop, i) => (
        <group
          key={prop.id}
          ref={(g) => {
            props.current[i] = g;
          }}
        >
          <PropModel id={prop.id} />
          <Label3D position={[0, prop.labelY, 0]} tone="muted" visible={roomy}>
            <span className="text-[12px]">{prop.label}</span>
          </Label3D>
        </group>
      ))}
    </group>
  );
}

/**
 * Topic 2.4: a ring around a device for each wireless technology's typical
 * range. On a linear scale only LoRaWAN shows; on a log scale every power of
 * ten gets the same space and all six rings appear.
 */
export default function RangeScene({ scale, active, onSelect }: RangeSceneProps) {
  return (
    <Scene3D
      label={`Range rings around a device for six wireless technologies, drawn on a ${scale === "log" ? "logarithmic" : "linear"} scale`}
      height="clamp(320px, 80vw, 460px)"
      camera={{ position: [0, 7.1, 10.1], fov: 30, target: [0, 0, 0.3] }}
    >
      <RangeRings scale={scale} active={active} onSelect={onSelect} />
    </Scene3D>
  );
}
