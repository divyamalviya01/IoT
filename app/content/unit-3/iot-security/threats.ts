/*
 * The attack surface of a small smart home, one entry per attack vector.
 * Shared by the 3D scene (where each threat sits) and the list beside it
 * (what it is, an IoT example, and the defence).
 */

export type Layer = "perception" | "network" | "application";
export type LayerChoice = Layer | "all";

export type DeviceId = "camera" | "lock" | "thermostat" | "router" | "cloud" | "phone";

export type ThreatId =
  | "tamper"
  | "debug"
  | "spoof"
  | "capture"
  | "sniff"
  | "mitm"
  | "replay"
  | "jam"
  | "password"
  | "api"
  | "firmware"
  | "takeover";

/** A threat sits on a device, or on the link between two devices. */
export type ThreatSpot = { device: DeviceId } | { link: [DeviceId, DeviceId] };

export interface Threat {
  id: ThreatId;
  layer: Layer;
  name: string;
  /** Short words on the scene's warning label */
  short: string;
  /** Short words on the scene's shield label when defences are on */
  defence: string;
  spot: ThreatSpot;
  /** What it is, an IoT example, and the defence */
  text: string;
}

export const LAYER_NAME: Record<Layer, string> = {
  perception: "Perception",
  network: "Network",
  application: "Application and cloud",
};

export const LAYER_SHORT: Record<Layer, string> = {
  perception: "Perception",
  network: "Network",
  application: "Application",
};

export const LAYER_ABOUT: Record<LayerChoice, string> = {
  perception: "The devices themselves. These attacks need someone close to the device.",
  network: "The links that carry data. These attacks can come from nearby or across the internet.",
  application: "Apps, cloud services and logins. These attacks can come from anywhere in the world.",
  all: "Every device, link and login is a way in. Together they make the attack surface.",
};

export const DEVICE_NAME: Record<DeviceId, string> = {
  camera: "Door camera",
  lock: "Smart lock",
  thermostat: "Thermostat",
  router: "Wi-Fi router",
  cloud: "Cloud server",
  phone: "Phone app",
};

