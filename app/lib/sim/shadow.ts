/**
 * A device shadow (AWS) or device twin (Azure): the cloud keeps the state the
 * app wants ("desired") next to the state the device last said it has
 * ("reported"). The difference is the "delta" the device must apply when it
 * next connects. Used by the 3.3 visual and the L21 bulb.
 */
export type ShadowValue = string | number | boolean;
export type ShadowState = Record<string, ShadowValue>;

export interface Shadow {
  desired: ShadowState;
  reported: ShadowState;
  /** Goes up by one on every change, so the device can ignore stale updates */
  version: number;
}

export function createShadow(reported: ShadowState = {}): Shadow {
  return { desired: { ...reported }, reported: { ...reported }, version: 1 };
}

/** The app (or a rule) asks for a new state. */
export function setDesired(s: Shadow, change: ShadowState): Shadow {
  return { ...s, desired: { ...s.desired, ...change }, version: s.version + 1 };
}

/** The device says what state it is really in. */
export function report(s: Shadow, change: ShadowState): Shadow {
  return { ...s, reported: { ...s.reported, ...change }, version: s.version + 1 };
}

/** Desired keys whose value differs from reported. Empty when in sync. */
export function delta(s: Shadow): ShadowState {
  const out: ShadowState = {};
  for (const [k, v] of Object.entries(s.desired)) if (s.reported[k] !== v) out[k] = v;
  return out;
}

export const inSync = (s: Shadow) => Object.keys(delta(s)).length === 0;

/**
 * The device connects, reads the delta, applies it and reports back. An
 * offline device changes nothing: the delta waits in the cloud.
 */
export function deviceSync(s: Shadow, online: boolean): { shadow: Shadow; applied: ShadowState } {
  const d = delta(s);
  if (!online || Object.keys(d).length === 0) return { shadow: s, applied: {} };
  return { shadow: report(s, d), applied: d };
}
