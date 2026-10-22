import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Who suggested in 1961 that computing could be sold like a public utility?",
    options: ["Kevin Ashton", "John McCarthy", "Tim Berners-Lee", "Bill Gates"],
    answer: 1,
    explanation: "John McCarthy proposed utility computing in 1961.",
  },
  {
    id: "q2",
    question: "In mainframe time-sharing, how was the computer used?",
    options: ["Each user had their own computer", "Many users at terminals shared one computer's time", "Computers in many cities joined for one job", "Code ran only when an event arrived"],
    answer: 1,
    explanation: "Time-sharing gave each terminal user a slice of the mainframe's time.",
  },
  {
    id: "q3",
    question: "What was the main problem with every company running its own servers (client–server)?",
    options: ["Servers could not use the internet", "Servers sat idle much of the time and were slow to add", "There were no personal computers", "Data could not be stored"],
    answer: 1,
    explanation: "Companies paid for hardware sized for peak demand that was idle most of the time.",
  },
  {
    id: "q4",
    question: "Which event in 2006 is usually taken as the start of the public cloud?",
    options: ["Launch of Docker", "Launch of Amazon S3 and EC2", "First iPhone", "Launch of AWS Lambda"],
    answer: 1,
    explanation: "AWS launched S3 in March 2006 and EC2 in August 2006, rented by use.",
  },
  {
    id: "q5",
    question: "Which technology lets one physical server run many separate virtual machines?",
    options: ["Virtualization (a hypervisor)", "Grid computing", "SaaS", "MQTT"],
    answer: 0,
    explanation: "A hypervisor shares the hardware between virtual machines; it is the base of the cloud.",
  },
  {
    id: "q6",
    question: "Salesforce in 1999 is a famous early example of which model?",
    options: ["IaaS", "SaaS", "Grid computing", "Edge computing"],
    answer: 1,
    explanation: "Salesforce delivered its software through a web browser: Software as a Service.",
  },
  {
    id: "q7",
    question: "How is a container different from a virtual machine?",
    options: [
      "It has its own full operating system",
      "It shares the host's operating system kernel, so it is lighter and starts in seconds",
      "It can only run on mainframes",
      "It is billed per run",
    ],
    answer: 1,
    explanation: "Containers package an app with its libraries but share the kernel; virtual machines carry a whole operating system.",
  },
  {
    id: "q8",
    question: "What is serverless computing?",
    options: [
      "Computing with no servers anywhere",
      "Running small functions only when an event arrives, without managing servers, paying per run",
      "Running everything on the device",
      "A mainframe without terminals",
    ],
    answer: 1,
    explanation: "There are still servers, but the provider hides them; you pay only when your function runs (for example AWS Lambda, 2014).",
  },
  {
    id: "q9",
    question: "Why did some processing move back to the edge after the cloud?",
    options: ["The cloud ran out of storage", "The cloud is too far away for decisions needed in milliseconds", "Edge devices are cheaper than phones", "The internet stopped working"],
    answer: 1,
    explanation: "Round trips to a distant data centre add latency, so fast decisions are made near the devices (fog and edge computing).",
  },
  {
    id: "q10",
    question: "Arrange in order: (a) public cloud, (b) client–server, (c) mainframe time-sharing, (d) serverless.",
    options: ["c, b, a, d", "b, c, a, d", "c, a, b, d", "a, b, c, d"],
    answer: 0,
    explanation: "Mainframes (1960s) → client–server (1980s–90s) → public cloud (2006) → serverless (2014).",
  },
];

export default quiz;
