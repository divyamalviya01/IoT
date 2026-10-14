import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { usePalette, type Palette } from "~/lib/palette";
import {
  CloudServer,
  House,
  Label3D,
  Link3D,
  PacketParticle,
  Phone,
  Router,
  Scene3D,
  SensorNode,
  SignalRings,
  Tree,
  mixColor,
  useFitScale,
  type AssetProps,
  type Label3DTone,
  type Vec3,
} from "~/components/three";
import { Fan } from "./Fan";

export type SmartHomePart = "sensor" | "fan" | "gateway" | "cloud" | "app";

export interface SmartHomeSceneProps {
  active?: SmartHomePart | null;
  onSelect?: (id: SmartHomePart) => void;
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

type Block = "things" | "connectivity" | "processing" | "interface";

interface PartSpec {
  block: Block;
  label: string;
  position: Vec3;
  rotation?: Vec3;
  scale?: number;
  /** Where the floating label sits. */
  labelAt: Vec3;
  /** Where packets arrive and leave. */
  anchor: Vec3;
}

const CLOUD_LIFT = 0.75;
/** Height the camera looks at; the fit scale shrinks the diorama around it. */
const VIEW_Y = 0.8;

const PARTS: Record<SmartHomePart, PartSpec> = {
  sensor: {
    block: "things",
    label: "Sensor",
    position: [-2.85, 0, 0.75],
    rotation: [0, 0.35, 0],
    scale: 1.3,
    labelAt: [-2.85, 1.8, 0.75],
    anchor: [-2.75, 1.38, 0.72],
  },
  fan: {
    block: "things",
    label: "Fan",
    position: [-1.4, 0, 0.8],
    rotation: [0, -0.2, 0],
    scale: 1.15,
    labelAt: [-1.4, 1.85, 0.8],
    anchor: [-1.4, 1.1, 0.86],
  },
  gateway: {
    block: "connectivity",
    label: "Wi-Fi gateway",
    position: [0.2, 0, -0.55],
    rotation: [0, -0.15, 0],
    scale: 1.1,
    labelAt: [0.2, 1.32, -0.55],
    anchor: [0.2, 0.5, -0.55],
  },
  cloud: {
    block: "processing",
    label: "Cloud",
    position: [2.6, CLOUD_LIFT, -1.2],
    rotation: [0, -0.25, 0],
    scale: 0.9,
    labelAt: [2.6, CLOUD_LIFT + 2.45, -1.2],
    anchor: [2.6, CLOUD_LIFT + 1.25, -1.0],
  },
  app: {
    block: "interface",
    label: "Phone app",
    position: [1.9, 0, 1.2],
    rotation: [0, -0.3, 0],
    scale: 1.1,
    labelAt: [1.9, -0.02, 1.85],
    anchor: [1.9, 1.12, 1.3],
  },
};

const BLOCK_TONE: Record<Block, Label3DTone> = {
  things: "u1",
  connectivity: "u2",
  processing: "u3",
  interface: "accent",
};

function blockColor(p: Palette, block: Block): string {
  if (block === "things") return p.u1;
  if (block === "connectivity") return p.u2;
  if (block === "processing") return p.u3;
  return p.brand;
}

/* ------------------------------------------------------------------ */
/* Timing: data goes up, then a command comes back down to the fan     */
/* ------------------------------------------------------------------ */

const HOP = 1.2;
/** Data: sensor to gateway to cloud to phone. */
const DATA_ROUTE: SmartHomePart[] = ["sensor", "gateway", "cloud", "app"];
/** Command: phone to cloud to gateway to fan. */
const COMMAND_ROUTE: SmartHomePart[] = ["app", "cloud", "gateway", "fan"];
const COMMAND_START = HOP * 3 + 0.6;
const FAN_ON = COMMAND_START + HOP * 3;
const FAN_OFF = FAN_ON + 4;
/** One full story, including time for the fan to coast to a stop. */
const CYCLE = FAN_OFF + 1.6;

function arcBetween(a: SmartHomePart, b: SmartHomePart): number {
  const key = [a, b].sort().join("-");
  if (key === "gateway-sensor" || key === "fan-gateway") return 0.7;
  if (key === "cloud-gateway") return 0.6;
  return 0.45;
}

const LINKS: Array<[SmartHomePart, SmartHomePart]> = [
  ["sensor", "gateway"],
  ["gateway", "fan"],
  ["gateway", "cloud"],
  ["cloud", "app"],
];

function Route({
  stops,
  start,
  color,
}: {
  stops: SmartHomePart[];
  start: number;
  color?: string;
}) {
  return (
    <>
      {stops.slice(0, -1).map((id, i) => {
        const next = stops[i + 1];
        return (
          <PacketParticle
            key={id}
            from={PARTS[id].anchor}
            to={PARTS[next].anchor}
            arc={arcBetween(id, next)}
            duration={HOP}
            delay={start + i * HOP}
            repeatDelay={CYCLE - HOP}
            color={color}
            size={0.1}
          />
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

function SmartHome({ active = null, onSelect }: SmartHomeSceneProps) {
  const p = usePalette();
  const fit = useFitScale(9);

  const colors = useMemo(() => {
    const ground = mixColor(p.surface2, p.lineStrong, 0.35);
    return {
      ground,
      yard: mixColor(p.ok, p.surface2, 0.72),
      pad: {
        things: mixColor(ground, p.u1, 0.4),
        connectivity: mixColor(ground, p.u2, 0.4),
        processing: mixColor(p.surface2, p.u3, 0.45),
        interface: mixColor(ground, p.brand, 0.4),
      } satisfies Record<Block, string>,
    };
  }, [p]);

  const partProps = (id: SmartHomePart): AssetProps => {
    const spec = PARTS[id];
    return {
      position: spec.position,
      rotation: spec.rotation,
      scale: spec.scale,
      highlighted: active === id,
      accent: blockColor(p, spec.block),
      onSelect: onSelect ? () => onSelect(id) : undefined,
    };
  };

  const pad = (id: SmartHomePart, radius = 0.5) => {
    const [x, y, z] = PARTS[id].position;
    return (
      <mesh position={[x, y + 0.012, z]}>
        <cylinderGeometry args={[radius, radius, 0.024, 28]} />
        <meshStandardMaterial color={colors.pad[PARTS[id].block]} roughness={0.85} />
      </mesh>
    );
  };

  return (
    <group position={[0, VIEW_Y * (1 - fit), 0]} scale={fit}>
      {/* Ground, and the home's garden */}
      <RoundedBox args={[7.9, 0.14, 4.4]} radius={0.06} smoothness={2} position={[0, -0.07, 0]}>
        <meshStandardMaterial color={colors.ground} roughness={0.9} />
      </RoundedBox>
      <mesh position={[-2.15, 0.006, -0.05]}>
        <boxGeometry args={[3.4, 0.012, 3.95]} />
        <meshStandardMaterial color={colors.yard} roughness={0.95} />
      </mesh>
      <House position={[-2.15, 0, -1.05]} rotation={[0, 0.12, 0]} />
      <Tree position={[-3.6, 0, -1.6]} scale={0.5} />
      <Tree position={[3.6, 0, 1.4]} scale={0.45} />

      {/* Colour pads: one colour per building block */}
      {pad("sensor", 0.42)}
      {pad("fan", 0.42)}
      {pad("gateway", 0.62)}
      {pad("app", 0.45)}

      {/* Things */}
      <SensorNode {...partProps("sensor")} />
      <Fan {...partProps("fan")} cycle={CYCLE} onAt={FAN_ON} offAt={FAN_OFF} />

      {/* Connectivity */}
      <Router {...partProps("gateway")} />
      <SignalRings
        position={[0.2, 0.92, -0.55]}
        color={p.u2}
        maxRadius={0.85}
        period={2.2}
      />

      {/* Data processing, floating above a small platform */}
      <mesh position={[2.6, CLOUD_LIFT - 0.05, -1.2]}>
        <cylinderGeometry args={[0.72, 0.62, 0.1, 28]} />
        <meshStandardMaterial color={colors.pad.processing} roughness={0.7} />
      </mesh>
      <Link3D from={[2.6, 0.02, -1.2]} to={[2.6, CLOUD_LIFT - 0.1, -1.2]} color={p.lineStrong} dashed />
      <CloudServer {...partProps("cloud")} />

      {/* User interface */}
      <Phone {...partProps("app")} />

      {/* Labels, coloured by building block */}
      {(Object.keys(PARTS) as SmartHomePart[]).map((id) => (
        <Label3D key={id} position={PARTS[id].labelAt} tone={BLOCK_TONE[PARTS[id].block]}>
          {active === id ? <strong>{PARTS[id].label}</strong> : PARTS[id].label}
        </Label3D>
      ))}

      {/* Network links */}
      {LINKS.map(([a, b]) => (
        <Link3D
          key={`${a}-${b}`}
          from={PARTS[a].anchor}
          to={PARTS[b].anchor}
          arc={arcBetween(a, b)}
          dashed
        />
      ))}

      {/* Readings travel up; a command comes back down */}
      <Route stops={DATA_ROUTE} start={0} />
      <Route stops={COMMAND_ROUTE} start={COMMAND_START} color={p.copper} />
    </group>
  );
}

/**
 * Topic 1.1: a smart home made of the four building blocks of IoT. A reading
 * travels from the temperature sensor to the phone app, and a command comes
 * back to switch the fan on.
 */
export default function SmartHomeScene({ active = null, onSelect }: SmartHomeSceneProps) {
  return (
    <Scene3D
      label="A smart home: a temperature sensor and a fan connect through a Wi-Fi gateway to a cloud platform and a phone app. Readings travel up to the phone, and a command travels back down to switch the fan on."
      height="clamp(300px, 72vw, 420px)"
      camera={{ position: [0.3, 4.1, 7.4], fov: 40, target: [0, VIEW_Y, -0.1] }}
    >
      <SmartHome active={active} onSelect={onSelect} />
    </Scene3D>
  );
}
