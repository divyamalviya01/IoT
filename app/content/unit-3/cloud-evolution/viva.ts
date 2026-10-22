import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is utility computing?",
    a: "Paying for computing by use, like electricity or water. John McCarthy suggested the idea in 1961, and the cloud made it real.",
  },
  {
    q: "What is time-sharing?",
    a: "Many users at terminals share one mainframe, each getting a small slice of its time in turn, so the costly computer is never idle.",
  },
  {
    q: "Differentiate grid computing and cloud computing.",
    a: "Grid computing joins many computers owned by different institutes in different places to work on one big job. Cloud computing rents resources from one provider's data centres to many customers on demand.",
  },
  {
    q: "Why is virtualization important for the cloud?",
    a: "It lets one physical server run many isolated virtual machines, so a provider can share its hardware safely between many customers and use it fully.",
  },
  {
    q: "When did the public cloud start, and how?",
    a: "In 2006, when Amazon Web Services launched S3 storage and EC2 virtual servers that anyone could rent by the hour.",
  },
  {
    q: "Differentiate virtual machines, containers and serverless functions.",
    a: "A virtual machine is a whole computer with its own operating system. A container packs an app with its libraries and shares the host kernel, so it is lighter. A serverless function runs only when an event arrives and is billed per run.",
  },
  {
    q: "Why did edge and fog computing appear after the cloud?",
    a: "Because the cloud is far away; decisions that must be made in milliseconds, or data too large to send, are better handled near the devices.",
  },
];

export default viva;
