import { useEffect, useMemo, useRef } from "react";
import { Edges, RoundedBox } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { usePalette } from "~/lib/palette";
import {
  AssetFrame,
  CloudServer,
  Gateway,
  GlowMaterial,
  Label3D,
  Link3D,
  Motor,
  PacketParticle,
  Rack,
  Scene3D,
  SensorNode,
  mixColor,
  useFitScale,
  type AssetProps,
  type Vec3,
} from "~/components/three";

export type Tier = "devices" | "edge" | "fog" | "cloud";
export type ProcessAt = Exclude<Tier, "devices">;

export interface TiersSceneProps {
  active?: Tier | null;
  onSelect?: (id: Tier) => void;
  processAt: ProcessAt;
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

const TIERS: Tier[] = ["devices", "edge", "fog", "cloud"];
const FLOOR_Y: Record<Tier, number> = { devices: 0, edge: 1.45, fog: 2.9, cloud: 4.35 };
const TIER_NAME: Record<Tier, string> = {
  devices: "Devices",
  edge: "Edge",
  fog: "Fog",
  cloud: "Cloud",
};
const SLAB_W = 6.4;
const SLAB_D = 2.1;
/** Height the camera looks at; the fit scale shrinks the stack around it. */
const VIEW_Y = 2.75;

/** Seconds for the whole round trip, so higher tiers visibly take longer. */
const TRIP: Record<ProcessAt, number> = { edge: 0.6, fog: 1.2, cloud: 2.4 };
const TIME_TEXT: Record<ProcessAt, string> = {
  edge: "about 2 ms",
  fog: "about 10 ms",
  cloud: "about 80 ms",
};
/** Time spent working on the data at the chosen tier, and the rest before the next trip. */
const THINK = 0.25;
const REST = 0.9;

const UP_X = 0.8;
const DOWN_X = 1.2;
const RISER_Z = 0.55;
const STOP_Y: Record<ProcessAt, number> = {
  edge: FLOOR_Y.edge + 0.36,
  fog: FLOOR_Y.fog + 0.48,
  cloud: FLOOR_Y.cloud + 0.62,
};
const CAR_TOP: Vec3 = [-1.45, 0.52, 0.4];
const CLOUD_RACKS = [2.0, 2.5];

function routeUp(to: ProcessAt): Vec3[] {
  const points: Vec3[] = [CAR_TOP, [UP_X, STOP_Y.edge, RISER_Z]];
  if (to === "edge") return points;
  points.push([UP_X, STOP_Y.fog, RISER_Z]);
  if (to === "fog") return points;
  points.push([UP_X, STOP_Y.cloud, RISER_Z]);
  return points;
}

function routeDown(from: ProcessAt): Vec3[] {
  const points: Vec3[] = [];
  if (from === "cloud") points.push([DOWN_X, STOP_Y.cloud, RISER_Z]);
  if (from !== "edge") points.push([DOWN_X, STOP_Y.fog, RISER_Z]);
  points.push([DOWN_X, STOP_Y.edge, RISER_Z], [CAR_TOP[0] + 0.2, CAR_TOP[1], CAR_TOP[2]]);
  return points;
}

/* ------------------------------------------------------------------ */
/* Models                                                              */
/* ------------------------------------------------------------------ */

const WHEELS: Vec3[] = [
  [-0.28, 0.1, 0.22],
  [0.28, 0.1, 0.22],
  [-0.28, 0.1, -0.22],
  [0.28, 0.1, -0.22],
];

/** A small toy car: a connected vehicle that must react in milliseconds. About 0.95 long. */
function Car(props: AssetProps) {
  const p = usePalette();
  return (
    <AssetFrame {...props} labelHeight={0.8}>
      <RoundedBox args={[0.95, 0.2, 0.46]} radius={0.06} smoothness={2} position={[0, 0.2, 0]}>
        <GlowMaterial color={p.copper} roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[0.5, 0.18, 0.4]} radius={0.05} smoothness={2} position={[-0.05, 0.37, 0]}>
        <GlowMaterial color={mixColor(p.silk, p.u2, 0.45)} roughness={0.3} />
      </RoundedBox>
      {WHEELS.map((w) => (
        <mesh key={w.join()} position={w} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.06, 14]} />
          <meshStandardMaterial color={p.casingDark} roughness={0.8} />
        </mesh>
      ))}
    </AssetFrame>
  );
}

interface SlabProps {
  tier: Tier;
  color: string;
  edge: string;
  onSelect?: (id: Tier) => void;
}

