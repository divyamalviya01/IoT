import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "Define cloud computing.",
    a: "Cloud computing is on-demand access over the internet to a shared pool of computing resources, such as servers, storage and software, that can be set up and released quickly and are paid for by use (NIST SP 800-145).",
  },
  {
    q: "List the five essential characteristics of cloud computing.",
    a: "On-demand self-service, broad network access, resource pooling, rapid elasticity and measured service.",
  },
  {
    q: "Differentiate IaaS, PaaS and SaaS.",
    a: "IaaS rents virtual machines and storage; you manage the operating system and above. PaaS gives a ready platform; you bring only the app and data. SaaS is finished software you simply use, such as Gmail.",
  },
  {
    q: "What are the four deployment models?",
    a: "Public cloud (any customer), private cloud (one organisation), community cloud (organisations with shared needs) and hybrid cloud (a mix of private and public).",
  },
  {
    q: "What is multi-tenancy?",
    a: "Many customers sharing the same physical servers while each one's data and work are kept separate and private.",
  },
  {
    q: "Why does IoT need the cloud?",
    a: "To accept data from very many devices, store it for years, run analytics and machine learning, give access from anywhere and let projects grow while paying only for use.",
  },
  {
    q: "Give two limitations of cloud computing for IoT.",
    a: "It needs a reliable internet link, and its latency is too high for very fast control. Costs can also grow and moving between providers is hard (vendor lock-in).",
  },
];

export default viva;
