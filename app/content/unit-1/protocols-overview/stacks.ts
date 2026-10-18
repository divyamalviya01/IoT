/**
 * Header sizes for three example protocol stacks, from the payload outwards.
 * Shared by the 1.7 encapsulation explorer and the 2.3 protocol architecture scene.
 */

export type StackId = "mqtt" | "coap" | "http";

export interface LayerPart {
  layer: string;
  name: string;
  bytes: number;
  detail: string;
  /** Tailwind background class for the bar segment */
  tone: string;
}

const utf8 = (s: string) => new TextEncoder().encode(s).length;

/** Header sizes for each stack, from the payload outwards (top layer first). */
export function buildStack(stack: StackId, payload: string, compress: boolean): LayerPart[] {
  const payloadBytes = utf8(payload);
  if (stack === "mqtt") {
    const topic = "home/temp";
    const remaining = 2 + utf8(topic) + payloadBytes;
    const lengthBytes = remaining > 127 ? 2 : 1;
    return [
      { layer: "Application", name: "MQTT PUBLISH header", bytes: 1 + lengthBytes + 2 + utf8(topic), detail: `Type and flags (1), remaining length (${lengthBytes}), topic length (2), topic “${topic}” (${utf8(topic)})`, tone: "bg-u3" },
      { layer: "Transport", name: "TCP header", bytes: 20, detail: "Source and destination ports, sequence and acknowledgement numbers, flags, window, checksum", tone: "bg-u2" },
      { layer: "Network", name: "IPv4 header", bytes: 20, detail: "Version, length, time to live, protocol, source and destination IP addresses", tone: "bg-u1" },
      { layer: "Link", name: "Wi-Fi frame header and check", bytes: 36, detail: "Radio (MAC) addresses, frame control, sequence number and a 4-byte error check (approximate)", tone: "bg-ink-3" },
    ];
  }
  if (stack === "coap") {
    const path = "temp";
    const coap = 4 + 2 + (1 + utf8(path)) + 1;
    const parts: LayerPart[] = [
      { layer: "Application", name: "CoAP header", bytes: coap, detail: `Fixed header (4), token (2), Uri-Path option “${path}” (${1 + utf8(path)}), payload marker (1)`, tone: "bg-u3" },
    ];
    if (compress) {
      parts.push({ layer: "Network + transport", name: "6LoWPAN compressed IPv6 + UDP", bytes: 6, detail: "6LoWPAN squeezes the 48 bytes of IPv6 and UDP headers into 6 (IPHC 2, compressed UDP 4) by leaving out values the receiver can work out (best case)", tone: "bg-u2" });
    } else {
      parts.push(
        { layer: "Transport", name: "UDP header", bytes: 8, detail: "Source port, destination port, length and checksum: 2 bytes each", tone: "bg-u2" },
        { layer: "Network", name: "IPv6 header", bytes: 40, detail: "Version, traffic class, flow label, length, next header, hop limit and two 16-byte addresses", tone: "bg-u1" },
      );
    }
    parts.push({ layer: "Link", name: "IEEE 802.15.4 frame header and check", bytes: 11, detail: "Frame control, sequence number, network (PAN) ID, short addresses and a 2-byte error check", tone: "bg-ink-3" });
    return parts;
  }
  const request = `POST /temp HTTP/1.1\r\nHost: api.example.com\r\nContent-Type: text/plain\r\nContent-Length: ${payloadBytes}\r\n\r\n`;
  return [
    { layer: "Application", name: "HTTP request line and headers", bytes: utf8(request), detail: "POST /temp HTTP/1.1, Host, Content-Type and Content-Length, all as readable text", tone: "bg-u3" },
    { layer: "Transport", name: "TCP header", bytes: 20, detail: "Source and destination ports, sequence and acknowledgement numbers, flags, window, checksum", tone: "bg-u2" },
    { layer: "Network", name: "IPv4 header", bytes: 20, detail: "Version, length, time to live, protocol, source and destination IP addresses", tone: "bg-u1" },
    { layer: "Link", name: "Ethernet header and check", bytes: 18, detail: "Destination and source MAC addresses (6 + 6), type (2) and a 4-byte error check", tone: "bg-ink-3" },
  ];
}

export const STACK_LABEL: Record<StackId, string> = {
  mqtt: "MQTT over Wi-Fi",
  coap: "CoAP over 802.15.4",
  http: "HTTP over Ethernet",
};
