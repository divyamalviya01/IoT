import type { ReactNode } from "react";
import { Edges } from "@react-three/drei";
import { BoxGeometry, CylinderGeometry } from "three";
import { usePalette } from "~/lib/palette";
import { AssetFrame, GlowMaterial, type PartInstance, type Vec3 } from "~/components/three";

/*
 * Small helpers for building circuit boards in millimetres. Board space:
 * x runs left to right, y runs from the near edge to the far edge, z is up
 * from the board's top surface. Everything is shrunk by S into scene units.
 */

/** Scene units per millimetre. */
export const S = 0.06;
/** Thickness of a PCB, slightly exaggerated so it reads from above. */
export const PCB_T = 1.8;

const unitBox = new BoxGeometry(1, 1, 1);
const unitCylinder = new CylinderGeometry(1, 1, 1, 16);

/** Millimetre board point to a scene point (z measured from the board's top). */
export function boardPoint(width: number, depth: number, x: number, y: number, z = 0): Vec3 {
  return [(x - width / 2) * S, (z + PCB_T) * S, (depth / 2 - y) * S];
}

/** Instances for a row (or grid) of header pins, in a part's local millimetres. */
export function pinGrid(
  cols: number,
  rows: number,
  pitch: number,
  z: number,
  height: number,
  width = 0.9,
): PartInstance[] {
  const items: PartInstance[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * pitch;
      const y = (r - (rows - 1) / 2) * pitch;
      items.push({
        position: [x * S, (z + height / 2) * S, -y * S],
        scale: [width * S, height * S, width * S],
      });
    }
  }
  return items;
}

interface MaterialProps {
  color: string;
  /** Use the highlight glow material (for the part's key surfaces). */
  glow?: boolean;
  metal?: boolean;
  roughness?: number;
}

function Material({ color, glow, metal, roughness }: MaterialProps) {
  const r = roughness ?? (metal ? 0.35 : 0.6);
  const m = metal ? 0.55 : 0;
  return glow ? (
    <GlowMaterial color={color} roughness={r} metalness={m} />
  ) : (
    <meshStandardMaterial color={color} roughness={r} metalness={m} />
  );
}

export interface MBoxProps extends MaterialProps {
  /** Centre of the bottom face, in local millimetres [x, y, z]. */
  at?: [number, number, number];
  /** [width along x, depth along y, height] in millimetres. */
  size: [number, number, number];
}

/** A box measured in millimetres, sitting on `at`. */
export function MBox({ at = [0, 0, 0], size, ...material }: MBoxProps) {
  const [x, y, z] = at;
  const [w, d, h] = size;
  return (
    <mesh geometry={unitBox} position={[x * S, (z + h / 2) * S, -y * S]} scale={[w * S, h * S, d * S]}>
      <Material {...material} />
    </mesh>
  );
}

export interface MCylProps extends MaterialProps {
  at?: [number, number, number];
  radius: number;
  height: number;
  /** "up" stands on the board; "x" and "y" lie along those board axes. */
  axis?: "up" | "x" | "y";
}

/** A cylinder measured in millimetres. `at` is its centre for lying cylinders, its base when upright. */
export function MCyl({ at = [0, 0, 0], radius, height, axis = "up", ...material }: MCylProps) {
  const [x, y, z] = at;
  const rotation: Vec3 = axis === "x" ? [0, 0, Math.PI / 2] : axis === "y" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  const cy = axis === "up" ? z + height / 2 : z;
  return (
    <mesh
      geometry={unitCylinder}
      position={[x * S, cy * S, -y * S]}
      rotation={rotation}
      scale={[radius * S, height * S, radius * S]}
    >
      <Material {...material} />
    </mesh>
  );
}

export interface BoardPartProps {
  /** Part centre on the board, in millimetres [x, y]. */
  at: [number, number];
  /** Board size, for converting to scene space. */
  board: [number, number];
  /** Footprint and height for the selection outline: [width, depth, height] in mm (z from `haloZ`). */
  halo: [number, number, number];
  haloZ?: number;
  /** Shift of the outline's centre from `at`, in mm. */
  haloOffset?: [number, number];
  selected: boolean;
  accent: string;
  onSelect?: () => void;
  children: ReactNode;
}

/**
 * One clickable part of a board: glows and grows a little when selected, and
 * shows a see-through outline box around its footprint.
 */
export function BoardPart({
  at,
  board,
  halo,
  haloZ = 0,
  haloOffset = [0, 0],
  selected,
  accent,
  onSelect,
  children,
}: BoardPartProps) {
  const [w, d, h] = halo;
  const margin = 1.6;
  return (
    <AssetFrame
      position={boardPoint(board[0], board[1], at[0], at[1])}
      highlighted={selected}
      accent={accent}
      onSelect={onSelect}
      labelHeight={0}
    >
      {children}
      {selected && (
        <mesh
          geometry={unitBox}
          position={[haloOffset[0] * S, (haloZ + h / 2) * S, -haloOffset[1] * S]}
          scale={[(w + margin * 2) * S, (h + margin) * S, (d + margin * 2) * S]}
          raycast={() => null}
        >
          <meshBasicMaterial color={accent} transparent opacity={0.16} depthWrite={false} />
          <Edges color={accent} />
        </mesh>
      )}
    </AssetFrame>
  );
}

/** Board-wide colours shared by both models. */
export function useBoardColors() {
  const p = usePalette();
  return {
    p,
    metal: p.casing,
    dark: p.casingDark,
    gold: p.pcbTrace,
    silk: p.silk,
    accent: p.u1,
  };
}
