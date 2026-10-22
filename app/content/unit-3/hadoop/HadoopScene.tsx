import { useLayoutEffect, useMemo, useRef } from "react";
import { RoundedBox } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { BoxGeometry, Color, Matrix4, Quaternion, Vector3, type InstancedMesh } from "three";
import { CLUSTER, NODES_PER_RACK, RACKS, rackName, type Copy, type Hdfs } from "~/labs/l23-hadoop/engine";
import { usePalette } from "~/lib/palette";
import { useResolvedTheme } from "~/lib/theme";
import {
  AssetFrame,
  GlowMaterial,
  InstancedParts,
  Label3D,
  Led,
  Link3D,
  PacketParticle,
  Rack,
  Scene3D,
  mixColor,
  useFitScale,
  type PartInstance,
  type Vec3,
} from "~/components/three";

export type HadoopPart = "namenode" | "datanode" | "block" | "replica" | "rack" | "heartbeat";
export type Phase = "healthy" | "detecting" | "repairing" | "repaired";

export interface HadoopSceneProps {
  /** The file as written, before anything failed. */
  hdfs: Hdfs;
  /** DataNode id that has failed, or null. */
  failed: number | null;
  phase: Phase;
  /** New copies the NameNode orders after a failure. */
  copies: Copy[];
  /** Blocks with no live copy left. */
  lost: number[];
  /** Changes whenever the cluster is set up again, so packets restart. */
  runKey: string;
  active?: HadoopPart | null;
  onSelect?: (id: HadoopPart) => void;
  /** Clicking a DataNode fails it, or brings it back. */
  onToggleNode?: (id: number) => void;
  /** Called as each new copy lands on its DataNode. */
  onCopyArrive?: () => void;
}

export const nodeName = (id: number) => CLUSTER[id]?.name ?? `D${id + 1}`;
export const blockName = (b: number) => `Block ${b + 1}`;

/* ------------------------------------------------------------------ */
/* Block colours: the chart series tokens, read from app.css           */
/* ------------------------------------------------------------------ */

const SERIES_FALLBACK = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];

/** Hex colours for seriesColor(0…n-1), so each block keeps one colour in 2D and 3D. */
export function useBlockColors(count: number): string[] {
  const theme = useResolvedTheme();
  return useMemo(() => {
    const css = typeof document === "undefined" ? null : getComputedStyle(document.documentElement);
    return Array.from({ length: count }, (_, i) => {
      const slot = Math.min(i, 7);
      return css?.getPropertyValue(`--series-${slot + 1}`).trim() || SERIES_FALLBACK[slot];
    });
    // The theme decides which token values are live.
  }, [count, theme]);
}

/* ------------------------------------------------------------------ */
/* Layout (world units)                                                */
/* ------------------------------------------------------------------ */

const RACK_Z = 0.6;
const SERVER_W = 1.5;
const SERVER_H = 0.4;
const SERVER_D = 0.7;
/** First node of a rack at the top, last at the bottom. */
const SERVER_Y = [1.38, 0.88, 0.38];
const FACE_Z = RACK_Z + SERVER_D / 2;
/** One drive bay per block, so a block always sits in the same place on every node. */
const BAY_X = [0.02, 0.22, 0.42, 0.62];
const CUBE = 0.16;
const FRAME_W = 1.7;
const FRAME_D = 0.86;
const FRAME_H = 1.7;

const NAME_X = 0;
const NAME_Z = -2.3;
const PLINTH_H = 0.85;
const NAME_SCALE = 0.85;
/** Where heartbeats arrive at the NameNode. */
const NAME_PORT: Vec3 = [NAME_X, PLINTH_H + 1.25 * NAME_SCALE, NAME_Z + 0.38 * NAME_SCALE];

const VIEW_Y = 0.9;

interface Layout {
  rackX: number[];
  /** Width the fit scale keeps in view. Wider than the racks, because their fronts are nearer the camera. */
  fitWidth: number;
  /** Cubes are drawn a little larger on phones. */
  cube: number;
  nodeAt: (id: number) => Vec3;
  cubeAt: (node: number, block: number) => Vec3;
  backOf: (node: number) => Vec3;
  bays: PartInstance[];
  posts: PartInstance[];
}

