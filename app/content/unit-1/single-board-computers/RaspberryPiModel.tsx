import { useMemo } from "react";
import { InstancedParts, Led, mixColor, type PartInstance } from "~/components/three";
import { BoardPart, MBox, MCyl, PCB_T, S, boardPoint, pinGrid, useBoardColors } from "./boardKit";

export type PiPart =
  | "soc"
  | "ram"
  | "wireless"
  | "gpio"
  | "usb"
  | "ethernet"
  | "hdmi"
  | "power"
  | "sd";

/** Raspberry Pi 4 board: 85 × 56 mm. */
export const PI_SIZE: [number, number] = [85, 56];
const [W, D] = PI_SIZE;

/** Where each part's floating label sits, in board millimetres [x, y, z]. */
export const PI_LABELS: Record<PiPart, [number, number, number]> = {
  soc: [26.5, 32, 9],
  ram: [43.5, 33, 7],
  wireless: [12.5, 41, 7],
  gpio: [31.2, 62, 6],
  usb: [80, 18, 24],
  ethernet: [77, 46, 22],
  hdmi: [32.75, -7, 4],
  power: [11.2, -7, 4],
  sd: [-7, 28, 4],
};

const HOLES: Array<[number, number]> = [
  [3.5, 3.5],
  [61.5, 3.5],
  [3.5, 52.5],
  [61.5, 52.5],
];
const HOLE_RINGS: PartInstance[] = HOLES.map(([x, y]) => ({
  position: boardPoint(W, D, x, y, 0.05),
  scale: [3 * S, 0.1 * S, 3 * S],
}));
const HOLE_CENTRES: PartInstance[] = HOLES.map(([x, y]) => ({
  position: boardPoint(W, D, x, y, 0.12),
  scale: [1.4 * S, 0.1 * S, 1.4 * S],
}));

// Small surface-mount parts around the processor, for texture.
const PASSIVES: PartInstance[] = [
  [19, 22],
  [22, 22],
  [25, 22],
  [33, 22],
  [36, 24],
  [36, 40],
  [19, 42],
  [22, 43],
  [50, 26],
  [50, 38],
  [28, 14],
  [31, 14],
  [8, 20],
  [8, 34],
].map(([x, y]) => ({
  position: boardPoint(W, D, x, y, 0.4),
  scale: [1.6 * S, 0.8 * S, 0.8 * S],
}));

const GPIO_PINS = pinGrid(20, 2, 2.54, 2.5, 6);
const POE_PINS = pinGrid(2, 2, 2.54, 2.5, 5);

export interface PiModelProps {
  active: PiPart | null;
  onSelect?: (id: PiPart) => void;
}

