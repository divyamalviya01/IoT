import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { usePalette } from "~/lib/palette";
import { useSceneMotion } from "../Scene3D";
import { AssetFrame, GlowMaterial, InstancedParts, Led, mixColor, type PartInstance } from "./shared";
import type { AssetProps } from "./types";

const AXIS_Y = 0.62;
const FIN_RADIUS = 0.38;

// Cooling fins running along the body, all the way round.
const FINS: PartInstance[] = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  return {
    position: [0, AXIS_Y + Math.cos(angle) * FIN_RADIUS, Math.sin(angle) * FIN_RADIUS],
    scale: [0.8, 0.07, 0.035],
    rotation: [angle, 0, 0],
  };
});

/** An industrial electric motor on a base: finned body, fan cover, terminal box and a turning shaft. About 1.3 long. */
export function Motor(props: AssetProps) {
  const p = usePalette();
  const { paused } = useSceneMotion();
  const shaftRef = useRef<Group>(null);
  const colors = useMemo(
    () => ({
      body: mixColor(p.casing, p.u2, 0.3),
      fins: mixColor(p.casing, p.casingDark, 0.35),
    }),
    [p.casing, p.u2, p.casingDark],
  );

  useFrame((_, delta) => {
    if (paused || !shaftRef.current) return;
    shaftRef.current.rotation.x += Math.min(delta, 0.1) * 4;
  });

  return (
    <AssetFrame {...props} labelHeight={1.5}>
      {/* Base and supports */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[1.0, 0.08, 0.7]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.8} />
      </mesh>
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.2, 0]}>
          <boxGeometry args={[0.14, 0.24, 0.56]} />
          <meshStandardMaterial color={colors.fins} roughness={0.7} />
        </mesh>
      ))}

      {/* Body, axis along x */}
      <mesh position={[0, AXIS_Y, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.36, 0.36, 0.9, 20]} />
        <GlowMaterial color={colors.body} roughness={0.5} metalness={0.15} />
      </mesh>
      <InstancedParts items={FINS} color={colors.fins} roughness={0.6} />

      {/* Front flange and fan cover */}
      <mesh position={[0.48, AXIS_Y, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.4, 0.4, 0.06, 20]} />
        <GlowMaterial color={colors.body} roughness={0.5} />
      </mesh>
      <mesh position={[-0.55, AXIS_Y, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.37, 0.33, 0.2, 20]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.6} />
      </mesh>

      {/* Terminal box with a status light */}
      <mesh position={[0, AXIS_Y + 0.47, 0]}>
        <boxGeometry args={[0.32, 0.16, 0.28]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.6} />
      </mesh>
      <Led position={[0.1, AXIS_Y + 0.47, 0.145]} color={p.ok} size={0.025} period={1.6} />

      {/* Shaft with a key and coupling disc, so you can see it turn */}
      <group ref={shaftRef} position={[0.51, AXIS_Y, 0]}>
        <mesh position={[0.16, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.32, 12]} />
          <meshStandardMaterial color={p.casing} metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.13, 0.13, 0.06, 16]} />
          <meshStandardMaterial color={p.casing} metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh position={[0.3, 0.15, 0]}>
          <boxGeometry args={[0.07, 0.05, 0.05]} />
          <meshStandardMaterial color={p.copper} roughness={0.5} />
        </mesh>
      </group>
    </AssetFrame>
  );
}
