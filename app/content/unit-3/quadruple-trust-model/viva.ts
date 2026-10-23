import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is the Quadruple Trust Model?",
    a: "A model saying an IoT system is trustworthy only when four qualities hold together: protection, security, privacy and safety. The four were named as 'quadruple trust' by the IEEE 2413 architecture framework.",
  },
  {
    q: "What is IoT-A?",
    a: "A European research project (2010–2013) that produced the IoT Architectural Reference Model, a common way to describe IoT systems, including a security functional group and a trust, security and privacy perspective.",
  },
  {
    q: "Differentiate protection and security.",
    a: "Protection guards devices and data against damage, loss and faults of any kind, such as storms or breakdowns. Security guards against deliberate attacks by people.",
  },
  {
    q: "Differentiate safety and privacy.",
    a: "Safety means the system must not harm people, property or the environment, even when it fails. Privacy means personal data is used only as the person agreed and kept no longer than needed.",
  },
  {
    q: "Give an example where two pillars conflict.",
    a: "A smart lock that unlocks when its battery dies keeps people safe in a fire, but makes the home less secure. Designers must choose deliberately.",
  },
  {
    q: "How would you apply the model to a health wearable?",
    a: "Protection: water-resistant case and offline storage. Security: encrypted Bluetooth and signed updates. Privacy: the patient controls who sees data. Safety: the band warns when it fails instead of showing normal readings.",
  },
  {
    q: "Why is trust needed between devices?",
    a: "So a gateway accepts data only from authenticated devices and can ignore devices that misbehave, preventing fake or faulty devices from corrupting the system.",
  },
];

export default viva;
