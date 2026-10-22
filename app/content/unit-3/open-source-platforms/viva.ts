import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is an open-source IoT platform?",
    a: "Free software for connecting devices, processing their data and showing it, whose code anyone may use, study, change and share under an open-source licence.",
  },
  {
    q: "Name four open-source IoT platforms.",
    a: "Node-RED, the Eclipse IoT projects (Kura, Hono, Ditto), Home Assistant and OpenRemote. Kaa Community Edition is also open source.",
  },
  {
    q: "What is Node-RED?",
    a: "A flow-based programming tool, started at IBM in 2013 and now an OpenJS Foundation project, in which you wire nodes together in a web browser to connect devices, process messages and send them on.",
  },
  {
    q: "What do Eclipse Kura, Hono and Ditto do?",
    a: "Kura is gateway software for the edge, Hono connects very many devices over MQTT, HTTP and AMQP, and Ditto keeps digital twins of devices.",
  },
  {
    q: "Differentiate permissive and copyleft licences.",
    a: "Permissive licences such as Apache 2.0 let you use and change the code, even in closed products. Copyleft licences such as AGPL-3.0 require you to share your changes, including for software offered as a web service.",
  },
  {
    q: "Is ThingSpeak open source? Is ThingsBoard?",
    a: "ThingSpeak is not; it is a free-to-start MathWorks service. ThingsBoard Community Edition was Apache 2.0 up to version 4.3; from version 4.4 it is source-available under the Business Source License.",
  },
  {
    q: "Give two limitations of open-source IoT platforms.",
    a: "You must host, secure and update them yourself, and support comes mainly from community forums unless you pay for it.",
  },
];

export default viva;
