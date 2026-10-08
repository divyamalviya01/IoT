import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Group,
  type InstancedMesh,
  type MeshStandardMaterial,
} from "three";
import { usePalette } from "~/lib/palette";
import { Label3D } from "../effects";
import { useSceneMotion } from "../Scene3D";
import type { Vec3 } from "../types";
import type { AssetProps } from "./types";

const MAX_STEP = 0.1;

/* ------------------------------------------------------------------ */
/* Colour helper                                                       */
/* ------------------------------------------------------------------ */

const mixA = new Color();
const mixB = new Color();

/** Blend two palette colours (t = 0 gives a, 1 gives b). Returns a hex string. */
export function mixColor(a: string, b: string, t: number): string {
  return `#${mixA.set(a).lerp(mixB.set(b), t).getHexString()}`;
}

/* ------------------------------------------------------------------ */
/* Glow (highlight) context                                            */
/* ------------------------------------------------------------------ */

interface Glow {
  active: boolean;
  hover: boolean;
  color: string | undefined;
}

const GlowContext = createContext<Glow>({ active: false, hover: false, color: undefined });

export interface GlowMaterialProps {
  color: string;
  roughness?: number;
  metalness?: number;
  flatShading?: boolean;
}

/**
 * A standard material that glows in the asset's accent colour when the asset
 * is highlighted (and faintly on hover). Use it on an asset's key parts.
 */
export function GlowMaterial({
  color,
  roughness = 0.65,
  metalness = 0,
  flatShading = false,
}: GlowMaterialProps) {
  const glow = useContext(GlowContext);
  const intensity = glow.active ? 0.5 : glow.hover ? 0.2 : 0;
  return (
    <meshStandardMaterial
      color={color}
      emissive={glow.color ?? color}
      emissiveIntensity={intensity}
      roughness={roughness}
      metalness={metalness}
      flatShading={flatShading}
    />
  );
}

/* ------------------------------------------------------------------ */
/* AssetFrame                                                          */
/* ------------------------------------------------------------------ */

export interface AssetFrameProps extends AssetProps {
  /** Height (in model units) where the label floats. */
  labelHeight: number;
  children: ReactNode;
}

/**
 * Wraps a model with the shared asset behaviour: placement, highlight glow and
 * grow, hover cursor, click to select, and a floating label. A frame without
 * its own `highlighted` prop inherits the glow of a frame around it.
 */
