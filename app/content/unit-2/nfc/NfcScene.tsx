import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { RoundedBox } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  DoubleSide,
  Matrix4,
  Plane,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type Group,
  type InstancedMesh,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from "three";
import { fieldStrength, readChance, taps, uriRecord } from "~/labs/l18-nfc-tap/engine";
import { usePalette } from "~/lib/palette";
import {
  AssetFrame,
  GlowMaterial,
  Label3D,
  Scene3D,
  mixColor,
  useFitScale,
  useSceneMotion,
  type Vec3,
} from "~/components/three";

export type NfcPart = "coil" | "field" | "antenna" | "chip";

export interface TapResult {
  /** Which of the TAP_COUNT taps this was (0 based). */
  index: number;
  read: boolean;
  /** The distance the tap was made at, in cm. */
  distance: number;
}

export interface NfcSceneProps {
  /** Gap between the back of the phone and the tag, in cm. */
  distance: number;
  active?: NfcPart | null;
  onSelect?: (id: NfcPart) => void;
  /** Called once per simulated tap, when the tag answers or stays silent. */
  onTap?: (tap: TapResult) => void;
}

/* ------------------------------------------------------------------ */
/* Data shared with the page                                           */
/* ------------------------------------------------------------------ */

export const MAX_CM = 12;
export const TAG_URL = "https://example.com";
export const RECORD = uriRecord(TAG_URL);
export const TAP_COUNT = 10;
const TAP_SEED = 4;

/** The ten taps the scene plays through at a distance; the page shows the same list. */
export function tapsAt(distance: number): boolean[] {
  return taps(distance, TAP_COUNT, TAP_SEED);
}

/* ------------------------------------------------------------------ */
/* Scale and layout: 1 scene unit = 5 cm                               */
/* ------------------------------------------------------------------ */

const CM = 0.2;

/** The lab's reader coil radius in cm, recovered from its on-axis field formula. */
const COIL_CM = (() => {
  const q = fieldStrength(1) ** (2 / 3);
  return Math.sqrt(q / (1 - q));
})();
const COIL_R = COIL_CM * CM;

const TAG_TOP = 0.012;
const PHONE_W = 3.0;
const PHONE_T = 0.16;
const PHONE_D = 1.5;
/** The coil sits just inside the back of the phone. */
const COIL_Y = 0.025;
const CHIP: Vec3 = [0.4, TAG_TOP + 0.014, 0];
const RULER_X = -1.95;
const VIEW_Y = 1.0;
const FIT_WIDTH = 5.8;
/** On phones the side labels hide, so the view can zoom in, centred on the ruler and the phone. */
const NARROW_FIT_WIDTH = 4.4;
const NARROW_SHIFT = 0.35;

const phoneY = (cm: number) => TAG_TOP + Math.min(Math.max(cm, 0), MAX_CM) * CM;

/* ------------------------------------------------------------------ */
/* The magnetic field of the phone's coil                              */
/* ------------------------------------------------------------------ */

/** Complete elliptic integrals K(m) and E(m) by the arithmetic-geometric mean. */
function ellipticKE(m: number): [number, number] {
  let a = 1;
  let b = Math.sqrt(1 - m);
  let sum = m / 2;
  let pow = 0.5;
  for (let i = 0; i < 24; i++) {
    const c = (a - b) / 2;
    const next = (a + b) / 2;
    b = Math.sqrt(a * b);
    a = next;
    pow *= 2;
    sum += pow * c * c;
    if (c < 1e-12) break;
  }
  const k = Math.PI / (2 * a);
  return [k, k * (1 - sum)];
}

/** Field of a single loop of radius COIL_R at (rho, z), in arbitrary units: [radial, along the axis]. */
function loopField(rho: number, z: number): [number, number] {
  const a = COIL_R;
  const r = Math.max(rho, 1e-6);
  const q = (a + r) ** 2 + z * z;
  const m = Math.min((4 * a * r) / q, 1 - 1e-12);
  const [k, e] = ellipticKE(m);
  const d = (a - r) ** 2 + z * z;
  const sq = Math.sqrt(q);
  const bz = (k + ((a * a - r * r - z * z) / d) * e) / sq;
  const br = (z / (r * sq)) * (-k + ((a * a + r * r + z * z) / d) * e);
  return [br, bz];
}

