import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import type { Group, MeshStandardMaterial } from "three";
import {
  InstancedParts,
  Label3D,
  PacketParticle,
  Scene3D,
  mixColor,
  useFitScale,
  useSceneMotion,
  type Label3DTone,
  type PartInstance,
  type Vec3,
} from "~/components/three";
import { unitColor, usePalette, type UnitNumber } from "~/lib/palette";

export interface HeroBoardProps {
  onSelectUnit?: (unit: UnitNumber) => void;
  activeUnit?: UnitNumber | null;
}

/* ------------------------------------------------------------------ */
/* Board layout (x across, z towards the viewer, board top at y = 0)   */
/* ------------------------------------------------------------------ */

type P2 = [number, number];

const UNITS: UnitNumber[] = [1, 2, 3];

const UNIT_LABEL: Record<UnitNumber, string> = {
  1: "Unit 1: Devices and protocols",
  2: "Unit 2: Communication and wireless",
  3: "Unit 3: Cloud, security and applications",
};

const UNIT_TONE: Record<UnitNumber, Label3DTone> = { 1: "u1", 2: "u2", 3: "u3" };

const CORE = { x: 0, z: 0.6, size: 1.7 };

interface ChipSpec {
  x: number;
  z: number;
  w: number;
  d: number;
  /** Which pair of sides carries the pins. */
  pinSides: "x" | "z";
}

const CHIPS: Record<UnitNumber, ChipSpec> = {
  1: { x: -3.25, z: -0.3, w: 1.0, d: 1.6, pinSides: "x" },
  2: { x: 0, z: -2.0, w: 1.6, d: 1.0, pinSides: "z" },
  3: { x: 3.25, z: -0.3, w: 1.0, d: 1.6, pinSides: "x" },
};

/** Centre line of each trace bus, from the core's pins to the unit chip's pins, with right-angle bends. */
const ROUTES: Record<UnitNumber, P2[]> = {
  1: [
    [-1.0, 1.0],
    [-1.8, 1.0],
    [-1.8, -0.3],
    [-2.6, -0.3],
  ],
  2: [
    [-0.45, -0.4],
    [-0.45, -0.95],
    [0.35, -0.95],
    [0.35, -1.36],
  ],
  3: [
    [1.0, 1.0],
    [1.8, 1.0],
    [1.8, -0.3],
    [2.6, -0.3],
  ],
};

/** Feed line and meander of a printed Wi-Fi antenna in the front-right corner. */
const ANTENNA: P2[] = [
  [0.6, 1.6],
  [0.6, 1.95],
  [3.4, 1.95],
  [3.4, 2.6],
  [3.6, 2.6],
  [3.6, 1.95],
  [3.8, 1.95],
  [3.8, 2.6],
  [4.0, 2.6],
  [4.0, 1.95],
  [4.2, 1.95],
  [4.2, 2.6],
  [4.4, 2.6],
  [4.4, 1.95],
];

const BUS_OFFSETS = [-0.22, 0, 0.22];
const TRACE_W = 0.07;
const TRACE_H = 0.012;
const PACKET_Y = 0.1;
const LIFT = 0.22;

/** Shift an axis-aligned polyline sideways by d, keeping corners square. */
function offsetPath(path: P2[], d: number): P2[] {
  const normals: P2[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const dx = path[i + 1][0] - path[i][0];
    const dz = path[i + 1][1] - path[i][1];
    const len = Math.hypot(dx, dz) || 1;
    normals.push([-dz / len, dx / len]);
  }
  return path.map(([x, z], i) => {
    const a = normals[Math.max(0, i - 1)];
    const b = normals[Math.min(normals.length - 1, i)];
    const k = d / (1 + a[0] * b[0] + a[1] * b[1]);
    return [x + (a[0] + b[0]) * k, z + (a[1] + b[1]) * k];
  });
}

