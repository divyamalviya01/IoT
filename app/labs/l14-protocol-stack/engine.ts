/**
 * Lab L14: place IoT protocols and parts in the layers of an architecture.
 *
 * A layer can hold several tokens, so placements are keyed by token. Each
 * token lists the layers it may go in: the first is the textbook answer, and
 * any other is accepted with a note (books do not all agree). Distractors
 * belong in no layer and must stay in the tray.
 */

export interface Layer {
  id: string;
  name: string;
  /** What this layer does, in one line */
  job: string;
  /** OSI layer numbers it matches, shown beside the zone */
  osi?: string;
}

export interface Token {
  id: string;
  label: string;
  /** Layers it may go in; accepts[0] is the main answer. Empty for distractors. */
  accepts: string[];
  /** Why it belongs where it does (or, for a distractor, why it does not belong) */
  why: string;
  /** Shown when it is placed in an accepted layer other than the main one */
  note?: string;
}

export interface Challenge {
  id: string;
  title: string;
  story: string;
  /** Top layer first */
  layers: Layer[];
  tokens: Token[];
  /** Each layer must hold exactly one token (building one stack in order) */
  onePerLayer?: boolean;
}

export type Placement = Partial<Record<string, string>>;

export type TokenState = "tray" | "ok" | "ok-alt" | "wrong";

export interface CheckResult {
  states: Record<string, TokenState>;
  /** Every token that belongs somewhere is placed correctly and no distractor is placed */
  complete: boolean;
  placed: number;
  correct: number;
  /** Tokens still to place (excluding distractors) */
  remaining: number;
  /** Explanation of the first mistake, in tray order */
  firstMistake: { token: string; message: string } | null;
  /** Notes for tokens accepted in their second-choice layer */
  notes: string[];
}

const L = (id: string, name: string, job: string, osi?: string): Layer => ({ id, name, job, osi });

