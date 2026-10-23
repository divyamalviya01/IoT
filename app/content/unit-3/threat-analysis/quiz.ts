import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "In threat analysis, what is a vulnerability?",
    options: ["Something valuable to protect", "A weakness that a threat can use", "The final risk score", "A type of encryption"],
    answer: 1,
    explanation: "Asset = what we protect; threat = what could harm it; vulnerability = the weakness it uses.",
  },
  {
    id: "q2",
    question: "How is risk calculated on a risk matrix?",
    options: ["Likelihood + impact", "Likelihood × impact", "Impact − likelihood", "Number of assets × threats"],
    answer: 1,
    explanation: "Risk = likelihood × impact, each rated 1 to 5.",
  },
  {
    id: "q3",
    question: "What does the S in STRIDE stand for?",
    options: ["Security", "Spoofing", "Sniffing", "Safety"],
    answer: 1,
    explanation: "Spoofing: pretending to be someone or something else.",
  },
  {
    id: "q4",
    question: "Which security property does 'Information disclosure' attack?",
    options: ["Availability", "Integrity", "Confidentiality", "Authorisation"],
    answer: 2,
    explanation: "Information disclosure breaks confidentiality; encryption is the usual defence.",
  },
  {
    id: "q5",
    question: "A guest account in a smart-home app manages to add new administrators. Which STRIDE threat is this?",
    options: ["Repudiation", "Denial of service", "Elevation of privilege", "Tampering"],
    answer: 2,
    explanation: "Gaining rights you should not have is elevation of privilege.",
  },
  {
    id: "q6",
    question: "In a data-flow diagram, how is a data store usually drawn?",
    options: ["A circle", "A rectangle", "Two parallel lines", "An arrow"],
    answer: 2,
    explanation: "External entity = rectangle, process = circle, data store = parallel lines, data flow = arrow.",
  },
  {
    id: "q7",
    question: "What is a trust boundary?",
    options: [
      "The edge of the Wi-Fi range",
      "A line where data passes between parts trusted to different degrees",
      "The maximum risk score",
      "A firewall brand",
    ],
    answer: 1,
    explanation: "Threats cluster where data crosses trust levels, such as home network to internet.",
  },
  {
    id: "q8",
    question: "Which STRIDE categories apply to a data flow?",
    options: ["Spoofing and repudiation", "Tampering, information disclosure and denial of service", "All six", "Only elevation of privilege"],
    answer: 1,
    explanation: "STRIDE per element: a data flow can be tampered with, read or blocked.",
  },
  {
    id: "q9",
    question: "A threat has likelihood 4 and impact 5. Which band is it in?",
    options: ["Low", "Medium", "High", "Critical"],
    answer: 3,
    explanation: "4 × 5 = 20, which falls in the critical band (20–25).",
  },
  {
    id: "q10",
    question: "Why does encryption NOT fix a spoofing threat?",
    options: [
      "Encryption is too slow",
      "Spoofing attacks authentication; encryption protects confidentiality",
      "Encryption makes spoofing easier",
      "Spoofing only affects data stores",
    ],
    answer: 1,
    explanation: "Each control protects a property; spoofing needs an authentication control.",
  },
];

export default quiz;
