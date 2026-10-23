/**
 * L28 STRIDE threat modelling workshop. A smart door lock system is drawn as
 * a data-flow diagram (DFD). Each element gets the STRIDE categories that
 * apply to its type ("STRIDE per element", from Microsoft's SDL), each threat
 * is rated on a 5 × 5 risk matrix, and mitigations are matched to the
 * category they actually address.
 */

export type Stride = "S" | "T" | "R" | "I" | "D" | "E";
export const STRIDE_ORDER: Stride[] = ["S", "T", "R", "I", "D", "E"];

export const STRIDE: Record<Stride, { name: string; property: string; control: string; question: string }> = {
  S: { name: "Spoofing", property: "authentication", control: "an authentication", question: "Can someone pretend to be this?" },
  T: { name: "Tampering", property: "integrity", control: "an integrity", question: "Can someone change it?" },
  R: { name: "Repudiation", property: "non-repudiation", control: "a logging", question: "Can someone deny doing something?" },
  I: { name: "Information disclosure", property: "confidentiality", control: "an encryption", question: "Can someone read what they should not?" },
  D: { name: "Denial of service", property: "availability", control: "an availability", question: "Can someone stop it working?" },
  E: { name: "Elevation of privilege", property: "authorisation", control: "an authorisation", question: "Can someone gain rights they should not have?" },
};

export type ElementKind = "external" | "process" | "store" | "flow";

/** STRIDE per element: which categories apply to each kind of DFD element. */
export const PER_ELEMENT: Record<ElementKind, Stride[]> = {
  external: ["S", "R"],
  process: ["S", "T", "R", "I", "D", "E"],
  store: ["T", "I", "D"],
  flow: ["T", "I", "D"],
};

export type Zone = "phone" | "internet" | "home" | "radio";

export interface Element {
  id: string;
  name: string;
  kind: ElementKind;
  zone: Zone;
  /** A store that holds logs can also be repudiated */
  logs?: boolean;
  from?: string;
  to?: string;
  /** Position on a 100 × 60 diagram (stores, processes and externals only) */
  x?: number;
  y?: number;
}

export const ELEMENTS: Element[] = [
  { id: "resident", name: "Resident", kind: "external", zone: "phone", x: 8, y: 30 },
  { id: "app", name: "Mobile app", kind: "process", zone: "phone", x: 24, y: 30 },
  { id: "cloud", name: "Cloud API", kind: "process", zone: "internet", x: 50, y: 30 },
  { id: "registry", name: "Device registry", kind: "store", zone: "internet", x: 42, y: 8 },
  { id: "log", name: "Access log", kind: "store", zone: "internet", logs: true, x: 58, y: 52 },
  { id: "hub", name: "Home hub", kind: "process", zone: "home", x: 74, y: 30 },
  { id: "lock", name: "Smart lock", kind: "process", zone: "radio", x: 92, y: 30 },
  { id: "f-app-cloud", name: "App → Cloud (HTTPS)", kind: "flow", zone: "internet", from: "app", to: "cloud" },
  { id: "f-cloud-hub", name: "Cloud → Hub (MQTT over TLS)", kind: "flow", zone: "home", from: "cloud", to: "hub" },
  { id: "f-hub-lock", name: "Hub → Lock (Bluetooth LE)", kind: "flow", zone: "radio", from: "hub", to: "lock" },
];

/** Lines where data crosses from one level of trust to another. */
export const BOUNDARIES: { name: string; zone: Zone }[] = [
  { name: "Phone", zone: "phone" },
  { name: "Internet and cloud", zone: "internet" },
  { name: "Home network", zone: "home" },
  { name: "Bluetooth range", zone: "radio" },
];

export const getElement = (id: string) => ELEMENTS.find((e) => e.id === id)!;

export function categoriesFor(e: Element): Stride[] {
  if (e.kind === "store" && e.logs) return ["T", "R", "I", "D"];
  return PER_ELEMENT[e.kind];
}