export const CHALLENGES: Challenge[] = [
  {
    id: "three-layer",
    title: "3-layer IoT architecture",
    story: "The simplest IoT model: things that sense, a network that carries, and applications that use the data.",
    layers: [
      L("application", "Application", "Delivers services to users, such as a smart-home app"),
      L("network", "Network", "Carries data from things to servers and connects them"),
      L("perception", "Perception", "Senses the physical world and acts on it"),
    ],
    tokens: [
      { id: "temp", label: "Temperature sensor", accepts: ["perception"], why: "A sensor measures the physical world, which is the job of the perception layer." },
      { id: "rfid", label: "RFID tag", accepts: ["perception"], why: "An RFID tag identifies a physical object, so it belongs to the perception layer." },
      { id: "actuator", label: "Motor (actuator)", accepts: ["perception"], why: "Actuators act on the physical world, so they sit with sensors in the perception layer." },
      { id: "zigbee", label: "Zigbee", accepts: ["network"], why: "Zigbee is a wireless technology that carries data, which is the network layer's job." },
      { id: "wifi", label: "Wi-Fi", accepts: ["network"], why: "Wi-Fi carries data between devices, so it is part of the network layer." },
      { id: "cellular", label: "4G / 5G", accepts: ["network"], why: "Mobile networks carry data over long distances: network layer." },
      { id: "gateway", label: "Gateway", accepts: ["network"], why: "A gateway connects local devices to the internet, so most textbooks place it in the network layer." },
      {
        id: "cloud",
        label: "Cloud platform",
        accepts: ["application", "network"],
        why: "The cloud stores and serves data to applications, so most textbooks place it in the application layer.",
        note: "Some books put data processing in the network layer, so Network is accepted too.",
      },
      { id: "home-app", label: "Smart-home app", accepts: ["application"], why: "An app that users touch is the application layer." },
      { id: "health-app", label: "Health-monitoring app", accepts: ["application"], why: "A service for users, so it belongs in the application layer." },
    ],
  },
  {
    id: "five-layer",
    title: "5-layer IoT architecture",
    story: "The 3-layer model split further: transport moves data, processing stores and analyses it, and business decides how the system makes money.",
    layers: [
      L("business", "Business", "Manages the whole system: business models, profits and user privacy"),
      L("application", "Application", "Delivers services to users"),
      L("processing", "Processing", "Stores, analyses and processes large amounts of data"),
      L("transport", "Transport", "Moves data between the perception and processing layers"),
      L("perception", "Perception", "Senses the physical world"),
    ],
    tokens: [
      { id: "temp", label: "Temperature sensor", accepts: ["perception"], why: "Sensors gather data from the physical world: perception layer." },
      { id: "rfid", label: "RFID tag", accepts: ["perception"], why: "An RFID tag identifies a physical object: perception layer." },
      { id: "camera", label: "Camera", accepts: ["perception"], why: "A camera senses the world as images: perception layer." },
      { id: "wifi", label: "Wi-Fi", accepts: ["transport"], why: "In the 5-layer model the transport layer moves data through networks such as Wi-Fi." },
      { id: "zigbee", label: "Zigbee", accepts: ["transport"], why: "Zigbee moves sensor data over the air: transport layer in the 5-layer model." },
      { id: "cellular", label: "4G", accepts: ["transport"], why: "4G moves data over long distances: transport layer in the 5-layer model." },
      { id: "database", label: "Cloud database", accepts: ["processing"], why: "Storing large amounts of data is the processing layer's job." },
      { id: "hadoop", label: "Hadoop analytics", accepts: ["processing"], why: "Analysing big data is done in the processing layer." },
      { id: "middleware", label: "Middleware", accepts: ["processing"], why: "Middleware manages and processes data between devices and apps: processing layer." },
      { id: "home-app", label: "Smart-home app", accepts: ["application"], why: "A service for users: application layer." },
      { id: "health-app", label: "Health-monitoring app", accepts: ["application"], why: "A service for users: application layer." },
      { id: "business-model", label: "Business model", accepts: ["business"], why: "How the system makes money is decided in the business layer." },
      { id: "privacy", label: "Privacy policy", accepts: ["business"], why: "Rules about users' privacy are managed in the business layer." },
      { id: "billing", label: "Billing plan", accepts: ["business"], why: "Charging customers is a business-layer concern." },
    ],
  },
  {
    id: "iot-stack",
    title: "IoT protocol stack and OSI",
    story: "Real protocols in the layers they work at. The OSI layer numbers are shown beside each layer.",
    layers: [
      L("application", "Application", "Messages between programs", "OSI 5–7"),
      L("transport", "Transport", "Delivers data between programs on two devices", "OSI 4"),
      L("network", "Network", "Addresses and routes packets across networks", "OSI 3"),
      L("adaptation", "Adaptation", "Squeezes IPv6 onto tiny radio frames", "between 3 and 2"),
      L("link", "Link + physical", "Sends frames over one link: the radio or cable", "OSI 1–2"),
    ],
    tokens: [
      { id: "mqtt", label: "MQTT", accepts: ["application"], why: "MQTT carries messages between programs: application layer." },
      { id: "coap", label: "CoAP", accepts: ["application"], why: "CoAP is a web-like protocol for programs: application layer." },
      { id: "http", label: "HTTP", accepts: ["application"], why: "HTTP is an application-layer protocol." },
      { id: "xmpp", label: "XMPP", accepts: ["application"], why: "XMPP carries chat-style messages between programs: application layer." },
      { id: "tcp", label: "TCP", accepts: ["transport"], why: "TCP gives reliable delivery between programs: transport layer." },
      { id: "udp", label: "UDP", accepts: ["transport"], why: "UDP delivers datagrams between programs: transport layer." },
      { id: "ipv4", label: "IPv4", accepts: ["network"], why: "IP addresses and routes packets: network layer." },
      { id: "ipv6", label: "IPv6", accepts: ["network"], why: "IPv6 addresses and routes packets: network layer." },
      { id: "rpl", label: "RPL", accepts: ["network"], why: "RPL is a routing protocol for low-power networks, and routing is the network layer's job." },
      {
        id: "6lowpan",
        label: "6LoWPAN",
        accepts: ["adaptation", "network"],
        why: "6LoWPAN is an adaptation layer: it compresses IPv6 headers so they fit in 127-byte IEEE 802.15.4 frames.",
        note: "Many tables list 6LoWPAN under the network layer, so Network is accepted too. Strictly, it adapts IPv6 to the link below.",
      },
      { id: "802154", label: "IEEE 802.15.4", accepts: ["link"], why: "IEEE 802.15.4 defines the low-power radio and its frames: link and physical layers." },
      { id: "ble", label: "BLE", accepts: ["link"], why: "BLE's radio and link layer send frames over the air: link and physical layers." },
      { id: "wifi", label: "Wi-Fi (802.11)", accepts: ["link"], why: "Wi-Fi defines the radio and frames: link and physical layers." },
      { id: "ethernet", label: "Ethernet", accepts: ["link"], why: "Ethernet defines the cable and frames: link and physical layers." },
      {
        id: "lorawan",
        label: "LoRaWAN",
        accepts: ["link"],
        why: "LoRaWAN is the MAC (link) layer over the LoRa radio. It carries no IP by itself, so it sits in link and physical.",
      },
    ],
  },
  {
    id: "ietf-stack",
    title: "Build the IETF stack for a battery sensor",
    story: "A coin-cell sensor must reach the internet with IP. Put one protocol in each layer, and leave the ones that do not fit in the tray.",
    onePerLayer: true,
    layers: [
      L("application", "Application", "Talks to web services in a REST style", "OSI 5–7"),
      L("transport", "Transport", "Light delivery with no connection", "OSI 4"),
      L("network", "Network", "Gives every sensor an IP address", "OSI 3"),
      L("adaptation", "Adaptation", "Fits IPv6 into small radio frames", "between 3 and 2"),
      L("link", "Link + physical", "Low-power radio", "OSI 1–2"),
    ],
    tokens: [
      { id: "coap", label: "CoAP", accepts: ["application"], why: "CoAP gives REST over UDP with a 4-byte header, made for small devices." },
      { id: "udp", label: "UDP", accepts: ["transport"], why: "UDP has no handshake and an 8-byte header, which saves battery." },
      { id: "ipv6", label: "IPv6 (routes by RPL)", accepts: ["network"], why: "IPv6 gives every sensor its own address; RPL finds routes through the low-power mesh." },
      { id: "6lowpan", label: "6LoWPAN", accepts: ["adaptation"], why: "6LoWPAN compresses the 40-byte IPv6 header to a few bytes." },
      { id: "802154", label: "IEEE 802.15.4", accepts: ["link"], why: "IEEE 802.15.4 is the low-power radio the IETF stack is built on." },
      { id: "tcp", label: "TCP", accepts: [], why: "TCP needs a handshake and resends, which cost battery; the IETF stack uses UDP instead." },
      { id: "http", label: "HTTP", accepts: [], why: "HTTP's text headers are too big for tiny frames; CoAP does the same job in a few bytes." },
      { id: "wifi", label: "Wi-Fi", accepts: [], why: "Wi-Fi uses far too much power for a coin cell; IEEE 802.15.4 is the low-power radio here." },
    ],
  },
];

