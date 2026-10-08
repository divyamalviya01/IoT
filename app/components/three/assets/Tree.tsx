import { useMemo } from "react";
import { usePalette } from "~/lib/palette";
import { AssetFrame, GlowMaterial, mixColor } from "./shared";
import type { AssetProps } from "./types";

/** A low-poly pine tree. About 1.1 wide and 1.7 tall. */
export function Tree(props: AssetProps) {
  const p = usePalette();
  const bark = useMemo(() => mixColor(p.copper, p.casingDark, 0.4), [p.copper, p.casingDark]);

  return (
    <AssetFrame {...props} labelHeight={2}>
      <mesh position={[0, 0.275, 0]}>
        <cylinderGeometry args={[0.07, 0.1, 0.55, 8]} />
        <meshStandardMaterial color={bark} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <coneGeometry args={[0.55, 0.9, 8]} />
        <GlowMaterial color={p.ok} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 1.38, 0]}>
        <coneGeometry args={[0.4, 0.7, 8]} />
        <GlowMaterial color={p.ok} roughness={0.85} flatShading />
      </mesh>
    </AssetFrame>
  );
}
