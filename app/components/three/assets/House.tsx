import { useMemo } from "react";
import { usePalette } from "~/lib/palette";
import { AssetFrame, GlowMaterial, mixColor } from "./shared";
import type { AssetProps } from "./types";

/** A small house: walls, pitched roof, door, windows and a chimney. About 1.8 wide and 2 tall. */
export function House(props: AssetProps) {
  const p = usePalette();
  const glass = useMemo(() => mixColor(p.silk, p.u2, 0.45), [p.silk, p.u2]);

  return (
    <AssetFrame {...props} labelHeight={2.3}>
      {/* Foundation and walls */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[1.75, 0.08, 1.45]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <boxGeometry args={[1.6, 1.0, 1.3]} />
        <GlowMaterial color={p.casing} roughness={0.8} />
      </mesh>

      {/* Pitched roof: a triangular prism with the ridge running front to back */}
      <mesh position={[0, 1.366, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 0.55]}>
        <cylinderGeometry args={[1.04, 1.04, 1.5, 3]} />
        <GlowMaterial color={p.copper} roughness={0.7} flatShading />
      </mesh>
      <mesh position={[0.45, 1.58, -0.25]}>
        <boxGeometry args={[0.18, 0.42, 0.18]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.8} />
      </mesh>

      {/* Door */}
      <mesh position={[0, 0.36, 0.66]}>
        <boxGeometry args={[0.32, 0.56, 0.04]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.6} />
      </mesh>
      <mesh position={[0.1, 0.36, 0.69]}>
        <sphereGeometry args={[0.025, 8, 6]} />
        <meshStandardMaterial color={p.copper} roughness={0.4} />
      </mesh>

      {/* Windows */}
      {[-0.52, 0.52].map((x) => (
        <mesh key={x} position={[x, 0.68, 0.66]}>
          <boxGeometry args={[0.3, 0.3, 0.04]} />
          <meshStandardMaterial color={glass} roughness={0.25} />
        </mesh>
      ))}
      {[-0.81, 0.81].map((x) => (
        <mesh key={x} position={[x, 0.68, 0]}>
          <boxGeometry args={[0.04, 0.3, 0.36]} />
          <meshStandardMaterial color={glass} roughness={0.25} />
        </mesh>
      ))}
    </AssetFrame>
  );
}
