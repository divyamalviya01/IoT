import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Simulated Hadoop cluster: one NameNode and nine DataNodes on three racks, plus a MapReduce job over simulated IoT temperature logs (seeded)",
  ],
  theory:
    "HDFS cuts a file into blocks (128 MB by default) and stores each block on several DataNodes; the number of copies is the replication factor (3 by default). Rack-aware placement puts the first copy on the writer's node, the second on a node in another rack and the third on another node in that rack. The NameNode keeps the index of blocks. DataNodes send heartbeats; when one stops, the NameNode re-copies its blocks from surviving copies. MapReduce processes data in parallel: mappers turn input lines into key–value pairs, the shuffle sends each key to one reducer, and reducers combine the values. A combiner pre-sums values on each mapper so fewer records cross the network.",
  procedure: [
    "Open lab L23, Hadoop. In the HDFS part, keep a 500 MB file, 128 MB blocks and replication factor 3. Note the blocks and copies.",
    "Tap DataNode D4 to fail it. Wait for the NameNode to re-copy its blocks, then press Record observation.",
    "Set the replication factor to 1, fail a DataNode holding a block, and record what is lost.",
    "Change the block size to 64 MB and note the number of blocks.",
    "In the MapReduce part, run the job with 1,200 lines, 4 mappers, 2 reducers and the combiner off, and record. Turn the combiner on, run and record. Try 3 reducers and record.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "part", label: "Part" },
    { key: "input", label: "Input" },
    { key: "blocks", label: "Blocks / mappers" },
    { key: "rf", label: "Copies / reducers" },
    { key: "failure", label: "Failure / combiner" },
    { key: "stored", label: "Stored / shuffled" },
    { key: "result", label: "Result" },
  ],
  resultHint:
    "State how many blocks and copies the file needed, what happened when a DataNode failed with replication factor 3 and with 1, how much the combiner reduced the shuffle, and whether the averages changed.",
  viva: [
    {
      q: "How many blocks does a 500 MB file make with 128 MB blocks, and how much disk does it use with replication factor 3?",
      a: "Four blocks (three of 128 MB and one of 116 MB), stored three times: 12 block copies using 1500 MB.",
    },
    {
      q: "Why is the second copy placed on a different rack?",
      a: "So that losing a whole rack, for example to a power or switch failure, still leaves a copy of every block.",
    },
    {
      q: "What did the NameNode do when a DataNode failed?",
      a: "It noticed the missing heartbeats and made new copies of that node's blocks from the surviving copies on other DataNodes.",
    },
    {
      q: "Why was data lost with replication factor 1?",
      a: "Each block had only one copy, so when its DataNode failed there was nothing left to copy from.",
    },
    {
      q: "What does the shuffle do in MapReduce?",
      a: "It moves every key–value pair from the mappers to the reducer responsible for that key, so all values of one key meet at one reducer.",
    },
    {
      q: "How did the combiner change the job?",
      a: "Each mapper sent one (sensor, sum, count) record per sensor instead of one record per line, so far fewer records crossed the network, with the same averages.",
    },
  ],
};

export default record;