/** One flat box per straight run of a trace. */
function traceBoxes(path: P2[]): PartInstance[] {
  const boxes: PartInstance[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const [x1, z1] = path[i];
    const [x2, z2] = path[i + 1];
    const alongX = Math.abs(x2 - x1) >= Math.abs(z2 - z1);
    boxes.push({
      position: [(x1 + x2) / 2, TRACE_H / 2 + 0.002, (z1 + z2) / 2],
      scale: alongX
        ? [Math.abs(x2 - x1) + TRACE_W, TRACE_H, TRACE_W]
        : [TRACE_W, TRACE_H, Math.abs(z2 - z1) + TRACE_W],
    });
  }
  return boxes;
}

/** A thin rectangle outline, as printed silkscreen. */
function outline(cx: number, cz: number, w: number, d: number): PartInstance[] {
  const t = 0.03;
  const y = 0.003;
  const h = 0.004;
  return [
    { position: [cx, y, cz - d / 2], scale: [w + t, h, t] },
    { position: [cx, y, cz + d / 2], scale: [w + t, h, t] },
    { position: [cx - w / 2, y, cz], scale: [t, h, d + t] },
    { position: [cx + w / 2, y, cz], scale: [t, h, d + t] },
  ];
}

const TRACES: PartInstance[] = [
  ...UNITS.flatMap((u) => BUS_OFFSETS.flatMap((d) => traceBoxes(offsetPath(ROUTES[u], d)))),
  ...traceBoxes(ANTENNA),
];

const PACKET_PATHS: Record<UnitNumber, { out: Vec3[]; back: Vec3[] }> = {
  1: packetPaths(ROUTES[1]),
  2: packetPaths(ROUTES[2]),
  3: packetPaths(ROUTES[3]),
};

function packetPaths(route: P2[]) {
  const out = route.map(([x, z]): Vec3 => [x, PACKET_Y, z]);
  return { out, back: [...out].reverse() };
}

const SILK: PartInstance[] = [
  ...outline(0, 0, 9.5, 5.5),
  ...outline(CORE.x, CORE.z, CORE.size + 0.55, CORE.size + 0.55),
  ...UNITS.flatMap((u) => {
    const c = CHIPS[u];
    return outline(c.x, c.z, c.w + 0.55, c.d + 0.55);
  }),
];

const CORNERS: P2[] = [
  [-4.55, -2.55],
  [4.55, -2.55],
  [-4.55, 2.55],
  [4.55, 2.55],
];

const HOLE_RINGS: PartInstance[] = CORNERS.map(([x, z]) => ({
  position: [x, 0.003, z],
  scale: [0.2, 0.006, 0.2],
}));

const HOLES: PartInstance[] = CORNERS.map(([x, z]) => ({
  position: [x, 0.005, z],
  scale: [0.11, 0.008, 0.11],
}));

const SMD_SPOTS: P2[] = [
  [-1.3, -0.1],
  [1.3, -0.1],
  [-1.25, 1.7],
  [1.25, 1.7],
  [-2.4, -1.5],
  [2.4, -1.5],
];

const SMD: PartInstance[] = SMD_SPOTS.map(([x, z]) => ({
  position: [x, 0.035, z],
  scale: [0.18, 0.07, 0.1],
}));

const HEADER_PINS: PartInstance[] = Array.from({ length: 20 }, (_, i) => ({
  position: [-2.375 + i * 0.25, 0.2, 2.45],
  scale: [0.05, 0.24, 0.05],
}));

function corePins(): PartInstance[] {
  const half = CORE.size / 2 + 0.07;
  const offsets = Array.from({ length: 8 }, (_, i) => -0.63 + i * 0.18);
  return offsets.flatMap((o): PartInstance[] => [
    { position: [o, 0.04, -half], scale: [0.07, 0.035, 0.16] },
    { position: [o, 0.04, half], scale: [0.07, 0.035, 0.16] },
    { position: [-half, 0.04, o], scale: [0.16, 0.035, 0.07] },
    { position: [half, 0.04, o], scale: [0.16, 0.035, 0.07] },
  ]);
}

