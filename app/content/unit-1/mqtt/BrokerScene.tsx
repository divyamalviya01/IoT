import { useMemo, useRef, useState } from "react";
import { RoundedBox } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group, MeshBasicMaterial, MeshStandardMaterial } from "three";
import { topicMatches } from "~/labs/l06-mqtt-broker/engine";
import { usePalette, type Palette } from "~/lib/palette";
import {
  AssetFrame,
  GlowMaterial,
  Label3D,
  Led,
  Link3D,
  PacketParticle,
  Phone,
  Rack,
  Scene3D,
  SensorNode,
  mixColor,
  useFitScale,
  useSceneMotion,
  type AssetProps,
  type Label3DTone,
  type Vec3,
} from "~/components/three";

export type BrokerPart = "broker" | "temp" | "door" | "phone" | "dashboard" | "alarm";
/** Which publishers are sending: both, or only one of them. */
export type MessageSource = "both" | "temp" | "door";

type Publisher = "temp" | "door";
type Subscriber = "phone" | "dashboard" | "alarm";

export interface BrokerSceneProps {
  active?: BrokerPart | null;
  onSelect?: (id: BrokerPart) => void;
  source?: MessageSource;
}

/* ------------------------------------------------------------------ */
/* Topics and subscriptions                                            */
/* ------------------------------------------------------------------ */

export const TOPICS: Record<Publisher, string> = {
  temp: "home/livingroom/temperature",
  door: "home/door/status",
};

export const SUBSCRIPTIONS: Record<Subscriber, string> = {
  phone: "home/#",
  dashboard: "home/+/temperature",
  alarm: "home/door/status",
};

const SUBSCRIBERS: Subscriber[] = ["phone", "dashboard", "alarm"];

/** Who the broker forwards each message to, worked out from the subscriptions. */
const RECEIVERS: Record<Publisher, Subscriber[]> = {
  temp: SUBSCRIBERS.filter((s) => topicMatches(SUBSCRIPTIONS[s], TOPICS.temp)),
  door: SUBSCRIBERS.filter((s) => topicMatches(SUBSCRIPTIONS[s], TOPICS.door)),
};

const SCHEDULES: Record<MessageSource, readonly Publisher[]> = {
  both: ["temp", "door"],
  temp: ["temp"],
  door: ["door"],
};

const TEMPERATURES = [24, 25, 26, 25];

