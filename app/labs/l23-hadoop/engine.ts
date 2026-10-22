/**
 * L23 Hadoop: a small HDFS cluster (3 racks × 3 DataNodes) with the default
 * rack-aware replica placement, DataNode failure and re-replication, plus a
 * MapReduce job that averages IoT temperature logs per sensor.
 *
 * Placement is deterministic (least-loaded node, ties to the lower id), so the
 * same settings always give the same picture.
 */
import { createRng } from "~/lib/sim/random";

/* ------------------------------------------------------------------ */
/* Cluster                                                             */
/* ------------------------------------------------------------------ */

export const RACKS = 3;
export const NODES_PER_RACK = 3;

export interface DataNode {
  id: number;
  rack: number;
  name: string;
}

export const CLUSTER: DataNode[] = Array.from({ length: RACKS * NODES_PER_RACK }, (_, id) => ({
  id,
  rack: Math.floor(id / NODES_PER_RACK),
  name: `D${id + 1}`,
}));

export const rackName = (rack: number) => `Rack ${rack + 1}`;
export const BLOCK_SIZES_MB = [64, 128, 256] as const;
export const DEFAULT_BLOCK_MB = 128;
export const DEFAULT_RF = 3;

/* ------------------------------------------------------------------ */
/* Splitting a file into blocks                                        */
/* ------------------------------------------------------------------ */

export interface Block {
  id: number;
  sizeMB: number;
}

/** A file is cut into fixed-size blocks; only the last block may be smaller. */
export function splitBlocks(sizeMB: number, blockMB: number): Block[] {
  const blocks: Block[] = [];
  for (let start = 0, id = 0; start < sizeMB; start += blockMB, id++) {
    blocks.push({ id, sizeMB: Math.min(blockMB, sizeMB - start) });
  }
  return blocks;
}

/* ------------------------------------------------------------------ */
/* Replica placement                                                   */
/* ------------------------------------------------------------------ */

export interface Hdfs {
  blocks: Block[];
  /** Block id → DataNode ids holding a copy, in placement order */
  replicas: Record<number, number[]>;
  failed: Set<number>;
  rf: number;
}

function loads(replicas: Record<number, number[]>, failed: Set<number>): number[] {
  const load = CLUSTER.map(() => 0);
  for (const nodes of Object.values(replicas)) for (const n of nodes) if (!failed.has(n)) load[n]++;
  return load;
}

/** Least-loaded live node that passes the filter (ties go to the lower id). */
function pick(load: number[], failed: Set<number>, ok: (n: DataNode) => boolean): number | undefined {
  let best: DataNode | undefined;
  for (const n of CLUSTER) {
    if (failed.has(n.id) || !ok(n)) continue;
    if (!best || load[n.id] < load[best.id]) best = n;
  }
  return best?.id;
}

/**
 * The HDFS default policy for one block:
 * 1st copy on the writer's node (or the least-loaded node if the writer is outside the cluster),
 * 2nd on a node in a different rack, 3rd on another node in that same remote rack,
 * any further copies on any other node.
 */
function placeBlock(load: number[], failed: Set<number>, rf: number, writer?: number): number[] {
  const chosen: number[] = [];
  const add = (id: number | undefined) => {
    if (id === undefined) return false;
    chosen.push(id);
    load[id]++;
    return true;
  };
  const unused = (n: DataNode) => !chosen.includes(n.id);

  const first = writer !== undefined && !failed.has(writer) ? writer : pick(load, failed, () => true);
  if (!add(first) || rf < 2) return chosen;
  const rack1 = CLUSTER[chosen[0]].rack;
  const second = pick(load, failed, (n) => n.rack !== rack1) ?? pick(load, failed, unused);
  if (!add(second) || rf < 3) return chosen;
  const rack2 = CLUSTER[chosen[1]].rack;
  const third = pick(load, failed, (n) => n.rack === rack2 && unused(n)) ?? pick(load, failed, unused);
  if (!add(third)) return chosen;
  while (chosen.length < rf && add(pick(load, failed, unused)));
  return chosen;
}

export function writeFile(sizeMB: number, blockMB: number, rf: number, failed: Set<number> = new Set(), writer?: number): Hdfs {
  const blocks = splitBlocks(sizeMB, blockMB);
  const load = CLUSTER.map(() => 0);
  const replicas: Record<number, number[]> = {};
  for (const b of blocks) replicas[b.id] = placeBlock(load, failed, rf, writer);
  return { blocks, replicas, failed: new Set(failed), rf };
}

/* ------------------------------------------------------------------ */
/* Failure and recovery                                                */
/* ------------------------------------------------------------------ */

export const liveCopies = (h: Hdfs, block: number) => h.replicas[block].filter((n) => !h.failed.has(n));

export interface HdfsStatus {
  healthy: number[];
  underReplicated: number[];
  lost: number[];
  /** MB actually stored on live DataNodes */
  storedMB: number;
  /** Copies held by each DataNode (failed nodes count 0) */
  perNode: number[];
}

export function status(h: Hdfs): HdfsStatus {
  const s: HdfsStatus = { healthy: [], underReplicated: [], lost: [], storedMB: 0, perNode: loads(h.replicas, h.failed) };
  for (const b of h.blocks) {
    const live = liveCopies(h, b.id).length;
    s.storedMB += live * b.sizeMB;
    if (live === 0) s.lost.push(b.id);
    else if (live < h.rf) s.underReplicated.push(b.id);
    else s.healthy.push(b.id);
  }
  return s;
}

export const failNode = (h: Hdfs, id: number): Hdfs => ({ ...h, failed: new Set([...h.failed, id]) });

