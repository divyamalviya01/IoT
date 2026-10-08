import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import type { Group } from "three";
import { usePalette } from "~/lib/palette";
import { useSceneMotion } from "../Scene3D";
import type { Vec3 } from "../types";
import { AssetFrame, GlowMaterial, Led, mixColor } from "./shared";
import type { AssetProps } from "./types";

const CLOUD_PUFFS: Array<{ position: Vec3; radius: number }> = [
  { position: [0, 0.08, 0], radius: 0.42 },
  { position: [-0.44, -0.04, 0.02], radius: 0.3 },
  { position: [0.44, -0.03, 0], radius: 0.33 },
  { position: [-0.2, 0.22, -0.06], radius: 0.3 },
  { position: [0.22, 0.24, -0.04], radius: 0.28 },
];

/** A server block with a puffy cloud floating above it. About 1.5 wide and 2.3 tall. */
export function CloudServer(props: AssetProps) {
  const p = usePalette();
  const { paused } = useSceneMotion();
  const cloudRef = useRef<Group>(null);
  const time = useRef(0);
  const cloudColor = useMemo(() => mixColor(p.silk, p.u2, 0.3), [p.silk, p.u2]);

  useFrame((_, delta) => {
    const cloud = cloudRef.current;
    if (!cloud || paused) return;
    time.current += Math.min(delta, 0.1);
    cloud.position.y = 1.78 + Math.sin(time.current * 1.3) * 0.05;
  });

  return (
    <AssetFrame {...props} labelHeight={2.55}>
      {/* Server */}
      <RoundedBox args={[0.8, 0.95, 0.65]} radius={0.05} smoothness={3} position={[0, 0.475, 0]}>
        <GlowMaterial color={p.casingDark} roughness={0.55} />
      </RoundedBox>
      {[0.25, 0.48, 0.71].map((y, i) => (
        <group key={y}>
          <mesh position={[-0.04, y, 0.326]}>
            <boxGeometry args={[0.56, 0.13, 0.01]} />
            <meshStandardMaterial color={p.casing} roughness={0.6} />
          </mesh>
          <Led
            position={[0.29, y, 0.33]}
            color={i === 1 ? p.signal : p.ok}
            size={0.025}
            period={1.4 + i * 0.4}
            phase={i * 0.3}
          />
        </group>
      ))}

      {/* Data rising to the cloud */}
      {[1.08, 1.2, 1.32].map((y, i) => (
        <Led key={y} position={[0, y, 0]} color={p.signal} size={0.035} period={1.2} phase={1 - i * 0.25} />
      ))}

      {/* Cloud */}
      <group ref={cloudRef} position={[0, 1.78, 0]}>
        <group scale={[1, 0.9, 0.85]}>
          {CLOUD_PUFFS.map((puff, i) => (
            <mesh key={i} position={puff.position}>
              <sphereGeometry args={[puff.radius, 18, 12]} />
              <GlowMaterial color={cloudColor} roughness={0.85} />
            </mesh>
          ))}
          <mesh position={[0, -0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.24, 0.9, 6, 18]} />
            <GlowMaterial color={cloudColor} roughness={0.85} />
          </mesh>
        </group>
      </group>
    </AssetFrame>
  );
}
