import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is big data?",
    a: "Data so large, so fast or so varied that ordinary databases and single computers cannot store or process it in time.",
  },
  {
    q: "Explain the 5 Vs of big data.",
    a: "Volume is the amount of data, velocity its speed, variety its different kinds, veracity how trustworthy it is, and value how useful it is.",
  },
  {
    q: "Differentiate structured, semi-structured and unstructured data with IoT examples.",
    a: "Structured data has fixed rows and columns, such as a meter-reading table. Semi-structured data has tags but no fixed table, such as JSON messages. Unstructured data has no set format, such as CCTV video.",
  },
  {
    q: "Name the four types of analytics.",
    a: "Descriptive (what happened), diagnostic (why it happened), predictive (what will happen) and prescriptive (what we should do).",
  },
  {
    q: "Differentiate batch and stream processing.",
    a: "Batch processing collects data and processes it later in one large job, such as monthly bills. Stream processing handles each reading as it arrives, within seconds, such as fire alarms.",
  },
  {
    q: "What are the stages of an IoT data pipeline?",
    a: "Ingest (collect messages, for example through MQTT or Kafka), store (data lake or time-series database), process (batch or stream analytics) and visualize or act (dashboards, alerts, control).",
  },
  {
    q: "What is a z-score and how is it used for anomaly detection?",
    a: "It is how many standard deviations a reading is from the recent average. A reading with a z-score above about 3 is flagged as unusual.",
  },
];

export default viva;
