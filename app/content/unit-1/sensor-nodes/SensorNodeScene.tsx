import { useEffect, useMemo, useRef, type ComponentType } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CylinderGeometry, SphereGeometry, Vector3, type Group, type Mesh } from "three";
import { usePalette } from "~/lib/palette";
import {
  Label3D,
  Scene3D,
  SignalRings,
  useFitScale,
  useSceneMotion,
  type Vec3,
} from "~/components/three";
import {
  ADC_AT,
  ANTENNA_AT,
  ANTENNA_HEIGHT,
  BUS_XZ,
  MCU_AT,
  McuLayer,
  PowerLayer,
  RADIO_AT,
  RAIL_XZ,
  RadioLayer,
  SENSOR_AT,
  SensingLayer,
  type LayerProps,
} from "./NodeLayers";

export type NodeUnit = "power" | "sensing" | "mcu" | "radio";

export interface SensorNodeSceneProps {
  active?: NodeUnit | null;
  onSelect?: (id: NodeUnit) => void;
  /** 0 = assembled, 1 = layers fully separated. */
  explode: number;
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

/** Bottom to top. */
const ORDER: NodeUnit[] = ["power", "sensing", "mcu", "radio"];
const LAYER: Record<NodeUnit, ComponentType<LayerProps>> = {
  power: PowerLayer,
  sensing: SensingLayer,
  mcu: McuLayer,
  radio: RadioLayer,
};
const LABEL: Record<NodeUnit, string> = {
  power: "Battery and power",
  sensing: "Sensor and ADC",
  mcu: "Microcontroller",
  radio: "Radio transceiver",
};
const LABEL_AT: Record<NodeUnit, Vec3> = {
  power: [1.4, 0.3, 0.2],
  sensing: [1.45, 0.06, 0.1],
  mcu: [1.45, 0.06, 0.1],
  radio: [1.4, 0.06, 0.1],
};

/** Height of each layer when assembled, and the extra gap per layer when separated. */
const BASE_Y = [0, 0.48, 0.76, 1.04];
const GAP = 0.72;
const BOARD_TOP = 0.05;
const MAX_STEP = 0.1;
/** Height the camera looks at; the fit scale shrinks the model around it. */
const VIEW_Y = 1.8;

const layerHeights = (explode: number) => BASE_Y.map((y, i) => y + explode * i * GAP);

/* ------------------------------------------------------------------ */
/* The packet's climb, in layer-local waypoints                        */
/* ------------------------------------------------------------------ */

/** [layer index, x, height above the layer, z] */
type Waypoint = [number, number, number, number];

interface Leg {
  at: number;
  duration: number;
  points: Waypoint[];
  /** The analog voltage is copper; once the ADC has turned it into a number it is a data packet. */
  kind: "voltage" | "data";
  size: number;
}

const T = BOARD_TOP;
const sensorTop: Waypoint = [1, SENSOR_AT[0], T + 0.18, SENSOR_AT[2]];
const adc: Waypoint = [1, ADC_AT[0], T + 0.1, ADC_AT[2]];
const mcu = (layer: number): Waypoint => [layer, MCU_AT[0], T + 0.12, MCU_AT[2]];
const bus = (layer: number): Waypoint => [layer, BUS_XZ[0], T + 0.03, BUS_XZ[1]];
const radio: Waypoint = [3, RADIO_AT[0], T + 0.12, RADIO_AT[2]];
const antennaTip: Waypoint = [3, ANTENNA_AT[0], T + 0.04 + ANTENNA_HEIGHT, ANTENNA_AT[2]];

const LEGS: Leg[] = [
  {
    at: 0,
    duration: 0.8,
    points: [sensorTop, [1, -0.6, T + 0.03, 0.22], adc],
    kind: "voltage",
    size: 0.05,
  },
  {
    at: 1.05,
    duration: 1.4,
    points: [adc, [1, 0.52, T + 0.03, 0.18], bus(1), bus(2), [2, 0.52, T + 0.03, 0.12], mcu(2)],
    kind: "data",
    size: 0.06,
  },
  {
    at: 3.0,
    duration: 1.3,
    points: [mcu(2), [2, 0.52, T + 0.03, 0.12], bus(2), bus(3), [3, 0.52, T + 0.03, 0.2], radio],
    kind: "data",
    size: 0.08,
  },
  {
    at: 4.5,
    duration: 0.55,
    points: [radio, [3, ANTENNA_AT[0], T + 0.06, RADIO_AT[2]], antennaTip],
    kind: "data",
    size: 0.08,
  },
];
const RINGS_FROM = 5.05;
const RINGS_TO = 6.7;
const CYCLE = 7.2;
/** What a still image shows: the packet waiting at the microcontroller. */
const IDLE_TIME = 2.7;

const packetGeometry = new SphereGeometry(1, 14, 10);
const railGeometry = new CylinderGeometry(1, 1, 1, 8);

const tmpA = new Vector3();
const tmpB = new Vector3();

/** Position along a polyline (constant speed), with the layers where they are right now. */
function sampleLeg(points: Waypoint[], heights: number[], u: number, out: Vector3) {
  const world = (w: Waypoint, v: Vector3) => v.set(w[1], heights[w[0]] + w[2], w[3]);
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += world(points[i - 1], tmpA).distanceTo(world(points[i], tmpB));
  }
  let d = Math.min(Math.max(u, 0), 1) * total;
  for (let i = 1; i < points.length; i++) {
    world(points[i - 1], tmpA);
    world(points[i], tmpB);
    const seg = tmpA.distanceTo(tmpB);
    if (d <= seg || i === points.length - 1) {
      return out.lerpVectors(tmpA, tmpB, seg > 0 ? Math.min(d / seg, 1) : 0);
    }
    d -= seg;
  }
  return world(points[0], out);
}