/** A see-through floor. Clicking it selects its tier. */
function Slab({ tier, color, edge, onSelect }: SlabProps) {
  const hovering = useRef(false);

  useEffect(
    () => () => {
      if (hovering.current) document.body.style.cursor = "";
    },
    [],
  );

  const handlers = onSelect
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (e.delta > 6) return;
          onSelect(tier);
        },
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          hovering.current = true;
          document.body.style.cursor = "pointer";
        },
        onPointerOut: () => {
          hovering.current = false;
          document.body.style.cursor = "";
        },
      }
    : undefined;

  return (
    <mesh position={[0, FLOOR_Y[tier] - 0.04, 0]} {...handlers}>
      <boxGeometry args={[SLAB_W, 0.08, SLAB_D]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.6}
        depthWrite={false}
        roughness={0.8}
      />
      <Edges color={edge} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

function Tiers({ active = null, onSelect, processAt }: TiersSceneProps) {
  const p = usePalette();
  const fit = useFitScale(7.2);

  const colors = useMemo(
    () => ({
      slab: mixColor(p.surface2, p.lineStrong, 0.45),
      used: mixColor(p.surface2, p.u2, 0.5),
      edge: p.lineStrong,
    }),
    [p],
  );

  const select = (id: Tier) => (onSelect ? () => onSelect(id) : undefined);
  const tierProps = (id: Tier): AssetProps => ({
    highlighted: active === id,
    onSelect: select(id),
  });

  const trip = TRIP[processAt];
  const leg = trip / 2;
  const period = trip + THINK + REST;
  const up = routeUp(processAt);
  const down = routeDown(processAt);

  return (
    <group position={[0, VIEW_Y * (1 - fit), 0]} scale={fit}>
      {/* Floors */}
      {TIERS.map((tier) => (
        <Slab
          key={tier}
          tier={tier}
          color={tier === processAt ? colors.used : colors.slab}
          edge={tier === processAt ? p.u2 : colors.edge}
          onSelect={onSelect}
        />
      ))}

      {/* Devices: a connected car and two sensor nodes */}
      <Car position={[-1.45, 0, 0.35]} rotation={[0, 0.25, 0]} {...tierProps("devices")} />
      <SensorNode position={[-0.2, 0, -0.25]} scale={0.8} {...tierProps("devices")} />
      <SensorNode position={[1.75, 0, -0.35]} scale={0.8} rotation={[0, -0.3, 0]} {...tierProps("devices")} />
      <Motor position={[2.55, 0, 0.25]} scale={0.5} rotation={[0, -0.5, 0]} {...tierProps("devices")} />

      {/* Edge: a gateway right next to the devices */}
      <Gateway position={[1.0, FLOOR_Y.edge, -0.1]} scale={0.95} {...tierProps("edge")} />

      {/* Fog: a local server */}
      <Rack position={[1.0, FLOOR_Y.fog, -0.15]} scale={0.42} {...tierProps("fog")} />

      {/* Cloud: a large data centre far away */}
      <CloudServer position={[1.0, FLOOR_Y.cloud, -0.2]} scale={0.62} {...tierProps("cloud")} />
      {CLOUD_RACKS.map((x) => (
        <Rack key={x} position={[x, FLOOR_Y.cloud, -0.35]} scale={0.5} {...tierProps("cloud")} />
      ))}

      {/* Tier names */}
      {TIERS.map((tier) => (
        <Label3D
          key={tier}
          position={[-2.75, FLOOR_Y[tier] + 0.22, 0.8]}
          tone={active === tier ? "accent" : "default"}
        >
          {active === tier ? <strong>{TIER_NAME[tier]}</strong> : TIER_NAME[tier]}
        </Label3D>
      ))}

      {/* Round-trip time at the chosen tier */}
      <Label3D position={[-1.45, FLOOR_Y[processAt] + 0.85, 0.8]} tone="u2">
        Round trip: {TIME_TEXT[processAt]}
      </Label3D>

      {/* The round trip: up on the left line, back down on the right */}
      {up.slice(0, -1).map((from, i) => (
        <Link3D key={`u${i}`} from={from} to={up[i + 1]} color={p.ink3} dashed animated />
      ))}
      {down.slice(0, -1).map((from, i) => (
        <Link3D key={`d${i}`} from={from} to={down[i + 1]} color={p.ink3} dashed animated />
      ))}
      <group key={processAt}>
        <PacketParticle path={up} duration={leg} repeatDelay={period - leg} size={0.11} />
        <PacketParticle
          path={down}
          duration={leg}
          delay={leg + THINK}
          repeatDelay={period - leg}
          color={p.copper}
          size={0.11}
        />
      </group>
    </group>
  );
}

/**
 * Topic 1.4: four tiers stacked like floors (devices, edge, fog, cloud). A
 * reading travels from a device up to the chosen tier and the answer comes
 * back down; the higher the tier, the longer the round trip.
 */
export default function TiersScene({ active = null, onSelect, processAt }: TiersSceneProps) {
  return (
    <Scene3D
      label={`Four tiers stacked like floors: devices at the bottom, then edge, fog and cloud at the top. Data from a car travels up to the ${TIER_NAME[processAt].toLowerCase()} tier and the answer comes back down. Round trip ${TIME_TEXT[processAt]}.`}
      height="clamp(400px, 105vw, 500px)"
      camera={{ position: [2.2, 7.0, 10.6], fov: 40, target: [0.2, VIEW_Y, 0] }}
    >
      <Tiers active={active} onSelect={onSelect} processAt={processAt} />
    </Scene3D>
  );
}
