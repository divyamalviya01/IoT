import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "What is the default HDFS block size in Hadoop 2 and 3?",
    options: ["4 KB", "64 MB", "128 MB", "1 GB"],
    answer: 2,
    explanation: "The default is 128 MB; Hadoop 1 used 64 MB.",
  },
  {
    id: "q2",
    question: "How many blocks does a 500 MB file make with 128 MB blocks?",
    options: ["3", "4", "5", "500"],
    answer: 1,
    explanation: "128 + 128 + 128 + 116 MB: four blocks, the last one smaller.",
  },
  {
    id: "q3",
    question: "What does the NameNode store?",
    options: ["All the file data", "The index: which blocks make up each file and where they are", "Only backups", "The MapReduce code"],
    answer: 1,
    explanation: "The NameNode holds metadata; DataNodes hold the blocks.",
  },
  {
    id: "q4",
    question: "What is the default replication factor in HDFS?",
    options: ["1", "2", "3", "5"],
    answer: 2,
    explanation: "Each block is stored three times by default.",
  },
  {
    id: "q5",
    question: "Where does HDFS put the second copy of a block?",
    options: ["On the same node", "On a node in a different rack", "On the NameNode", "In the cloud"],
    answer: 1,
    explanation: "Rack-aware placement puts copy 2 on another rack, and copy 3 on another node in that rack.",
  },
  {
    id: "q6",
    question: "What is the Secondary NameNode?",
    options: ["A hot backup that takes over instantly", "A helper that merges the NameNode's change log into checkpoints", "A second DataNode", "The YARN master"],
    answer: 1,
    explanation: "Despite its name, it is not a backup; high availability uses a Standby NameNode.",
  },
  {
    id: "q7",
    question: "A DataNode stops sending heartbeats. What does the NameNode do once it decides the node is dead?",
    options: ["Deletes the file", "Makes new copies of its blocks from the surviving copies", "Stops the whole cluster", "Nothing"],
    answer: 1,
    explanation: "Under-replicated blocks are copied again until each has the replication factor.",
  },
  {
    id: "q8",
    question: "What is the correct order of MapReduce phases?",
    options: ["Reduce → map → shuffle", "Map → shuffle and sort → reduce", "Shuffle → map → reduce", "Map → reduce → shuffle"],
    answer: 1,
    explanation: "Mappers emit key–value pairs, the shuffle groups them by key, reducers combine each group.",
  },
  {
    id: "q9",
    question: "What does a combiner do?",
    options: [
      "Joins two clusters",
      "Pre-reduces each mapper's output so less data crosses the network in the shuffle",
      "Adds more replicas",
      "Schedules jobs",
    ],
    answer: 1,
    explanation: "A combiner sends (key, sum, count) instead of every value, shrinking the shuffle.",
  },
  {
    id: "q10",
    question: "Which tool processes data in memory and often replaces MapReduce?",
    options: ["Sqoop", "Apache Spark", "ZooKeeper", "Flume"],
    answer: 1,
    explanation: "Spark keeps data in memory between steps and handles batch and streaming work.",
  },
];

export default quiz;