const CORE_PINS = corePins();

function chipPins(spec: ChipSpec): PartInstance[] {
  const offsets = Array.from({ length: 6 }, (_, i) => -0.6 + i * 0.24);
  if (spec.pinSides === "x") {
    const half = spec.w / 2 + 0.07;
    return offsets.flatMap((o): PartInstance[] => [
      { position: [-half, 0.05, o], scale: [0.14, 0.05, 0.09] },
      { position: [half, 0.05, o], scale: [0.14, 0.05, 0.09] },
    ]);
  }
  const half = spec.d / 2 + 0.07;
  return offsets.flatMap((o): PartInstance[] => [
    { position: [o, 0.05, -half], scale: [0.09, 0.05, 0.14] },
    { position: [o, 0.05, half], scale: [0.09, 0.05, 0.14] },
  ]);
}

const CHIP_PINS: Record<UnitNumber, PartInstance[]> = {
  1: chipPins(CHIPS[1]),
  2: chipPins(CHIPS[2]),
  3: chipPins(CHIPS[3]),
};

/** A loose grid of via dots, kept clear of chips, traces and connectors. */
function vias(): PartInstance[] {
  type Rect = [number, number, number, number];
  const keepOut: Rect[] = [
    [CORE.x - 1.3, CORE.z - 1.3, CORE.x + 1.3, CORE.z + 1.3],
    ...UNITS.map((u): Rect => {
      const c = CHIPS[u];
      return [c.x - c.w / 2 - 0.45, c.z - c.d / 2 - 0.45, c.x + c.w / 2 + 0.45, c.z + c.d / 2 + 0.45];
    }),
    ...[...UNITS.map((u) => ROUTES[u]), ANTENNA].flatMap((path) =>
      path.slice(1).map((end, i): Rect => {
        const start = path[i];
        return [
          Math.min(start[0], end[0]) - 0.42,
          Math.min(start[1], end[1]) - 0.42,
          Math.max(start[0], end[0]) + 0.42,
          Math.max(start[1], end[1]) + 0.42,
        ];
      }),
    ),
    [-2.8, 2.15, 2.8, 2.8],
    [-5, 1.1, -4.1, 2.3],
    [-1.0, 1.7, -0.2, 2.2],
    ...CORNERS.map(([x, z]): Rect => [x - 0.4, z - 0.4, x + 0.4, z + 0.4]),
    ...SMD_SPOTS.map(([x, z]): Rect => [x - 0.25, z - 0.25, x + 0.25, z + 0.25]),
  ];
  const dots: PartInstance[] = [];
  for (let x = -4.5; x <= 4.5001; x += 0.5) {
    for (let z = -2.5; z <= 2.5001; z += 0.5) {
      const blocked = keepOut.some(([x1, z1, x2, z2]) => x >= x1 && x <= x2 && z >= z1 && z <= z2);
      if (!blocked) dots.push({ position: [x, 0.004, z], scale: [0.045, 0.008, 0.045] });
    }
  }
  return dots;
}

const VIAS = vias();

/* ------------------------------------------------------------------ */
/* Chips                                                               */
/* ------------------------------------------------------------------ */

function CoreChip({ pinDot }: { pinDot: string }) {
  const p = usePalette();
  const { paused } = useSceneMotion();
  const inlayRef = useRef<MeshStandardMaterial>(null);
  const time = useRef(0);

  // A slow heartbeat on the core's marking.
  useFrame((_, delta) => {
    const inlay = inlayRef.current;
    if (paused || !inlay) return;
    time.current += Math.min(delta, 0.1);
    inlay.emissiveIntensity = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(time.current * 2.2));
  });

  return (
    <group position={[CORE.x, 0, CORE.z]}>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[CORE.size, 0.2, CORE.size]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.226, 0]}>
        <boxGeometry args={[0.7, 0.012, 0.7]} />
        <meshStandardMaterial
          ref={inlayRef}
          color={p.brand}
          emissive={p.brand}
          emissiveIntensity={0.35}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[-0.62, 0.225, -0.62]}>
        <cylinderGeometry args={[0.06, 0.06, 0.01, 12]} />
        <meshStandardMaterial color={pinDot} />
      </mesh>
      <InstancedParts items={CORE_PINS} color={p.casing} metalness={0.4} roughness={0.4} />
      <Label3D position={[0, 0.55, 0]} tone="muted">
        IoT Lab
      </Label3D>
    </group>
  );
}

