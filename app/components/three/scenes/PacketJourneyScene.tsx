import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import type { Group } from "three";
import { usePalette } from "~/lib/palette";
import { Scene3D, useFitScale, useSceneMotion } from "../Scene3D";
import { Link3D, PacketParticle, SignalRings } from "../effects";
import {
  AssetFrame,
  CloudServer,
  Gateway,
  GlowMaterial,
  House,
  Phone,
  Router,
  SensorNode,
  Tree,
  mixColor,
  type AssetProps,
} from "../assets";
import type { Vec3 } from "../types";

export type JourneyStop = "sensor" | "gateway" | "internet" | "cloud" | "app";

export interface PacketJourneySceneProps {
  activeStop?: JourneyStop | null;
  onSelectStop?: (id: JourneyStop) => void;
}

const STOP_ORDER: JourneyStop[] = ["sensor", "gateway", "internet", "cloud", "app"];

interface StopSpec {
  label: string;
  position: Vec3;
  rotation?: Vec3;
  scale?: number;
  /** Where packets arrive and leave. */
  anchor: Vec3;
}

const STOPS: Record<JourneyStop, StopSpec> = {
  sensor: {
    label: "Sensor",
    position: [-3.0, 0, 1.0],
    rotation: [0, 0.25, 0],
    scale: 1.35,
    anchor: [-3.0, 1.05, 1.0],
  },
  gateway: { label: "Gateway", position: [-1.4, 0, -0.6], rotation: [0, 0.2, 0], anchor: [-1.4, 0.42, -0.6] },
  internet: { label: "Internet", position: [0.6, 0, 0.5], anchor: [0.6, 1.4, 0.5] },
  cloud: { label: "Cloud", position: [2.6, 0, -0.8], anchor: [2.6, 1.75, -0.8] },
  app: { label: "Phone app", position: [4.4, 0, 0.7], rotation: [0, -0.35, 0], anchor: [4.4, 0.9, 0.75] },
};

/** Arch height of each hop: sensor to gateway, gateway to internet, internet to cloud, cloud to phone. */
const ARCS = [0.5, 0.8, 0.6, 0.6];
/** Seconds per hop, and the pause before the journey starts again. */
const HOP = 1.4;
const REST = 0.9;
const JOURNEY = HOP * (STOP_ORDER.length - 1) + REST;

/* ------------------------------------------------------------------ */
/* The "Internet" stop: a router with a globe above it                 */
/* ------------------------------------------------------------------ */

const LATITUDE_Y = 0.22;
const GLOBE_R = 0.43;
const LATITUDE_R = Math.sqrt(GLOBE_R * GLOBE_R - LATITUDE_Y * LATITUDE_Y);

function Globe({ position }: { position: Vec3 }) {
  const p = usePalette();
  const { paused } = useSceneMotion();
  const spinRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!paused && spinRef.current) spinRef.current.rotation.y += Math.min(delta, 0.1) * 0.6;
  });

  return (
    <group position={position} rotation={[0, 0, 0.35]}>
      <group ref={spinRef}>
        <mesh>
          <sphereGeometry args={[0.42, 20, 14]} />
          <GlowMaterial color={p.u2} roughness={0.5} />
        </mesh>
        {/* Equator and two lines of latitude */}
        {[0, LATITUDE_Y, -LATITUDE_Y].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[y === 0 ? GLOBE_R : LATITUDE_R, 0.014, 6, 24]} />
            <meshStandardMaterial color={p.silk} roughness={0.5} />
          </mesh>
        ))}
        {/* Two meridians */}
        {[0, Math.PI / 2].map((angle) => (
          <mesh key={angle} rotation={[0, angle, 0]}>
            <torusGeometry args={[GLOBE_R, 0.014, 6, 24]} />
            <meshStandardMaterial color={p.silk} roughness={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function InternetStop(props: AssetProps) {
  return (
    <AssetFrame {...props} labelHeight={2.1}>
      <Router />
      <Globe position={[0, 1.4, 0]} />
    </AssetFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

function Journey({ activeStop = null, onSelectStop }: PacketJourneySceneProps) {
  const p = usePalette();
  // A little wider than the ground so the near corners stay in view.
  const fit = useFitScale(13.5);
  const colors = useMemo(
    () => ({
      ground: mixColor(p.surface2, p.lineStrong, 0.35),
      yard: mixColor(p.ok, p.surface2, 0.7),
    }),
    [p],
  );

  const stopProps = (id: JourneyStop): AssetProps => ({
    position: STOPS[id].position,
    rotation: STOPS[id].rotation,
    scale: STOPS[id].scale,
    label: STOPS[id].label,
    highlighted: activeStop === id,
    onSelect: onSelectStop ? () => onSelectStop(id) : undefined,
  });

  return (
    <group scale={fit}>
      {/* Ground and the home's yard */}
      <RoundedBox args={[11.8, 0.14, 5.4]} radius={0.06} smoothness={2} position={[0, -0.07, 0]}>
        <meshStandardMaterial color={colors.ground} roughness={0.9} />
      </RoundedBox>
      <mesh position={[-3.95, 0.012, -0.2]}>
        <boxGeometry args={[3.3, 0.024, 4.4]} />
        <meshStandardMaterial color={colors.yard} roughness={0.95} />
      </mesh>

      {/* Scenery */}
      <House position={[-4.4, 0, -0.9]} rotation={[0, 0.35, 0]} scale={0.85} />
      <Tree position={[-5.3, 0, 1.5]} scale={0.6} />
      <Tree position={[-2.5, 0, -1.9]} scale={0.5} />
      <Tree position={[5.4, 0, -1.7]} scale={0.55} />

      {/* The five stops */}
      <SensorNode {...stopProps("sensor")} />
      <SignalRings position={[-3.0, 1.0, 1.0]} maxRadius={1.1} period={1.8} />
      <Gateway {...stopProps("gateway")} />
      <InternetStop {...stopProps("internet")} />
      <CloudServer {...stopProps("cloud")} />
      <Phone {...stopProps("app")} />

      {/* Links and one packet making the whole journey, hop by hop */}
      {STOP_ORDER.slice(0, -1).map((id, i) => {
        const from = STOPS[id].anchor;
        const to = STOPS[STOP_ORDER[i + 1]].anchor;
        return (
          <group key={id}>
            <Link3D from={from} to={to} arc={ARCS[i]} dashed animated />
            <PacketParticle
              from={from}
              to={to}
              arc={ARCS[i]}
              duration={HOP}
              delay={i * HOP}
              repeatDelay={JOURNEY - HOP}
            />
          </group>
        );
      })}
    </group>
  );
}

/**
 * Getting started demo: a small diorama of a reading's trip from a sensor,
 * through a gateway, the internet and the cloud, to a phone app.
 */
export default function PacketJourneyScene({ activeStop = null, onSelectStop }: PacketJourneySceneProps) {
  return (
    <Scene3D
      label="A data packet travelling from a sensor to a phone app"
      height={420}
      camera={{ position: [0.5, 4.9, 8.4], fov: 40, target: [0.2, 0.6, 0] }}
    >
      <Journey activeStop={activeStop} onSelectStop={onSelectStop} />
    </Scene3D>
  );
}
