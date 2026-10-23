import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is the CIA triad?",
    a: "The three main goals of security: confidentiality (only the right people can read data), integrity (data is not changed unnoticed) and availability (the system works when needed).",
  },
  {
    q: "Why are IoT devices especially vulnerable?",
    a: "They often have default passwords, little memory and CPU for security, rare updates, physical exposure, and they exist in huge numbers of identical copies from many makers.",
  },
  {
    q: "Give one attack at each layer of an IoT system.",
    a: "Perception: physical tampering with a sensor. Network: eavesdropping or replaying messages. Application or cloud: logging in with a stolen or default password.",
  },
  {
    q: "What was the Mirai botnet?",
    a: "Malware from 2016 that logged in to cameras and routers with factory passwords over Telnet, joined them into a botnet and used it for huge DDoS attacks, including one on the DNS company Dyn.",
  },
  {
    q: "Name four items of the OWASP IoT Top 10.",
    a: "Weak or default passwords, insecure network services, lack of a secure update mechanism and insecure data transfer and storage. Others include insecure defaults and lack of physical hardening.",
  },
  {
    q: "What is the attack surface of an IoT system?",
    a: "All the points where an attacker could try to get in: devices, physical ports, radios, network services, apps, cloud accounts and the people who use them.",
  },
  {
    q: "What does 'security by design' mean?",
    a: "Planning security from the start of a product, with secure defaults, least privilege, encryption and signed updates, instead of adding it after problems appear.",
  },
];

export default viva;
