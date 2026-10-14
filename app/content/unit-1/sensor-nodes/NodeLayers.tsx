import { useMemo } from "react";
import { usePalette } from "~/lib/palette";
import {
  AssetFrame,
  GlowMaterial,
  InstancedParts,
  Led,
  mixColor,
  type AssetProps,
  type PartInstance,
  type Vec3,
} from "~/components/three";

/*
 * The four layers of the exploded sensor node. Each layer sits on y = 0 of its
 * own group (the scene moves the groups apart) and faces +z. Boards are about
 * 1.6 wide and 1.15 deep.
 */

export interface LayerProps extends AssetProps {
  /** Fade the layer towards the background so the selected one stands out. */
  dim?: boolean;
}

export const BOARD_W = 1.6;
export const BOARD_D = 1.15;
const BOARD_T = 0.05;

/** Where the power rail meets each board (back left corner). */
export const RAIL_XZ: [number, number] = [-0.66, -0.44];
/** Where the stacking header carries data between boards (front right). */
export const BUS_XZ: [number, number] = [0.52, 0.4];

/** Fades colours a little towards the page background. */
function useTones(dim: boolean | undefined) {
  const p = usePalette();
  return useMemo(() => {
    const t = (c: string) => (dim ? mixColor(c, p.bg, 0.22) : c);
    return { p, t };
  }, [p, dim]);
}

/** Small round pad where the power rail (amber) or data header (grey) joins a board. */
function Pad({ at, color }: { at: [number, number]; color: string }) {
  return (
    <mesh position={[at[0], BOARD_T + 0.006, at[1]]}>
      <cylinderGeometry args={[0.06, 0.06, 0.012, 14]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
    </mesh>
  );
}

function Board({ color, size = [BOARD_W, BOARD_D] }: { color: string; size?: [number, number] }) {
  return (
    <mesh position={[0, BOARD_T / 2, 0]}>
      <boxGeometry args={[size[0], BOARD_T, size[1]]} />
      <GlowMaterial color={color} roughness={0.6} />
    </mesh>
  );
}

/** Pins along two or four sides of a square chip, as instanced parts. */
function chipPins(cx: number, cz: number, half: number, perSide: number, y: number, sides: 2 | 4) {
  const items: PartInstance[] = [];
  const pitch = (half * 1.6) / Math.max(perSide - 1, 1);
  for (let i = 0; i < perSide; i++) {
    const o = -half * 0.8 + i * pitch;
    items.push({ position: [cx - half - 0.025, y, cz + o], scale: [0.05, 0.015, 0.025] });
    items.push({ position: [cx + half + 0.025, y, cz + o], scale: [0.05, 0.015, 0.025] });
    if (sides === 4) {
      items.push({ position: [cx + o, y, cz - half - 0.025], scale: [0.025, 0.015, 0.05] });
      items.push({ position: [cx + o, y, cz + half + 0.025], scale: [0.025, 0.015, 0.05] });
    }
  }
  return items;
}

function traces(segments: Array<[number, number, number, number]>, y = BOARD_T + 0.002) {
  return segments.map<PartInstance>(([x1, z1, x2, z2]) => ({
    position: [(x1 + x2) / 2, y, (z1 + z2) / 2],
    scale: [Math.max(Math.abs(x2 - x1), 0.018), 0.004, Math.max(Math.abs(z2 - z1), 0.018)],
  }));
}

/* ------------------------------------------------------------------ */
/* Power unit: battery pack with a small solar cell                    */
/* ------------------------------------------------------------------ */

const CELL_Z = [-0.25, 0.25];
const SOLAR_LINES: PartInstance[] = [-0.12, 0.12].map((x) => ({
  position: [x, 0.018, 0],
  scale: [0.012, 0.004, 0.62],
}));

export function PowerLayer({ dim, ...props }: LayerProps) {
  const { p, t } = useTones(dim);
  return (
    <AssetFrame {...props} labelHeight={0.6}>
      {/* Tray */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[BOARD_W, 0.1, BOARD_D]} />
        <GlowMaterial color={t(p.casingDark)} roughness={0.7} />
      </mesh>
      {/* Two cells lying side by side */}
      {CELL_Z.map((z) => (
        <group key={z} position={[0, 0.26, z]} rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[0.16, 0.16, 1.2, 18]} />
            <GlowMaterial color={t(p.casing)} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.162, 0.162, 0.2, 18]} />
            <meshStandardMaterial color={t(p.copper)} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.63, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.06, 10]} />
            <meshStandardMaterial color={t(p.lineStrong)} metalness={0.5} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* Spring contacts at the ends */}
      {[-0.72, 0.72].map((x) => (
        <mesh key={x} position={[x, 0.22, 0]}>
          <boxGeometry args={[0.04, 0.22, 0.86]} />
          <meshStandardMaterial color={t(p.lineStrong)} metalness={0.5} roughness={0.35} />
        </mesh>
      ))}

      {/* Small solar cell for energy harvesting, tilted towards the sky */}
      <group position={[-1.12, 0.12, 0.22]} rotation={[0, 0, -0.35]}>
        <mesh>
          <boxGeometry args={[0.5, 0.03, 0.7]} />
          <GlowMaterial color={t(mixColor(p.u2, p.casingDark, 0.55))} roughness={0.3} />
        </mesh>
        <InstancedParts items={SOLAR_LINES} color={t(p.silk)} />
      </group>

      {/* Where the power rail starts */}
      <mesh position={[RAIL_XZ[0], 0.106, RAIL_XZ[1]]}>
        <cylinderGeometry args={[0.07, 0.07, 0.012, 14]} />
        <meshStandardMaterial color={t(p.warn)} roughness={0.4} metalness={0.3} />
      </mesh>
    </AssetFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Sensing unit: sensor (on a tab) and ADC chip                        */