interface UnitChipProps {
  unit: UnitNumber;
  active: boolean;
  short: boolean;
  onHoverChange: (unit: UnitNumber, hovering: boolean) => void;
  onSelect?: (unit: UnitNumber) => void;
}

function UnitChip({ unit, active, short, onHoverChange, onSelect }: UnitChipProps) {
  const p = usePalette();
  const spec = CHIPS[unit];
  const color = unitColor(p, unit);
  const liftRef = useRef<Group>(null);
  const hoveringRef = useRef(false);

  // Ease the chip up out of the board when active, and back down.
  useFrame((state, delta) => {
    const group = liftRef.current;
    if (!group) return;
    const target = active ? LIFT : 0;
    const diff = target - group.position.y;
    if (Math.abs(diff) < 0.001) {
      if (diff !== 0) group.position.y = target;
      return;
    }
    group.position.y += diff * (1 - Math.exp(-Math.min(delta, 0.1) * 12));
    state.invalidate();
  });

  useEffect(
    () => () => {
      if (hoveringRef.current) document.body.style.cursor = "";
    },
    [],
  );

  const handlers = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      hoveringRef.current = true;
      document.body.style.cursor = "pointer";
      onHoverChange(unit, true);
    },
    onPointerOut: () => {
      hoveringRef.current = false;
      document.body.style.cursor = "";
      onHoverChange(unit, false);
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (e.delta > 6) return;
      onSelect?.(unit);
    },
  };

  return (
    <group position={[spec.x, 0, spec.z]}>
      <group ref={liftRef} {...handlers}>
        <mesh position={[0, 0.13, 0]}>
          <boxGeometry args={[spec.w, 0.22, spec.d]} />
          <meshStandardMaterial
            color={p.casingDark}
            emissive={color}
            emissiveIntensity={active ? 0.15 : 0}
            roughness={0.5}
          />
        </mesh>
        <mesh position={[0, 0.246, 0]}>
          <boxGeometry args={[spec.w - 0.2, 0.012, spec.d - 0.2]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={active ? 0.55 : 0.12}
            roughness={0.45}
          />
        </mesh>
        <mesh position={[-spec.w / 2 + 0.17, 0.254, -spec.d / 2 + 0.17]}>
          <cylinderGeometry args={[0.05, 0.05, 0.01, 12]} />
          <meshStandardMaterial color={p.casingDark} />
        </mesh>
        <InstancedParts items={CHIP_PINS[unit]} color={p.casing} metalness={0.4} roughness={0.4} />
        <Label3D position={[0, 0.85, 0]} tone={active ? UNIT_TONE[unit] : "default"}>
          {short ? `Unit ${unit}` : UNIT_LABEL[unit]}
        </Label3D>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

function BoardScene({ activeUnit, onSelectUnit }: HeroBoardProps) {
  const p = usePalette();
  // On tall, narrow views (phones) the board turns a quarter so it fills the
  // frame, and the units then read top to bottom.
  const portrait = useThree((s) => s.size.width < s.size.height * 0.95);
  // Wider than the board itself: its near edge looks bigger in perspective.
  const fit = useFitScale(portrait ? 9 : 13);
  const narrow = useThree((s) => s.size.width < 560);
  const [hovered, setHovered] = useState<UnitNumber | null>(null);

  const colors = useMemo(
    () => ({
      via: mixColor(p.pcb2, p.silk, 0.12),
      smd: mixColor(p.copper, p.silk, 0.55),
      pinDot: mixColor(p.casingDark, p.silk, 0.3),
    }),
    [p],
  );

  const onHoverChange = (unit: UnitNumber, hovering: boolean) =>
    setHovered((current) => (hovering ? unit : current === unit ? null : current));

  return (
    <group scale={fit} rotation={[0, portrait ? -Math.PI / 2 : 0, 0]}>
      {/* The board */}
      <RoundedBox args={[10, 0.16, 6]} radius={0.06} smoothness={2} position={[0, -0.08, 0]}>
        <meshStandardMaterial color={p.pcb} roughness={0.7} />
      </RoundedBox>
      <InstancedParts items={VIAS} shape="cylinder" color={colors.via} roughness={0.6} />
      <InstancedParts items={SILK} color={p.silk} roughness={0.8} />
      <InstancedParts items={TRACES} color={p.pcbTrace} roughness={0.45} metalness={0.3} />
      <InstancedParts items={HOLE_RINGS} shape="cylinder" color={p.pcbTrace} metalness={0.3} />
      <InstancedParts items={HOLES} shape="cylinder" color={p.casingDark} />
      <InstancedParts items={SMD} color={colors.smd} roughness={0.5} />

      {/* Pin header along the front edge */}
      <mesh position={[0, 0.06, 2.45]}>
        <boxGeometry args={[5.1, 0.12, 0.22]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.7} />
      </mesh>
      <InstancedParts items={HEADER_PINS} color={p.pcbTrace} metalness={0.5} roughness={0.35} />

      {/* USB connector and crystal */}
      <mesh position={[-4.72, 0.09, 1.7]}>
        <boxGeometry args={[0.8, 0.18, 0.75]} />
        <meshStandardMaterial color={p.casing} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[-0.6, 0.07, 1.95]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.07, 0.3, 4, 10]} />
        <meshStandardMaterial color={p.casing} metalness={0.5} roughness={0.35} />
      </mesh>

      <CoreChip pinDot={colors.pinDot} />
      {UNITS.map((unit) => (
        <UnitChip
          key={unit}
          unit={unit}
          active={activeUnit === unit || hovered === unit}
          short={narrow}
          onHoverChange={onHoverChange}
          onSelect={onSelectUnit}
        />
      ))}

      {/* Data packets running out along each bus and back */}
      {UNITS.map((unit, i) => (
        <group key={unit}>
          <PacketParticle
            path={PACKET_PATHS[unit].out}
            duration={2.2}
            delay={i * 0.75}
            repeatDelay={1.1}
            color={unitColor(p, unit)}
            size={0.085}
            idleProgress={0.3}
          />
          <PacketParticle
            path={PACKET_PATHS[unit].back}
            duration={2.2}
            delay={i * 0.75 + 1.65}
            repeatDelay={1.1}
            size={0.075}
            idleProgress={0.3}
          />
        </group>
      ))}
    </group>
  );
}

/**
 * Home page hero: the syllabus as a circuit board. Each chip is one unit.
 * Hovering or clicking a chip highlights it; `activeUnit` highlights one from
 * outside (for example from the HTML list of units below the hero).
 */
export default function HeroBoard({ onSelectUnit, activeUnit = null }: HeroBoardProps) {
  return (
    <Scene3D
      label="A circuit board where each chip is one unit of the syllabus"
      height={460}
      camera={{ position: [1.2, 7, 8.5], fov: 40, target: [0, 0, 0.5] }}
      minDistance={8.5}
      maxDistance={13}
      orbitLimits={{
        minPolarAngle: 0.25,
        maxPolarAngle: 1.15,
        minAzimuthAngle: -0.8,
        maxAzimuthAngle: 1.1,
      }}
    >
      <BoardScene activeUnit={activeUnit} onSelectUnit={onSelectUnit} />
    </Scene3D>
  );
}