/* ------------------------------------------------------------------ */
/* Small animated pieces                                               */
/* ------------------------------------------------------------------ */

const WAVE_DOTS = Array.from({ length: 11 }, (_, i) => i);

/** The physical signal: a copper wave of heat reaching the sensor dome. */
function HeatWave() {
  const p = usePalette();
  const { paused } = useSceneMotion();
  const dots = useRef<Array<Mesh | null>>([]);
  const time = useRef(0);

  useFrame((_, delta) => {
    if (!paused) time.current += Math.min(delta, MAX_STEP);
    WAVE_DOTS.forEach((i) => {
      const dot = dots.current[i];
      if (dot) dot.position.y = T + 0.17 + 0.07 * Math.sin(i * 0.95 - time.current * 5);
    });
  });

  return (
    <group>
      {WAVE_DOTS.map((i) => (
        <mesh
          key={i}
          ref={(m) => {
            dots.current[i] = m;
          }}
          geometry={packetGeometry}
          position={[-1.95 + i * 0.065, T + 0.17, SENSOR_AT[2]]}
          scale={0.028}
        >
          <meshStandardMaterial color={p.copper} emissive={p.copper} emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

const ENERGY_DOTS = [0, 1, 2];

/* ------------------------------------------------------------------ */
/* The stack                                                           */
/* ------------------------------------------------------------------ */

function NodeStack({ active = null, onSelect, explode }: SensorNodeSceneProps) {
  const p = usePalette();
  const { paused } = useSceneMotion();
  const invalidate = useThree((s) => s.invalidate);
  const fit = useFitScale(5.0);

  const target = useRef(explode);
  target.current = explode;
  const current = useRef(explode);
  const heights = useRef(layerHeights(explode));

  const groups = useRef<Array<Group | null>>([]);
  const powerRail = useRef<Mesh>(null);
  const dataBus = useRef<Mesh>(null);
  const energy = useRef<Array<Mesh | null>>([]);
  const voltage = useRef<Group>(null);
  const data = useRef<Group>(null);
  const rings = useRef<Group>(null);

  const time = useRef(0);
  const started = useRef(false);
  const point = useMemo(() => new Vector3(), []);

  // A new slider value needs a frame even when the scene renders on demand.
  useEffect(() => {
    invalidate();
  }, [explode, invalidate]);

  useFrame((state, delta) => {
    const step = Math.min(delta, MAX_STEP);

    // 1. Ease the layers towards the slider value (or jump there when motion is paused).
    let e = current.current;
    const goal = target.current;
    e = paused ? goal : e + (goal - e) * (1 - Math.exp(-step * 7));
    if (Math.abs(goal - e) < 0.001) e = goal;
    else state.invalidate();
    current.current = e;
    const h = layerHeights(e);
    heights.current = h;
    h.forEach((y, i) => groups.current[i]?.position.setY(y));

    // 2. Stretch the power rail and the data header between the boards.
    const railFrom = 0.11;
    const railTo = h[3] + BOARD_TOP;
    if (powerRail.current) {
      powerRail.current.position.y = (railFrom + railTo) / 2;
      powerRail.current.scale.set(0.022, railTo - railFrom, 0.022);
    }
    const busFrom = h[1] + BOARD_TOP;
    if (dataBus.current) {
      dataBus.current.position.y = (busFrom + railTo) / 2;
      dataBus.current.scale.set(0.016, railTo - busFrom, 0.016);
    }

    // 3. Story time.
    if (!paused) {
      time.current += step;
      started.current = true;
    }
    const t = started.current ? time.current % CYCLE : IDLE_TIME;

    ENERGY_DOTS.forEach((i) => {
      const dot = energy.current[i];
      if (!dot) return;
      const u = (time.current * 0.35 + i / ENERGY_DOTS.length) % 1;
      dot.position.y = railFrom + u * (railTo - railFrom);
    });

    // Find the leg that started most recently; hold at its end until the next one.
    let leg: Leg | null = null;
    for (const l of LEGS) if (t >= l.at) leg = l;
    const last = LEGS[LEGS.length - 1];
    const travelling = leg !== null && !(leg === last && t > last.at + last.duration);
    if (voltage.current) voltage.current.visible = false;
    if (data.current) data.current.visible = false;
    if (leg && travelling) {
      const g = leg.kind === "voltage" ? voltage.current : data.current;
      if (g) {
        sampleLeg(leg.points, h, (t - leg.at) / leg.duration, point);
        g.position.copy(point);
        g.scale.setScalar(leg.size);
        g.visible = true;
      }
    }
    if (rings.current) {
      rings.current.visible = !started.current || (t >= RINGS_FROM && t <= RINGS_TO);
    }
  });

  return (
    <group position={[0, VIEW_Y * (1 - fit), 0]} scale={fit}>
      <group position={[-0.35, 0, 0]}>
        {ORDER.map((id, i) => {
          const Layer = LAYER[id];
          return (
            <group
              key={id}
              ref={(g) => {
                groups.current[i] = g;
              }}
              position={[0, heights.current[i], 0]}
            >
              <Layer
                highlighted={active === id}
                dim={active !== null && active !== id}
                onSelect={onSelect ? () => onSelect(id) : undefined}
              />
              <Label3D
                position={LABEL_AT[id]}
                tone={active === id ? "accent" : "default"}
                visible={explode >= 0.35 || active === id}
              >
                {LABEL[id]}
              </Label3D>
              {id === "sensing" && <HeatWave />}
              {id === "sensing" && (
                <Label3D
                  position={[-1.75, T + 0.42, SENSOR_AT[2]]}
                  tone="muted"
                  visible={explode >= 0.35}
                >
                  Heat
                </Label3D>
              )}
              {id === "radio" && (
                <group ref={rings}>
                  <SignalRings
                    position={[ANTENNA_AT[0], T + 0.04 + ANTENNA_HEIGHT, ANTENNA_AT[2]]}
                    maxRadius={0.9}
                    period={1.1}
                  />
                </group>
              )}
            </group>
          );
        })}

        {/* Power rail: the battery feeds every layer */}
        <mesh ref={powerRail} geometry={railGeometry} position={[RAIL_XZ[0], 0.5, RAIL_XZ[1]]}>
          <meshStandardMaterial color={p.warn} emissive={p.warn} emissiveIntensity={0.25} />
        </mesh>
        {ENERGY_DOTS.map((i) => (
          <mesh
            key={i}
            ref={(m) => {
              energy.current[i] = m;
            }}
            geometry={packetGeometry}
            position={[RAIL_XZ[0], 0.2, RAIL_XZ[1]]}
            scale={0.04}
          >
            <meshStandardMaterial color={p.warn} emissive={p.warn} emissiveIntensity={0.9} />
          </mesh>
        ))}

        {/* Stacking header that carries data between the boards */}
        <mesh ref={dataBus} geometry={railGeometry} position={[BUS_XZ[0], 1, BUS_XZ[1]]}>
          <meshStandardMaterial color={p.ink3} roughness={0.5} />
        </mesh>

        {/* The reading: a voltage (copper), then a number and a packet (green) */}
        <group ref={voltage} visible={false}>
          <mesh geometry={packetGeometry}>
            <meshStandardMaterial color={p.copper} emissive={p.copper} emissiveIntensity={0.9} />
          </mesh>
          <mesh geometry={packetGeometry} scale={2.2}>
            <meshBasicMaterial color={p.copper} transparent opacity={0.22} depthWrite={false} />
          </mesh>
        </group>
        <group ref={data} visible={false}>
          <mesh geometry={packetGeometry}>
            <meshStandardMaterial color={p.signal} emissive={p.signal} emissiveIntensity={0.9} />
          </mesh>
          <mesh geometry={packetGeometry} scale={2.2}>
            <meshBasicMaterial color={p.signal} transparent opacity={0.22} depthWrite={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/**
 * Topic 1.3: an exploded sensor node. Four stacked layers (power, sensing,
 * processing, radio) move apart with the slider, and a reading climbs from
 * the sensor to the antenna.
 */
export default function SensorNodeScene({ active = null, onSelect, explode }: SensorNodeSceneProps) {
  return (
    <Scene3D
      label="An exploded view of a sensor node with four layers: a battery pack at the bottom, then the sensor and ADC board, the microcontroller board, and the radio board with its antenna on top. A reading climbs from the sensor through the ADC and microcontroller to the antenna, which sends it out as radio waves."
      height="clamp(360px, 92vw, 460px)"
      camera={{ position: [1.4, 3.15, 6.25], fov: 40, target: [0.1, VIEW_Y, 0] }}
    >
      <NodeStack active={active} onSelect={onSelect} explode={explode} />
    </Scene3D>
  );
}
