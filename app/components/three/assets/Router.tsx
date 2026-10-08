import { RoundedBox } from "@react-three/drei";
import { usePalette } from "~/lib/palette";
import { AssetFrame, GlowMaterial, Led } from "./shared";
import type { AssetProps } from "./types";

/** A dark Wi-Fi router with three paddle antennas and a row of lights. About 0.9 wide. */
export function Router(props: AssetProps) {
  const p = usePalette();
  return (
    <AssetFrame {...props} labelHeight={1.05}>
      {/* Feet */}
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.015, 0]}>
          <boxGeometry args={[0.12, 0.03, 0.45]} />
          <meshStandardMaterial color={p.casingDark} roughness={0.9} />
        </mesh>
      ))}

      {/* Body */}
      <RoundedBox args={[0.9, 0.16, 0.55]} radius={0.05} smoothness={3} position={[0, 0.11, 0]}>
        <GlowMaterial color={p.casingDark} roughness={0.4} />
      </RoundedBox>
      <mesh position={[0, 0.191, 0.08]}>
        <boxGeometry args={[0.7, 0.004, 0.012]} />
        <meshStandardMaterial color={p.lineStrong} roughness={0.5} />
      </mesh>

      {/* Lights */}
      {[0, 1, 2, 3, 4].map((i) => (
        <Led
          key={i}
          position={[-0.24 + i * 0.12, 0.11, 0.276]}
          color={i === 0 ? p.ok : p.signal}
          size={0.018}
          period={1 + i * 0.3}
          phase={i * 0.2}
          blink={i !== 0}
        />
      ))}

      {/* Antennas */}
      {[-1, 0, 1].map((side) => (
        <group key={side} position={[side * 0.32, 0.17, -0.24]} rotation={[0, 0, -side * 0.18]}>
          <RoundedBox args={[0.075, 0.52, 0.03]} radius={0.012} smoothness={2} position={[0, 0.27, 0]}>
            <GlowMaterial color={p.casingDark} roughness={0.5} />
          </RoundedBox>
        </group>
      ))}
    </AssetFrame>
  );
}