export const THREATS: Threat[] = [
  /* Perception layer: the devices */
  {
    id: "tamper",
    layer: "perception",
    name: "Physical tampering",
    short: "Tampering",
    defence: "Tamper alarm",
    spot: { device: "lock" },
    text: "Opening, forcing or changing a device where it stands, such as prying off a smart lock's cover or pulling its battery. Defence: a sturdy case, tamper-proof screws and a tamper switch that alerts the owner's phone.",
  },
  {
    id: "debug",
    layer: "perception",
    name: "Open debug port",
    short: "Debug port",
    defence: "Port locked",
    spot: { device: "thermostat" },
    text: "Test pins (UART or JTAG) left open on the circuit board. Through them, the firmware and the saved Wi-Fi password can be read. Defence: disable or lock debug ports before sale, and encrypt stored keys.",
  },
  {
    id: "spoof",
    layer: "perception",
    name: "Sensor spoofing",
    short: "Spoofing",
    defence: "Readings checked",
    spot: { device: "thermostat" },
    text: "Feeding a sensor false input, or sending fake readings in its name. A fake “30 °C” reading could switch the heating off. Defence: check readings make sense, compare them with nearby sensors, and sign each reading.",
  },
  {
    id: "capture",
    layer: "perception",
    name: "Node capture",
    short: "Node capture",
    defence: "Unique keys",
    spot: { device: "camera" },
    text: "Taking a device away to copy the keys inside it. A stolen outdoor camera's keys could let a clone join the home network. Defence: a unique key per device in a secure chip, and revoke a stolen device at once.",
  },

  /* Network layer: the links */
  {
    id: "sniff",
    layer: "network",
    name: "Eavesdropping",
    short: "Eavesdropping",
    defence: "WPA3 + TLS",
    spot: { link: ["camera", "router"] },
    text: "Reading data as it travels. Camera video or MQTT messages sent without encryption can be read by anyone in range. Defence: encrypt every link, with WPA3 on Wi-Fi and TLS for MQTT (port 8883).",
  },
  {
    id: "mitm",
    layer: "network",
    name: "Man-in-the-middle",
    short: "Man-in-the-middle",
    defence: "Server verified",
    spot: { link: ["router", "cloud"] },
    text: "An attacker secretly sits between the device and the cloud, reading or changing messages, for example through a fake server. Defence: TLS with certificate checks, so the device talks only to the real server.",
  },
  {
    id: "replay",
    layer: "network",
    name: "Replay attack",
    short: "Replay",
    defence: "One-time commands",
    spot: { link: ["lock", "router"] },
    text: "Recording a valid message and sending it again later. A copied “unlock” command could open the door hours later. Defence: add a counter or timestamp to each command, so it works only once.",
  },
  {
    id: "jam",
    layer: "network",
    name: "Jamming and denial of service (DoS)",
    short: "Jamming / DoS",
    defence: "Jam alert",
    spot: { device: "router" },
    text: "Drowning the radio in noise, or flooding the router with traffic, so nothing gets through. A jammed camera cannot send its alarm. Defence: detect jamming and alert the owner, rate-limit traffic, and keep a backup link.",
  },

  /* Application and cloud layer: apps, services and logins */
  {
    id: "password",
    layer: "application",
    name: "Weak or default password",
    short: "Default password",
    defence: "Unique password",
    spot: { device: "camera" },
    text: "Factory logins such as admin/admin. The Mirai botnet (2016) logged into cameras and routers this way and used them for huge DDoS attacks. Defence: a unique password per device; the UK banned default passwords from April 2024.",
  },
  {
    id: "api",
    layer: "application",
    name: "Insecure cloud API",
    short: "Insecure API",
    defence: "Every call checked",
    spot: { device: "cloud" },
    text: "A cloud API that does not check who is asking. Changing a device ID in a request could show someone else's camera. Defence: check the user's identity and permission on every request, over HTTPS only.",
  },
  {
    id: "firmware",
    layer: "application",
    name: "Outdated firmware",
    short: "Old firmware",
    defence: "Signed updates",
    spot: { device: "router" },
    text: "Firmware with known bugs that were never fixed. Many home routers run for years without a single update. Defence: automatic, signed over-the-air (OTA) updates, and a promised support period.",
  },
  {
    id: "takeover",
    layer: "application",
    name: "Account takeover",
    short: "Account takeover",
    defence: "2FA on",
    spot: { device: "phone" },
    text: "Logging into the owner's app with a leaked or reused password, then unlocking the door from anywhere. Defence: two-factor authentication (2FA), a unique password and alerts for new logins.",
  },
];

export const THREAT_BY_ID = Object.fromEntries(THREATS.map((t) => [t.id, t])) as Record<ThreatId, Threat>;

export function threatsIn(layer: LayerChoice): Threat[] {
  return layer === "all" ? THREATS : THREATS.filter((t) => t.layer === layer);
}

const DEVICE_NOUN: Record<DeviceId, string> = {
  camera: "door camera",
  lock: "smart lock",
  thermostat: "thermostat",
  router: "Wi-Fi router",
  cloud: "cloud server",
  phone: "phone app",
};

/** "the smart lock", or "the link between the door camera and the Wi-Fi router" */
export function spotPhrase(spot: ThreatSpot): string {
  if ("device" in spot) return `the ${DEVICE_NOUN[spot.device]}`;
  return `the link between the ${DEVICE_NOUN[spot.link[0]]} and the ${DEVICE_NOUN[spot.link[1]]}`;
}

const DEVICE_SHORT: Record<DeviceId, string> = {
  camera: "camera",
  lock: "lock",
  thermostat: "thermostat",
  router: "router",
  cloud: "cloud",
  phone: "phone",
};

/** "Smart lock", or "Camera to router link" */
export function spotName(spot: ThreatSpot): string {
  if ("device" in spot) return DEVICE_NAME[spot.device];
  const [a, b] = spot.link;
  const first = DEVICE_SHORT[a];
  return `${first[0].toUpperCase()}${first.slice(1)} to ${DEVICE_SHORT[b]} link`;
}