/** A restored DataNode rejoins. Copies it still holds count again. */
export const restoreNode = (h: Hdfs, id: number): Hdfs => {
  const failed = new Set(h.failed);
  failed.delete(id);
  return { ...h, failed };
};

export interface Copy {
  block: number;
  from: number;
  to: number;
}

/**
 * What the NameNode does once it decides a DataNode is dead: forget the dead
 * copies and make new ones from a surviving copy, keeping copies on two racks
 * where it can. A block with no surviving copy cannot be repaired.
 */
export function reReplicate(h: Hdfs): { hdfs: Hdfs; copies: Copy[] } {
  const replicas: Record<number, number[]> = {};
  for (const b of h.blocks) replicas[b.id] = liveCopies(h, b.id);
  const load = loads(replicas, h.failed);
  const copies: Copy[] = [];

  for (const b of h.blocks) {
    const nodes = replicas[b.id];
    if (nodes.length === 0) continue;
    while (nodes.length < h.rf) {
      const racks = new Set(nodes.map((n) => CLUSTER[n].rack));
      const free = (n: DataNode) => !nodes.includes(n.id);
      const to = (racks.size < 2 ? pick(load, h.failed, (n) => free(n) && !racks.has(n.rack)) : undefined) ?? pick(load, h.failed, free);
      if (to === undefined) break;
      copies.push({ block: b.id, from: nodes[0], to });
      nodes.push(to);
      load[to]++;
    }
  }
  return { hdfs: { ...h, replicas }, copies };
}

/* ------------------------------------------------------------------ */
/* MapReduce: average temperature per sensor                           */
/* ------------------------------------------------------------------ */

export interface LogLine {
  sensor: string;
  /** Seconds since the start of the log */
  t: number;
  temp: number;
}

const SENSOR_BASE = [24, 28, 31, 35, 22, 26];

export function makeLogs(lines: number, sensors = 4, seed = 1): LogLine[] {
  const rng = createRng(seed);
  return Array.from({ length: lines }, (_, i) => {
    const s = rng.int(0, sensors - 1);
    return { sensor: `S${s + 1}`, t: i * 5, temp: Math.round(rng.normal(SENSOR_BASE[s % SENSOR_BASE.length], 1.5) * 10) / 10 };
  });
}

export const formatLine = (l: LogLine) => `${l.sensor},${l.t},${l.temp.toFixed(1)}`;

/** Which reducer gets a key: the sum of its character codes, modulo the reducer count. */
export function partition(key: string, reducers: number): number {
  let sum = 0;
  for (const ch of key) sum += ch.charCodeAt(0);
  return sum % reducers;
}

export interface SensorResult {
  sensor: string;
  count: number;
  sum: number;
  avg: number;
}

export interface MapReduceRun {
  splits: LogLine[][];
  /** Key–value pairs each mapper emits (one per line) */
  mapOutput: number[];
  /** Records each mapper sends over the network in the shuffle */
  shuffled: number[];
  mapOutputRecords: number;
  shuffledRecords: number;
  /** Keys each reducer is responsible for */
  reducerKeys: string[][];
  /** Records each reducer receives */
  reducerRecords: number[];
  results: SensorResult[];
}

export interface MapReduceOptions {
  mappers: number;
  reducers: number;
  combiner: boolean;
}

export function mapReduce(lines: LogLine[], { mappers, reducers, combiner }: MapReduceOptions): MapReduceRun {
  const size = Math.ceil(lines.length / mappers);
  const splits = Array.from({ length: mappers }, (_, m) => lines.slice(m * size, (m + 1) * size));

  // Map: each line becomes (sensor, temp). A combiner pre-sums per key inside each mapper.
  const emitted = splits.map((split) => {
    if (!combiner) return split.map((l) => ({ key: l.sensor, sum: l.temp, count: 1 }));
    const acc = new Map<string, { sum: number; count: number }>();
    for (const l of split) {
      const a = acc.get(l.sensor) ?? { sum: 0, count: 0 };
      a.sum += l.temp;
      a.count++;
      acc.set(l.sensor, a);
    }
    return [...acc].map(([key, a]) => ({ key, ...a }));
  });

  // Shuffle and sort: every record goes to the reducer that owns its key.
  const reducerKeys: string[][] = Array.from({ length: reducers }, () => []);
  const reducerRecords = Array.from({ length: reducers }, () => 0);
  const totals = new Map<string, { sum: number; count: number }>();
  for (const records of emitted) {
    for (const r of records) {
      const p = partition(r.key, reducers);
      if (!reducerKeys[p].includes(r.key)) reducerKeys[p].push(r.key);
      reducerRecords[p]++;
      const t = totals.get(r.key) ?? { sum: 0, count: 0 };
      t.sum += r.sum;
      t.count += r.count;
      totals.set(r.key, t);
    }
  }
  reducerKeys.forEach((keys) => keys.sort());

  // Reduce: average = total ÷ count for each key.
  const results = [...totals]
    .map(([sensor, t]) => ({ sensor, count: t.count, sum: t.sum, avg: t.sum / t.count }))
    .sort((a, b) => a.sensor.localeCompare(b.sensor, "en", { numeric: true }));

  const mapOutput = splits.map((s) => s.length);
  const shuffled = emitted.map((e) => e.length);
  return {
    splits,
    mapOutput,
    shuffled,
    mapOutputRecords: mapOutput.reduce((a, b) => a + b, 0),
    shuffledRecords: shuffled.reduce((a, b) => a + b, 0),
    reducerKeys,
    reducerRecords,
    results,
  };
}
