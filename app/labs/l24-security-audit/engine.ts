/**
 * L24 Smart home security audit (defensive). A home has eight connected
 * devices with ten weaknesses, one for each item of the OWASP IoT Top 10
 * (2018). The student inspects devices to find the weaknesses, picks a fix for
 * each, and runs a simulated check of which attacks would still succeed.
 * Nothing here describes how to carry out an attack; it only models outcomes.
 */

export type Severity = "high" | "medium" | "low";
export type Quality = "right" | "partial" | "wrong";
export type Cia = "C" | "I" | "A";

export const WEIGHT: Record<Severity, number> = { high: 3, medium: 2, low: 1 };

export type DeviceId = "router" | "camera" | "oldCamera" | "lock" | "thermostat" | "hub" | "broker" | "cloud";

export interface Device {
  id: DeviceId;
  name: string;
  /** What an inspection shows, whether or not anything is wrong */
  facts: string[];
  /** Position on the 100 × 64 floor plan */
  x: number;
  y: number;
}

export const DEVICES: Device[] = [
  { id: "router", name: "Wi-Fi router", x: 50, y: 30, facts: ["Open ports: 23 (Telnet), 80, 443", "UPnP: on", "Firmware: up to date"] },
  { id: "camera", name: "Door camera", x: 9, y: 49, facts: ["Login: admin / admin", "Port 554 (video) reachable from the internet"] },
  { id: "oldCamera", name: "Old garage camera", x: 86, y: 52, facts: ["Model from 2017, last update 2019", "Not in the owner's device list"] },
  { id: "lock", name: "Smart door lock", x: 24, y: 56, facts: ["Firmware 1.0.2 (fix released in 1.0.4)", "Updates: copied by hand, no signature check"] },
  { id: "thermostat", name: "Thermostat", x: 38, y: 14, facts: ["Data sharing with partners: on (default)", "Keeps 2 years of room history online"] },
  { id: "hub", name: "Smart-light hub", x: 66, y: 16, facts: ["Web page runs an old web-server library", "Debug header open on the board; sits on an open shelf"] },
  { id: "broker", name: "MQTT broker (Raspberry Pi)", x: 80, y: 30, facts: ["Listening on port 1883 without TLS", "Anonymous clients allowed"] },
  { id: "cloud", name: "Cloud account and app", x: 92, y: 8, facts: ["Password reused from a shopping site that leaked", "Two-factor login: off"] },
];

export interface FixOption {
  id: string;
  text: string;
  quality: Quality;
  feedback: string;
}

export interface Weakness {
  id: string;
  device: DeviceId;
  owasp: string;
  owaspName: string;
  title: string;
  severity: Severity;
  cia: Cia[];
  fixes: FixOption[];
}

const fix = (id: string, quality: Quality, text: string, feedback: string): FixOption => ({ id, quality, text, feedback });

