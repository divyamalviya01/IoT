/**
 * Lab L19: LoRa time on air, data rate and range.
 *
 * Time on air follows Semtech's formula (AN1200.13) with the settings
 * LoRaWAN uses: 8-symbol preamble, explicit header, CRC on and coding rate
 * 4/5. Low data rate optimisation (DE) switches on when a symbol lasts longer
 * than 16 ms (SF11 and SF12 at 125 kHz, SF12 at 250 kHz).
 *
 * PL is the PHY payload: the application data plus 13 bytes of LoRaWAN
 * header, frame counter and integrity check.
 *
 * Range is illustrative: a link budget with a log-distance path-loss model,
 * 14 dBm transmit power, 10 dB fade margin and 31.2 dB loss at 1 m (free
 * space at 865 MHz).
 */

export const SPREADING_FACTORS = [7, 8, 9, 10, 11, 12] as const;
export type SF = (typeof SPREADING_FACTORS)[number];
export const BANDWIDTHS_KHZ = [125, 250, 500] as const;
export type BandwidthKHz = (typeof BANDWIDTHS_KHZ)[number];

export const LORAWAN_OVERHEAD = 13;
const PREAMBLE_SYMBOLS = 8;
const CODING_RATE = 1; // 4/5
const TX_POWER_DBM = 14;
const FADE_MARGIN_DB = 10;
const LOSS_AT_1M_DB = 31.2;

/** Signal-to-noise ratio the receiver needs at each SF, dB (Semtech SX1276) */
const SNR_MIN: Record<SF, number> = { 7: -7.5, 8: -10, 9: -12.5, 10: -15, 11: -17.5, 12: -20 };

export type Environment = "rural" | "urban";
export const PATH_LOSS_EXPONENT: Record<Environment, number> = { rural: 2.7, urban: 3.2 };

/** EU868's 1 % rule allows 864 s of airtime per day; The Things Network asks for at most 30 s. */
export type AirtimeRule = "eu1pct" | "ttn30s";
export const AIRTIME_BUDGET_MS: Record<AirtimeRule, number> = { eu1pct: 864_000, ttn30s: 30_000 };

/** Largest LoRaWAN application payload at SF10–12 (EU868 and IN865 data rates DR0–DR2) */
export const MAX_APP_PAYLOAD_SLOW_SF = 51;

/** Low data rate optimisation: on when a symbol lasts more than 16 ms. */
export function lowDataRateOptimise(sf: SF, bwKHz: number): boolean {
  // Symbol time in ms is 2^SF / BW(kHz); compare with whole numbers to avoid rounding.
  return 2 ** sf > 16 * bwKHz;
}

export interface Airtime {
  symbolMs: number;
  preambleMs: number;
  payloadSymbols: number;
  payloadMs: number;
  totalMs: number;
  lowDataRate: boolean;
}

/** Time on air for a PHY payload of `pl` bytes. */
export function airtime(sf: SF, bwKHz: number, pl: number): Airtime {
  const symbolMs = (2 ** sf / (bwKHz * 1000)) * 1000;
  const de = lowDataRateOptimise(sf, bwKHz) ? 1 : 0;
  const preambleMs = (PREAMBLE_SYMBOLS + 4.25) * symbolMs;
  const numerator = 8 * pl - 4 * sf + 28 + 16 - 0; // CRC on, explicit header
  const payloadSymbols = 8 + Math.max(Math.ceil(numerator / (4 * (sf - 2 * de))) * (CODING_RATE + 4), 0);
  const payloadMs = payloadSymbols * symbolMs;
  return { symbolMs, preambleMs, payloadSymbols, payloadMs, totalMs: preambleMs + payloadMs, lowDataRate: de === 1 };
}

/** Raw bit rate in bits per second, after 4/5 coding. */
export function bitRate(sf: SF, bwKHz: number): number {
  return ((sf * bwKHz * 1000) / 2 ** sf) * (4 / (4 + CODING_RATE));
}

/** Weakest signal the receiver can decode, dBm. Each doubling of bandwidth costs about 3 dB. */
export function sensitivity(sf: SF, bwKHz: number): number {
  return -174 + 10 * Math.log10(bwKHz * 1000) + 6 + SNR_MIN[sf];
}

/** Indicative range in km (illustrative: real range depends on terrain, height and buildings). */
export function rangeKm(sf: SF, bwKHz: number, env: Environment): number {
  const budget = TX_POWER_DBM - sensitivity(sf, bwKHz) - FADE_MARGIN_DB - LOSS_AT_1M_DB;
  return 10 ** (budget / (10 * PATH_LOSS_EXPONENT[env])) / 1000;
}

/** Most messages a device may send per day within an airtime budget. */
export function messagesPerDay(totalMs: number, rule: AirtimeRule): number {
  return Math.floor(AIRTIME_BUDGET_MS[rule] / totalMs);
}

export interface LoraResult {
  sf: SF;
  bwKHz: number;
  appBytes: number;
  phyBytes: number;
  airtime: Airtime;
  bitRate: number;
  sensitivity: number;
  rangeKm: number;
  messagesPerDay: number;
  /** Under the 1 % rule, the device must stay quiet for 99 × the airtime after each message */
  waitAfterS: number;
  warnings: string[];
}

export function evaluate(sf: SF, bwKHz: number, appBytes: number, env: Environment, rule: AirtimeRule): LoraResult {
  const phyBytes = appBytes + LORAWAN_OVERHEAD;
  const a = airtime(sf, bwKHz, phyBytes);
  const warnings: string[] = [];
  if (sf >= 10 && appBytes > MAX_APP_PAYLOAD_SLOW_SF) {
    warnings.push(`LoRaWAN allows at most ${MAX_APP_PAYLOAD_SLOW_SF} bytes of application data at SF10–SF12.`);
  }
  if (bwKHz !== 125) {
    warnings.push("LoRaWAN uplinks in India (IN865) use 125 kHz only. 250 and 500 kHz are radio options used by other regional plans.");
  }
  return {
    sf,
    bwKHz,
    appBytes,
    phyBytes,
    airtime: a,
    bitRate: bitRate(sf, bwKHz),
    sensitivity: sensitivity(sf, bwKHz),
    rangeKm: rangeKm(sf, bwKHz, env),
    messagesPerDay: messagesPerDay(a.totalMs, rule),
    waitAfterS: (99 * a.totalMs) / 1000,
    warnings,
  };
}

/** The same settings at every spreading factor, for the charts. */
export function acrossSF(bwKHz: number, appBytes: number, env: Environment, rule: AirtimeRule): LoraResult[] {
  return SPREADING_FACTORS.map((sf) => evaluate(sf, bwKHz, appBytes, env, rule));
}
