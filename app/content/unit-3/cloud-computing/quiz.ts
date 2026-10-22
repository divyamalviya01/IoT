import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "Which document gives the standard definition of cloud computing?",
    options: ["RFC 7252", "NIST SP 800-145", "IEEE 802.15.4", "ISO 9001"],
    answer: 1,
    explanation: "NIST Special Publication 800-145 (2011) defines cloud computing, its five characteristics, three service models and four deployment models.",
  },
  {
    id: "q2",
    question: "A platform adds servers within minutes when every smart meter reports at midnight, then removes them. Which characteristic is this?",
    options: ["Broad network access", "Measured service", "Rapid elasticity", "On-demand self-service"],
    answer: 2,
    explanation: "Rapid elasticity means resources grow and shrink quickly with demand.",
  },
  {
    id: "q3",
    question: "Many customers share the same physical servers, each kept separate. What is this called?",
    options: ["Resource pooling (multi-tenancy)", "Virtual private network", "Edge computing", "Grid computing"],
    answer: 0,
    explanation: "Resource pooling serves many tenants from one pool of hardware.",
  },
  {
    id: "q4",
    question: "In IaaS, what does the customer manage?",
    options: ["Nothing at all", "Only the data", "The operating system, runtime, application and data", "The physical servers and cooling"],
    answer: 2,
    explanation: "IaaS gives virtual machines; everything from the operating system upwards is yours.",
  },
  {
    id: "q5",
    question: "Gmail is an example of which service model?",
    options: ["IaaS", "PaaS", "SaaS", "On-premises"],
    answer: 2,
    explanation: "Gmail is finished software used over the internet: Software as a Service.",
  },
  {
    id: "q6",
    question: "In the 'pizza as a service' analogy, which model matches 'pizza delivered'?",
    options: ["On-premises", "IaaS", "PaaS", "SaaS"],
    answer: 2,
    explanation: "You only provide the table and drinks (your app and data); the pizza is made and baked for you, like PaaS.",
  },
  {
    id: "q7",
    question: "Several government departments share one cloud built for their common needs. Which deployment model is this?",
    options: ["Public cloud", "Private cloud", "Community cloud", "Hybrid cloud"],
    answer: 2,
    explanation: "A community cloud is shared by organisations with the same needs and rules, such as MeghRaj for government departments.",
  },
  {
    id: "q8",
    question: "A hospital keeps patient records in its own cloud and runs analytics on a public cloud. Which model is this?",
    options: ["Hybrid cloud", "Community cloud", "Public cloud", "SaaS"],
    answer: 0,
    explanation: "Combining private and public clouds is a hybrid cloud.",
  },
  {
    id: "q9",
    question: "Which job should NOT depend on a round trip to a distant cloud?",
    options: ["Monthly energy report", "Storing five years of readings", "Stopping a machine within 5 ms when a guard opens", "Training a fault-prediction model"],
    answer: 2,
    explanation: "Cloud round trips take tens to hundreds of milliseconds; fast safety control must run at the edge.",
  },
  {
    id: "q10",
    question: "Which is a limitation of cloud computing?",
    options: ["Large up-front hardware cost", "Cannot scale", "Vendor lock-in and dependence on the internet", "No access from phones"],
    answer: 2,
    explanation: "The cloud removes up-front cost and scales easily, but ties you to the internet and, often, to one provider.",
  },
];

export default quiz;
