/**
 * Lab L01: build an IoT system by placing parts into six fixed slots.
 * Pure logic only: the parts, the scenarios and the checks that produce
 * plain-English hints.
 */

export type SlotId = "sense" | "process" | "connect" | "cloud" | "app" | "act";
export type Quantity = "temperature" | "soil-moisture" | "distance" | "light" | "motion";
export type Action = "cool" | "water" | "indicate" | "alarm";

export const SLOTS: { id: SlotId; label: string; job: string }[] = [
  { id: "sense", label: "Sense", job: "Measures the physical world" },
  { id: "process", label: "Process", job: "Reads the sensor and runs simple rules" },
  { id: "connect", label: "Connect", job: "Links the device to the internet" },
  { id: "cloud", label: "Cloud", job: "Stores and analyses the data" },
  { id: "app", label: "App", job: "Shows data and sends commands" },
  { id: "act", label: "Act", job: "Changes the physical world" },
];

export interface Part {
  id: string;
  name: string;
  role: SlotId;
  /** One line shown under the name in the tray */
  detail: string;
  measures?: Quantity;
  does?: Action;
  /** Microcontroller without built-in wireless */
  noWireless?: boolean;
  /** Short-range network device */
  shortRange?: boolean;
}

export const PARTS: Record<string, Part> = {
  dht11: { id: "dht11", name: "DHT11 sensor", role: "sense", detail: "Temperature and humidity", measures: "temperature" },
  soil: { id: "soil", name: "Soil moisture probe", role: "sense", detail: "Water in the soil", measures: "soil-moisture" },
  hcsr04: { id: "hcsr04", name: "HC-SR04 sensor", role: "sense", detail: "Distance by ultrasound", measures: "distance" },
  ldr: { id: "ldr", name: "LDR", role: "sense", detail: "Light level", measures: "light" },
  pir: { id: "pir", name: "PIR sensor", role: "sense", detail: "Movement of people", measures: "motion" },
  esp32: { id: "esp32", name: "ESP32", role: "process", detail: "Microcontroller with Wi-Fi" },
  uno: { id: "uno", name: "Arduino Uno", role: "process", detail: "Microcontroller, no wireless", noWireless: true },
  wifi: { id: "wifi", name: "Wi-Fi router", role: "connect", detail: "Short-range network to the internet", shortRange: true },
  lora: { id: "lora", name: "LoRa gateway", role: "connect", detail: "Long-range radio to the internet" },
  cloud: { id: "cloud", name: "IoT cloud platform", role: "cloud", detail: "Stores data, runs rules" },
  app: { id: "app", name: "Mobile app", role: "app", detail: "Live data and buttons" },
  dashboard: { id: "dashboard", name: "Web dashboard", role: "app", detail: "Charts in a browser" },
  fan: { id: "fan", name: "Fan with relay", role: "act", detail: "Cools a room", does: "cool" },
  pump: { id: "pump", name: "Water pump with relay", role: "act", detail: "Waters a field", does: "water" },
  sign: { id: "sign", name: "LED sign", role: "act", detail: "Shows free or full", does: "indicate" },
  buzzer: { id: "buzzer", name: "Buzzer", role: "act", detail: "Sounds an alarm", does: "alarm" },
};

export interface Scenario {
  id: string;
  title: string;
  story: string;
  quantity: Quantity;
  action: Action;
  /** Part ids offered in the tray, correct ones mixed with distractors */
  tray: string[];
  reading: { label: string; unit: string };
  /** Rule the cloud applies, in words */
  rule: string;
  /** Wording when the actuator is on and off */
  actuatorOn: string;
  actuatorOff: string;
  /** Long-distance site where short-range networks struggle */
  outdoor?: boolean;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "cooling",
    title: "Smart room cooling",
    story: "Switch on the classroom fan when the room gets hotter than 30 °C.",
    quantity: "temperature",
    action: "cool",
    tray: ["dht11", "soil", "ldr", "esp32", "uno", "wifi", "cloud", "app", "fan", "pump", "buzzer"],
    reading: { label: "Room temperature", unit: "°C" },
    rule: "Above 30 °C, switch the fan on",
    actuatorOn: "Fan on",
    actuatorOff: "Fan off",
  },
  {
    id: "irrigation",
    title: "Smart irrigation",
    story: "Start the water pump when the soil in a 5-acre field becomes dry.",
    quantity: "soil-moisture",
    action: "water",
    tray: ["soil", "dht11", "hcsr04", "esp32", "lora", "wifi", "cloud", "dashboard", "app", "pump", "fan"],
    reading: { label: "Soil moisture", unit: "%" },
    rule: "Below 30% moisture, switch the pump on",
    actuatorOn: "Pump on",
    actuatorOff: "Pump off",
    outdoor: true,
  },
  {
    id: "parking",
    title: "Smart parking",
    story: "Show drivers whether a parking slot is free, using a sign at the entrance.",
    quantity: "distance",
    action: "indicate",
    tray: ["hcsr04", "pir", "ldr", "esp32", "uno", "wifi", "cloud", "dashboard", "app", "sign", "buzzer"],
    reading: { label: "Distance to car", unit: "cm" },
    rule: "Closer than 50 cm means a car is parked: show “Full”",
    actuatorOn: "Sign shows “Full”",
    actuatorOff: "Sign shows “Free”",
  },
];