/** Field at the centre of the coil, so loopField / B_CENTER matches the lab's fieldStrength on the axis. */
const B_CENTER = Math.PI / COIL_R;
/** Below the strength at 10 cm (the theoretical limit) a field line is drawn fully faded. */
const H_MIN = fieldStrength(10);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** 0 to 1 on a log scale: 1 at the coil, 0 at the 10 cm limit. */
function brightness(h: number): number {
  return clamp01(Math.log(h / H_MIN) / Math.log(1 / H_MIN));
}

/** Seeds inside the coil, as a share of its radius. Each line reaches out to a different distance. */
const SEEDS = [0.34, 0.42, 0.5, 0.62];
const PLANES = 6;

/** Follow one field line from (rho0, 0) up and around until it comes back down to the coil's plane. */
function traceHalf(rho0: number): [number, number][] {
  const ds = 0.01;
  const dir = (r: number, z: number): [number, number] => {
    const [br, bz] = loopField(r, z);
    const m = Math.hypot(br, bz) || 1;
    return [br / m, bz / m];
  };
  let r = rho0;
  let z = 0;
  const out: [number, number][] = [[r, z]];
  for (let i = 0; i < 5000; i++) {
    const k1 = dir(r, z);
    const k2 = dir(r + (k1[0] * ds) / 2, z + (k1[1] * ds) / 2);
    const k3 = dir(r + (k2[0] * ds) / 2, z + (k2[1] * ds) / 2);
    const k4 = dir(r + k3[0] * ds, z + k3[1] * ds);
    const nr = r + (ds * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0])) / 6;
    const nz = z + (ds * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])) / 6;
    if (nz < 0 && i > 5) {
      const t = z / (z - nz);
      out.push([r + (nr - r) * t, 0]);
      break;
    }
    r = nr;
    z = nz;
    if (i % 3 === 2) out.push([r, z]);
  }
  return out;
}

interface FieldLoop {
  points: Vector3[];
  /** Distance along the loop at each point. */
  lengths: number[];
  /** Brightness at each point. */
  glow: number[];
  total: number;
  dots: number;
}

const strengthAt = (p: Vector3) => {
  const [br, bz] = loopField(Math.hypot(p.x, p.z), p.y);
  return Math.hypot(br, bz) / B_CENTER;
};

/**
 * Phones put a thin magnetic (ferrite) sheet behind the coil, which steers the
 * field out of the back towards the tag. The part above the coil is drawn faint.
 */
const ABOVE = 0.3;
const sideFactor = (y: number) => 1 - (1 - ABOVE) * clamp01(y / 0.15);

/** Closed field lines in PLANES half-planes around the coil's axis, plus one tube mesh for all of them. */
function buildField(): { loops: FieldLoop[]; geometry: BufferGeometry } {
  const halves = SEEDS.map((s) => traceHalf(s * COIL_R));
  const loops: FieldLoop[] = [];
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const radial = 5;
  const sample = new Vector3();

  for (let k = 0; k < PLANES; k++) {
    const phi = (k / PLANES) * Math.PI * 2 + Math.PI / 12;
    const cx = Math.cos(phi);
    const cz = Math.sin(phi);
    for (const half of halves) {
      // Up through the coil and over the top, then the mirror image back underneath.
      const flat: [number, number][] = [...half];
      for (let i = half.length - 2; i >= 1; i--) flat.push([half[i][0], -half[i][1]]);
      const points = flat.map(([r, z]) => new Vector3(r * cx, z, r * cz));
      const lengths = [0];
      for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + points[i].distanceTo(points[i - 1]));
      const total = lengths[lengths.length - 1] + points[points.length - 1].distanceTo(points[0]);
      const glow = points.map((p) => brightness(strengthAt(p)) ** 1.3 * sideFactor(p.y));
      loops.push({ points, lengths, glow, total, dots: Math.max(1, Math.round(total / 1.2)) });

      const curve = new CatmullRomCurve3(points, true, "centripetal");
      const segments = Math.min(260, Math.max(48, Math.round(total / 0.04)));
      const tube = new TubeGeometry(curve, segments, 0.011, radial, true);
      const pos = tube.getAttribute("position");
      const base = positions.length / 3;
      // One opacity per ring of the tube: faint where the field is weak, so far parts fade away.
      const ringAlpha: number[] = [];
      for (let ring = 0; ring < segments; ring++) {
        curve.getPointAt(ring / segments, sample);
        ringAlpha.push(brightness(strengthAt(sample)) ** 1.8 * sideFactor(sample.y));
      }
      for (let v = 0; v < pos.count; v++) {
        positions.push(pos.getX(v), pos.getY(v), pos.getZ(v));
        colors.push(1, 1, 1, ringAlpha[Math.floor(v / (radial + 1)) % segments]);
      }
      const index = tube.getIndex();
      if (index) for (let i = 0; i < index.count; i++) indices.push(base + index.getX(i));
      tube.dispose();
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("color", new BufferAttribute(new Float32Array(colors), 4));
  geometry.setIndex(new BufferAttribute(new Uint32Array(indices), 1));
  geometry.computeBoundingSphere();
  return { loops, geometry };
}

/** Position and brightness `along` a closed loop. */
function sampleLoop(loop: FieldLoop, along: number, out: Vector3): number {
  const { points, lengths, glow } = loop;
  const n = points.length;
  let lo = 0;
  let hi = n - 1;
  if (along >= lengths[n - 1]) {
    lo = n - 1;
  } else {
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (lengths[mid] <= along) lo = mid;
      else hi = mid;
    }
  }
  const next = lo === n - 1 ? 0 : lo + 1;
  const span = (lo === n - 1 ? loop.total : lengths[next]) - lengths[lo];
  const u = span > 0 ? clamp01((along - lengths[lo]) / span) : 0;
  out.lerpVectors(points[lo], points[next], u);
  return glow[lo] + (glow[next] - glow[lo]) * u;
}

