import { useThree } from "@react-three/fiber";
import { Label3D, Scene3D, useFitScale } from "~/components/three";
import { ArduinoUnoModel, UNO_LABELS, UNO_SIZE, type UnoPart } from "./ArduinoUnoModel";
import { boardPoint } from "./boardKit";
import { PI_LABELS, PI_SIZE, RaspberryPiModel, type PiPart } from "./RaspberryPiModel";

export type BoardKind = "pi" | "uno";
export type { PiPart, UnoPart };

export interface BoardsSceneProps {
  board: BoardKind;
  active: string;
  onSelect?: (id: string) => void;
  /** Short names shown on the board, by part id. */
  labels: Record<string, string>;
}

/** Below this canvas width only the selected part is labelled, so labels don't pile up. */
const ALL_LABELS_MIN_WIDTH = 560;

function Boards({ board, active, onSelect, labels }: BoardsSceneProps) {
  // Both boards share one scale so their real sizes can be compared.
  const fit = useFitScale(6.6);
  const width = useThree((s) => s.size.width);
  const showAll = width >= ALL_LABELS_MIN_WIDTH;

  const anchors: Record<string, [number, number, number]> = board === "pi" ? PI_LABELS : UNO_LABELS;
  const [w, d] = board === "pi" ? PI_SIZE : UNO_SIZE;

  return (
    <group scale={fit}>
      {board === "pi" ? (
        <RaspberryPiModel active={active as PiPart} onSelect={onSelect} />
      ) : (
        <ArduinoUnoModel active={active as UnoPart} onSelect={onSelect} />
      )}
      {Object.entries(anchors).map(([id, [x, y, z]]) => (
        <Label3D
          key={`${board}-${id}`}
          position={boardPoint(w, d, x, y, z)}
          tone={id === active ? "u1" : "default"}
          visible={showAll || id === active}
        >
          {id === active ? <strong>{labels[id]}</strong> : labels[id]}
        </Label3D>
      ))}
    </group>
  );
}

/**
 * Topic 1.5: a Raspberry Pi 4 or an Arduino Uno R3, laid flat and seen from
 * above at an angle. Each named part can be selected.
 */
export default function BoardsScene(props: BoardsSceneProps) {
  const name = props.board === "pi" ? "Raspberry Pi 4" : "Arduino Uno";
  const label =
    props.board === "pi"
      ? `A ${name} board seen from above: the processor and memory in the middle, the 40-pin GPIO header along the top edge, USB and Ethernet ports on the right, USB-C power and two micro-HDMI ports along the bottom, and the microSD slot on the left.`
      : `An ${name} board seen from above: the ATmega328P chip in its socket, the digital pin header along the top edge, the power and analog headers along the bottom, the USB-B port and power jack on the left, and the reset button in the top left corner.`;
  return (
    <Scene3D
      label={label}
      height="clamp(320px, 75vw, 440px)"
      camera={{ position: [0, 6.3, 3.5], fov: 40, target: [0, 0, 0.1] }}
      maxDistance={11}
    >
      <Boards {...props} />
    </Scene3D>
  );
}