/** [threat, suggested likelihood, suggested impact] for each element and category */
const CATALOGUE: Record<string, Partial<Record<Stride, [string, number, number]>>> = {
  resident: {
    S: ["Someone signs in as the resident with a stolen password.", 4, 5],
    R: ["The resident denies opening the door at 2 a.m., and nothing proves who did.", 3, 3],
  },
  app: {
    S: ["A fake copy of the app tricks the resident into typing their login.", 3, 4],
    T: ["A modified app on a rooted phone sends unlock commands without checks.", 2, 4],
    R: ["The app sends commands with no record of which user pressed what.", 3, 3],
    I: ["The app stores the login token unencrypted on the phone.", 3, 4],
    D: ["The app crashes on unexpected data, so the resident cannot lock the door.", 2, 3],
    E: ["A guest account in the app can add new users.", 2, 5],
  },
  cloud: {
    S: ["A fake hub connects to the cloud and receives commands meant for the real one.", 2, 5],
    T: ["Commands are changed inside the cloud service.", 2, 5],
    R: ["Changes to user rights are not logged.", 3, 3],
    I: ["An insecure API returns other customers' lock history.", 3, 5],
    D: ["A flood of requests takes the API down, so no one can unlock remotely.", 3, 4],
    E: ["A bug lets an ordinary user call admin-only functions.", 2, 5],
  },
  hub: {
    S: ["Another device pretends to be the hub on the home Wi-Fi.", 2, 4],
    T: ["The hub's firmware is replaced with a modified version.", 2, 5],
    R: ["The hub keeps no record of which commands it passed on.", 3, 2],
    I: ["The hub's web page shows the Wi-Fi password.", 3, 4],
    D: ["A power cut or radio interference stops the hub.", 3, 4],
    E: ["An old web server on the hub lets an attacker run code with full rights.", 3, 5],
  },
  lock: {
    S: ["A fake Bluetooth command is accepted as coming from the hub.", 3, 5],
    T: ["Someone opens the lock's case and changes its firmware.", 2, 5],
    R: ["The lock cannot show when or why it opened.", 3, 3],
    I: ["The lock reveals its unlock code over Bluetooth.", 2, 5],
    D: ["Constant connection attempts drain the battery and the door gets stuck.", 3, 4],
    E: ["A leftover debug mode lets anyone with a cable open the lock.", 2, 5],
  },
  registry: {
    T: ["Device records are changed so a fake device is trusted.", 2, 5],
    I: ["The registry leaks device keys and owners' addresses.", 2, 5],
    D: ["The registry goes down, so no device can connect.", 2, 4],
  },
  log: {
    T: ["Someone deletes the entries that show a break-in.", 2, 4],
    R: ["Log entries have no reliable time or user, so they prove nothing.", 3, 3],
    I: ["The access log reveals when the family is away.", 3, 4],
    D: ["The log fills the disk and stops recording.", 2, 3],
  },
  "f-app-cloud": {
    T: ["A man in the middle changes the command between app and cloud.", 2, 5],
    I: ["Login details are read on public Wi-Fi when the app does not check the certificate.", 3, 4],
    D: ["A blocked or weak mobile connection stops commands getting through.", 3, 3],
  },
  "f-cloud-hub": {
    T: ["A command is altered on its way to the hub.", 2, 5],
    I: ["MQTT messages to the hub can be read if TLS is turned off.", 3, 4],
    D: ["The home internet goes down, so the hub misses commands.", 4, 3],
  },
  "f-hub-lock": {
    T: ["A Bluetooth command is recorded and replayed later to open the door.", 3, 5],
    I: ["Someone nearby listens to the Bluetooth link and learns the lock's state.", 3, 3],
    D: ["Bluetooth interference stops the lock receiving commands.", 2, 4],
  },
};

export interface Threat {
  id: string;
  element: string;
  category: Stride;
  text: string;
  suggested: { likelihood: number; impact: number };
}