export const WEAKNESSES: Weakness[] = [
  {
    id: "I1",
    device: "camera",
    owasp: "I1",
    owaspName: "Weak, guessable or hardcoded passwords",
    title: "The camera still uses the factory login admin / admin",
    severity: "high",
    cia: ["C", "I"],
    fixes: [
      fix("a", "right", "Set a long, unique password", "Right. Botnets try lists of factory passwords; a unique one is not on any list."),
      fix("b", "partial", "Change it to admin123", "Better than admin, but admin123 is on every password list. It is still guessable."),
      fix("c", "wrong", "Rename the camera to \"Garden light\"", "A new name does not change the login. Anyone can still sign in with admin / admin."),
    ],
  },
  {
    id: "I2",
    device: "router",
    owasp: "I2",
    owaspName: "Insecure network services",
    title: "Telnet (port 23) is open to the internet and sends logins as plain text",
    severity: "high",
    cia: ["C", "I", "A"],
    fixes: [
      fix("a", "right", "Turn off Telnet; manage the router from its app or from home only", "Right. A service that is switched off cannot be attacked."),
      fix("b", "partial", "Move Telnet to port 2323", "Hiding it on another port helps little: botnets such as Mirai scanned port 2323 too."),
      fix("c", "wrong", "Restart the router every night", "A restart does not close the port. Telnet is open again a minute later."),
    ],
  },
  {
    id: "I3",
    device: "cloud",
    owasp: "I3",
    owaspName: "Insecure ecosystem interfaces",
    title: "The cloud account reuses a leaked password and has no two-factor login",
    severity: "medium",
    cia: ["C", "I"],
    fixes: [
      fix("a", "right", "Turn on two-factor login and use a unique password", "Right. A stolen password alone is no longer enough to sign in."),
      fix("b", "partial", "Add a number to the end of the old password", "Attackers try such small changes first. Two-factor login is still missing."),
      fix("c", "wrong", "Log out of the app every night", "Logging out does not stop someone else logging in with the leaked password."),
    ],
  },
  {
    id: "I4",
    device: "lock",
    owasp: "I4",
    owaspName: "Lack of secure update mechanism",
    title: "The lock runs firmware with a published flaw, and updates are not signed",
    severity: "high",
    cia: ["I", "A"],
    fixes: [
      fix("a", "right", "Install the fixed firmware and turn on signed automatic updates", "Right. The flaw is fixed, and future fixes arrive by themselves and are checked."),
      fix("b", "partial", "Install the fix once by hand; leave automatic updates off", "The known flaw is gone, but the next one will stay open until someone remembers."),
      fix("c", "wrong", "Download firmware from a forum to save time", "Unsigned firmware from a stranger could contain anything. Never do this."),
    ],
  },
  {
    id: "I5",
    device: "hub",
    owasp: "I5",
    owaspName: "Use of insecure or outdated components",
    title: "The hub's web page is built on an old library with known bugs",
    severity: "medium",
    cia: ["C", "I", "A"],
    fixes: [
      fix("a", "right", "Apply the vendor update that replaces the old library", "Right. The vulnerable component is gone."),
      fix("b", "partial", "Block the hub page from the internet, keep the old library", "This shrinks who can reach it, but anyone on the home network still can."),
      fix("c", "wrong", "Clear the browser cache", "The bug is in the hub, not in your browser."),
    ],
  },
  {
    id: "I6",
    device: "thermostat",
    owasp: "I6",
    owaspName: "Insufficient privacy protection",
    title: "The thermostat shares room-by-room data with advertisers by default",
    severity: "low",
    cia: ["C"],
    fixes: [
      fix("a", "right", "Turn off data sharing and delete the stored history", "Right. Nothing new is shared, and the old history is gone."),
      fix("b", "partial", "Turn off sharing but keep two years of history online", "New sharing stops, but the stored history still shows when the house is empty."),
      fix("c", "wrong", "Set the thermostat to 24 °C", "The temperature setting has nothing to do with who receives your data."),
    ],
  },
  {
    id: "I7",
    device: "broker",
    owasp: "I7",
    owaspName: "Insecure data transfer and storage",
    title: "MQTT runs on port 1883 with no TLS, and anyone may connect without a password",
    severity: "high",
    cia: ["C", "I"],
    fixes: [
      fix("a", "right", "Turn on TLS (port 8883) and give every device its own login", "Right. Messages are encrypted and only known devices can connect."),
      fix("b", "partial", "Require a password but keep port 1883 without TLS", "Now the password itself travels as plain text for anyone listening (see lab L25)."),
      fix("c", "wrong", "Move MQTT to port 1884", "A different port number is not encryption. The messages are still readable."),
    ],
  },
  {
    id: "I8",
    device: "oldCamera",
    owasp: "I8",
    owaspName: "Lack of device management",
    title: "A forgotten camera from the previous owner is still on the Wi-Fi",
    severity: "medium",
    cia: ["C", "I"],
    fixes: [
      fix("a", "right", "Remove it from the network and keep a list of every device", "Right. You cannot protect devices you do not know about."),
      fix("b", "partial", "Turn off its microphone only", "It still sits on the network, unpatched, and can be used to reach other devices."),
      fix("c", "wrong", "Point it at the wall", "Where it looks does not matter; it is still an unpatched computer on your network."),
    ],
  },
  {
    id: "I9",
    device: "router",
    owasp: "I9",
    owaspName: "Insecure default settings",
    title: "UPnP is on, so the camera opened its own port to the internet",
    severity: "medium",
    cia: ["C"],
    fixes: [
      fix("a", "right", "Turn off UPnP; view the camera through the maker's app or a VPN", "Right. The camera is no longer reachable directly from the internet."),
      fix("b", "partial", "Leave UPnP on but restart the camera", "After the restart the camera simply opens the port again."),
      fix("c", "wrong", "Dim the router's lights", "The lights have nothing to do with which ports are open."),
    ],
  },
  {
    id: "I10",
    device: "hub",
    owasp: "I10",
    owaspName: "Lack of physical hardening",
    title: "An open debug header gives anyone with a cable full control of the hub",
    severity: "low",
    cia: ["C", "I", "A"],
    fixes: [
      fix("a", "right", "Install the maker's update that locks the debug port, and keep the hub in a closed cabinet", "Right. The port is locked in software and harder to reach."),
      fix("b", "partial", "Put a sticker over the port", "A sticker hides the port but does not lock it."),
      fix("c", "wrong", "Move the hub nearer the window", "That makes it easier, not harder, to reach."),
    ],
  },
];

