import {
  Component,
  Suspense,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ErrorInfo,
  type ReactNode,
  type RefObject,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import { usePalette } from "~/lib/palette";
import { useResolvedTheme } from "~/lib/theme";
import { LabelOverlay, LabelProjector, LabelRegistry, LabelRegistryProvider } from "./labels";
import type { Vec3 } from "./types";
import { useHydrated } from "./useHydrated";

/* ------------------------------------------------------------------ */
/* Public types and contexts                                           */
/* ------------------------------------------------------------------ */

export interface Scene3DCamera {
  position: Vec3;
  fov?: number;
  target?: Vec3;
}

/** Optional extra limits for the orbit camera (angles in radians). */
export interface OrbitLimits {
  minPolarAngle?: number;
  maxPolarAngle?: number;
  minAzimuthAngle?: number;
  maxAzimuthAngle?: number;
}

export interface Scene3DProps {
  children: ReactNode;
  /** Describes what the scene shows, for screen readers. */
  label: string;
  /** Height of the view. Numbers are pixels. Default 420. */
  height?: number | string;
  camera?: Scene3DCamera;
  /** Let people orbit and zoom with the mouse or touch. Default true. */
  controls?: boolean;
  minDistance?: number;
  maxDistance?: number;
  orbitLimits?: OrbitLimits;
  /** 2D alternative shown when WebGL is unavailable or the scene crashes. */
  fallback?: ReactNode;
  className?: string;
  /** Default true. False renders a still scene on demand only. */
  animated?: boolean;
}

export interface SceneMotion {
  /** True when effects should hold still (paused, reduced motion or a static scene). */
  paused: boolean;
}

const SceneMotionContext = createContext<SceneMotion>({ paused: false });

/** Read inside a Scene3D to freeze animations when the scene is paused. */
export function useSceneMotion(): SceneMotion {
  return useContext(SceneMotionContext);
}

interface SceneView {
  /** Distance from the starting camera position to its target. */
  distance: number;
  fov: number;
}

const SceneViewContext = createContext<SceneView>({ distance: 10, fov: 40 });

/**
 * Returns a scale (at most 1) that makes content of the given width fit the
 * view horizontally from the starting camera. Wrap wide dioramas in a group
 * with this scale so they still fit on narrow screens.
 */
export function useFitScale(contentWidth: number): number {
  const { distance, fov } = useContext(SceneViewContext);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  if (width <= 0 || height <= 0 || contentWidth <= 0) return 1;
  const visible = 2 * distance * Math.tan((fov * Math.PI) / 360) * (width / height);
  return Math.min(1, visible / contentWidth);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_POSITION: Vec3 = [6, 5, 8];
const DEFAULT_TARGET: Vec3 = [0, 0, 0];
const DEFAULT_FOV = 40;
const DPR: [number, number] = [1, 1.5];
const GL_OPTIONS = { alpha: true, antialias: true } as const;
const NO_WEBGL_MESSAGE =
  "This 3D view needs WebGL, which is turned off in this browser. The text on this page explains the same idea.";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

let webglSupport: boolean | null = null;

/**
 * three.js 0.163+ needs WebGL 2. Checked once per page load on a throwaway
 * canvas, then the test context is released so it doesn't count against the
 * browser's context limit.
 */
function hasWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    webglSupport = gl !== null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

function MessageBox({
  height,
  className,
  children,
}: {
  height: number | string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "flex w-full items-center justify-center rounded-lg border border-line bg-surface-2 p-6 text-center text-sm text-ink-3",
        className,
      )}
      style={{ height }}
    >
      {children}
    </div>
  );
}

class SceneErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("The 3D view stopped working.", error, info.componentStack);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/* Pieces that live inside the Canvas                                  */
/* ------------------------------------------------------------------ */

