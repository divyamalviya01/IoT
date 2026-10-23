import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is the shared responsibility model?",
    a: "The split of security duties in the cloud: the provider secures the physical data centres, hardware and the services it runs; the customer secures their data, identities, access and configuration, and more layers in IaaS than in SaaS.",
  },
  {
    q: "What is IAM and name two good practices.",
    a: "Identity and access management controls who and what can perform which actions. Good practices are least privilege and multi-factor login, plus using roles instead of shared keys.",
  },
  {
    q: "How are IoT devices identified to the cloud securely?",
    a: "Each device gets its own X.509 certificate and private key, ideally stored in a secure element, and connects with mutual TLS so both the device and the server prove who they are.",
  },
  {
    q: "What is mutual TLS?",
    a: "A TLS connection in which both sides present certificates: the server proves itself to the device, and the device proves itself to the server.",
  },
  {
    q: "What is key management?",
    a: "Creating, storing, rotating and destroying encryption keys safely, usually with a key management service and hardware security modules, so keys are never exposed.",
  },
  {
    q: "Name three top cloud threats.",
    a: "From the CSA 2024 list: identity and access management weaknesses, insecure interfaces and APIs, and misconfiguration.",
  },
  {
    q: "Why is misconfiguration so dangerous in the cloud?",
    a: "Because a single wrong setting, such as a public storage folder or an open endpoint, can expose all of a company's data or devices at once, even though the provider's infrastructure is secure.",
  },
];

export default viva;