export const TOTAL_WEIGHT = WEAKNESSES.reduce((a, w) => a + WEIGHT[w.severity], 0); // 22

export interface Attack {
  id: string;
  name: string;
  /** What happens if it succeeds */
  impact: string;
  /** Possible if every weakness in at least one group is not properly fixed */
  requires: string[][];
}

export const ATTACKS: Attack[] = [
  { id: "botnet", name: "Botnet takeover", impact: "Devices are recruited into a botnet that floods websites (as Mirai did in 2016).", requires: [["I2"], ["I1", "I9"]] },
  { id: "sniff", name: "Eavesdropping on MQTT", impact: "Someone on the Wi-Fi reads the lock's state and commands.", requires: [["I7"]] },
  { id: "lock", name: "Lock firmware flaw", impact: "The published flaw opens the front door.", requires: [["I4"]] },
  { id: "account", name: "Cloud account takeover", impact: "The leaked password opens the app: cameras, lock and history.", requires: [["I3"]] },
  { id: "hub", name: "Hub web bug", impact: "A known bug lets an attacker run their own code on the hub.", requires: [["I5"]] },
  { id: "foothold", name: "Forgotten-camera foothold", impact: "The unwatched camera is used as a stepping stone to other devices.", requires: [["I8"]] },
  { id: "privacy", name: "Privacy profiling", impact: "Advertisers learn when the family is away.", requires: [["I6"]] },
  { id: "physical", name: "Physical access", impact: "A visitor with a cable takes over the hub.", requires: [["I10"]] },
];

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export interface AuditState {
  inspected: DeviceId[];
  /** Weakness id → chosen fix option id */
  chosen: Record<string, string>;
}

export const emptyAudit = (): AuditState => ({ inspected: [], chosen: {} });

export const getWeakness = (id: string) => WEAKNESSES.find((w) => w.id === id)!;
export const weaknessesOn = (device: DeviceId) => WEAKNESSES.filter((w) => w.device === device);

export function inspect(s: AuditState, device: DeviceId): AuditState {
  return s.inspected.includes(device) ? s : { ...s, inspected: [...s.inspected, device] };
}

export function applyFix(s: AuditState, weaknessId: string, optionId: string): AuditState {
  const w = getWeakness(weaknessId);
  if (!s.inspected.includes(w.device)) throw new Error("Inspect the device first.");
  if (!w.fixes.some((f) => f.id === optionId)) throw new Error("Unknown fix.");
  return { ...s, chosen: { ...s.chosen, [weaknessId]: optionId } };
}

export function quality(s: AuditState, weaknessId: string): Quality | undefined {
  const id = s.chosen[weaknessId];
  return id ? getWeakness(weaknessId).fixes.find((f) => f.id === id)?.quality : undefined;
}

export const isFixed = (s: AuditState, weaknessId: string) => quality(s, weaknessId) === "right";

export const found = (s: AuditState) => WEAKNESSES.filter((w) => s.inspected.includes(w.device));

/** 0–100: properly fixed weight over all weight; a partial fix counts half. */
export function score(s: AuditState): number {
  let got = 0;
  for (const w of WEAKNESSES) {
    const q = quality(s, w.id);
    got += WEIGHT[w.severity] * (q === "right" ? 1 : q === "partial" ? 0.5 : 0);
  }
  return Math.round((100 * got) / TOTAL_WEIGHT);
}

export interface AttackResult {
  attack: Attack;
  possible: boolean;
  /** The unfixed weaknesses that still allow it (first open path) */
  via: string[];
}

export function attacks(s: AuditState): AttackResult[] {
  return ATTACKS.map((attack) => {
    const open = attack.requires.find((group) => group.every((id) => !isFixed(s, id)));
    return { attack, possible: !!open, via: open ?? [] };
  });
}

export const blockedCount = (s: AuditState) => attacks(s).filter((a) => !a.possible).length;
