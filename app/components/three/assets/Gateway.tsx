import { RoundedBox } from "@react-three/drei";
import { usePalette } from "~/lib/palette";
import { AssetFrame, GlowMaterial, Led } from "./shared";
import type { AssetProps } from "./types";

/** A flat gateway box with two antennas and a row of status LEDs. About 1.2 wide. */
export function Gateway(props: AssetProps) {
  const p = usePalette();
  const ledColors = [p.ok, p.signal, p.signal, p.warn];
  return (
    <AssetFrame {...props} labelHeight={1.2}>
      {/* Rubber feet */}
      {[-0.24, 0.24].map((z) => (
        <mesh key={z} position={[0, 0.015, z]}>
          <boxGeometry args={[1.0, 0.03, 0.08]} />
          <meshStandardMaterial color={p.casingDark} roughness={0.9} />
        </mesh>
      ))}

      {/* Body */}
      <RoundedBox args={[1.2, 0.26, 0.7]} radius={0.07} smoothness={3} position={[0, 0.16, 0]}>
        <GlowMaterial color={p.casing} />
      </RoundedBox>
      <mesh position={[0, 0.291, 0.22]}>
        <boxGeometry args={[1.0, 0.006, 0.07]} />
        <meshStandardMaterial color={p.brand} roughness={0.5} />
      </mesh>

      {/* LED panel */}
      <mesh position={[0, 0.16, 0.351]}>
        <boxGeometry args={[0.96, 0.1, 0.01]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.5} />
      </mesh>
      {ledColors.map((color, i) => (
        <Led
          key={i}
          position={[-0.33 + i * 0.16, 0.16, 0.36]}
          color={color}
          size={0.025}
          period={1.6 + i * 0.35}
          phase={i * 0.27}
        />
      ))}

      {/* Antennas, leaning slightly outwards */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.48, 0.3, -0.26]} rotation={[0, 0, -side * 0.14]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.045, 0.045, 0.09, 12]} />
            <meshStandardMaterial color={p.casingDark} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.024, 0.034, 0.6, 10]} />
            <GlowMaterial color={p.casingDark} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </AssetFrame>
  );
}
