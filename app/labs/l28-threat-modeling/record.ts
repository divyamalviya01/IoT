import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Data-flow diagram of a smart door lock system: resident, mobile app, cloud API, device registry, access log, home hub, smart lock and three data flows",
    "STRIDE threat catalogue (42 threats), a 5 × 5 risk matrix and a list of nine security controls",
  ],
  theory:
    "An asset is anything worth protecting; a threat is something that could harm it, and a vulnerability is the weakness that lets the threat happen. Risk = likelihood × impact, each rated 1 to 5 (1–4 low, 5–9 medium, 10–16 high, 20–25 critical). STRIDE names six kinds of threat, each attacking one security property: Spoofing (authentication), Tampering (integrity), Repudiation (non-repudiation), Information disclosure (confidentiality), Denial of service (availability) and Elevation of privilege (authorisation). The system is drawn as a data-flow diagram (DFD) of external entities, processes, data stores and data flows, with dashed trust boundaries where data moves between zones of different trust. STRIDE per element applies only the letters that fit each kind: S and R for external entities, all six for processes, and T, I and D for stores and flows (plus R for a store that holds logs). A control lowers a risk only if it protects the property that the threat attacks.",
  procedure: [
    "Open lab L28, STRIDE threat modeling. Read the threats of the Smart lock and the Hub → Lock flow, which start in the model.",
    "Press Select all and check that STRIDE per element finds 42 threats. Press Record observation.",
    "Study the risk heat map and the Top risks list. Change a likelihood or impact where you disagree with the suggested rating.",
    "For each top risk, choose a mitigation and press Apply. Try one control from the wrong category and note why it is refused.",
    "Switch the heat map to After mitigations, note the change, and press Record observation.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "elements", label: "Elements" },
    { key: "threats", label: "Threats" },
    { key: "highBefore", label: "High + critical before" },
    { key: "highAfter", label: "High + critical after" },
    { key: "mitigations", label: "Mitigations" },
    { key: "top", label: "Top risk now" },
  ],
  resultHint:
    "State how many threats STRIDE found in the whole system, how many were high or critical before and after your mitigations, which threat is still the biggest risk, and why a wrong-category control was refused.",
  viva: [
    {
      q: "What do the six letters of STRIDE stand for?",
      a: "Spoofing, Tampering, Repudiation, Information disclosure, Denial of service and Elevation of privilege.",
    },
    {
      q: "Which security property does each STRIDE threat attack?",
      a: "Spoofing attacks authentication, tampering attacks integrity, repudiation attacks non-repudiation, information disclosure attacks confidentiality, denial of service attacks availability and elevation of privilege attacks authorisation.",
    },
    {
      q: "Why does a data flow get only T, I and D in STRIDE per element?",
      a: "A flow is data on the move, so it can be changed, read or blocked. It cannot log in or act by itself, so spoofing, repudiation and elevation do not apply to it.",
    },
    {
      q: "What is a trust boundary, and why does it matter?",
      a: "It is the line where data moves between zones of different trust, such as from the home network to the internet. Many threats appear at these crossings, so they need the closest checks.",
    },
    {
      q: "How is risk calculated on the risk matrix?",
      a: "Risk = likelihood × impact, each rated from 1 to 5. For example, likelihood 4 and impact 5 give 20, which is critical.",
    },
    {
      q: "Why was encryption refused as a mitigation for spoofing?",
      a: "Encryption protects confidentiality, but spoofing attacks authentication. Only an authentication control, such as two-factor login or device certificates, lowers that risk.",
    },
  ],
};

export default record;
