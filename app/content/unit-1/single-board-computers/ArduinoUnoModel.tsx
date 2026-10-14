import { useMemo } from "react";
import { InstancedParts, Led, mixColor, type PartInstance } from "~/components/three";
import { BoardPart, MBox, MCyl, PCB_T, S, boardPoint, pinGrid, useBoardColors } from "./boardKit";

export type UnoPart = "mcu" | "digital" | "analog" | "usb" | "jack" | "powerpins" | "reset";

/** Arduino Uno R3 board: 68.6 × 53.3 mm. */
export const UNO_SIZE: [number, number] = [68.6, 53.3];
const [W, D] = UNO_SIZE;
const PITCH = 2.54;
const HEADER_H = 8.5;

/** Where each part's floating label sits, in board millimetres [x, y, z]. */
export const UNO_LABELS: Record<UnoPart, [number, number, number]> = {
  mcu: [47.6, 18, 9],
  digital: [40.5, 60, 9],
  analog: [57.2, -5, 9],
  usb: [-6, 38, 16],
  jack: [-4, 8, 16],
  powerpins: [36.8, -5, 9],
  reset: [6.6, 60, 5],
};

const HOLES: Array<[number, number]> = [
  [14, 2.5],
  [15.3, 50.7],
  [66.1, 7.6],
  [66.1, 35.5],
];
const HOLE_RINGS: PartInstance[] = HOLES.map(([x, y]) => ({
  position: boardPoint(W, D, x, y, 0.05),
  scale: [2.8 * S, 0.1 * S, 2.8 * S],
}));
const HOLE_CENTRES: PartInstance[] = HOLES.map(([x, y]) => ({
  position: boardPoint(W, D, x, y, 0.12),
  scale: [1.6 * S, 0.1 * S, 1.6 * S],
}));

/** Gold contacts showing in the top of a female header with `n` sockets. */
const sockets = (n: number) => pinGrid(n, 1, PITCH, HEADER_H, 0.12, 1.1);
const SOCKETS_10 = sockets(10);
const SOCKETS_8 = sockets(8);
const SOCKETS_6 = sockets(6);

/** The DIP chip's 28 legs, 14 down each long side. */
const DIP_LEGS: PartInstance[] = [-1, 1].flatMap((side) =>
  Array.from({ length: 14 }, (_, i) => ({
    position: [(-16.51 + i * PITCH) * S, 3.7 * S, -side * 4.2 * S] as [number, number, number],
    scale: [0.7 * S, 2.6 * S, 1.2 * S] as [number, number, number],
  })),
);
const ICSP_PINS = pinGrid(2, 3, PITCH, 2.5, 6);

export interface UnoModelProps {
  active: UnoPart | null;
  onSelect?: (id: UnoPart) => void;
}