function payload(kind: Publisher, count: number): string {
  if (kind === "door") return count % 2 === 1 ? "“open”" : "“closed”";
  return `${TEMPERATURES[(Math.max(count, 1) - 1) % TEMPERATURES.length]} °C`;
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

interface PartSpec {
  label: string;
  position: Vec3;
  rotation?: Vec3;
  scale?: number;
  /** Where the floating label sits. */
  labelAt: Vec3;
  /** Where packets leave or arrive. */
  anchor: Vec3;
}

/** Height the camera looks at; the fit scale shrinks the diorama around it. */
const VIEW_Y = 0.55;
const BROKER_AT: Vec3 = [0, 0, -0.2];
/** Where messages arrive at the broker, wait, and leave again. */
const HUB: Vec3 = [0, 1.62, -0.2];

// Parts at the back carry their label above them; parts at the front carry it
// in front, so labels never sit on top of a neighbour.
const PARTS: Record<BrokerPart, PartSpec> = {
  broker: {
    label: "Broker",
    position: BROKER_AT,
    labelAt: [0, 0.02, 0.85],
    anchor: HUB,
  },
  temp: {
    label: "Temperature sensor",
    position: [-2.3, 0, -0.95],
    rotation: [0, 0.5, 0],
    scale: 1.05,
    labelAt: [-2.1, 1.62, -0.95],
    anchor: [-2.27, 0.86, -0.9],
  },
  door: {
    label: "Door sensor",
    position: [-2.5, 0, 0.95],
    rotation: [0, 0.45, 0],
    scale: 0.95,
    labelAt: [-2.2, 0.02, 1.62],
    anchor: [-2.5, 1.12, 0.95],
  },
  phone: {
    label: "Phone app",
    position: [2.05, 0, -1.4],
    rotation: [0, -0.45, 0],
    labelAt: [2.05, 1.55, -1.4],
    anchor: [2.05, 1.0, -1.3],
  },
  dashboard: {
    label: "Dashboard",
    position: [2.75, 0, 0],
    rotation: [0, -0.5, 0],
    scale: 0.95,
    labelAt: [2.45, 1.45, 0],
    anchor: [2.72, 1.06, 0.02],
  },
  alarm: {
    label: "Door alarm",
    position: [2.15, 0, 1.4],
    rotation: [0, -0.4, 0],
    labelAt: [1.3, 0.3, 1.6],
    anchor: [2.15, 0.68, 1.4],
  },
};

const BASE_TONE: Record<BrokerPart, Label3DTone> = {
  broker: "default",
  temp: "u1",
  door: "u3",
  phone: "default",
  dashboard: "default",
  alarm: "default",
};

function messageColor(p: Palette, kind: Publisher): string {
  return kind === "temp" ? p.u1 : p.u3;
}

function baseAccent(p: Palette, id: BrokerPart): string {
  if (id === "temp") return p.u1;
  if (id === "door") return p.u3;
  return p.brand;
}

const LINK_ARC = 0.3;
const CLIENTS: Exclude<BrokerPart, "broker">[] = ["temp", "door", "phone", "dashboard", "alarm"];

/* ------------------------------------------------------------------ */
/* Timing: publish, wait at the broker, forward to matching clients    */
/* ------------------------------------------------------------------ */

/** Longest step taken in one frame; matches PacketParticle so the two stay in step. */
const MAX_STEP = 0.1;
const UP = 1.0;
const HOLD = 0.6;
const DOWN = 1.0;
const ARRIVE = UP + HOLD + DOWN;
/** How long the publisher, broker and subscribers glow. */
const SEND_GLOW = 0.5;
const ARRIVE_GLOW = 1.0;
const RING = 1.4;
/** Time given to one message before the next one starts. */
const PHASE = 4.2;

interface Flow {
  /** Parts glowing right now, with the kind of message that lit them. */
  flash: Partial<Record<BrokerPart, Publisher>>;
  /** The message waiting at or leaving the broker. */
  held: Publisher | null;
  /** How many messages of the held kind have been sent so far. */
  count: number;
  doorOpen: boolean;
  ringing: boolean;
}

const IDLE_FLOW: Flow = { flash: {}, held: null, count: 0, doorOpen: false, ringing: false };

function flowAt(time: number, schedule: readonly Publisher[]): Flow {
  const cycle = PHASE * schedule.length;
  const flow: Flow = { flash: {}, held: null, count: 0, doorOpen: false, ringing: false };
  schedule.forEach((kind, i) => {
    const local = time - i * PHASE;
    if (local < 0) return;
    const count = Math.floor(local / cycle) + 1;
    const s = local % cycle;
    if (kind === "door") flow.doorOpen = count % 2 === 1;
    if (s < SEND_GLOW) flow.flash[kind] = kind;
    if (s >= UP && s < UP + HOLD + 0.2) flow.flash.broker = kind;
    if (s >= UP && s < ARRIVE) {
      flow.held = kind;
      flow.count = count;
    }
    if (s >= ARRIVE && s < ARRIVE + ARRIVE_GLOW) {
      for (const sub of RECEIVERS[kind]) flow.flash[sub] = kind;
    }
    if (kind === "door" && s >= ARRIVE && s < ARRIVE + RING) flow.ringing = true;
  });
  return flow;
}

/** One clock for the glows, the door and the alarm, in step with the packets beside it. */
function MessageClock({
  schedule,
  onChange,
}: {
  schedule: readonly Publisher[];
  onChange: (flow: Flow) => void;
}) {
  const { paused } = useSceneMotion();
  const time = useRef(0);
  const started = useRef(false);
  const last = useRef("");

  useFrame((_, delta) => {
    if (!paused) {
      time.current += Math.min(delta, MAX_STEP);
      started.current = true;
    }
    const flow = started.current ? flowAt(time.current, schedule) : IDLE_FLOW;
    const key = JSON.stringify(flow);
    if (key === last.current) return;
    last.current = key;
    onChange(flow);
  });

  return null;
}

function Messages({ schedule, color }: { schedule: readonly Publisher[]; color: (k: Publisher) => string }) {
  const cycle = PHASE * schedule.length;
  return (
    <>
      {schedule.map((kind, i) => {
        const start = i * PHASE;
        const tint = color(kind);
        return (
          <group key={kind}>
            {/* Published once, to the broker */}
            <PacketParticle
              from={PARTS[kind].anchor}
              to={HUB}
              arc={LINK_ARC}
              duration={UP}
              delay={start}
              repeatDelay={cycle - UP}
              color={tint}
              size={0.1}
            />
            {/* Waits at the broker while it checks the subscriptions */}
            <PacketParticle
              path={[HUB, HUB]}
              duration={HOLD}
              delay={start + UP}
              repeatDelay={cycle - HOLD}
              color={tint}
              size={0.11}
            />
            {/* One copy per matching subscriber */}
            {RECEIVERS[kind].map((sub) => (
              <PacketParticle
                key={sub}
                from={HUB}
                to={PARTS[sub].anchor}
                arc={LINK_ARC}
                duration={DOWN}
                delay={start + UP + HOLD}
                repeatDelay={cycle - DOWN}
                color={tint}
                size={0.1}
              />
            ))}
          </group>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Models                                                              */
/* ------------------------------------------------------------------ */

/** The broker: a small server on a round plinth, with a ring on top where messages wait. */
function BrokerHub(props: AssetProps) {
  const p = usePalette();
  const plinth = useMemo(() => mixColor(p.surface2, p.brand, 0.35), [p.surface2, p.brand]);
  return (
    <AssetFrame {...props} labelHeight={2}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.74, 0.82, 0.1, 32]} />
        <meshStandardMaterial color={plinth} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.105, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.66, 0.03, 6, 40]} />
        <GlowMaterial color={p.brand} roughness={0.4} />
      </mesh>
      <Rack position={[0, 0.1, 0]} scale={0.62} />
      {/* Mast and catch ring */}
      <mesh position={[0, 1.39, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.1, 8]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.17, 0.022, 6, 24]} />
        <GlowMaterial color={p.brand} roughness={0.4} />
      </mesh>
    </AssetFrame>
  );
}

const DOOR_OPEN = -1.0;

/** A door in its frame, with a two-part magnetic sensor. The door swings when its state changes. */
function DoorSensor({ open, ...props }: AssetProps & { open: boolean }) {
  const p = usePalette();
  const { paused } = useSceneMotion();
  const hinge = useRef<Group>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const door = useMemo(() => mixColor(p.copper, p.casing, 0.45), [p.copper, p.casing]);

  useFrame((state, delta) => {
    const g = hinge.current;
    if (!g || paused) return;
    const target = openRef.current ? DOOR_OPEN : 0;
    const diff = target - g.rotation.y;
    if (Math.abs(diff) < 1e-3) {
      if (diff !== 0) g.rotation.y = target;
      return;
    }
    g.rotation.y += diff * (1 - Math.exp(-Math.min(delta, MAX_STEP) * 9));
    state.invalidate();
  });

  return (
    <AssetFrame {...props} labelHeight={1.4}>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.86, 0.04, 0.4]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.8} />
      </mesh>
      {/* Frame */}
      {[-0.34, 0.34].map((x) => (
        <mesh key={x} position={[x, 0.54, 0]}>
          <boxGeometry args={[0.07, 1.0, 0.12]} />
          <meshStandardMaterial color={p.casing} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 1.075, 0]}>
        <boxGeometry args={[0.75, 0.07, 0.12]} />
        <meshStandardMaterial color={p.casing} roughness={0.7} />
      </mesh>
      {/* Door, hinged on the left post */}
      <group ref={hinge} position={[-0.3, 0.54, 0]}>
        <mesh position={[0.3, 0, 0]}>
          <boxGeometry args={[0.6, 0.98, 0.045]} />
          <GlowMaterial color={door} roughness={0.7} />
        </mesh>
        <mesh position={[0.52, -0.04, 0.04]}>
          <sphereGeometry args={[0.03, 8, 6]} />
          <meshStandardMaterial color={p.casingDark} roughness={0.5} />
        </mesh>
        {/* Magnet half of the sensor */}
        <mesh position={[0.56, 0.36, 0.04]}>
          <boxGeometry args={[0.06, 0.12, 0.035]} />
          <meshStandardMaterial color={p.silk} roughness={0.5} />
        </mesh>
      </group>
      {/* Sensor half on the frame, with its status light */}
      <RoundedBox args={[0.1, 0.24, 0.07]} radius={0.02} smoothness={2} position={[0.36, 0.9, 0.09]}>
        <GlowMaterial color={p.silk} roughness={0.5} />
      </RoundedBox>
      <Led position={[0.36, 0.98, 0.13]} color={p.ok} size={0.02} period={1.6} />
    </AssetFrame>
  );
}

const DASH_BARS = [0.1, 0.15, 0.12, 0.19, 0.16];

/** A flat screen on a stand, showing temperature tiles and a small chart. About 1 wide. */
function Dashboard(props: AssetProps) {
  const p = usePalette();
  const colors = useMemo(
    () => ({
      tile: mixColor(p.silk, p.u1, 0.25),
      footer: mixColor(p.silk, p.lineStrong, 0.6),
    }),
    [p.silk, p.u1, p.lineStrong],
  );
  return (
    <AssetFrame {...props} labelHeight={1.4}>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.5, 0.04, 0.32]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.27, -0.02]}>
        <cylinderGeometry args={[0.035, 0.035, 0.46, 10]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.6} />
      </mesh>
      <group position={[0, 0.8, 0]} rotation={[-0.12, 0, 0]}>
        <RoundedBox args={[1.0, 0.62, 0.05]} radius={0.03} smoothness={2}>
          <GlowMaterial color={p.casingDark} roughness={0.4} />
        </RoundedBox>
        <group position={[0, 0, 0.027]}>
          <mesh>
            <boxGeometry args={[0.92, 0.54, 0.004]} />
            <meshStandardMaterial color={p.silk} emissive={p.silk} emissiveIntensity={0.25} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.215, 0.003]}>
            <boxGeometry args={[0.84, 0.06, 0.002]} />
            <meshStandardMaterial color={p.brand} roughness={0.5} />
          </mesh>
          {/* Reading tile */}
          <mesh position={[-0.22, 0.02, 0.003]}>
            <boxGeometry args={[0.34, 0.24, 0.002]} />
            <meshStandardMaterial color={colors.tile} roughness={0.5} />
          </mesh>
          <mesh position={[-0.24, 0.05, 0.005]}>
            <boxGeometry args={[0.2, 0.07, 0.002]} />
            <meshStandardMaterial color={p.u1} roughness={0.5} />
          </mesh>
          <mesh position={[-0.27, -0.04, 0.005]}>
            <boxGeometry args={[0.14, 0.03, 0.002]} />
            <meshStandardMaterial color={p.ink3} roughness={0.5} />
          </mesh>
          {/* Chart */}
          {DASH_BARS.map((h, i) => (
            <mesh key={i} position={[0.06 + i * 0.075, -0.1 + h / 2, 0.003]}>
              <boxGeometry args={[0.05, h, 0.002]} />
              <meshStandardMaterial color={p.u1} roughness={0.5} />
            </mesh>
          ))}
          <mesh position={[0, -0.205, 0.003]}>
            <boxGeometry args={[0.84, 0.06, 0.002]} />
            <meshStandardMaterial color={colors.footer} roughness={0.5} />
          </mesh>
        </group>
      </group>
    </AssetFrame>
  );
}

