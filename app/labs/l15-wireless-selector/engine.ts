/**
 * Lab L15: choose a wireless technology from a project's needs.
 *
 * Hard limits rule a technology out (it cannot reach far enough, carry the
 * data rate, or talk to a phone when one is required). The rest are scored:
 * low power matters more the longer the battery must last, low cost matters
 * when nodes must be cheap, mesh and IP matter only when asked for, and a
 * technology whose typical range is close to the need scores a little
 * higher than one that is far bigger or smaller.
 *
 * Figures are typical values for teaching, not data-sheet guarantees.
 * NB-IoT and LTE-M join the list in topic 3.22 (cellular IoT).
 */

export type TechId = "nfc" | "ble" | "classic" | "zigbee" | "wifi" | "lorawan";

export interface Tech {
  id: TechId;
  name: string;
  /** Typical range, metres */
  typicalRangeM: number;
  /** Largest range in good conditions, metres */
  maxRangeM: number;
  /** Maximum data rate, kbps */
  rateKbps: number;
  /** 1 = lowest power, 5 = highest */
  power: number;
  /** 1 = cheapest per node, 5 = dearest */
  cost: number;
  /** How well it builds a mesh, 0–1 */
  mesh: number;
  phone: boolean;
  ip: boolean;
  band: string;
}

export const TECHS: Tech[] = [
  { id: "nfc", name: "NFC", typicalRangeM: 0.04, maxRangeM: 0.1, rateKbps: 424, power: 1, cost: 1, mesh: 0, phone: true, ip: false, band: "13.56 MHz" },
  { id: "ble", name: "BLE", typicalRangeM: 15, maxRangeM: 100, rateKbps: 1000, power: 2, cost: 2, mesh: 0.5, phone: true, ip: false, band: "2.4 GHz" },
  { id: "classic", name: "Bluetooth Classic", typicalRangeM: 10, maxRangeM: 100, rateKbps: 3000, power: 3, cost: 2, mesh: 0, phone: true, ip: false, band: "2.4 GHz" },
  { id: "zigbee", name: "Zigbee", typicalRangeM: 20, maxRangeM: 100, rateKbps: 250, power: 2, cost: 3, mesh: 1, phone: false, ip: false, band: "2.4 GHz" },
  { id: "wifi", name: "Wi-Fi", typicalRangeM: 40, maxRangeM: 100, rateKbps: 100_000, power: 5, cost: 3, mesh: 0.25, phone: true, ip: true, band: "2.4 / 5 GHz" },
  { id: "lorawan", name: "LoRaWAN", typicalRangeM: 5000, maxRangeM: 15_000, rateKbps: 5.5, power: 1, cost: 3, mesh: 0, phone: false, ip: false, band: "865–867 MHz (India)" },
];

export type Battery = "mains" | "months" | "years";
export type CostNeed = "normal" | "veryLow";

export interface Needs {
  rangeM: number;
  rateKbps: number;
  battery: Battery;
  cost: CostNeed;
  mesh: boolean;
  phone: boolean;
  ip: boolean;
}

const BATTERY_WEIGHT: Record<Battery, number> = { mains: 0, months: 2, years: 3 };
const COST_WEIGHT: Record<CostNeed, number> = { normal: 1, veryLow: 2 };

export interface Scored {
  tech: Tech;
  excluded: boolean;
  /** Why it was ruled out, or why it scored as it did */
  reasons: string[];
  score: number;
  parts: { power: number; cost: number; mesh: number; ip: number; rangeFit: number };
}

const fmtRange = (m: number) => (m >= 1000 ? `${m / 1000} km` : m >= 1 ? `${m} m` : `${m * 100} cm`);
const fmtRate = (k: number) => (k >= 1000 ? `${k / 1000} Mbps` : `${k} kbps`);