/** An Arduino Uno R3, laid flat with the USB and power jacks on the left. */
export function ArduinoUnoModel({ active, onSelect }: UnoModelProps) {
  const { p, metal, dark, gold, silk, accent } = useBoardColors();
  const colors = useMemo(
    () => ({
      board: mixColor(p.u2, p.brand, 0.5),
      socket: mixColor(p.casingDark, p.lineStrong, 0.3),
      hole: mixColor(p.casingDark, p.casing, 0.35),
    }),
    [p],
  );

  const part = (id: UnoPart) => ({
    board: UNO_SIZE,
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

      {/* USB chip, crystal, regulator, capacitors and the ICSP header (not in the list) */}
      <group position={at(21.5, 38.5)}>
        <MBox size={[5.5, 5.5, 1]} color={dark} />
      </group>
      <group position={at(22, 29)}>
        <MBox size={[7, 4.6, 3.6]} color={metal} metal />
        {[-3.5, 3.5].map((x) => (
          <MCyl key={x} at={[x, 0, 0]} radius={2.3} height={3.6} color={metal} metal />
        ))}
      </group>
      <group position={at(18, 9)}>
        <MBox size={[6.5, 7, 1.6]} color={dark} />
        <MBox at={[0, 4.2, 0]} size={[3.2, 1.4, 0.5]} color={metal} metal />
      </group>
      {[
        [12.5, 18],
        [19, 18],
      ].map(([x, y]) => (
        <group key={x} position={at(x, y)}>
          <MCyl radius={3} height={5.5} color={dark} roughness={0.5} />
          <MCyl at={[0, 0, 5.5]} radius={2.6} height={0.2} color={metal} metal />
        </group>
      ))}
      <group position={at(64.1, 27.3)}>
        <MBox size={[5.08, 7.62, 2.5]} color={dark} />
        <InstancedParts items={ICSP_PINS} color={gold} metalness={0.5} roughness={0.35} />
      </group>

      {/* Status lights: L (pin 13), TX and RX, and ON */}
      <Led position={at(25, 44.5)} color={p.warn} size={0.04} period={1.2} />
      <Led position={at(25, 40)} color={p.warn} size={0.035} period={0.7} phase={0.3} />
      <Led position={at(25, 37.5)} color={p.warn} size={0.035} period={0.9} phase={0.6} />
      <Led position={at(61, 42)} color={p.ok} size={0.04} blink={false} />

      {/* ATmega328P in its socket */}
      <BoardPart at={[47.6, 17.8]} halo={[37.5, 10.2, 5.9]} {...part("mcu")}>
        <MBox size={[37.5, 10.2, 2.6]} color={colors.socket} />
        <MBox at={[0, 0, 2.6]} size={[35.6, 7.4, 3.3]} color={dark} glow />
        <InstancedParts items={DIP_LEGS} color={metal} metalness={0.6} roughness={0.3} />
        <MCyl at={[-15.5, 2, 5.9]} radius={0.8} height={0.1} color={silk} />
      </BoardPart>

      {/* Digital header (two blocks) along the far edge */}
      <BoardPart at={[40.5, 50.8]} halo={[46, 2.6, HEADER_H]} {...part("digital")}>
        <group position={[-10.27 * S, 0, 0]}>
          <MBox size={[10 * PITCH, PITCH, HEADER_H]} color={dark} glow />
          <InstancedParts items={SOCKETS_10} color={gold} metalness={0.5} roughness={0.35} />
        </group>
        <group position={[12.84 * S, 0, 0]}>
          <MBox size={[8 * PITCH, PITCH, HEADER_H]} color={dark} glow />
          <InstancedParts items={SOCKETS_8} color={gold} metalness={0.5} roughness={0.35} />
        </group>
      </BoardPart>

      {/* Power header and analog header along the near edge */}
      <BoardPart at={[36.83, 2.54]} halo={[20.4, 2.6, HEADER_H]} {...part("powerpins")}>
        <MBox size={[8 * PITCH, PITCH, HEADER_H]} color={dark} glow />
        <InstancedParts items={SOCKETS_8} color={gold} metalness={0.5} roughness={0.35} />
      </BoardPart>
      <BoardPart at={[57.15, 2.54]} halo={[15.3, 2.6, HEADER_H]} {...part("analog")}>
        <MBox size={[6 * PITCH, PITCH, HEADER_H]} color={dark} glow />
        <InstancedParts items={SOCKETS_6} color={gold} metalness={0.5} roughness={0.35} />
      </BoardPart>

      {/* USB-B port, sticking out of the left edge */}
      <BoardPart at={[1.75, 37.7]} halo={[16.3, 12, 10.9]} {...part("usb")}>
        <MBox size={[16.3, 12, 10.9]} color={metal} metal glow />
        <MBox at={[-8.15, 0, 1.7]} size={[0.4, 8.6, 7.6]} color={dark} />
        <MBox at={[-8.3, 0, 3.6]} size={[0.4, 5.2, 3.2]} color={colors.hole} />
      </BoardPart>

      {/* DC barrel jack */}
      <BoardPart at={[5.05, 7.7]} halo={[13.7, 9, 11]} {...part("jack")}>
        <MBox size={[13.7, 9, 11]} color={dark} glow />
        <MCyl at={[-6.9, 0, 6]} radius={3.2} height={0.5} axis="x" color={colors.hole} />
        <MCyl at={[-7.1, 0, 6]} radius={1} height={0.5} axis="x" color={metal} metal />
      </BoardPart>

      {/* Reset button in the top left corner */}
      <BoardPart at={[6.6, 49.5]} halo={[6, 6, 4.8]} {...part("reset")}>
        <MBox size={[6, 6, 3.3]} color={metal} metal glow />
        <MCyl at={[0, 0, 3.3]} radius={1.7} height={1.5} color={dark} glow />
      </BoardPart>
    </group>
  );
}
