import { usePalette } from "~/lib/palette";
import { AssetFrame, GlowMaterial, InstancedParts, Led, type PartInstance } from "./shared";
import type { AssetProps } from "./types";

const CORNERS: Array<[number, number]> = [
  [-0.6, -0.36],
  [0.6, -0.36],
  [-0.6, 0.36],
  [0.6, 0.36],
];

const STANDOFFS: PartInstance[] = CORNERS.map(([x, z]) => ({
  position: [x, 0.04, z],
  scale: [0.035, 0.08, 0.035],
}));

const HOLE_RINGS: PartInstance[] = CORNERS.map(([x, z]) => ({
  position: [x, 0.132, z],
  scale: [0.05, 0.006, 0.05],
}));

// Two rows of twelve header pins along the back edge.
const HEADER_PINS: PartInstance[] = [-0.4, -0.32].flatMap((z) =>
  Array.from({ length: 12 }, (_, i) => ({
    position: [-0.39 + i * 0.08, 0.215, z] as [number, number, number],
    scale: [0.025, 0.17, 0.025] as [number, number, number],
  })),
);

// A few copper traces between the chip, the USB port and the header.
const TRACES: PartInstance[] = [
  { position: [-0.36, 0.131, 0.15], scale: [0.42, 0.004, 0.02] },
  { position: [0.05, 0.131, -0.21], scale: [0.02, 0.004, 0.12] },
  { position: [0.15, 0.131, -0.21], scale: [0.02, 0.004, 0.12] },
  { position: [0.38, 0.131, 0.02], scale: [0.3, 0.004, 0.02] },
];

/** A microcontroller board: green PCB, main chip, header pins, USB port and LEDs. About 1.4 wide. */
export function Board(props: AssetProps) {
  const p = usePalette();
  return (
    <AssetFrame {...props} labelHeight={0.65}>
      <InstancedParts items={STANDOFFS} shape="cylinder" color={p.casing} metalness={0.3} />

      {/* PCB */}
      <mesh position={[0, 0.105, 0]}>
        <boxGeometry args={[1.4, 0.05, 0.9]} />
        <GlowMaterial color={p.pcb} roughness={0.6} />
      </mesh>
      <InstancedParts items={HOLE_RINGS} shape="cylinder" color={p.pcbTrace} metalness={0.4} />
      <InstancedParts items={TRACES} color={p.pcbTrace} metalness={0.3} roughness={0.5} />

      {/* Main chip with a pin-1 dot */}
      <mesh position={[0.05, 0.155, 0.02]}>
        <boxGeometry args={[0.34, 0.05, 0.34]} />
        <GlowMaterial color={p.casingDark} roughness={0.5} />
      </mesh>
      <mesh position={[-0.06, 0.181, -0.09]}>
        <cylinderGeometry args={[0.02, 0.02, 0.004, 10]} />
        <meshStandardMaterial color={p.silk} />
      </mesh>
      <mesh position={[-0.35, 0.15, 0.17]}>
        <boxGeometry args={[0.18, 0.04, 0.14]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.5} />
      </mesh>

      {/* Crystal */}
      <mesh position={[0.36, 0.16, 0.2]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.03, 0.1, 4, 8]} />
        <meshStandardMaterial color={p.casing} metalness={0.5} roughness={0.35} />
      </mesh>

      {/* Header */}
      <mesh position={[0.05, 0.17, -0.36]}>
        <boxGeometry args={[1.0, 0.08, 0.16]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.7} />
      </mesh>
      <InstancedParts items={HEADER_PINS} color={p.pcbTrace} metalness={0.5} roughness={0.35} />

      {/* USB port, sticking out of the left edge */}
      <mesh position={[-0.66, 0.18, 0.15]}>
        <boxGeometry args={[0.24, 0.1, 0.22]} />
        <meshStandardMaterial color={p.casing} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[-0.785, 0.18, 0.15]}>
        <boxGeometry args={[0.012, 0.045, 0.15]} />
        <meshStandardMaterial color={p.casingDark} />
      </mesh>

      {/* Power and status LEDs */}
      <Led position={[0.48, 0.14, 0.33]} color={p.bad} size={0.022} blink={false} />
      <Led position={[0.56, 0.14, 0.33]} color={p.ok} size={0.022} period={1.2} />
    </AssetFrame>
  );
}