/* ------------------------------------------------------------------ */
/* Shared geometry, scratch objects and timing                         */
/* ------------------------------------------------------------------ */

const dotGeometry = new SphereGeometry(1, 10, 8);
const byteGeometry = new BoxGeometry(1, 1, 1);
const unitBox = new BoxGeometry(1, 1, 1);
const pulseGeometry = new RingGeometry(0.88, 1, 40);

const tmpMatrix = new Matrix4();
const tmpPos = new Vector3();
const tmpScale = new Vector3();
const noTurn = new Quaternion();
const from = new Vector3();
const to = new Vector3();

const MAX_STEP = 0.1;
const DOT_SPEED = 0.45;
const DOT_R = 0.028;

/** One simulated tap: the phone asks, the tag may answer with its bytes, the phone opens the link. */
const CYCLE = 3.6;
const ASK = 0.5;
const BYTES_START = 0.75;
const BYTE_GAP = 0.07;
const BYTE_TRAVEL = 0.55;
const BYTES_END = BYTES_START + (RECORD.bytes.length - 1) * BYTE_GAP + BYTE_TRAVEL;
const OPENED_END = 3.4;
const NO_ANSWER_END = 2.4;

type Phase = "idle" | "reading" | "opened" | "noAnswer" | "weak" | "sometimes";

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