const BLINK = 0.18;

/** A red warning light that flashes while `ringing`, and holds still when the scene is paused. */
function AlarmLight({ position, ringing }: { position: Vec3; ringing: boolean }) {
  const p = usePalette();
  const { paused } = useSceneMotion();
  const lamp = useRef<MeshStandardMaterial>(null);
  const halo = useRef<MeshBasicMaterial>(null);
  const time = useRef(0);

  useFrame((_, delta) => {
    const l = lamp.current;
    const h = halo.current;
    if (!l || !h) return;
    if (!ringing) {
      time.current = 0;
      l.emissiveIntensity = 0.25;
      h.opacity = 0;
      return;
    }
    if (paused) return;
    time.current += Math.min(delta, MAX_STEP);
    const on = Math.floor(time.current / BLINK) % 2 === 0;
    l.emissiveIntensity = on ? 1.8 : 0.25;
    h.opacity = on ? 0.32 : 0;
  });

  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.11, 0.12, 0.04, 16]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          ref={lamp}
          color={p.bad}
          emissive={p.bad}
          emissiveIntensity={0.25}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <sphereGeometry args={[0.2, 12, 8]} />
        <meshBasicMaterial ref={halo} color={p.bad} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

const GRILLE_Y = [0.37, 0.42, 0.47];

