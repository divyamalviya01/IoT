import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { usePalette } from "~/lib/palette";
import { AssetFrame, GlowMaterial, mixColor } from "./shared";
import type { AssetProps } from "./types";

/** A phone on a little stand, its screen showing a simple dashboard app. About 0.5 wide, 1.1 tall. */
export function Phone(props: AssetProps) {
  const p = usePalette();
  const colors = useMemo(
    () => ({
      card: mixColor(p.silk, p.u2, 0.3),
      card2: mixColor(p.silk, p.copper, 0.3),
    }),
    [p.silk, p.u2, p.copper],
  );
  const bars = [0.1, 0.17, 0.12, 0.22];

  return (
    <AssetFrame {...props} labelHeight={1.35}>
      {/* Stand */}
      <mesh position={[0, 0.02, -0.02]}>
        <boxGeometry args={[0.5, 0.04, 0.42]} />
        <meshStandardMaterial color={p.casing} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.07, 0.15]}>
        <boxGeometry args={[0.5, 0.06, 0.05]} />
        <meshStandardMaterial color={p.casing} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.3, -0.16]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[0.36, 0.5, 0.04]} />
        <meshStandardMaterial color={p.casing} roughness={0.6} />
      </mesh>

      {/* Phone, leaning back */}
      <group position={[0, 0.05, 0.08]} rotation={[-0.2, 0, 0]}>
        <RoundedBox args={[0.52, 1.0, 0.06]} radius={0.05} smoothness={3} position={[0, 0.5, 0]}>
          <GlowMaterial color={p.casingDark} roughness={0.35} />
        </RoundedBox>

        {/* Screen */}
        <group position={[0, 0.5, 0.031]}>
          <mesh>
            <boxGeometry args={[0.46, 0.9, 0.004]} />
            <meshStandardMaterial color={p.silk} emissive={p.silk} emissiveIntensity={0.25} roughness={0.3} />
          </mesh>
          {/* Top bar */}
          <mesh position={[0, 0.37, 0.003]}>
            <boxGeometry args={[0.4, 0.07, 0.002]} />
            <meshStandardMaterial color={p.brand} roughness={0.5} />
          </mesh>
          {/* Reading card */}
          <mesh position={[0, 0.19, 0.003]}>
            <boxGeometry args={[0.4, 0.2, 0.002]} />
            <meshStandardMaterial color={colors.card} roughness={0.5} />
          </mesh>
          <mesh position={[-0.08, 0.2, 0.005]}>
            <boxGeometry args={[0.18, 0.06, 0.002]} />
            <meshStandardMaterial color={p.u2} roughness={0.5} />
          </mesh>
          {/* Chart */}
          {bars.map((h, i) => (
            <mesh key={i} position={[-0.135 + i * 0.09, -0.16 + h / 2, 0.003]}>
              <boxGeometry args={[0.06, h, 0.002]} />
              <meshStandardMaterial color={i === 3 ? p.signal : p.brand} roughness={0.5} />
            </mesh>
          ))}
          {/* Bottom card */}
          <mesh position={[0, -0.3, 0.003]}>
            <boxGeometry args={[0.4, 0.12, 0.002]} />
            <meshStandardMaterial color={colors.card2} roughness={0.5} />
          </mesh>
        </group>
      </group>
    </AssetFrame>
  );
}
