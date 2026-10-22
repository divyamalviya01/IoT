import { describe, expect, it } from "vitest";
import { CLUSTER, failNode, makeLogs, mapReduce, partition, reReplicate, restoreNode, splitBlocks, status, writeFile } from "./engine";

describe("splitting a file into blocks", () => {
  it("cuts 500 MB into 3 × 128 MB + 116 MB", () => {
    expect(splitBlocks(500, 128).map((b) => b.sizeMB)).toEqual([128, 128, 128, 116]);
  });
  it("needs twice as many blocks at 64 MB", () => {
    const blocks = splitBlocks(500, 64);
    expect(blocks).toHaveLength(8);
    expect(blocks.at(-1)?.sizeMB).toBe(52);
  });
  it("cuts 1 GB into exactly 8 full blocks", () => {
    expect(splitBlocks(1024, 128).every((b) => b.sizeMB === 128)).toBe(true);
    expect(splitBlocks(1024, 128)).toHaveLength(8);
  });
});

describe("rack-aware replica placement", () => {
  const rackOf = (n: number) => CLUSTER[n].rack;

  it("puts copy 2 on another rack and copy 3 beside copy 2", () => {
    const h = writeFile(500, 128, 3);
    expect(h.replicas).toEqual({ 0: [0, 3, 4], 1: [1, 5, 3], 2: [2, 6, 7], 3: [8, 0, 1] });
    for (const nodes of Object.values(h.replicas)) {
      expect(new Set(nodes).size).toBe(3);
      expect(rackOf(nodes[1])).not.toBe(rackOf(nodes[0]));
      expect(rackOf(nodes[2])).toBe(rackOf(nodes[1]));
    }
  });

  it("stores the file rf times over", () => {
    expect(status(writeFile(500, 128, 3)).storedMB).toBe(1500);
    expect(status(writeFile(500, 128, 1)).storedMB).toBe(500);
  });

  it("spreads replication factor 2 over two racks", () => {
    for (const nodes of Object.values(writeFile(1024, 128, 2).replicas)) {
      expect(new Set(nodes.map(rackOf)).size).toBe(2);
    }
  });

  it("puts every first copy on the writer's node when the writer is a DataNode", () => {
    const h = writeFile(500, 128, 3, new Set(), 4);
    expect(Object.values(h.replicas).every((nodes) => nodes[0] === 4)).toBe(true);
  });
});

describe("DataNode failure", () => {
  it("marks blocks under-replicated, then re-replicates them", () => {
    const h = failNode(writeFile(500, 128, 3), 3);
    expect(status(h).underReplicated).toEqual([0, 1]);
    const { hdfs, copies } = reReplicate(h);
    expect(copies).toEqual([
      { block: 0, from: 0, to: 2 },
      { block: 1, from: 1, to: 4 },
    ]);
    const s = status(hdfs);
    expect(s.healthy).toHaveLength(4);
    expect(s.lost).toEqual([]);
    expect(s.storedMB).toBe(1500);
  });

  it("loses a block when every copy is on a failed node", () => {
    const h = [0, 3, 4].reduce(failNode, writeFile(500, 128, 3));
    expect(status(h).lost).toEqual([0]);
    expect(reReplicate(h).copies.some((c) => c.block === 0)).toBe(false);
  });

  it("loses data at once with replication factor 1", () => {
    expect(status(failNode(writeFile(500, 128, 1), 0)).lost).toEqual([0]);
  });

  it("counts a restored node's copies again", () => {
    const h = restoreNode(failNode(writeFile(500, 128, 3), 3), 3);
    expect(status(h).healthy).toHaveLength(4);
  });
});

describe("MapReduce: average temperature per sensor", () => {
  const logs = makeLogs(1200, 4, 1);
  const direct = (sensor: string) => {
    const temps = logs.filter((l) => l.sensor === sensor).map((l) => l.temp);
    return temps.reduce((a, b) => a + b, 0) / temps.length;
  };

  it("gives the same averages as a direct calculation", () => {
    const run = mapReduce(logs, { mappers: 4, reducers: 2, combiner: false });
    expect(run.results.map((r) => r.sensor)).toEqual(["S1", "S2", "S3", "S4"]);
    for (const r of run.results) expect(r.avg).toBeCloseTo(direct(r.sensor), 9);
    expect(run.results.reduce((a, r) => a + r.count, 0)).toBe(1200);
  });

  it("emits one pair per line, and a combiner shrinks the shuffle", () => {
    const plain = mapReduce(logs, { mappers: 4, reducers: 2, combiner: false });
    const combined = mapReduce(logs, { mappers: 4, reducers: 2, combiner: true });
    expect(plain.mapOutputRecords).toBe(1200);
    expect(plain.shuffledRecords).toBe(1200);
    expect(combined.shuffledRecords).toBe(16);
    combined.results.forEach((r, i) => expect(r.avg).toBeCloseTo(plain.results[i].avg, 9));
  });

  it("partitions keys by character-code sum", () => {
    expect(["S1", "S2", "S3", "S4"].map((k) => partition(k, 2))).toEqual([0, 1, 0, 1]);
    expect(mapReduce(logs, { mappers: 4, reducers: 3, combiner: true }).reducerKeys).toEqual([["S1", "S4"], ["S2"], ["S3"]]);
  });

  it("repeats exactly with the same seed", () => {
    expect(makeLogs(50, 4, 7)).toEqual(makeLogs(50, 4, 7));
  });
});