function Lights() {
  const theme = useResolvedTheme();
  const p = usePalette();
  const dark = theme === "dark";
  const key = dark ? p.ink : p.surface;
  return (
    <>
      <ambientLight color={key} intensity={dark ? 0.95 : 1.15} />
      <hemisphereLight
        color={key}
        groundColor={dark ? p.surface2 : p.lineStrong}
        intensity={dark ? 0.55 : 0.7}
      />
      <directionalLight color={key} position={[5, 9, 6]} intensity={dark ? 1.35 : 1.6} />
    </>
  );
}

/** Renders a fresh frame whenever the loop mode or theme changes, so on-demand scenes never go stale. */
function FrameKick() {
  const invalidate = useThree((s) => s.invalidate);
  const frameloop = useThree((s) => s.frameloop);
  const theme = useResolvedTheme();
  useEffect(() => {
    invalidate();
  }, [invalidate, frameloop, theme]);
  return null;
}

type OrbitControlsHandle = ComponentRef<typeof OrbitControls>;

/**
 * Runs after OrbitControls connects. Saves the starting view for "Reset view"
 * and lets a one-finger vertical swipe scroll the page on phones (horizontal
 * drags and pinches still move the camera).
 */
function ControlsSetup({ controlsRef }: { controlsRef: RefObject<OrbitControlsHandle | null> }) {
  const gl = useThree((s) => s.gl);
  const connected = useThree((s) => s.events.connected) as HTMLElement | null | undefined;

  useEffect(() => {
    controlsRef.current?.saveState();
  }, [controlsRef]);

  useEffect(() => {
    const el = connected ?? gl.domElement;
    if (el && "style" in el) el.style.touchAction = "pan-y";
  }, [connected, gl]);

  return null;
}

/** Without orbit controls, point the camera at the target once. */
function CameraAim({ target }: { target: Vec3 }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const [x, y, z] = target;
  useLayoutEffect(() => {
    camera.lookAt(x, y, z);
    invalidate();
  }, [camera, invalidate, x, y, z]);
  return null;
}

/* ------------------------------------------------------------------ */
/* Toolbar icons                                                       */
/* ------------------------------------------------------------------ */

function PauseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
      <rect x="3.5" y="2.5" width="3" height="11" rx="1" />
      <rect x="9.5" y="2.5" width="3" height="11" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
      <path d="M4.5 2.8v10.4a.8.8 0 0 0 1.2.7l8.3-5.2a.8.8 0 0 0 0-1.4L5.7 2.1a.8.8 0 0 0-1.2.7Z" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.8 8a5.2 5.2 0 1 0 1.6-3.8" />
      <path d="M2.5 2.5v3h3" />
    </svg>
  );
}

const BUTTON_CLASS =
  "inline-flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/* ------------------------------------------------------------------ */
/* The live scene                                                      */
/* ------------------------------------------------------------------ */

interface LiveSceneProps extends Scene3DProps {
  height: number | string;
  controls: boolean;
  animated: boolean;
}

