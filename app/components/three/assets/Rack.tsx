import { usePalette } from "~/lib/palette";
import { AssetFrame, GlowMaterial, InstancedParts, Led, type PartInstance } from "./shared";
import type { AssetProps } from "./types";

const UNIT_Y = Array.from({ length: 8 }, (_, i) => 0.24 + i * 0.21);

const UNIT_FACES: PartInstance[] = UNIT_Y.map((y) => ({
  position: [0, y, 0.355],
  scale: [0.68, 0.17, 0.02],
}));

const UNIT_VENTS: PartInstance[] = UNIT_Y.map((y) => ({
  position: [-0.1, y, 0.367],
  scale: [0.36, 0.05, 0.006],
}));

/** A server rack with eight stacked units, each with a status light. About 0.8 wide and 2 tall. */
export function Rack(props: AssetProps) {
  const p = usePalette();
  return (
    <AssetFrame {...props} labelHeight={2.3}>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[0.84, 0.06, 0.74]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.01, 0]}>
        <boxGeometry args={[0.8, 1.9, 0.7]} />
        <GlowMaterial color={p.casingDark} roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.985, 0]}>
        <boxGeometry args={[0.84, 0.05, 0.74]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.8} />
      </mesh>

      <InstancedParts items={UNIT_FACES} color={p.casing} roughness={0.55} />
      <InstancedParts items={UNIT_VENTS} color={p.casingDark} roughness={0.7} />
      {UNIT_Y.map((y, i) => (
        <Led
          key={y}
          position={[0.26, y, 0.37]}
          color={i % 3 === 1 ? p.signal : p.ok}
          size={0.022}
          period={1.3 + (i % 4) * 0.4}
          phase={(i * 0.37) % 1}
        />
      ))}
    </AssetFrame>
  );
}