/** A Raspberry Pi 4 Model B, laid flat with the GPIO header along the far edge. */
export function RaspberryPiModel({ active, onSelect }: PiModelProps) {
  const { p, metal, dark, gold, silk, accent } = useBoardColors();
  const colors = useMemo(
    () => ({
      board: mixColor(p.pcb2, p.ok, 0.35),
      substrate: mixColor(p.pcb, p.casingDark, 0.4),
      usb3: p.u2,
      usb2: mixColor(p.casingDark, p.casing, 0.35),
      card: mixColor(p.casingDark, p.u2, 0.35),
    }),
    [p],
  );

  const part = (id: PiPart) => ({
    board: PI_SIZE,
    selected: active === id,
    accent,
    onSelect: onSelect ? () => onSelect(id) : undefined,
  });
  const at = (x: number, y: number) => boardPoint(W, D, x, y);

  return (
    <group>
      {/* Board */}
      <mesh position={[0, (PCB_T / 2) * S, 0]}>
        <boxGeometry args={[W * S, PCB_T * S, D * S]} />
        <meshStandardMaterial color={colors.board} roughness={0.6} />
      </mesh>
      <InstancedParts items={HOLE_RINGS} shape="cylinder" color={gold} metalness={0.4} />
      <InstancedParts items={HOLE_CENTRES} shape="cylinder" color={dark} />
      <InstancedParts items={PASSIVES} color={p.lineStrong} roughness={0.5} />

      {/* Smaller chips and connectors that are not in the list */}
      <group position={at(56, 41)}>
        <MBox size={[6, 6, 1]} color={dark} />
      </group>
      <group position={at(56, 22)}>
        <MBox size={[7, 7, 1]} color={dark} />
      </group>
      <group position={at(17, 13)}>
        <MBox size={[5, 5, 0.9]} color={dark} />
      </group>
      <group position={at(59.7, 52.5)}>
        <InstancedParts items={POE_PINS} color={gold} metalness={0.5} roughness={0.35} />
      </group>
      {/* Camera ribbon connector */}
      <group position={at(46.5, 12)}>
        <MBox size={[3, 22, 4.5]} color={silk} />
        <MBox at={[0, 0, 4.5]} size={[3.4, 22, 1]} color={dark} />
      </group>
      {/* Audio jack */}
      <group position={at(53.5, 6)}>
        <MBox size={[7, 12, 6]} color={dark} />
        <MCyl at={[0, -6.4, 3]} radius={3} height={1.4} axis="y" color={dark} />
      </group>
      {/* Power and activity lights */}
      <Led position={at(1.6, 8.5)} color={p.bad} size={0.045} blink={false} />
      <Led position={at(1.6, 12)} color={p.ok} size={0.045} period={0.9} />

      {/* SoC with its metal lid */}
      <BoardPart at={[26.5, 32]} halo={[17, 17, 2.6]} {...part("soc")}>
        <MBox size={[17, 17, 1.2]} color={colors.substrate} />
        <MBox at={[0, 0, 1.2]} size={[14, 14, 1.4]} color={metal} metal glow />
      </BoardPart>

      <BoardPart at={[43.5, 32]} halo={[10, 14, 1.2]} {...part("ram")}>
        <MBox size={[10, 14, 1.2]} color={dark} glow />
      </BoardPart>

      <BoardPart at={[12.5, 41]} halo={[12, 10, 1.6]} {...part("wireless")}>
        <MBox size={[12, 10, 1.6]} color={metal} metal glow />
      </BoardPart>

      {/* 40-pin GPIO header along the far edge */}
      <BoardPart at={[31.23, 52.5]} halo={[50.8, 5.1, 8.5]} {...part("gpio")}>
        <MBox size={[50.8, 5.08, 2.5]} color={dark} glow />
        <InstancedParts items={GPIO_PINS} color={gold} metalness={0.5} roughness={0.35} />
      </BoardPart>

      {/* Two stacked USB 3.0 ports (blue) and two USB 2.0 ports */}
      <BoardPart at={[78.5, 18]} halo={[18, 31.2, 16]} {...part("usb")}>
        {[
          { y: 9, tongue: colors.usb3 },
          { y: -9, tongue: colors.usb2 },
        ].map(({ y, tongue }) => (
          <group key={y}>
            <MBox at={[0, y, 0]} size={[18, 13.2, 16]} color={metal} metal glow />
            {[1.6, 9].map((z) => (
              <group key={z}>
                <MBox at={[9, y, z]} size={[0.4, 12, 5.4]} color={dark} />
                <MBox at={[9.2, y, z + 1.6]} size={[0.4, 10, 1.8]} color={tongue} />
              </group>
            ))}
          </group>
        ))}
      </BoardPart>

      <BoardPart at={[76, 45.75]} halo={[21, 16, 13.5]} {...part("ethernet")}>
        <MBox size={[21, 16, 13.5]} color={metal} metal glow />
        <MBox at={[10.5, 0, 1.5]} size={[0.4, 12, 9]} color={dark} />
        <MBox at={[10.6, -5, 11]} size={[0.4, 2.5, 1.5]} color={p.ok} />
        <MBox at={[10.6, 5, 11]} size={[0.4, 2.5, 1.5]} color={p.warn} />
      </BoardPart>

      {/* Two micro-HDMI ports on the near edge */}
      <BoardPart at={[32.75, 2.75]} halo={[20.5, 7.5, 3.2]} {...part("hdmi")}>
        {[-6.75, 6.75].map((x) => (
          <group key={x}>
            <MBox at={[x, 0, 0]} size={[7, 7.5, 3.2]} color={metal} metal glow />
            <MBox at={[x, -3.8, 0.7]} size={[5.6, 0.4, 1.8]} color={dark} />
          </group>
        ))}
      </BoardPart>

      <BoardPart at={[11.2, 2.75]} halo={[9, 7.5, 3.3]} {...part("power")}>
        <MBox size={[9, 7.5, 3.3]} color={metal} metal glow />
        <MBox at={[0, -3.8, 0.7]} size={[7, 0.4, 1.9]} color={dark} />
      </BoardPart>

      {/* microSD slot under the board; the card sticks out of the left edge */}
      <BoardPart
        at={[4.5, 28]}
        halo={[7, 13, 6]}
        haloZ={-PCB_T - 2.2}
        haloOffset={[-6.5, 0]}
        {...part("sd")}
      >
        <MBox at={[2, 0, -PCB_T - 1.5]} size={[14, 13, 1.5]} color={metal} metal />
        <MBox at={[-1, 0, -PCB_T - 1.3]} size={[16, 11, 1]} color={colors.card} glow />
      </BoardPart>
    </group>
  );
}
