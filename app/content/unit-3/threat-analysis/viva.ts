import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "Define asset, threat, vulnerability and risk.",
    a: "An asset is something of value; a threat is something that could harm it; a vulnerability is a weakness the threat can use; risk is how likely and how harmful that is, usually likelihood × impact.",
  },
  {
    q: "What does STRIDE stand for?",
    a: "Spoofing, Tampering, Repudiation, Information disclosure, Denial of service and Elevation of privilege.",
  },
  {
    q: "Which security property does each STRIDE threat attack?",
    a: "Spoofing attacks authentication, tampering integrity, repudiation non-repudiation, information disclosure confidentiality, denial of service availability, and elevation of privilege authorisation.",
  },
  {
    q: "What is a data-flow diagram in threat modelling?",
    a: "A drawing of the system's external entities, processes, data stores and data flows, with trust boundaries, used as the map on which threats are found.",
  },
  {
    q: "What is STRIDE per element?",
    a: "Applying only the relevant STRIDE categories to each DFD element: external entities S and R; processes all six; data stores T, I and D (plus R for logs); data flows T, I and D.",
  },
  {
    q: "How is a risk matrix used?",
    a: "Likelihood and impact are rated 1 to 5 and multiplied. Scores of 1–4 are low, 5–9 medium, 10–16 high and 20–25 critical, so the worst risks are fixed first.",
  },
  {
    q: "What are the ways to treat a risk?",
    a: "Reduce it with a control, avoid it by removing the feature, transfer it, for example through insurance, or accept it if it is low.",
  },
];

export default viva;
