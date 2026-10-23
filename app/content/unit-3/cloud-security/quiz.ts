import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "In the shared responsibility model, which is ALWAYS the customer's job?",
    options: ["Physical security of the data centre", "Securing their data, identities and configuration", "Replacing failed hard disks", "Cooling the servers"],
    answer: 1,
    explanation: "Whatever the service model, the customer owns their data, accounts and settings.",
  },
  {
    id: "q2",
    question: "On a PaaS IoT platform, who patches the operating system?",
    options: ["The customer", "The provider", "The device", "Nobody"],
    answer: 1,
    explanation: "In PaaS the provider runs and patches the OS and runtime; the customer secures code, data and access.",
  },
  {
    id: "q3",
    question: "What does 'least privilege' mean in IAM?",
    options: ["Everyone is an administrator", "Each user, app and device gets only the permissions it needs", "No one may log in", "Passwords are short"],
    answer: 1,
    explanation: "Limiting permissions limits the damage if an account is taken over.",
  },
  {
    id: "q4",
    question: "What is mutual TLS?",
    options: [
      "TLS used twice in a row",
      "TLS where both the server and the device show certificates to prove who they are",
      "TLS without encryption",
      "A password shared by all devices",
    ],
    answer: 1,
    explanation: "Both sides authenticate; IoT clouds such as AWS IoT Core use it for device connections.",
  },
  {
    id: "q5",
    question: "Where is the best place to keep a device's private key?",
    options: ["In the firmware source code", "In a secure element or TPM chip", "In a shared cloud folder", "Printed on the device label"],
    answer: 1,
    explanation: "A secure element lets the key be used for signing but never read out.",
  },
  {
    id: "q6",
    question: "What is a key management service (KMS) used for?",
    options: ["Storing photos", "Creating, storing, rotating and controlling encryption keys", "Sending MQTT messages", "Writing firmware"],
    answer: 1,
    explanation: "A KMS manages keys safely, often backed by hardware security modules.",
  },
  {
    id: "q7",
    question: "A storage folder of camera clips is accidentally made public. Which CSA cloud threat is this?",
    options: ["Advanced persistent threat", "Misconfiguration", "Denial of service", "Quantum attack"],
    answer: 1,
    explanation: "Wrong settings are among the most common causes of cloud data leaks.",
  },
  {
    id: "q8",
    question: "Which threat tops the Cloud Security Alliance's 2024 list?",
    options: ["Identity and access management weaknesses", "Physical theft", "Power cuts", "Slow internet"],
    answer: 0,
    explanation: "IAM weaknesses rank first, followed by insecure interfaces and APIs and misconfiguration.",
  },
  {
    id: "q9",
    question: "What should happen when an IoT device is stolen or retired?",
    options: ["Nothing", "Its certificate is revoked so it can no longer connect", "All devices get the same new password", "The cloud account is deleted"],
    answer: 1,
    explanation: "Revocation cuts off one device without affecting the rest of the fleet.",
  },
  {
    id: "q10",
    question: "Within how many hours do CERT-In's 2022 directions require many organisations to report cyber incidents?",
    options: ["1 hour", "6 hours", "72 hours", "30 days"],
    answer: 1,
    explanation: "CERT-In's April 2022 directions set a 6-hour reporting window.",
  },
];

export default quiz;