export function AssetFrame({
  position,
  rotation,
  scale = 1,
  highlighted,
  accent,
  label,
  showLabel = true,
  onSelect,
  labelHeight,
  children,
}: AssetFrameProps) {
  const palette = usePalette();
  const parent = useContext(GlowContext);
  const [hovered, setHovered] = useState(false);
  const hoverRef = useRef(false);
  const groupRef = useRef<Group>(null);

  const selectable = onSelect !== undefined;
  const own = highlighted !== undefined;
  const active = own ? highlighted : parent.active;
  const hoverGlow = (hovered && selectable) || (!own && parent.hover);
  const glowColor = accent ?? (own ? undefined : parent.color) ?? palette.brand;

  const glow = useMemo<Glow>(
    () => ({ active, hover: hoverGlow, color: glowColor }),
    [active, hoverGlow, glowColor],
  );

  const targetScale = scale * (own && highlighted ? 1.06 : hovered && selectable ? 1.03 : 1);
  const targetRef = useRef(targetScale);
  targetRef.current = targetScale;

  // Start at the right size, then ease towards changes.
  useLayoutEffect(() => {
    groupRef.current?.scale.setScalar(targetRef.current);
  }, []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const target = targetRef.current;
    const current = group.scale.x;
    const diff = target - current;
    if (Math.abs(diff) < 1e-4) {
      if (diff !== 0) group.scale.setScalar(target);
      return;
    }
    group.scale.setScalar(current + diff * (1 - Math.exp(-Math.min(delta, MAX_STEP) * 14)));
    state.invalidate();
  });

  // Restore the cursor if this asset unmounts or stops being selectable while hovered.
  useEffect(() => {
    if (!selectable) return;
    return () => {
      if (hoverRef.current) {
        hoverRef.current = false;
        document.body.style.cursor = "";
      }
    };
  }, [selectable]);

  const handlers = onSelect
    ? {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          hoverRef.current = true;
          setHovered(true);
          document.body.style.cursor = "pointer";
        },
        onPointerOut: () => {
          hoverRef.current = false;
          setHovered(false);
          document.body.style.cursor = "";
        },
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          // Ignore the click that ends an orbit drag.
          if (e.delta > 6) return;
          onSelect();
        },
      }
    : undefined;

  return (
    <group ref={groupRef} position={position} rotation={rotation} {...handlers}>
      <GlowContext.Provider value={glow}>{children}</GlowContext.Provider>
      {label && showLabel && (
        <Label3D position={[0, labelHeight, 0]} tone={active ? "accent" : "default"}>
          {label}
        </Label3D>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Led                                                                 */
/* ------------------------------------------------------------------ */

const ledGeometry = new SphereGeometry(1, 10, 8);

export interface LedProps {
  position: Vec3;
  color: string;
  /** Radius. Default 0.03. */
  size?: number;
  /** Seconds per gentle pulse. */
  period?: number;
  /** 0 to 1, offsets the pulse so neighbouring LEDs don't blink together. */
  phase?: number;
  blink?: boolean;
}

/** A small status light that pulses gently, and holds still when the scene is paused. */
export function Led({ position, color, size = 0.03, period = 2.4, phase = 0, blink = true }: LedProps) {
  const materialRef = useRef<MeshStandardMaterial>(null);
  const { paused } = useSceneMotion();
  const time = useRef(phase * period);

  useFrame((_, delta) => {
    const material = materialRef.current;
    if (!material || !blink || paused) return;
    time.current += Math.min(delta, MAX_STEP);
    const wave = 0.5 + 0.5 * Math.sin((time.current / period) * Math.PI * 2);
    material.emissiveIntensity = 0.3 + 0.9 * wave;
  });

  return (
    <mesh position={position} geometry={ledGeometry} scale={size}>
      <meshStandardMaterial
        ref={materialRef}
        color={color}
        emissive={color}
        emissiveIntensity={1}
        roughness={0.3}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* InstancedParts                                                      */
/* ------------------------------------------------------------------ */

const unitBox = new BoxGeometry(1, 1, 1);
const unitCylinder = new CylinderGeometry(1, 1, 1, 12);
const unitSphere = new SphereGeometry(1, 12, 8);

export interface PartInstance {
  position: Vec3;
  /** Size of the part (a unit box, or a cylinder/sphere of radius 1 and height 1). */
  scale: Vec3;
  rotation?: Vec3;
}

export interface InstancedPartsProps {
  items: readonly PartInstance[];
  shape?: "box" | "cylinder" | "sphere";
  color: string;
  roughness?: number;
  metalness?: number;
}

const tmpMatrix = new Matrix4();
const tmpPosition = new Vector3();
const tmpScale = new Vector3();
const tmpQuaternion = new Quaternion();
const tmpEuler = new Euler();

/**
 * Many identical small parts (pins, vias, fins) in a single draw call.
 * Pass a memoised `items` array.
 */
export function InstancedParts({
  items,
  shape = "box",
  color,
  roughness = 0.6,
  metalness = 0,
}: InstancedPartsProps) {
  const ref = useRef<InstancedMesh>(null);
  const geometry = shape === "box" ? unitBox : shape === "cylinder" ? unitCylinder : unitSphere;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((item, i) => {
      const r = item.rotation;
      tmpQuaternion.setFromEuler(r ? tmpEuler.set(r[0], r[1], r[2]) : tmpEuler.set(0, 0, 0));
      tmpMatrix.compose(
        tmpPosition.set(item.position[0], item.position[1], item.position[2]),
        tmpQuaternion,
        tmpScale.set(item.scale[0], item.scale[1], item.scale[2]),
      );
      mesh.setMatrixAt(i, tmpMatrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <instancedMesh key={items.length} ref={ref} args={[geometry, undefined, items.length]}>
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </instancedMesh>
  );
}