function LiveScene({
  children,
  label,
  height,
  camera,
  controls,
  minDistance,
  maxDistance,
  orbitLimits,
  className,
  animated,
}: LiveSceneProps) {
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(() => reducedMotion === true);
  const [onScreen, setOnScreen] = useState(true);
  const wrapperRef = useRef<HTMLElement>(null);
  const controlsRef = useRef<OrbitControlsHandle | null>(null);
  const [labels] = useState(() => new LabelRegistry());

  // Stop rendering entirely while the view is scrolled away.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setOnScreen(entry.isIntersecting);
      },
      { rootMargin: "120px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const position = camera?.position ?? DEFAULT_POSITION;
  const target = camera?.target ?? DEFAULT_TARGET;
  const fov = camera?.fov ?? DEFAULT_FOV;

  // Keep these stable by value so a parent re-render never snaps the camera back.
  const viewKey = `${position.join(",")}|${target.join(",")}|${fov}`;
  const view = useMemo(() => {
    const [px, py, pz] = position;
    const [tx, ty, tz] = target;
    const distance = Math.hypot(px - tx, py - ty, pz - tz);
    return {
      cameraProps: { position: [px, py, pz] as Vec3, fov, near: 0.1, far: 200 },
      target: [tx, ty, tz] as Vec3,
      context: { distance, fov } satisfies SceneView,
    };
  }, [viewKey]);

  const stillScene = !animated || paused;
  const frameloop = !onScreen ? "never" : stillScene ? "demand" : "always";
  const motion = useMemo<SceneMotion>(() => ({ paused: stillScene }), [stillScene]);

  const distance = view.context.distance;
  const minD = minDistance ?? Math.max(0.5, distance * 0.55);
  const maxD = maxDistance ?? distance * 1.8;

  const showToolbar = animated || controls;

  return (
    <figure
      ref={wrapperRef}
      aria-label={label}
      className={cx("relative isolate m-0 w-full overflow-hidden rounded-lg", className)}
      style={{ height }}
    >
      <Canvas
        frameloop={frameloop}
        dpr={DPR}
        gl={GL_OPTIONS}
        flat
        camera={view.cameraProps}
        style={{ width: "100%", height: "100%" }}
      >
        <SceneViewContext.Provider value={view.context}>
          <SceneMotionContext.Provider value={motion}>
            <LabelRegistryProvider value={labels}>
              <Lights />
              <FrameKick />
              <LabelProjector registry={labels} />
              {controls ? (
                <>
                  <OrbitControls
                    ref={controlsRef}
                    makeDefault
                    enablePan={false}
                    enableDamping
                    dampingFactor={0.08}
                    minDistance={minD}
                    maxDistance={maxD}
                    maxPolarAngle={orbitLimits?.maxPolarAngle ?? Math.PI / 2 - 0.08}
                    minPolarAngle={orbitLimits?.minPolarAngle ?? 0}
                    minAzimuthAngle={orbitLimits?.minAzimuthAngle ?? -Infinity}
                    maxAzimuthAngle={orbitLimits?.maxAzimuthAngle ?? Infinity}
                    target={view.target}
                  />
                  <ControlsSetup controlsRef={controlsRef} />
                </>
              ) : (
                <CameraAim target={view.target} />
              )}
              <Suspense fallback={null}>{children}</Suspense>
            </LabelRegistryProvider>
          </SceneMotionContext.Provider>
        </SceneViewContext.Provider>
      </Canvas>

      <LabelOverlay registry={labels} />

      {showToolbar && (
        <div className="absolute right-2 bottom-2 z-30 flex gap-1 rounded-md border border-line bg-surface/90 p-1 text-sm">
          {animated && (
            <button type="button" className={BUTTON_CLASS} onClick={() => setPaused((v) => !v)}>
              {paused ? <PlayIcon /> : <PauseIcon />}
              {paused ? "Play animation" : "Pause animation"}
            </button>
          )}
          {controls && (
            <button
              type="button"
              className={BUTTON_CLASS}
              onClick={() => controlsRef.current?.reset()}
            >
              <ResetIcon />
              Reset view
            </button>
          )}
        </div>
      )}
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Scene3D                                                             */
/* ------------------------------------------------------------------ */

/**
 * A client-only three.js view with the lab's lighting, orbit controls, a
 * pause/play and reset toolbar, and graceful fallbacks. Pre-render and the
 * hydration pass show a same-size placeholder.
 */
export function Scene3D({
  height = 420,
  controls = true,
  animated = true,
  fallback,
  className,
  ...rest
}: Scene3DProps) {
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <MessageBox height={height} className={className}>
        Loading 3D view
      </MessageBox>
    );
  }

  const failure = fallback ?? (
    <MessageBox height={height} className={className}>
      <p className="max-w-md text-ink-2">{NO_WEBGL_MESSAGE}</p>
    </MessageBox>
  );

  // Only reached in the browser, after hydration.
  if (!hasWebGL()) return <>{failure}</>;

  return (
    <SceneErrorBoundary fallback={failure}>
      <LiveScene
        {...rest}
        height={height}
        controls={controls}
        animated={animated}
        className={className}
      />
    </SceneErrorBoundary>
  );
}
