import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "What is the main benefit of an open-source IoT platform over a commercial cloud platform?",
    options: ["It never needs updates", "You can run it yourself, change it and keep control of your data", "It is always faster", "It needs no server at all"],
    answer: 1,
    explanation: "Open source gives control and freedom, but you take on hosting and security.",
  },
  {
    id: "q2",
    question: "Which tool lets you build IoT logic by wiring nodes together in a browser?",
    options: ["Node-RED", "Eclipse Ditto", "HDFS", "ThingSpeak"],
    answer: 0,
    explanation: "Node-RED uses flow-based programming: nodes joined by wires.",
  },
  {
    id: "q3",
    question: "Node-RED was started at which company, and who looks after it now?",
    options: ["Google; Apache", "IBM; the OpenJS Foundation", "Microsoft; the Linux Foundation", "Amazon; Eclipse"],
    answer: 1,
    explanation: "Node-RED began at IBM in 2013 and is now an OpenJS Foundation project under Apache 2.0.",
  },
  {
    id: "q4",
    question: "Which Eclipse IoT project is gateway software that runs at the edge?",
    options: ["Eclipse Ditto", "Eclipse Hono", "Eclipse Kura", "Eclipse Mosquitto"],
    answer: 2,
    explanation: "Kura runs on gateways; Hono handles device connectivity; Ditto handles digital twins.",
  },
  {
    id: "q5",
    question: "Which Eclipse project manages digital twins?",
    options: ["Kura", "Ditto", "Hono", "Paho"],
    answer: 1,
    explanation: "Eclipse Ditto keeps the live state (twin) of each device.",
  },
  {
    id: "q6",
    question: "Under AGPL-3.0, what must you do if you change the software and offer it to users as a web service?",
    options: ["Nothing", "Pay a fee", "Share your changed source code", "Delete the software"],
    answer: 2,
    explanation: "AGPL's network clause requires sharing changes even when the software is only used over a network. OpenRemote uses AGPL-3.0.",
  },
  {
    id: "q7",
    question: "What changed for ThingsBoard at version 4.4?",
    options: [
      "It was retired",
      "It moved from Apache 2.0 to the Business Source License (source-available)",
      "It became part of AWS",
      "It stopped supporting MQTT",
    ],
    answer: 1,
    explanation: "From 4.4 ThingsBoard is source-available under BUSL 1.1; older Community Edition releases stay Apache 2.0.",
  },
  {
    id: "q8",
    question: "Which statement about ThingSpeak is true?",
    options: ["It is open source under Apache 2.0", "It is free to start but proprietary", "It is an Eclipse project", "It is a Hadoop tool"],
    answer: 1,
    explanation: "ThingSpeak from MathWorks has a free tier but is not open source.",
  },
  {
    id: "q9",
    question: "In the stack ESP32 → Mosquitto → Node-RED → database → Grafana, what does Mosquitto do?",
    options: ["Draws dashboards", "Stores readings for years", "Acts as the MQTT broker", "Runs MapReduce jobs"],
    answer: 2,
    explanation: "Mosquitto is an open-source MQTT broker that passes messages from publishers to subscribers.",
  },
  {
    id: "q10",
    question: "Which is a limitation of running an open-source platform yourself?",
    options: ["You cannot see the code", "You must host, secure and update it yourself", "It only works in the USA", "It cannot use MQTT"],
    answer: 1,
    explanation: "Freedom comes with responsibility: hosting, security, backups and updates are yours.",
  },
];

export default quiz;
