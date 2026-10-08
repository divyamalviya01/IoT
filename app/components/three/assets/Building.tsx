import { useMemo } from "react";
import { usePalette } from "~/lib/palette";
import { AssetFrame, GlowMaterial, Led, mixColor } from "./shared";
import type { AssetProps } from "./types";

const FLOORS = [0.6, 0.95, 1.3, 1.65, 2.0, 2.35];

/** An office tower with bands of windows and a rooftop mast. About 1.1 wide and 3 tall. */
export function Building(props: AssetProps) {
  const p = usePalette();
  const glass = useMemo(() => mixColor(p.silk, p.u2, 0.5), [p.silk, p.u2]);

  return (
    <AssetFrame {...props} labelHeight={3.45}>
      {/* Lobby */}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[1.04, 0.32, 1.04]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.13, 0.521]}>
        <boxGeometry args={[0.3, 0.24, 0.02]} />
        <meshStandardMaterial color={glass} roughness={0.25} />
      </mesh>

      {/* Tower */}
      <mesh position={[0, 1.47, 0]}>
        <boxGeometry args={[1.0, 2.3, 1.0]} />
        <GlowMaterial color={p.casing} roughness={0.7} />
      </mesh>
      {/* Window bands wrap all four sides in one box each */}
      {FLOORS.map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[1.02, 0.17, 1.02]} />
          <meshStandardMaterial color={glass} roughness={0.25} />
        </mesh>
      ))}

      {/* Roof */}
      <mesh position={[0, 2.66, 0]}>
        <boxGeometry args={[1.08, 0.08, 1.08]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.7} />
      </mesh>
      <mesh position={[0.2, 2.8, -0.15]}>
        <boxGeometry args={[0.4, 0.2, 0.3]} />
        <meshStandardMaterial color={p.casing} roughness={0.7} />
      </mesh>
      <mesh position={[-0.25, 2.95, 0.2]}>
        <cylinderGeometry args={[0.018, 0.024, 0.5, 6]} />
        <meshStandardMaterial color={p.casingDark} />
      </mesh>
      <Led position={[-0.25, 3.21, 0.2]} color={p.bad} size={0.035} period={2} />
    </AssetFrame>
  );
}