export function threatsFor(elementIds: string[]): Threat[] {
  const out: Threat[] = [];
  for (const e of ELEMENTS) {
    if (!elementIds.includes(e.id)) continue;
    for (const category of categoriesFor(e)) {
      const [text, likelihood, impact] = CATALOGUE[e.id][category]!;
      out.push({ id: `${e.id}:${category}`, element: e.id, category, text, suggested: { likelihood, impact } });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Risk                                                                */
/* ------------------------------------------------------------------ */

export type Band = "low" | "medium" | "high" | "critical";

/** Risk = likelihood × impact, each rated 1–5. */
export function band(risk: number): Band {
  if (risk <= 4) return "low";
  if (risk <= 9) return "medium";
  if (risk <= 16) return "high";
  return "critical";
}

/* ------------------------------------------------------------------ */
/* Mitigations                                                         */
/* ------------------------------------------------------------------ */

export interface Mitigation {
  id: string;
  category: Stride;
  text: string;
}

export const MITIGATIONS: Mitigation[] = [
  { id: "mfa", category: "S", text: "Strong authentication: two-factor login for people" },
  { id: "cert", category: "S", text: "Device certificates (X.509) with mutual TLS" },
  { id: "sign", category: "T", text: "Integrity checks: signed firmware and authenticated messages" },
  { id: "replay", category: "T", text: "Counters or timestamps so old messages are rejected" },
  { id: "audit", category: "R", text: "Tamper-proof, time-stamped audit logs" },
  { id: "encrypt", category: "I", text: "Encryption in transit and at rest" },
  { id: "minimise", category: "I", text: "Collect and keep less data; hide secrets from pages and logs" },
  { id: "rate", category: "D", text: "Rate limiting, spare capacity and a local fallback (keypad)" },
  { id: "least", category: "E", text: "Least privilege, input checks and separate admin accounts" },
];

export const getMitigation = (id: string) => MITIGATIONS.find((m) => m.id === id)!;

/** A mitigation only helps against the category it was designed for. */
export function tryMitigate(threat: Threat, mitigationId: string): { ok: boolean; reason: string } {
  const m = getMitigation(mitigationId);
  if (m.category === threat.category) return { ok: true, reason: `${m.text} protects ${STRIDE[m.category].property}, which ${STRIDE[threat.category].name.toLowerCase()} attacks.` };
  return {
    ok: false,
    reason: `This protects ${STRIDE[m.category].property}, but ${STRIDE[threat.category].name.toLowerCase()} attacks ${STRIDE[threat.category].property}. Choose ${STRIDE[threat.category].control} control.`,
  };
}

export interface Assessment {
  threat: Threat;
  likelihood: number;
  impact: number;
  mitigations: string[];
}

export interface Scored {
  risk: number;
  band: Band;
  residualLikelihood: number;
  residualRisk: number;
  residualBand: Band;
}

/** The first matching mitigation lowers likelihood by 2, each further one by 1 (never below 1). */
export function scoreAssessment(a: Assessment): Scored {
  const valid = a.mitigations.filter((id) => getMitigation(id).category === a.threat.category).length;
  const drop = valid === 0 ? 0 : 2 + (valid - 1);
  const residualLikelihood = Math.max(1, a.likelihood - drop);
  const risk = a.likelihood * a.impact;
  const residualRisk = residualLikelihood * a.impact;
  return { risk, band: band(risk), residualLikelihood, residualRisk, residualBand: band(residualRisk) };
}

export const suggestedAssessment = (t: Threat): Assessment => ({ threat: t, likelihood: t.suggested.likelihood, impact: t.suggested.impact, mitigations: [] });

/** Highest risk first; ties keep the diagram order, then STRIDE order. */
export function ranked(list: Assessment[], residual = false): Assessment[] {
  const order = (a: Assessment) => ELEMENTS.findIndex((e) => e.id === a.threat.element) * 10 + STRIDE_ORDER.indexOf(a.threat.category);
  return [...list].sort((a, b) => {
    const ra = residual ? scoreAssessment(a).residualRisk : scoreAssessment(a).risk;
    const rb = residual ? scoreAssessment(b).residualRisk : scoreAssessment(b).risk;
    return rb - ra || order(a) - order(b);
  });
}

export function countBands(list: Assessment[], residual = false): Record<Band, number> {
  const out: Record<Band, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const a of list) {
    const s = scoreAssessment(a);
    out[residual ? s.residualBand : s.band]++;
  }
  return out;
}