export function score(tech: Tech, needs: Needs): Scored {
  const reasons: string[] = [];
  if (needs.rangeM > tech.maxRangeM) reasons.push(`Reaches at most about ${fmtRange(tech.maxRangeM)}, but ${fmtRange(needs.rangeM)} is needed.`);
  if (needs.rateKbps > tech.rateKbps) reasons.push(`Carries at most ${fmtRate(tech.rateKbps)}, but ${fmtRate(needs.rateKbps)} is needed.`);
  if (needs.phone && !tech.phone) reasons.push("Phones cannot talk to it directly.");
  const zero = { power: 0, cost: 0, mesh: 0, ip: 0, rangeFit: 0 };
  if (reasons.length) return { tech, excluded: true, reasons, score: 0, parts: zero };

  const parts = {
    power: (BATTERY_WEIGHT[needs.battery] * (5 - tech.power)) / 4,
    cost: (COST_WEIGHT[needs.cost] * (5 - tech.cost)) / 4,
    mesh: needs.mesh ? 3 * tech.mesh : 0,
    ip: needs.ip && tech.ip ? 2 : 0,
    rangeFit: Math.max(0, 1 - Math.abs(Math.log10(tech.typicalRangeM / needs.rangeM)) / 3),
  };
  if (needs.battery !== "mains") reasons.push(tech.power <= 2 ? "Very low power: good for batteries." : tech.power >= 4 ? "Power hungry: drains batteries quickly." : "Moderate power use.");
  if (needs.mesh) reasons.push(tech.mesh >= 1 ? "Builds a self-healing mesh." : tech.mesh > 0 ? "Mesh is possible but not its strength." : "No mesh: every device must reach the hub directly.");
  if (needs.ip) reasons.push(tech.ip ? "Speaks IP directly." : "Needs a gateway to reach IP networks.");
  if (needs.cost === "veryLow") reasons.push(tech.cost <= 2 ? "Very cheap per node." : "Not the cheapest per node.");
  reasons.push(`Typical range ${fmtRange(tech.typicalRangeM)}, up to ${fmtRate(tech.rateKbps)}.`);
  const total = parts.power + parts.cost + parts.mesh + parts.ip + parts.rangeFit;
  return { tech, excluded: false, reasons, score: Math.round(total * 100) / 100, parts };
}

/** Every technology, best first; ruled-out ones last. */
export function rank(needs: Needs, techs: Tech[] = TECHS): Scored[] {
  return techs.map((t) => score(t, needs)).sort((a, b) => Number(a.excluded) - Number(b.excluded) || b.score - a.score);
}

export interface Scenario {
  id: string;
  title: string;
  story: string;
  needs: Needs;
  /** The answer the scenario is built to teach */
  expected: TechId;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "farm",
    title: "Farm soil sensors",
    story: "Soil-moisture sensors spread over a 5 km farm send a few bytes every hour and must run for years on a battery.",
    needs: { rangeM: 5000, rateKbps: 0.1, battery: "years", cost: "normal", mesh: false, phone: false, ip: false },
    expected: "lorawan",
  },
  {
    id: "wearable",
    title: "Fitness band",
    story: "A wrist band sends heart rate to the owner's phone and should last weeks on a tiny battery.",
    needs: { rangeM: 5, rateKbps: 10, battery: "months", cost: "normal", mesh: false, phone: true, ip: false },
    expected: "ble",
  },
  {
    id: "pay",
    title: "Tap-to-pay counter",
    story: "Customers pay by holding a phone or card a few centimetres from the reader. Nothing should be read from across the shop.",
    needs: { rangeM: 0.05, rateKbps: 10, battery: "mains", cost: "veryLow", mesh: false, phone: true, ip: false },
    expected: "nfc",
  },
  {
    id: "cctv",
    title: "CCTV camera",
    story: "A mains-powered camera streams HD video (about 4 Mbps) to a recorder on the home network.",
    needs: { rangeM: 20, rateKbps: 4000, battery: "mains", cost: "normal", mesh: false, phone: false, ip: true },
    expected: "wifi",
  },
  {
    id: "lighting",
    title: "Home lighting",
    story: "Forty smart bulbs and switches across a house must keep working if one bulb is unplugged.",
    needs: { rangeM: 15, rateKbps: 10, battery: "mains", cost: "normal", mesh: true, phone: false, ip: false },
    expected: "zigbee",
  },
];