/** Dots that flow round the field lines; they shrink where the field is weak. */
function FieldDots({
  loops,
  color,
  boost,
  clip,
}: {
  loops: FieldLoop[];
  color: string;
  boost: number;
  clip: Plane[];
}) {
  const { paused } = useSceneMotion();
  const ref = useRef<InstancedMesh>(null);
  const time = useRef(0);
  const point = useMemo(() => new Vector3(), []);
  const count = useMemo(() => loops.reduce((n, l) => n + l.dots, 0), [loops]);

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    if (!paused) time.current += Math.min(delta, MAX_STEP);
    let k = 0;
    loops.forEach((loop, li) => {
      for (let j = 0; j < loop.dots; j++) {
        const along = (time.current * DOT_SPEED + (j / loop.dots) * loop.total + li * 0.37) % loop.total;
        const glow = sampleLoop(loop, along, point);
        tmpMatrix.compose(point, noTurn, tmpScale.setScalar(DOT_R * boost * glow));
        mesh.setMatrixAt(k++, tmpMatrix);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[dotGeometry, undefined, count]} frustumCulled={false}>
      <meshBasicMaterial color={color} clippingPlanes={clip} />
    </instancedMesh>
  );
}

interface SpiralItem {
  position: Vec3;
  scale: Vec3;
}

/** A flat three-turn rectangular spiral printed on the sticker. */
const SPIRAL: SpiralItem[] = (() => {
  const out: SpiralItem[] = [];
  const w = 0.018;
  const y = TAG_TOP + 0.002;
  for (let t = 0; t < 3; t++) {
    const hx = 0.46 - t * 0.055;
    const hz = 0.31 - t * 0.055;
    out.push({ position: [0, y, -hz], scale: [hx * 2 + w, 0.004, w] });
    out.push({ position: [0, y, hz], scale: [hx * 2 + w, 0.004, w] });
    out.push({ position: [-hx, y, 0], scale: [w, 0.004, hz * 2] });
    out.push({ position: [hx, y, 0], scale: [w, 0.004, hz * 2] });
  }
  return out;
})();

function Spiral({ color, emissive, intensity }: { color: string; emissive: string; intensity: number }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    SPIRAL.forEach((s, i) => {
      tmpMatrix.compose(tmpPos.set(...s.position), noTurn, tmpScale.set(...s.scale));
      mesh.setMatrixAt(i, tmpMatrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);
  return (
    <instancedMesh ref={ref} args={[unitBox, undefined, SPIRAL.length]}>
      <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={intensity} roughness={0.4} metalness={0.2} />
    </instancedMesh>
  );
}

/** The distance scale beside the phone: green where every tap reads, amber where some do, red where none do. */
function Ruler({ roomy }: { roomy: boolean }) {
  const p = usePalette();
  const zones = useMemo(
    () => [
      { from: 0, to: 4, color: mixColor(p.surface2, p.ok, 0.7) },
      { from: 4, to: 8, color: mixColor(p.surface2, p.warn, 0.7) },
      { from: 8, to: MAX_CM, color: mixColor(p.surface2, p.bad, 0.7) },
    ],
    [p],
  );
  const ticks = useMemo(() => Array.from({ length: MAX_CM + 1 }, (_, i) => i), []);
  return (
    <group position={[RULER_X, 0, 0]}>
      {zones.map((z) => (
        <mesh key={z.from} position={[0, phoneY((z.from + z.to) / 2), 0]}>
          <boxGeometry args={[0.06, (z.to - z.from) * CM, 0.06]} />
          <meshStandardMaterial color={z.color} roughness={0.7} />
        </mesh>
      ))}
      {ticks.map((cm) => (
        <mesh key={cm} position={[-0.06, phoneY(cm), 0]}>
          <boxGeometry args={[cm % 4 === 0 ? 0.1 : 0.05, 0.008, 0.02]} />
          <meshStandardMaterial color={p.ink3} roughness={0.7} />
        </mesh>
      ))}
      {[0, 4, 8, 12].map((cm) => (
        <Label3D key={cm} position={[roomy ? -0.36 : -0.3, phoneY(cm), 0]} tone="muted" visible={roomy || cm !== 0}>
          {cm === 0 ? "0" : `${cm} cm`}
        </Label3D>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* The scene                                                           */
/* ------------------------------------------------------------------ */

const PHASE_TEXT: Record<Exclude<Phase, "idle">, string> = {
  reading: `Reading ${RECORD.bytes.length} bytes`,
  opened: `Opened ${TAG_URL}`,
  noAnswer: "No answer this time",
  weak: "Too weak to power the tag",
  sometimes: "Reads on some taps only",
};

function TapDiorama({ distance, active = null, onSelect, onTap }: NfcSceneProps) {
  const p = usePalette();
  const { paused } = useSceneMotion();
  const invalidate = useThree((s) => s.invalidate);
  const roomy = useThree((s) => s.size.width) >= 520;
  const fit = useFitScale(roomy ? FIT_WIDTH : NARROW_FIT_WIDTH);
  const field = useMemo(() => buildField(), []);
  useEffect(() => () => field.geometry.dispose(), [field]);

  const colors = useMemo(
    () => ({
      table: mixColor(mixColor(p.surface2, p.lineStrong, 0.35), p.copper, 0.1),
      phone: mixColor(p.casingDark, p.ink3, 0.45),
      field: p.u2,
      screenOff: mixColor(p.casingDark, p.ink3, 0.25),
      screenOn: mixColor(p.silk, p.brand, 0.35),
    }),
    [p],
  );

  const phone = useRef<Group>(null);
  const ask = useRef<Mesh>(null);
  const askMat = useRef<MeshBasicMaterial>(null);
  const bytes = useRef<InstancedMesh>(null);
  const chipMat = useRef<MeshStandardMaterial>(null);
  const halo = useRef<MeshBasicMaterial>(null);
  const screen = useRef<MeshStandardMaterial>(null);

  const distanceRef = useRef(distance);
  distanceRef.current = distance;
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;
  const activeRef = useRef(active);
  activeRef.current = active;

  const clock = useRef({
    time: 0,
    tap: -1,
    /** The distance the current tap is being made at. */
    at: distance,
    read: false,
    chance: 0,
    reported: false,
    y: phoneY(distance),
  });
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");

  useEffect(() => {
    invalidate();
  }, [distance, active, invalidate]);

  // The table hides the part of the field below its top (the field itself passes straight through wood).
  const gl = useThree((s) => s.gl);
  const clip = useMemo(() => [new Plane(new Vector3(0, 1, 0), 0)], []);
  useLayoutEffect(() => {
    gl.localClippingEnabled = true;
    clip[0].constant = -VIEW_Y * (1 - fit);
    invalidate();
  }, [gl, clip, fit, invalidate]);

  useFrame((_, delta) => {
    const c = clock.current;
    const d = distanceRef.current;
    const step = Math.min(delta, MAX_STEP);
    const target = phoneY(d);
    if (paused || Math.abs(target - c.y) < 1e-4) c.y = target;
    else c.y += (target - c.y) * (1 - Math.exp(-step * 6));
    phone.current?.position.setY(c.y);

    const chipSelected = activeRef.current === "chip";
    let chipGlow = 0;
    let haloOpacity = 0;
    let screenLit = false;
    let askAt: number | null = null;
    let next: Phase = "idle";
    let shown = 0;

    if (paused) {
      // A still scene shows the result of a tap at this distance.
      const chance = readChance(d);
      if (chance >= 1) {
        chipGlow = 1.1;
        haloOpacity = 0.32;
        screenLit = true;
        next = "opened";
      } else if (chance > 0) {
        chipGlow = 0.5;
        haloOpacity = 0.12;
        next = "sometimes";
      } else {
        next = "weak";
      }
    } else {
      // Moving the phone abandons the tap in progress and starts a new one at the new distance.
      if (d !== c.at) {
        c.at = d;
        c.time = 0;
        c.tap = -1;
      }
      c.time += step;
      const k = Math.floor(c.time / CYCLE);
      const t = c.time - k * CYCLE;
      if (k !== c.tap) {
        c.tap = k;
        c.chance = readChance(d);
        c.read = c.chance >= 1 ? true : c.chance <= 0 ? false : tapsAt(d)[k % TAP_COUNT];
        c.reported = false;
      }
      if (!c.reported && t >= ASK) {
        c.reported = true;
        onTapRef.current?.({ index: k % TAP_COUNT, read: c.read, distance: c.at });
      }
      if (t < ASK) askAt = t / ASK;
      if (c.read) {
        if (t >= ASK && t < OPENED_END) {
          chipGlow = 1.1 * clamp01((t - ASK) / 0.2);
          haloOpacity = 0.34 * clamp01((t - ASK) / 0.2);
        }
        if (t >= BYTES_START && t < BYTES_END) next = "reading";
        if (t >= BYTES_END && t < OPENED_END) {
          next = "opened";
          screenLit = true;
        }
        if (t >= BYTES_START && t < BYTES_END) {
          shown = RECORD.bytes.length;
        }
      } else if (t >= ASK && t < NO_ANSWER_END) {
        // Some power reaches the chip, but not enough for it to answer.
        if (c.chance > 0 && t < ASK + 0.35) {
          chipGlow = 0.45;
          haloOpacity = 0.1;
        }
        next = c.chance > 0 ? "noAnswer" : "weak";
      }
    }

    // The phone's "is anyone there?" pulse, travelling down to the tag.
    const ring = ask.current;
    const ringMat = askMat.current;
    if (ring && ringMat) {
      ring.visible = askAt !== null;
      if (askAt !== null) {
        ring.position.y = c.y + COIL_Y + (TAG_TOP + 0.01 - c.y - COIL_Y) * askAt;
        const s = COIL_R * (1 + 0.25 * askAt);
        ring.scale.set(s, s, s);
        ringMat.opacity = 0.75 * (1 - askAt * 0.6);
      }
    }

    // The tag's bytes, one after another, from the chip up to the coil.
    const b = bytes.current;
    if (b) {
      const t = c.time - Math.floor(c.time / CYCLE) * CYCLE;
      to.set(0, c.y + COIL_Y, 0);
      from.set(CHIP[0], CHIP[1] + 0.02, CHIP[2]);
      let n = 0;
      for (let i = 0; i < shown; i++) {
        const u = (t - BYTES_START - i * BYTE_GAP) / BYTE_TRAVEL;
        if (u < 0 || u > 1) continue;
        tmpPos.lerpVectors(from, to, u);
        // Arc towards the viewer so the bytes stay clear of the field lines.
        tmpPos.z += Math.sin(u * Math.PI) * 0.4;
        tmpMatrix.compose(tmpPos, noTurn, tmpScale.setScalar(0.085));
        b.setMatrixAt(n++, tmpMatrix);
      }
      b.count = n;
      b.instanceMatrix.needsUpdate = true;
    }

    const chip = chipMat.current;
    if (chip) {
      chip.emissive.set(chipGlow > 0 ? p.signal : p.brand);
      chip.emissiveIntensity = chipGlow > 0 ? chipGlow : chipSelected ? 0.6 : 0;
    }
    if (halo.current) halo.current.opacity = haloOpacity;
    const scr = screen.current;
    if (scr) {
      scr.color.set(screenLit ? colors.screenOn : colors.screenOff);
      scr.emissive.set(screenLit ? colors.screenOn : colors.screenOff);
      scr.emissiveIntensity = screenLit ? 0.55 : 0;
      scr.opacity = screenLit ? 0.75 : 0.5;
    }

    if (next !== phaseRef.current) {
      phaseRef.current = next;
      setPhase(next);
    }
  });

  const h = fieldStrength(distance);
  const antennaGlow = 0.9 * brightness(h);
  const select = (id: NfcPart) => (onSelect ? () => onSelect(id) : undefined);
  const selectCoil = (e: ThreeEvent<MouseEvent>) => {
    if (!onSelect || e.delta > 6) return;
    e.stopPropagation();
    onSelect("coil");
  };
  const fieldOn = active === "field";

  return (
    <group position={[roomy ? 0 : NARROW_SHIFT * fit, VIEW_Y * (1 - fit), 0]} scale={fit}>
      {/* Table */}
      <RoundedBox args={[5.4, 0.16, 2.6]} radius={0.05} smoothness={2} position={[0, -0.08, 0]}>
        <meshStandardMaterial color={colors.table} roughness={0.85} />
      </RoundedBox>

      {/* The tag: a sticker with an antenna and a chip, and no battery */}
      <AssetFrame
        highlighted={active === "antenna"}
        accent={p.brand}
        onSelect={select("antenna")}
        labelHeight={0.2}
      >
        <RoundedBox args={[1.1, TAG_TOP, 0.78]} radius={0.005} smoothness={1} position={[0, TAG_TOP / 2, 0]}>
          <meshStandardMaterial color={p.silk} roughness={0.6} />
        </RoundedBox>
        <Spiral
          color={p.copper}
          emissive={active === "antenna" ? p.brand : colors.field}
          intensity={active === "antenna" ? Math.max(0.6, antennaGlow) : antennaGlow}
        />
      </AssetFrame>
      <AssetFrame
        position={CHIP}
        highlighted={active === "chip"}
        accent={p.brand}
        onSelect={select("chip")}
        labelHeight={0.2}
      >
        <mesh>
          <boxGeometry args={[0.1, 0.025, 0.1]} />
          <meshStandardMaterial ref={chipMat} color={p.casingDark} emissive={p.signal} emissiveIntensity={0} roughness={0.4} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.16, 16, 10]} />
          <meshBasicMaterial ref={halo} color={p.signal} transparent opacity={0} depthWrite={false} />
        </mesh>
      </AssetFrame>

      <Ruler roomy={roomy} />

      {/* The phone, held flat over the tag. It is drawn see-through to show its coil. */}
      <group ref={phone} position={[0, phoneY(distance), 0]}>
        <RoundedBox
          args={[PHONE_W, PHONE_T, PHONE_D]}
          radius={0.1}
          smoothness={3}
          position={[0, PHONE_T / 2, 0]}
          onClick={selectCoil}
        >
          <meshStandardMaterial color={colors.phone} transparent opacity={0.45} depthWrite={false} roughness={0.35} />
        </RoundedBox>
        <mesh position={[0, PHONE_T + 0.004, 0]}>
          <boxGeometry args={[PHONE_W - 0.2, 0.006, PHONE_D - 0.18]} />
          <meshStandardMaterial
            ref={screen}
            color={colors.screenOff}
            emissive={colors.screenOff}
            emissiveIntensity={0}
            transparent
            opacity={0.5}
            depthWrite={false}
            roughness={0.3}
          />
        </mesh>
        {/* Camera bump on the back, at the far end */}
        <mesh position={[1.05, -0.012, -0.42]}>
          <boxGeometry args={[0.42, 0.024, 0.42]} />
          <meshStandardMaterial color={p.casingDark} roughness={0.4} />
        </mesh>
        <AssetFrame
          position={[0, COIL_Y, 0]}
          highlighted={active === "coil"}
          accent={p.brand}
          onSelect={select("coil")}
          labelHeight={0.3}
        >
          {[1, 0.88, 0.76, 0.64].map((s) => (
            <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} scale={COIL_R * s}>
              <torusGeometry args={[1, 0.026 / s, 6, 48]} />
              <GlowMaterial color={p.copper} roughness={0.35} metalness={0.3} />
            </mesh>
          ))}
        </AssetFrame>

        {/* The field moves with the phone */}
        <group position={[0, COIL_Y, 0]}>
          <mesh geometry={field.geometry} renderOrder={2}>
            <meshBasicMaterial
              color={colors.field}
              vertexColors
              transparent
              opacity={fieldOn ? 1 : 0.85}
              depthWrite={false}
              side={DoubleSide}
              clippingPlanes={clip}
            />
          </mesh>
          <FieldDots loops={field.loops} color={colors.field} boost={fieldOn ? 1.4 : 1} clip={clip} />
        </group>

        {/* Pointer to the distance scale */}
        <mesh position={[(RULER_X + 0.03 - PHONE_W / 2) / 2, 0.004, 0]}>
          <boxGeometry args={[-PHONE_W / 2 - RULER_X - 0.03, 0.008, 0.02]} />
          <meshStandardMaterial color={p.ink2} roughness={0.6} />
        </mesh>
        <mesh position={[RULER_X, 0.004, 0]}>
          <boxGeometry args={[0.14, 0.016, 0.1]} />
          <meshStandardMaterial color={p.ink} roughness={0.6} />
        </mesh>

        {/* Labels that travel with the phone */}
        <Label3D position={[0.15, PHONE_T + 0.42, 0]} tone={phase === "opened" ? "accent" : "default"} visible={phase !== "idle"}>
          {phase === "idle" ? "" : phase === "opened" ? <strong>{PHASE_TEXT.opened}</strong> : PHASE_TEXT[phase]}
        </Label3D>
        <Label3D position={[-0.95, PHONE_T + 0.16, 0.5]} tone={active === "coil" ? "accent" : "default"} visible={roomy}>
          NFC coil (inside)
        </Label3D>
        <Label3D position={[2.15, -0.1, 0.2]} tone={fieldOn ? "accent" : "u2"} visible={roomy}>
          Magnetic field
        </Label3D>
      </group>

      {/* Parts on the table */}
      <Label3D position={[-0.15, 0.04, 0.72]} tone={active === "antenna" ? "accent" : "default"}>
        Tag (no battery)
      </Label3D>

      {/* Bytes and the read request */}
      <instancedMesh ref={bytes} args={[byteGeometry, undefined, RECORD.bytes.length]} frustumCulled={false}>
        <meshStandardMaterial color={p.signal} emissive={p.signal} emissiveIntensity={0.9} roughness={0.4} />
      </instancedMesh>
      <mesh ref={ask} geometry={pulseGeometry} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <meshBasicMaterial ref={askMat} color={colors.field} transparent opacity={0} depthWrite={false} side={DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * Topic 2.9: a phone held over an NFC tag. The phone's coil makes a magnetic
 * field that fades very fast with distance; close enough, it powers the tag,
 * which answers with the bytes of its NDEF record.
 */
export default function NfcScene({ distance, active = null, onSelect, onTap }: NfcSceneProps) {
  return (
    <Scene3D
      label={`A phone held ${distance} cm above an NFC tag, with the magnetic field of its coil`}
      height="clamp(300px, 70vw, 440px)"
      camera={{ position: [0, 3.4, 5.7], fov: 38, target: [0, VIEW_Y, 0] }}
    >
      <TapDiorama distance={distance} active={active} onSelect={onSelect} onTap={onTap} />
    </Scene3D>
  );
}
