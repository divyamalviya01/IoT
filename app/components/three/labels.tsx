import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { addAfterEffect, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Vector3, type Camera, type Group, type Object3D } from "three";
import type { Vec3 } from "./types";

/*
 * Labels are plain DOM in one overlay that Scene3D renders over the canvas.
 * A Label3D inside the scene only places an invisible anchor; after every
 * rendered frame the anchors are projected to screen space and the overlay
 * elements are moved directly. This avoids drei's Html, which creates a
 * separate React root per label (and warns when those roots unmount).
 */

export type Label3DTone = "default" | "accent" | "muted" | "u1" | "u2" | "u3";

const TONE_CLASS: Record<Label3DTone, string> = {
  default: "border-line text-ink",
  accent: "border-brand text-brand",
  muted: "border-line text-ink-3",
  u1: "border-u1 text-u1",
  u2: "border-u2 text-u2",
  u3: "border-u3 text-u3",
};

function LabelPill({ tone, children }: { tone: Label3DTone; children: ReactNode }) {
  return (
    <div
      className={`pointer-events-none rounded-md border bg-surface/95 px-2 py-0.5 font-sans text-[13px] leading-tight whitespace-nowrap select-none ${TONE_CLASS[tone]}`}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Registry shared by the overlay (DOM) and the anchors (scene)        */
/* ------------------------------------------------------------------ */

interface LabelEntry {
  id: number;
  anchor: Object3D | null;
  content: ReactNode;
  tone: Label3DTone;
}

const NO_LABELS: LabelEntry[] = [];
const world = new Vector3();
const eye = new Vector3();

function isShown(object: Object3D): boolean {
  for (let o: Object3D | null = object; o; o = o.parent) {
    if (!o.visible) return false;
  }
  return true;
}

export class LabelRegistry {
  private entries = new Map<number, LabelEntry>();
  private elements = new Map<number, HTMLDivElement>();
  private written = new Map<number, string>();
  private listeners = new Set<() => void>();
  private snapshot: LabelEntry[] = NO_LABELS;
  private nextId = 1;
  /** Set by the scene so new labels get positioned even when rendering on demand. */
  requestFrame: (() => void) | undefined;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  allocate(): number {
    return this.nextId++;
  }

  upsert(entry: LabelEntry) {
    this.entries.set(entry.id, entry);
    this.emit();
  }

  remove(id: number) {
    if (!this.entries.delete(id)) return;
    this.elements.delete(id);
    this.written.delete(id);
    this.emit();
  }

  attach(id: number, el: HTMLDivElement | null) {
    this.written.delete(id);
    if (el) {
      this.elements.set(id, el);
      this.requestFrame?.();
    } else {
      this.elements.delete(id);
    }
  }

  /** Move every label to its anchor's place on screen. Nearer labels stack on top. */
  project(camera: Camera, width: number, height: number) {
    if (this.entries.size === 0) return;
    camera.updateMatrixWorld();
    camera.getWorldPosition(eye);
    for (const [id, entry] of this.entries) {
      const el = this.elements.get(id);
      const anchor = entry.anchor;
      if (!el || !anchor) continue;

      anchor.getWorldPosition(world);
      const distance = world.distanceTo(eye);
      world.project(camera);

      let next = "hidden";
      if (world.z > -1 && world.z < 1 && isShown(anchor)) {
        const x = ((world.x + 1) / 2) * width;
        const y = ((1 - world.y) / 2) * height;
        next = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)|${Math.max(0, Math.round(1000 - distance * 10))}`;
      }
      if (this.written.get(id) === next) continue;
      this.written.set(id, next);

      if (next === "hidden") {
        el.style.visibility = "hidden";
      } else {
        const [transform, z] = next.split("|");
        el.style.transform = transform;
        el.style.zIndex = z;
        el.style.visibility = "visible";
      }
    }
  }

  private emit() {
    this.snapshot = [...this.entries.values()];
    this.listeners.forEach((listener) => listener());
  }
}

const LabelRegistryContext = createContext<LabelRegistry | null>(null);

export const LabelRegistryProvider = LabelRegistryContext.Provider;

/* ------------------------------------------------------------------ */
/* Pieces Scene3D mounts                                               */
/* ------------------------------------------------------------------ */

/** DOM layer over the canvas. Sits below the toolbar; the figure's isolation keeps it below the page header. */
export function LabelOverlay({ registry }: { registry: LabelRegistry }) {
  const labels = useSyncExternalStore(registry.subscribe, registry.getSnapshot, () => NO_LABELS);
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {labels.map((label) => (
        <div
          key={label.id}
          ref={(el) => {
            registry.attach(label.id, el);
          }}
          className="absolute top-0 left-0"
          style={{ visibility: "hidden" }}
        >
          <div className="-translate-x-1/2 -translate-y-1/2">
            <LabelPill tone={label.tone}>{label.content}</LabelPill>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Inside the Canvas: projects the labels after each rendered frame. */
export function LabelProjector({ registry }: { registry: LabelRegistry }) {
  const get = useThree((s) => s.get);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    registry.requestFrame = () => invalidate();
    const stop = addAfterEffect(() => {
      const state = get();
      registry.project(state.camera, state.size.width, state.size.height);
    });
    invalidate();
    return () => {
      stop();
      registry.requestFrame = undefined;
    };
  }, [registry, get, invalidate]);

  return null;
}

/* ------------------------------------------------------------------ */
/* Label3D                                                             */
/* ------------------------------------------------------------------ */

export interface Label3DProps {
  position: Vec3;
  children: ReactNode;
  tone?: Label3DTone;
  visible?: boolean;
}

function RegisteredLabel({
  registry,
  position,
  children,
  tone,
  visible,
}: Required<Label3DProps> & { registry: LabelRegistry }) {
  const anchorRef = useRef<Group>(null);
  const [id] = useState(() => registry.allocate());

  useLayoutEffect(() => {
    if (visible) registry.upsert({ id, anchor: anchorRef.current, content: children, tone });
    else registry.remove(id);
  }, [registry, id, children, tone, visible]);

  useLayoutEffect(() => () => registry.remove(id), [registry, id]);

  return <group ref={anchorRef} position={position} />;
}

// Only used when a Label3D is rendered outside Scene3D.
const LABEL_Z_RANGE = [20, 0];

/**
 * A small text pill pinned to a point in the scene, drawn as HTML so it uses
 * the page fonts. Labels never take pointer events.
 */
export function Label3D({ position, children, tone = "default", visible = true }: Label3DProps) {
  const registry = useContext(LabelRegistryContext);
  if (registry) {
    return (
      <RegisteredLabel registry={registry} position={position} tone={tone} visible={visible}>
        {children}
      </RegisteredLabel>
    );
  }
  if (!visible) return null;
  return (
    <Html position={position} center zIndexRange={LABEL_Z_RANGE} pointerEvents="none">
      <LabelPill tone={tone}>{children}</LabelPill>
    </Html>
  );
}
