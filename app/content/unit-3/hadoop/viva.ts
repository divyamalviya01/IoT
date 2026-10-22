import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is Hadoop?",
    a: "An open-source Apache framework that stores very large data across clusters of ordinary computers (HDFS) and processes it in parallel where it is stored (MapReduce, managed by YARN).",
  },
  {
    q: "Explain the roles of the NameNode and DataNodes.",
    a: "The NameNode is the master that keeps the file system index: which blocks form each file and where they are. DataNodes are workers that store the blocks and send a heartbeat every 3 seconds.",
  },
  {
    q: "What are blocks and the replication factor in HDFS?",
    a: "Files are cut into blocks of 128 MB by default. Each block is stored on several DataNodes, three by default; that number is the replication factor.",
  },
  {
    q: "Explain rack-aware replica placement.",
    a: "The first copy goes on the writer's node, the second on a node in a different rack and the third on another node in that same remote rack, so losing a whole rack loses no data.",
  },
  {
    q: "What happens when a DataNode fails?",
    a: "Its heartbeats stop. After about 10 minutes the NameNode treats it as dead and makes new copies of its blocks from the surviving copies, until each block is back to the replication factor.",
  },
  {
    q: "Explain the phases of MapReduce with an example.",
    a: "To average temperature per sensor: mappers turn each log line into (sensor, temperature); the shuffle sends all pairs with the same sensor to one reducer; each reducer averages its sensor's values.",
  },
  {
    q: "What is YARN?",
    a: "Yet Another Resource Negotiator, Hadoop's resource manager. The ResourceManager hands out resources, a NodeManager runs tasks on each machine and an ApplicationMaster manages each job.",
  },
  {
    q: "Name four tools in the Hadoop ecosystem.",
    a: "Hive for SQL queries, HBase for a NoSQL database, Spark for fast in-memory processing and ZooKeeper for co-ordination. Kafka is often used for streaming data in.",
  },
];

export default viva;