function makeLayout(pitch: number, fitWidth: number, cube: number): Layout {
  const rackX = Array.from({ length: RACKS }, (_, r) => (r - (RACKS - 1) / 2) * pitch);
  const nodeAt = (id: number): Vec3 => [rackX[CLUSTER[id].rack], SERVER_Y[id % NODES_PER_RACK], RACK_Z];
  const cubeAt = (node: number, block: number): Vec3 => {
    const [x, y] = nodeAt(node);
    return [x + BAY_X[block % BAY_X.length], y, FACE_Z + cube / 2 - 0.02];
  };
  const backOf = (node: number): Vec3 => {
    const [x, y, z] = nodeAt(node);
    return [x, y + 0.08, z - SERVER_D / 2];
  };
  const bays = CLUSTER.flatMap((n) =>
    BAY_X.map((bx) => {
      const [x, y] = nodeAt(n.id);
      return { position: [x + bx, y, FACE_Z + 0.004] as Vec3, scale: [0.18, 0.21, 0.012] as Vec3 };
    }),
  );
  const posts = rackX.flatMap((x) =>
    [-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) => ({
        position: [x + sx * (FRAME_W / 2 - 0.03), FRAME_H / 2 + 0.05, RACK_Z + sz * (FRAME_D / 2 - 0.03)] as Vec3,
        scale: [0.06, FRAME_H, 0.06] as Vec3,
      })),
    ),
  );
  return { rackX, fitWidth, cube, nodeAt, cubeAt, backOf, bays, posts };
}

/** On phones the long "lost" label moves towards the middle so it stays in view. */
const lostX = (rackX: number, roomy: boolean) => (roomy ? rackX : Math.max(-1.3, Math.min(1.3, rackX)));

/** Wide views spread the racks out; phones pack them closer so each rack can be drawn bigger. */
const WIDE = makeLayout(2.3, 8.4, CUBE);
const NARROW = makeLayout(1.84, 7.0, CUBE * 1.15);

const cubeGeometry = new BoxGeometry(1, 1, 1);
const tmpMatrix = new Matrix4();
const tmpPos = new Vector3();
const tmpScale = new Vector3();
const noTurn = new Quaternion();
const tmpColor = new Color();

interface CubeItem {
  position: Vec3;
  size: number;
  color: string;
}

const MAX_CUBES = CLUSTER.length * BAY_X.length;

/** Every block copy in one draw call. */
function BlockCubes({ items, onSelect }: { items: CubeItem[]; onSelect?: () => void }) {
  const ref = useRef<InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const count = Math.min(items.length, MAX_CUBES);
    for (let i = 0; i < count; i++) {
      const c = items[i];
      tmpMatrix.compose(tmpPos.set(...c.position), noTurn, tmpScale.setScalar(c.size));
      mesh.setMatrixAt(i, tmpMatrix);
      mesh.setColorAt(i, tmpColor.set(c.color));
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    invalidate();
  }, [items, invalidate]);

  const handlers = onSelect
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (e.delta > 6) return;
          onSelect();
        },
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        },
        onPointerOut: () => {
          document.body.style.cursor = "";
        },
      }
    : {};

  return (
    <instancedMesh ref={ref} args={[cubeGeometry, undefined, MAX_CUBES]} {...handlers}>
      <meshStandardMaterial roughness={0.45} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
/* Models                                                              */
/* ------------------------------------------------------------------ */

/** One DataNode: a rack server with a status light. Darker and tinted when it has failed. */
function DataNodeBox({
  id,
  position,
  down,
  highlighted,
  onSelect,
}: {
  id: number;
  position: Vec3;
  down: boolean;
  highlighted: boolean;
  onSelect?: () => void;
}) {
  const p = usePalette();
  const body = down ? mixColor(p.casingDark, p.bad, 0.3) : p.casing;
  const face = down ? mixColor(p.casingDark, p.bad, 0.18) : p.casingDark;
  return (
    <AssetFrame position={position} highlighted={highlighted} accent={p.brand} onSelect={onSelect} labelHeight={0}>
      <RoundedBox args={[SERVER_W, SERVER_H, SERVER_D]} radius={0.03} smoothness={2}>
        <GlowMaterial color={body} roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 0, SERVER_D / 2 - 0.004]}>
        <boxGeometry args={[SERVER_W - 0.08, SERVER_H - 0.08, 0.012]} />
        <meshStandardMaterial color={face} roughness={0.7} />
      </mesh>
      <Led
        position={[SERVER_W / 2 - 0.08, SERVER_H / 2 - 0.09, SERVER_D / 2 + 0.01]}
        color={down ? p.bad : p.ok}
        size={0.028}
        blink={!down}
        period={1.4 + (id % 3) * 0.3}
        phase={(id * 0.29) % 1}
      />
    </AssetFrame>
  );
}

/** Rack frames, lifted a little so they still show against the dark theme. */
function useFrameColor(): string {
  const p = usePalette();
  return useMemo(() => mixColor(p.casingDark, p.ink3, 0.3), [p.casingDark, p.ink3]);
}

