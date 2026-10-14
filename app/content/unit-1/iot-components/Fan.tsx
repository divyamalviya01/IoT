import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, MeshStandardMaterial } from "three";
import { usePalette } from "~/lib/palette";
import { AssetFrame, GlowMaterial, useSceneMotion, type AssetProps } from "~/components/three";

/** Longest step in one frame, matching the kit's effects so timings stay in sync. */
const MAX_STEP = 0.1;
const BLADES = [0, 1, 2];
const TOP_SPEED = 13;

export interface FanProps extends AssetProps {
  /** Seconds in one full cycle of the scene's story. */
  cycle: number;
  /** Seconds into each cycle when the fan switches on and off. */
  onAt: number;
  offAt: number;
}

/**
 * A pedestal fan: base, pole, motor and three blades inside a guard. It spins
 * between `onAt` and `offAt` in every cycle, and holds still when the scene is
 * paused. About 0.8 wide and 1.35 tall, facing +z.
 */
export function Fan({ cycle, onAt, offAt, ...props }: FanProps) {
  const p = usePalette();
  const { paused } = useSceneMotion();
  const rotorRef = useRef<Group>(null);
  const lightRef = useRef<MeshStandardMaterial>(null);
  const time = useRef(0);
  const speed = useRef(0);

  useFrame((_, delta) => {
    if (paused) return;
    const step = Math.min(delta, MAX_STEP);
    time.current += step;
    const phase = time.current % cycle;
    const on = phase >= onAt && phase < offAt;

    // Spin up quickly, coast down slowly.
    const target = on ? TOP_SPEED : 0;
    const rate = on ? 2.4 : 1.1;
    speed.current += (target - speed.current) * (1 - Math.exp(-step * rate));
    if (speed.current < 0.02 && !on) speed.current = 0;
    if (rotorRef.current) rotorRef.current.rotation.z -= speed.current * step;
    if (lightRef.current) lightRef.current.emissiveIntensity = on ? 1.1 : 0.05;
  });

  return (
    <AssetFrame {...props} labelHeight={1.5}>
      {/* Base and pole */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.22, 0.26, 0.06, 20]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.84, 8]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.5} />
      </mesh>
      {/* Status light: bright while the fan is on */}
      <mesh position={[0, 0.065, 0.2]}>
        <sphereGeometry args={[0.028, 10, 8]} />
        <meshStandardMaterial
          ref={lightRef}
          color={p.ok}
          emissive={p.ok}
          emissiveIntensity={0.05}
          roughness={0.3}
        />
      </mesh>

      {/* Head, tilted slightly down */}
      <group position={[0, 0.96, 0]} rotation={[-0.12, 0, 0]}>
        <mesh position={[0, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.085, 0.1, 0.18, 14]} />
          <GlowMaterial color={p.casing} roughness={0.5} />
        </mesh>

        <group ref={rotorRef} position={[0, 0, 0.03]}>
          <mesh>
            <sphereGeometry args={[0.06, 12, 8]} />
            <GlowMaterial color={p.casingDark} roughness={0.4} />
          </mesh>
          {BLADES.map((i) => (
            <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]}>
              <mesh position={[0, 0.19, 0]} rotation={[0, 0.4, 0]}>
                <boxGeometry args={[0.12, 0.28, 0.012]} />
                <GlowMaterial color={p.casing} roughness={0.45} />
              </mesh>
            </group>
          ))}
        </group>

        {/* Guard: a ring at the front and one at the back */}
        {[0.1, -0.04].map((z) => (
          <mesh key={z} position={[0, 0, z]}>
            <torusGeometry args={[0.37, 0.012, 6, 28]} />
            <meshStandardMaterial color={p.ink3} roughness={0.5} />
          </mesh>
        ))}
      </group>
    </AssetFrame>
  );
}
