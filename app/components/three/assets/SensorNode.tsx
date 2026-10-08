import { RoundedBox } from "@react-three/drei";
import { usePalette } from "~/lib/palette";
import { AssetFrame, GlowMaterial, Led } from "./shared";
import type { AssetProps } from "./types";

/** A small sensor box on a stand, with a dome sensor, an antenna and a status LED. About 0.6 wide. */
export function SensorNode(props: AssetProps) {
  const p = usePalette();
  return (
    <AssetFrame {...props} labelHeight={1.3}>
      {/* Stand */}
      <mesh position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.2, 0.24, 0.05, 20]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.36, 10]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.6} />
      </mesh>

      {/* Body */}
      <RoundedBox args={[0.6, 0.34, 0.4]} radius={0.06} smoothness={3} position={[0, 0.55, 0]}>
        <GlowMaterial color={p.casing} />
      </RoundedBox>
      <mesh position={[-0.08, 0.55, 0.201]}>
        <boxGeometry args={[0.26, 0.16, 0.01]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.5} />
      </mesh>
      <Led position={[0.19, 0.6, 0.2]} color={p.ok} size={0.032} period={1.8} />

      {/* Dome sensor */}
      <mesh position={[-0.06, 0.72, 0]}>
        <sphereGeometry args={[0.13, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <GlowMaterial color={p.silk} roughness={0.3} />
      </mesh>

      {/* Antenna */}
      <mesh position={[0.21, 0.9, -0.08]}>
        <cylinderGeometry args={[0.012, 0.016, 0.36, 6]} />
        <meshStandardMaterial color={p.casingDark} />
      </mesh>
      <mesh position={[0.21, 1.08, -0.08]}>
        <sphereGeometry args={[0.035, 10, 8]} />
        <meshStandardMaterial color={p.copper} roughness={0.4} />
      </mesh>
    </AssetFrame>
  );
}
