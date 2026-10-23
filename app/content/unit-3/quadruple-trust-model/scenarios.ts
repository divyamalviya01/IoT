/**
 * The four parts of the "quadruple trust" named by IEEE 2413 (formerly
 * P2413): protection, security, privacy and safety. The standard names them
 * but does not define each one separately; these plain-word definitions are
 * the ones the theory page teaches.
 */
export type Pillar = "protection" | "security" | "privacy" | "safety";

export const PILLARS: { id: Pillar; name: string; meaning: string; question: string }[] = [
  {
    id: "protection",
    name: "Protection",
    meaning: "Keeping devices, data and services from damage, loss or misuse of any kind, including accidents, faults and bad weather.",
    question: "What if something breaks, fails or is damaged?",
  },
  {
    id: "security",
    name: "Security",
    meaning: "Defending against deliberate attacks: only the right people and devices get in, and data stays secret, unchanged and available.",
    question: "What if someone attacks it on purpose?",
  },
  {
    id: "privacy",
    name: "Privacy",
    meaning: "Personal information is collected and used only as the person agrees, and kept no longer than needed.",
    question: "Is personal data used only as the person agreed?",
  },
  {
    id: "safety",
    name: "Safety",
    meaning: "The system must not harm people, property or the environment, even when it fails.",
    question: "Could anyone get hurt?",
  },
];

export interface Scenario {
  id: string;
  text: string;
  answer: Pillar;
  why: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "lock-fire",
    text: "A smart lock unlocks itself when its battery runs out, so nobody is trapped inside during a fire.",
    answer: "safety",
    why: "The design protects people when the system fails. (It weakens security a little: the four pillars sometimes pull against each other.)",
  },
  {
    id: "camera-password",
    text: "Someone guesses a camera's password and watches the family.",
    answer: "security",
    why: "A deliberate attack got past the login. Strong, unique passwords are a security control.",
  },
  {
    id: "fitness-sale",
    text: "A fitness-band company sells users' heart-rate data to an insurer without asking them.",
    answer: "privacy",
    why: "Nobody broke in; the data was used in a way the users never agreed to.",
  },
  {
    id: "surge",
    text: "A storm surge destroys the home hub. A surge protector and a nightly backup would have saved it and its settings.",
    answer: "protection",
    why: "Nobody attacked it. Protection covers accidents, faults and the weather.",
  },
  {
    id: "insulin",
    text: "If its software crashes, an insulin pump stops at the last safe dose instead of delivering more.",
    answer: "safety",
    why: "When it fails, it fails in a way that cannot hurt the patient.",
  },
  {
    id: "factory-encrypt",
    text: "A factory encrypts its sensor messages so that competitors cannot read them.",
    answer: "security",
    why: "Encryption keeps data confidential against people who want to read it.",
  },
  {
    id: "speaker-recordings",
    text: "A smart speaker keeps voice recordings for years, although it needed them for only a minute.",
    answer: "privacy",
    why: "Personal data is kept far longer than its purpose needs.",
  },
  {
    id: "street-box",
    text: "Street-light controllers are fitted in locked, waterproof boxes so that rain and vandals cannot damage them.",
    answer: "protection",
    why: "The enclosure guards the equipment from damage, whatever the cause.",
  },
  {
    id: "robot-stop",
    text: "A robot arm stops instantly when a worker steps into its area.",
    answer: "safety",
    why: "The system is designed so that it cannot injure a person.",
  },
  {
    id: "meter-hourly",
    text: "A smart meter sends only hourly totals, so nobody can tell which appliance was used when.",
    answer: "privacy",
    why: "Collecting less detail stops the data revealing a family's daily routine.",
  },
  {
    id: "signed-firmware",
    text: "A device installs a firmware update only if it carries the maker's digital signature.",
    answer: "security",
    why: "It stops an attacker installing their own code.",
  },
  {
    id: "two-gateways",
    text: "A farm uses two gateways sharing the load, so if one fails the sensors keep reporting.",
    answer: "protection",
    why: "Spare equipment protects the service against breakdowns.",
  },
];