/** A small alarm box on a post, with a red light on top. */
function DoorAlarm({ ringing, ...props }: AssetProps & { ringing: boolean }) {
  const p = usePalette();
  return (
    <AssetFrame {...props} labelHeight={1}>
      <mesh position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.2, 0.23, 0.05, 20]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.24, 8]} />
        <meshStandardMaterial color={p.casingDark} roughness={0.6} />
      </mesh>
      <RoundedBox args={[0.46, 0.3, 0.3]} radius={0.04} smoothness={2} position={[0, 0.43, 0]}>
        <GlowMaterial color={p.casing} />
      </RoundedBox>
      {GRILLE_Y.map((y) => (
        <mesh key={y} position={[-0.06, y, 0.151]}>
          <boxGeometry args={[0.22, 0.022, 0.008]} />
          <meshStandardMaterial color={p.casingDark} roughness={0.7} />
        </mesh>
      ))}
      <Led position={[0.15, 0.47, 0.152]} color={p.ok} size={0.022} period={2} />
      <AlarmLight position={[0, 0.6, 0]} ringing={ringing} />
    </AssetFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

function BrokerHubDiorama({ active = null, onSelect, source = "both" }: BrokerSceneProps) {
  const p = usePalette();
  const fit = useFitScale(7.4);
  const [flow, setFlow] = useState<Flow>(IDLE_FLOW);
  const schedule = SCHEDULES[source];

  const colors = useMemo(() => {
    const ground = mixColor(p.surface2, p.lineStrong, 0.35);
    return {
      ground,
      temp: mixColor(ground, p.u1, 0.4),
      door: mixColor(ground, p.u3, 0.4),
      subscriber: mixColor(ground, p.ink3, 0.3),
    };
  }, [p]);

  const partProps = (id: BrokerPart): AssetProps => {
    const spec = PARTS[id];
    const lit = flow.flash[id];
    return {
      position: spec.position,
      rotation: spec.rotation,
      scale: spec.scale,
      highlighted: active === id || lit !== undefined,
      accent: lit ? messageColor(p, lit) : baseAccent(p, id),
      onSelect: onSelect ? () => onSelect(id) : undefined,
    };
  };

  const pad = (id: BrokerPart, color: string, radius = 0.5) => {
    const [x, y, z] = PARTS[id].position;
    return (
      <mesh position={[x, y + 0.012, z]}>
        <cylinderGeometry args={[radius, radius, 0.024, 28]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    );
  };

  const held = flow.held;
  // On narrow screens the message label would cover the part labels; the colours still tell the story.
  const roomy = useThree((s) => s.size.width) >= 520;

  return (
    <group position={[0, VIEW_Y * (1 - fit), 0]} scale={fit}>
      {/* Ground */}
      <RoundedBox args={[7.0, 0.14, 4.3]} radius={0.06} smoothness={2} position={[0, -0.07, 0]}>
        <meshStandardMaterial color={colors.ground} roughness={0.9} />
      </RoundedBox>

      {/* Pads: publishers in their message colour, subscribers in grey */}
      {pad("temp", colors.temp, 0.45)}
      {pad("door", colors.door, 0.5)}
      {pad("phone", colors.subscriber, 0.42)}
      {pad("dashboard", colors.subscriber, 0.52)}
      {pad("alarm", colors.subscriber, 0.38)}

      {/* Broker */}
      <BrokerHub {...partProps("broker")} />

      {/* Publishers */}
      <SensorNode {...partProps("temp")} />
      <DoorSensor {...partProps("door")} open={flow.doorOpen} />

      {/* Subscribers */}
      <Phone {...partProps("phone")} />
      <Dashboard {...partProps("dashboard")} />
      <DoorAlarm {...partProps("alarm")} ringing={flow.ringing} />

      {/* Every client talks only to the broker */}
      {CLIENTS.map((id) => (
        <Link3D key={id} from={PARTS[id].anchor} to={HUB} arc={LINK_ARC} lineWidth={1.25} />
      ))}

      {/* Labels */}
      {(Object.keys(PARTS) as BrokerPart[]).map((id) => (
        <Label3D key={id} position={PARTS[id].labelAt} tone={active === id ? "accent" : BASE_TONE[id]}>
          {active === id ? <strong>{PARTS[id].label}</strong> : PARTS[id].label}
        </Label3D>
      ))}

      {/* The message the broker is handling: its topic, then its content */}
      <Label3D
        position={[HUB[0], HUB[1] + 0.62, HUB[2]]}
        tone={held === "door" ? "u3" : "u1"}
        visible={held !== null && roomy}
      >
        <span className="block font-mono text-[12px]">{TOPICS[held ?? "temp"]}</span>
        <span className="block text-center font-semibold">{payload(held ?? "temp", flow.count)}</span>
      </Label3D>

      {/* Messages: once to the broker, then one copy per matching subscriber */}
      <group key={source}>
        <MessageClock schedule={schedule} onChange={setFlow} />
        <Messages schedule={schedule} color={(kind) => messageColor(p, kind)} />
      </group>
    </group>
  );
}

/**
 * Topic 1.9: an MQTT broker in the middle of a smart home. Two sensors publish
 * to topics; the broker forwards a copy of each message only to the clients
 * whose subscription matches the topic.
 */
export default function BrokerScene({ active = null, onSelect, source = "both" }: BrokerSceneProps) {
  return (
    <Scene3D
      label="An MQTT broker forwarding messages from two sensors to the subscribers whose topics match"
      height="clamp(300px, 72vw, 420px)"
      camera={{ position: [0, 4.9, 5.3], fov: 40, target: [0, VIEW_Y, 0] }}
    >
      <BrokerHubDiorama active={active} onSelect={onSelect} source={source} />
    </Scene3D>
  );
}