export type Placement = Partial<Record<SlotId, string>>;
export type SlotState = "empty" | "ok" | "wrong";

export interface CheckResult {
  valid: boolean;
  slots: Record<SlotId, SlotState>;
  /** The first problem, in slot order */
  problem?: { slot: SlotId; message: string };
  /** Works, but could be better */
  tips: string[];
}

const ROLE_NOUN: Record<SlotId, string> = {
  sense: "a sensor",
  process: "a microcontroller",
  connect: "a network device",
  cloud: "a cloud service",
  app: "a user interface",
  act: "an actuator",
};

const SLOT_NEED: Record<SlotId, string> = {
  sense: "The system needs a sensor to measure the world first.",
  process: "A microcontroller must read the sensor and prepare the data.",
  connect: "The device needs a network link to reach the internet.",
  cloud: "Data needs somewhere to be stored and analysed.",
  app: "People need an app or dashboard to see the data and give commands.",
  act: "Something must act on the decision, such as a motor or a relay.",
};

const QUANTITY_TEXT: Record<Quantity, string> = {
  temperature: "temperature",
  "soil-moisture": "soil moisture",
  distance: "distance",
  light: "light",
  motion: "movement",
};

const ACTION_TEXT: Record<Action, string> = {
  cool: "cool the room",
  water: "water the field",
  indicate: "show whether the slot is free",
  alarm: "sound an alarm",
};

export function getScenario(id: string): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}

/** Checks a placement slot by slot and explains the first problem it finds. */
export function check(scenario: Scenario, placement: Placement): CheckResult {
  const slots = {} as Record<SlotId, SlotState>;
  let problem: CheckResult["problem"];

  for (const slot of SLOTS) {
    const partId = placement[slot.id];
    const part = partId ? PARTS[partId] : undefined;
    let message: string | undefined;

    if (!part) {
      slots[slot.id] = "empty";
      message = `The ${slot.label} slot is empty. ${SLOT_NEED[slot.id]}`;
    } else if (part.role !== slot.id) {
      slots[slot.id] = "wrong";
      message = `${part.name} is ${ROLE_NOUN[part.role]}, not ${ROLE_NOUN[slot.id]}. ${SLOT_NEED[slot.id]}`;
    } else if (slot.id === "sense" && part.measures !== scenario.quantity) {
      slots[slot.id] = "wrong";
      message = `${part.name} measures ${QUANTITY_TEXT[part.measures!]}, but this system must measure ${QUANTITY_TEXT[scenario.quantity]}.`;
    } else if (slot.id === "act" && part.does !== scenario.action) {
      slots[slot.id] = "wrong";
      message = `${part.name} would ${ACTION_TEXT[part.does!]}, but this system must ${ACTION_TEXT[scenario.action]}.`;
    } else {
      slots[slot.id] = "ok";
    }

    if (message && !problem) problem = { slot: slot.id, message };
  }

  const tips: string[] = [];
  const processor = placement.process ? PARTS[placement.process] : undefined;
  const network = placement.connect ? PARTS[placement.connect] : undefined;
  if (processor?.noWireless) {
    tips.push(
      "The Arduino Uno has no built-in Wi-Fi, so it would need an extra wireless module. An ESP32 has Wi-Fi built in.",
    );
  }
  if (scenario.outdoor && network?.shortRange) {
    tips.push(
      "Wi-Fi rarely reaches the far corners of a 5-acre field. A LoRa gateway covers several kilometres on very little power.",
    );
  }

  return { valid: !problem, slots, problem, tips };
}

/** The data path as text, for the observation table. */
export function describePath(placement: Placement): string {
  return SLOTS.map((s) => (placement[s.id] ? PARTS[placement[s.id]!].name : "?")).join(" → ");
}

/**
 * A repeatable reading for the running system: rises and falls past the
 * rule's threshold so students see the actuator switch.
 */
export function readingAt(scenario: Scenario, seconds: number): number {
  const wave = Math.sin((seconds / 20) * 2 * Math.PI);
  if (scenario.id === "cooling") return round1(30 + 3 * wave);
  if (scenario.id === "irrigation") return Math.round(30 - 12 * wave);
  return Math.round(120 + 100 * wave);
}

/** Applies the scenario's rule to a reading: should the actuator be on? */
export function ruleFires(scenario: Scenario, value: number): boolean {
  if (scenario.id === "cooling") return value > 30;
  if (scenario.id === "irrigation") return value < 30;
  return value < 50;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