/** The open frame of one rack: a base, a top and four posts (the posts are drawn together). */
function RackFrame({ x, highlighted, onSelect }: { x: number; highlighted: boolean; onSelect?: () => void }) {
  const p = usePalette();
  const frame = useFrameColor();
  return (
    <AssetFrame position={[x, 0, RACK_Z]} highlighted={highlighted} accent={p.brand} onSelect={onSelect} labelHeight={0}>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[FRAME_W + 0.04, 0.1, FRAME_D + 0.04]} />
        <GlowMaterial color={frame} roughness={0.8} />
      </mesh>
      <mesh position={[0, FRAME_H + 0.05, 0]}>
        <boxGeometry args={[FRAME_W, 0.06, FRAME_D]} />
        <GlowMaterial color={frame} roughness={0.8} />
      </mesh>
    </AssetFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Diorama                                                             */
/* ------------------------------------------------------------------ */

function Cluster({
  hdfs,
  failed,
  phase,
  copies,
  lost,
  runKey,
  active = null,
  onSelect,
  onToggleNode,
  onCopyArrive,
}: HadoopSceneProps) {
  const p = usePalette();
  const roomy = useThree((s) => s.size.width) >= 520;
  const L = roomy ? WIDE : NARROW;
  const fit = useFitScale(L.fitWidth);
  const blockColors = useBlockColors(hdfs.blocks.length);
  const frameColor = useFrameColor();

  const colors = useMemo(() => {
    const ground = mixColor(p.surface2, p.lineStrong, 0.35);
    return {
      ground,
      plinth: mixColor(ground, p.brand, 0.35),
      dead: mixColor(p.lineStrong, p.ink3, 0.35),
      link: mixColor(p.ink3, p.surface, 0.25),
    };
  }, [p]);

  const select = (id: HadoopPart) => (onSelect ? () => onSelect(id) : undefined);
  const repaired = phase === "repaired";

  /* Every block copy: coloured when alive, grey on the failed node, new copies once they have landed */
  const cubes = useMemo<CubeItem[]>(() => {
    const out: CubeItem[] = [];
    const replicaFocus = active === "replica";
    const grow = active === "block" ? 1.18 : 1;
    const add = (node: number, block: number) => {
      const dead = node === failed;
      const focus = replicaFocus && block === 0;
      let color = dead ? colors.dead : blockColors[block];
      if (replicaFocus && !focus && !dead) color = mixColor(color, p.surface2, 0.6);
      out.push({ position: L.cubeAt(node, block), size: L.cube * (focus ? 1.35 : grow), color });
    };
    for (const b of hdfs.blocks) for (const node of hdfs.replicas[b.id]) add(node, b.id);
    if (repaired) for (const c of copies) add(c.to, c.block);
    return out;
  }, [L, hdfs, failed, repaired, copies, active, blockColors, colors.dead, p.surface2]);

  const heartbeatOn = active === "heartbeat";
  const nameStatus =
    failed === null
      ? null
      : phase === "detecting"
        ? `No heartbeat from ${nodeName(failed)}`
        : phase === "repairing"
          ? `Copying ${copies.length} ${copies.length === 1 ? "block" : "blocks"}`
          : lost.length > 0
            ? "Cannot repair"
            : copies.length > 0
              ? "All blocks safe again"
              : null;

  return (
    <group position={[0, VIEW_Y * (1 - fit), 0]} scale={fit}>
      {/* Floor */}
      <RoundedBox args={[7.8, 0.12, 5.2]} radius={0.05} smoothness={2} position={[0, -0.06, -0.8]}>
        <meshStandardMaterial color={colors.ground} roughness={0.9} />
      </RoundedBox>

      {/* NameNode on its plinth */}
      <mesh position={[NAME_X, PLINTH_H / 2, NAME_Z]}>
        <cylinderGeometry args={[0.62, 0.7, PLINTH_H, 28]} />
        <meshStandardMaterial color={colors.plinth} roughness={0.8} />
      </mesh>
      <Rack
        position={[NAME_X, PLINTH_H, NAME_Z]}
        scale={NAME_SCALE}
        highlighted={active === "namenode"}
        accent={p.brand}
        onSelect={select("namenode")}
      />
      <Label3D position={[NAME_X, PLINTH_H + 2 * NAME_SCALE + 0.3, NAME_Z]} tone={active === "namenode" ? "accent" : "default"}>
        <span className="block text-center font-semibold">NameNode</span>
        {nameStatus && (
          <span className={`block text-center text-[12px] ${lost.length > 0 || phase === "detecting" ? "text-bad" : "text-ink-2"}`}>
            {nameStatus}
          </span>
        )}
      </Label3D>

      {/* Racks */}
      {Array.from({ length: RACKS }, (_, r) => (
        <group key={r}>
          <RackFrame x={L.rackX[r]} highlighted={active === "rack"} onSelect={select("rack")} />
          <Label3D position={[L.rackX[r], 0.02, RACK_Z + FRAME_D / 2 + 0.32]} tone={active === "rack" ? "accent" : "muted"}>
            {active === "rack" ? <strong>{rackName(r)}</strong> : rackName(r)}
          </Label3D>
        </group>
      ))}
      <InstancedParts items={L.posts} color={frameColor} roughness={0.75} />

      {/* DataNodes */}
      {CLUSTER.map((n) => (
        <DataNodeBox
          key={n.id}
          id={n.id}
          position={L.nodeAt(n.id)}
          down={n.id === failed}
          highlighted={active === "datanode"}
          onSelect={onToggleNode ? () => onToggleNode(n.id) : undefined}
        />
      ))}
      <InstancedParts items={L.bays} color={mixColor(p.casingDark, p.ink3, 0.18)} roughness={0.8} />
      <BlockCubes items={cubes} onSelect={select(active === "replica" ? "replica" : "block")} />

      {/* DataNode labels, on the left of each server's face */}
      {CLUSTER.map((n) => {
        const [x, y] = L.nodeAt(n.id);
        const position: Vec3 = [x - 0.44, y, FACE_Z + 0.03];
        if (n.id === failed) {
          return (
            <Label3D key={n.id} position={position}>
              <span className="font-semibold text-bad">
                ✕ {n.name}
                {roomy ? " failed" : ""}
              </span>
            </Label3D>
          );
        }
        const on = active === "datanode";
        return (
          <Label3D key={n.id} position={position} tone={on ? "accent" : "default"}>
            {on ? <strong>{n.name}</strong> : n.name}
          </Label3D>
        );
      })}

      {/* Lost blocks: said in words above the failed node's rack */}
      {failed !== null && lost.length > 0 && (
        <Label3D position={[lostX(L.rackX[CLUSTER[failed].rack], roomy), FRAME_H + 0.42, RACK_Z]}>
          <span className="font-semibold text-bad">
            {lost.map(blockName).join(", ")} lost: no copy left
          </span>
        </Label3D>
      )}

      {/* Heartbeats: every live DataNode reports to the NameNode (every 3 s in a real cluster) */}
      {CLUSTER.map((n) => {
        const down = n.id === failed;
        return (
          <Link3D
            key={`${n.id}-${down}`}
            from={L.backOf(n.id)}
            to={NAME_PORT}
            arc={0.35}
            color={down ? p.bad : heartbeatOn ? p.brand : colors.link}
            dashed={down}
            lineWidth={heartbeatOn ? 2 : 1}
          />
        );
      })}
      {CLUSTER.filter((n) => n.id !== failed).map((n) => (
        <PacketParticle
          key={`hb-${n.id}`}
          from={L.backOf(n.id)}
          to={NAME_PORT}
          arc={0.35}
          duration={0.9}
          repeatDelay={2.1}
          delay={(n.id * 0.33) % 3}
          size={heartbeatOn ? 0.06 : 0.04}
          color={p.signal}
          idleProgress={0.55}
        />
      ))}

      {/* Re-replication: a surviving DataNode sends a new copy to another DataNode */}
      {phase === "repairing" &&
        copies.map((c, i) => (
          <PacketParticle
            key={`${runKey}-copy-${i}`}
            from={L.cubeAt(c.from, c.block)}
            to={L.cubeAt(c.to, c.block)}
            arc={0.9}
            duration={1.4}
            delay={i * 0.35}
            loop={false}
            size={0.085}
            color={blockColors[c.block]}
            onArrive={onCopyArrive}
            idleProgress={0.5}
          />
        ))}
    </group>
  );
}

/**
 * Topic 3.7: a small HDFS cluster. A NameNode keeps the map; nine DataNodes on
 * three racks hold copies of a file's four blocks. Fail a DataNode and the
 * NameNode notices the missing heartbeats and has the lost copies made again.
 */
export default function HadoopScene(props: HadoopSceneProps) {
  const { failed } = props;
  const label =
    failed === null
      ? "An HDFS cluster: a NameNode and nine DataNodes on three racks, each holding copies of a file's four blocks"
      : `An HDFS cluster with DataNode ${nodeName(failed)} failed, showing how the NameNode has its blocks copied again`;
  return (
    <Scene3D
      label={label}
      height="clamp(260px, 72vw, 460px)"
      camera={{ position: [0, 3.9, 8.2], fov: 34, target: [0, VIEW_Y, -0.5] }}
    >
      <Cluster {...props} />
    </Scene3D>
  );
}