/* ------------------------------------------------------------------ */

/** Sensor dome, on a tab that sticks out of the stack so it can feel the air. */
export const SENSOR_AT: Vec3 = [-1.02, BOARD_T, 0.22];
export const ADC_AT: Vec3 = [-0.3, BOARD_T, 0.18];

const ADC_PINS = chipPins(ADC_AT[0], ADC_AT[2], 0.13, 4, BOARD_T + 0.01, 2);
const SENSING_TRACES = traces([
  [-0.92, 0.22, -0.48, 0.22],
  [-0.12, 0.18, 0.52, 0.18],
  [0.52, 0.18, 0.52, 0.4],
  [-0.3, -0.05, -0.3, -0.3],
  [-0.3, -0.3, 0.3, -0.3],
]);
const RESISTORS: PartInstance[] = [
  { position: [0.15, BOARD_T + 0.015, -0.12], scale: [0.1, 0.03, 0.05] },
  { position: [0.32, BOARD_T + 0.015, -0.12], scale: [0.1, 0.03, 0.05] },
];

export function SensingLayer({ dim, ...props }: LayerProps) {
  const { p, t } = useTones(dim);
  return (
    <AssetFrame {...props} labelHeight={0.4}>
      <Board color={t(p.pcb2)} />
      {/* Tab holding the sensor */}
      <mesh position={[-0.98, BOARD_T / 2, 0.22]}>
        <boxGeometry args={[0.4, BOARD_T, 0.42]} />
        <GlowMaterial color={t(p.pcb2)} roughness={0.6} />
      </mesh>
      <InstancedParts items={SENSING_TRACES} color={t(p.pcbTrace)} metalness={0.3} roughness={0.5} />

      {/* Sensor: a small dome on a collar */}
      <mesh position={[SENSOR_AT[0], BOARD_T + 0.02, SENSOR_AT[2]]}>
        <cylinderGeometry args={[0.14, 0.15, 0.04, 18]} />
        <meshStandardMaterial color={t(p.casingDark)} roughness={0.6} />
      </mesh>
      <mesh position={[SENSOR_AT[0], BOARD_T + 0.04, SENSOR_AT[2]]}>
        <sphereGeometry args={[0.12, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <GlowMaterial color={t(p.silk)} roughness={0.3} />
      </mesh>

      {/* ADC chip */}
      <mesh position={[ADC_AT[0], BOARD_T + 0.025, ADC_AT[2]]}>
        <boxGeometry args={[0.26, 0.05, 0.26]} />
        <GlowMaterial color={t(p.casingDark)} roughness={0.5} />
      </mesh>
      <InstancedParts items={ADC_PINS} color={t(p.lineStrong)} metalness={0.5} roughness={0.35} />
      <InstancedParts items={RESISTORS} color={t(p.casing)} roughness={0.5} />

      <Pad at={RAIL_XZ} color={t(p.warn)} />
      <Pad at={BUS_XZ} color={t(p.lineStrong)} />
    </AssetFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Processing unit: microcontroller board                              */
/* ------------------------------------------------------------------ */

export const MCU_AT: Vec3 = [0.0, BOARD_T, 0.0];

const MCU_PINS = chipPins(MCU_AT[0], MCU_AT[2], 0.2, 6, BOARD_T + 0.01, 4);
const HEADER_PINS: PartInstance[] = Array.from({ length: 10 }, (_, i) => ({
  position: [-0.54 + i * 0.12, BOARD_T + 0.09, -0.46] as Vec3,
  scale: [0.025, 0.14, 0.025] as Vec3,
}));
const MCU_TRACES = traces([
  [0.22, 0.12, 0.52, 0.12],
  [0.52, 0.12, 0.52, 0.4],
  [-0.22, -0.1, -0.5, -0.1],
  [-0.1, -0.22, -0.1, -0.4],
  [0.1, -0.22, 0.1, -0.4],
  [0.3, 0.3, 0.3, 0.45],
]);

export function McuLayer({ dim, ...props }: LayerProps) {
  const { p, t } = useTones(dim);
  return (
    <AssetFrame {...props} labelHeight={0.4}>
      <Board color={t(p.pcb)} />
      <InstancedParts items={MCU_TRACES} color={t(p.pcbTrace)} metalness={0.3} roughness={0.5} />

      {/* Microcontroller chip with a pin-1 dot */}
      <mesh position={[MCU_AT[0], BOARD_T + 0.03, MCU_AT[2]]}>
        <boxGeometry args={[0.4, 0.06, 0.4]} />
        <GlowMaterial color={t(p.casingDark)} roughness={0.5} />
      </mesh>
      <mesh position={[MCU_AT[0] - 0.13, BOARD_T + 0.062, MCU_AT[2] - 0.13]}>
        <cylinderGeometry args={[0.025, 0.025, 0.004, 10]} />
        <meshStandardMaterial color={t(p.silk)} />
      </mesh>
      <InstancedParts items={MCU_PINS} color={t(p.lineStrong)} metalness={0.5} roughness={0.35} />

      {/* Header pins along the back edge */}
      <mesh position={[0, BOARD_T + 0.03, -0.46]}>
        <boxGeometry args={[1.24, 0.06, 0.08]} />
        <meshStandardMaterial color={t(p.casingDark)} roughness={0.7} />
      </mesh>
      <InstancedParts items={HEADER_PINS} color={t(p.pcbTrace)} metalness={0.5} roughness={0.35} />

      {/* Crystal and a status light */}
      <mesh position={[0.45, BOARD_T + 0.03, -0.12]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.03, 0.1, 4, 8]} />
        <meshStandardMaterial color={t(p.casing)} metalness={0.5} roughness={0.35} />
      </mesh>
      <Led position={[-0.5, BOARD_T + 0.02, 0.38]} color={t(p.ok)} size={0.025} period={1.6} />

      <Pad at={RAIL_XZ} color={t(p.warn)} />
      <Pad at={BUS_XZ} color={t(p.lineStrong)} />
    </AssetFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Communication unit: radio transceiver with an antenna               */
/* ------------------------------------------------------------------ */

export const RADIO_AT: Vec3 = [-0.12, BOARD_T, 0.05];
export const ANTENNA_AT: Vec3 = [0.4, BOARD_T, -0.3];
export const ANTENNA_HEIGHT = 0.75;

const SHIELD_DOTS: PartInstance[] = Array.from({ length: 4 }, (_, i) => ({
  position: [RADIO_AT[0] - 0.12 + i * 0.08, BOARD_T + 0.073, RADIO_AT[2] + 0.12] as Vec3,
  scale: [0.03, 0.004, 0.03] as Vec3,
}));
const RADIO_TRACES = traces([
  [0.12, 0.05, 0.4, 0.05],
  [0.4, 0.05, 0.4, -0.3],
  [0.52, 0.4, 0.52, 0.2],
  [0.52, 0.2, 0.0, 0.2],
]);

export function RadioLayer({ dim, ...props }: LayerProps) {
  const { p, t } = useTones(dim);
  return (
    <AssetFrame {...props} labelHeight={0.4}>
      <Board color={t(p.pcb2)} size={[1.36, BOARD_D]} />
      <InstancedParts items={RADIO_TRACES} color={t(p.pcbTrace)} metalness={0.3} roughness={0.5} />

      {/* Radio chip under a metal shield */}
      <mesh position={[RADIO_AT[0], BOARD_T + 0.035, RADIO_AT[2]]}>
        <boxGeometry args={[0.46, 0.07, 0.4]} />
        <GlowMaterial color={t(p.casing)} metalness={0.45} roughness={0.35} />
      </mesh>
      <InstancedParts items={SHIELD_DOTS} color={t(p.lineStrong)} />

      {/* Antenna */}
      <mesh position={[ANTENNA_AT[0], BOARD_T + 0.04, ANTENNA_AT[2]]}>
        <cylinderGeometry args={[0.055, 0.06, 0.08, 12]} />
        <meshStandardMaterial color={t(p.pcbTrace)} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[ANTENNA_AT[0], BOARD_T + 0.04 + ANTENNA_HEIGHT / 2, ANTENNA_AT[2]]}>
        <cylinderGeometry args={[0.018, 0.026, ANTENNA_HEIGHT, 8]} />
        <GlowMaterial color={t(p.casingDark)} roughness={0.5} />
      </mesh>
      <mesh position={[ANTENNA_AT[0], BOARD_T + 0.04 + ANTENNA_HEIGHT, ANTENNA_AT[2]]}>
        <sphereGeometry args={[0.04, 10, 8]} />
        <meshStandardMaterial color={t(p.copper)} roughness={0.4} />
      </mesh>

      <Pad at={RAIL_XZ} color={t(p.warn)} />
      <Pad at={BUS_XZ} color={t(p.lineStrong)} />
    </AssetFrame>
  );
}