export function getChallenge(id: string): Challenge {
  return CHALLENGES.find((c) => c.id === id) ?? CHALLENGES[0];
}

/** Tokens that belong somewhere (not distractors) */
export const realTokens = (c: Challenge) => c.tokens.filter((t) => t.accepts.length > 0);

export function check(c: Challenge, placement: Placement): CheckResult {
  const states: Record<string, TokenState> = {};
  const notes: string[] = [];
  let firstMistake: CheckResult["firstMistake"] = null;
  let placed = 0;
  let correct = 0;
  const layerName = (id: string) => c.layers.find((l) => l.id === id)?.name ?? id;
  const perLayer = new Map<string, string[]>();

  for (const t of c.tokens) {
    const layer = placement[t.id];
    if (!layer) {
      states[t.id] = "tray";
      continue;
    }
    placed++;
    perLayer.set(layer, [...(perLayer.get(layer) ?? []), t.id]);
    if (t.accepts[0] === layer) {
      states[t.id] = "ok";
      correct++;
    } else if (t.accepts.includes(layer)) {
      states[t.id] = "ok-alt";
      correct++;
      if (t.note) notes.push(`${t.label}: ${t.note}`);
    } else {
      states[t.id] = "wrong";
      firstMistake ??= {
        token: t.id,
        message:
          t.accepts.length === 0
            ? `${t.label} does not belong in this stack. ${t.why}`
            : `${t.label} is not a ${layerName(layer)} item. ${t.why}`,
      };
    }
  }

  // Building one stack: a second token in a layer is a mistake even if it could go there.
  if (c.onePerLayer && !firstMistake) {
    for (const [layer, ids] of perLayer) {
      if (ids.length > 1) {
        firstMistake = { token: ids[1], message: `The ${layerName(layer)} layer needs exactly one protocol here.` };
        break;
      }
    }
  }

  const remaining = realTokens(c).filter((t) => states[t.id] === "tray").length;
  const anyWrong = Object.values(states).includes("wrong");
  return {
    states,
    complete: remaining === 0 && !anyWrong && !firstMistake,
    placed,
    correct,
    remaining,
    firstMistake,
    notes,
  };
}
