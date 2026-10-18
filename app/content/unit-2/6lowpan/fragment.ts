/**
 * How many IEEE 802.15.4 frames a UDP payload needs over 6LoWPAN.
 *
 * A frame is at most 127 bytes. The MAC header and frame check take up to 25
 * of them, leaving 102 (81 with AES-CCM link security). The IPv6 and UDP
 * headers are 48 bytes, plus a 1-byte dispatch, so 49 without compression; at
 * best, IPHC compresses them to 6 (IPHC 2 + UDP next-header 1 + ports 1 +
 * checksum 2).
 *
 * If the packet does not fit, it is fragmented (RFC 4944): the first fragment
 * has a 4-byte header and carries the IP/UDP headers, later ones a 5-byte
 * header. Every fragment except the last carries a multiple of 8 bytes.
 */

export const FRAME_BYTES = 127;
export const MAC_BYTES = 25;
export const SECURITY_BYTES = 21;
export const UNCOMPRESSED_HEADER = 49;
export const COMPRESSED_HEADER = 6;
export const FRAG1_HEADER = 4;
export const FRAGN_HEADER = 5;

export interface FrameSlice {
  /** Fragment header bytes (0 when the packet fits in one frame) */
  fragHeader: number;
  /** IPv6 + UDP header bytes in this frame */
  ipHeader: number;
  /** Payload bytes in this frame */
  data: number;
  /** All bytes sent over the air, including the MAC header */
  onAir: number;
}

export interface FragmentResult {
  payload: number;
  compressed: boolean;
  secure: boolean;
  /** Bytes per frame left after the MAC header (and security) */
  available: number;
  header: number;
  frames: FrameSlice[];
  bytesOnAir: number;
  /** Share of the bytes on air that are not payload, 0–100 */
  overheadPct: number;
}

const floor8 = (n: number) => Math.floor(n / 8) * 8;

export function fragment(payload: number, opts: { compressed: boolean; secure?: boolean }): FragmentResult {
  const secure = opts.secure ?? false;
  const available = FRAME_BYTES - MAC_BYTES - (secure ? SECURITY_BYTES : 0);
  const header = opts.compressed ? COMPRESSED_HEADER : UNCOMPRESSED_HEADER;
  const macBytes = FRAME_BYTES - available;
  const frames: FrameSlice[] = [];

  if (header + payload <= available) {
    frames.push({ fragHeader: 0, ipHeader: header, data: payload, onAir: macBytes + header + payload });
  } else {
    const first = floor8(available - FRAG1_HEADER - header);
    const later = floor8(available - FRAGN_HEADER);
    frames.push({ fragHeader: FRAG1_HEADER, ipHeader: header, data: first, onAir: macBytes + FRAG1_HEADER + header + first });
    let left = payload - first;
    while (left > 0) {
      const data = Math.min(later, left);
      frames.push({ fragHeader: FRAGN_HEADER, ipHeader: 0, data, onAir: macBytes + FRAGN_HEADER + data });
      left -= data;
    }
  }

  const bytesOnAir = frames.reduce((s, f) => s + f.onAir, 0);
  return {
    payload,
    compressed: opts.compressed,
    secure,
    available,
    header,
    frames,
    bytesOnAir,
    overheadPct: Math.round(((bytesOnAir - payload) / bytesOnAir) * 100),
  };
}
