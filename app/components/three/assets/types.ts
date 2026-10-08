import type { Vec3 } from "../types";

export type { Vec3 };

/** Props every 3D asset accepts. Models sit on y = 0 and face +z. */
export interface AssetProps {
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  /** Glow in `accent` on key parts and grow slightly. */
  highlighted?: boolean;
  /** Glow colour. Default palette.brand. */
  accent?: string;
  label?: string;
  /** Default true when a label is given. */
  showLabel?: boolean;
  /** Makes the model clickable, with a pointer cursor on hover. */
  onSelect?: () => void;
}
