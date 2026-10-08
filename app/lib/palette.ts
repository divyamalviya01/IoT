import { useResolvedTheme, type ResolvedTheme } from "./theme";

/**
 * JS mirror of the colour tokens in app.css, for places CSS variables can't
 * reach (three.js materials, canvas drawing). Keep the two in sync.
 */
export interface Palette {
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  lineStrong: string;
  ink: string;
  ink2: string;
  ink3: string;
  brand: string;
  copper: string;
  u1: string;
  u2: string;
  u3: string;
  ok: string;
  warn: string;
  bad: string;
  pcb: string;
  pcb2: string;
  pcbTrace: string;
  silk: string;
  /** Neutral body colour for 3D device casings */
  casing: string;
  /** Darker casing for contrast parts (screens, chips) */
  casingDark: string;
  /** Glowing signal / packet colour */
  signal: string;
}

export const palettes: Record<ResolvedTheme, Palette> = {
  light: {
    bg: "#f5f7f8",
    surface: "#ffffff",
    surface2: "#edf1f3",
    line: "#d9e0e4",
    lineStrong: "#b9c4cb",
    ink: "#15232d",
    ink2: "#3f515d",
    ink3: "#5e6f78",
    brand: "#0b6b4f",
    copper: "#b0622a",
    u1: "#a65a1f",
    u2: "#2b5fc7",
    u3: "#7444b8",
    ok: "#177245",
    warn: "#8a5f00",
    bad: "#be3127",
    pcb: "#0e4a3a",
    pcb2: "#135c48",
    pcbTrace: "#c98a4b",
    silk: "#f1f4ee",
    casing: "#e4e9ec",
    casingDark: "#2a3a44",
    signal: "#1f9e74",
  },
  dark: {
    bg: "#0f171c",
    surface: "#16222a",
    surface2: "#1c2b35",
    line: "#263843",
    lineStrong: "#36505e",
    ink: "#e6edf0",
    ink2: "#b3c2ca",
    ink3: "#8a9ca6",
    brand: "#3fbf8f",
    copper: "#e0955a",
    u1: "#e39a5e",
    u2: "#7fa6f5",
    u3: "#b794ee",
    ok: "#4cc488",
    warn: "#e8b931",
    bad: "#f2776b",
    pcb: "#0b3a2e",
    pcb2: "#0f4a3b",
    pcbTrace: "#d99a5c",
    silk: "#e8ede4",
    casing: "#9fb0ba",
    casingDark: "#1a262e",
    signal: "#46d6a0",
  },
};

export function usePalette(): Palette {
  return palettes[useResolvedTheme()];
}

export type UnitNumber = 1 | 2 | 3;

export function unitColor(p: Palette, unit: UnitNumber | 0): string {
  if (unit === 1) return p.u1;
  if (unit === 2) return p.u2;
  if (unit === 3) return p.u3;
  return p.brand;
}
