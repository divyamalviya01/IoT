import { useId, useMemo, useState } from "react";
import { Readouts, type Readout } from "~/components/lab/Readouts";
import { ExploreLayout, type ExploreItem } from "~/components/theory/ExploreLayout";
import { Segmented } from "~/components/ui/Segmented";
import { DEFAULT_NODES, DEFAULT_RANGE, compare } from "~/labs/l16-zigbee-mesh/engine";
import { usePalette } from "~/lib/palette";
import { mixColor } from "~/components/three";
import ZigbeeScene, { DEVICE_KIND, KIND_NAME, meshFor, nodeName, type ZigbeePart } from "./ZigbeeScene";

const items: (ExploreItem & { id: ZigbeePart })[] = [
  {
    id: "coordinator",
    group: "Mains-powered, one per network",
    name: "Coordinator (hub)",
    text: "Starts the network, chooses its channel and lets new devices join. Here it is also the hub (gateway) that passes the readings on to the internet. It routes messages like a router.",
  },
  {
    id: "router",
    group: "Mains-powered",
    name: "Router (smart plug or bulb)",
    text: "Always powered from the mains, so it can stay awake and pass other devices' messages on. Routers link to every router in range, and those links make the mesh.",
  },
  {
    id: "end",
    group: "Battery-powered",
    name: "End device (sensor)",
    text: "Door, window, motion and temperature sensors run for months on a small battery because they sleep most of the time. Each one talks only to its parent and never passes on anyone else's message.",
  },
  {
    id: "link",
    group: "IEEE 802.15.4 radio, 2.4 GHz, 250 kbps",
    name: "Mesh link",
    text: `Two routers (or a router and the hub) link when they are within radio range, about ${DEFAULT_RANGE} m indoors in this house. Solid green links carry traffic now; dashed links are spare paths the mesh can switch to.`,
  },
];

type Choice = "none" | "1" | "2" | "3" | "4";

const ROUTER_IDS = DEFAULT_NODES.filter((n) => n.role === "router").map((n) => n.id);

const options: { value: Choice; label: string }[] = [
  { value: "none", label: "None" },
  ...ROUTER_IDS.map((id) => ({ value: String(id) as Choice, label: nodeName(id) })),
];

const fullName = (id: number) => `${nodeName(id)} (${KIND_NAME[DEVICE_KIND[id]]})`;

function list(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Sensors that can hear only one router: unplug it and they are orphaned. */
const LONERS = ROUTER_IDS.flatMap((r) => meshFor(r).orphans.map((e) => ({ end: e, router: r })));

const BASE = meshFor(null);

/** Colour key for the links and markers in the scene. */
function Key() {
  const p = usePalette();
  const id = useId();
  const keys = [
    { label: "Link carrying traffic", swatch: <span className="block h-0.5 w-5" style={{ backgroundColor: p.brand }} /> },
    {
      label: "Spare link",
      swatch: <span className="block w-5 border-t-2 border-dashed" style={{ borderColor: p.ink3 }} />,
    },
    {
      label: "Sensor to its parent",
      swatch: <span className="block h-0.5 w-5" style={{ backgroundColor: mixColor(p.ink2, p.brand, 0.35) }} />,
    },
    { label: "Re-joined a new parent", swatch: <span className="block h-1 w-5" style={{ backgroundColor: p.warn }} /> },
    {
      label: "Mains power cord",
      swatch: <span className="block h-0.5 w-5" style={{ backgroundColor: p.lineStrong }} />,
    },
    {
      label: "Orphaned or unplugged",
      swatch: <span className="block size-3 rounded-full border-2" style={{ borderColor: p.bad }} />,
    },
  ];
  return (
    <div className="text-sm">
      <p id={id} className="sr-only">
        Colour key
      </p>
      <ul aria-labelledby={id} className="flex flex-wrap gap-x-5 gap-y-1.5 text-ink-2">
        {keys.map((k) => (
          <li key={k.label} className="flex items-center gap-2">
            <span aria-hidden="true" className="flex w-5 shrink-0 items-center justify-center">
              {k.swatch}
            </span>
            {k.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ZigbeeVisual() {
  const [active, setActive] = useState<ZigbeePart>("router");
  const [choice, setChoice] = useState<Choice>("none");
  const failed = choice === "none" ? null : Number(choice);

  const { mesh, healing } = useMemo(() => {
    const m = meshFor(failed);
    return { mesh: m, healing: compare(BASE, m) };
  }, [failed]);

  const orphans = mesh.orphans.length;
  const readouts: Readout[] = [
    {
      label: "Average hops",
      value: mesh.avgHops === null ? "–" : mesh.avgHops.toFixed(1),
      unit: failed !== null && BASE.avgHops !== null ? `was ${BASE.avgHops.toFixed(1)}` : undefined,
      hint: "Hops from each router and sensor to the hub, averaged",
    },
    {
      label: "Longest trip",
      value: mesh.maxHops ?? "–",
      unit: mesh.maxHops === 1 ? "hop" : "hops",
    },
    {
      label: "Re-joined",
      value: healing.rejoined.length,
      unit: healing.rejoined.length === 1 ? "sensor" : "sensors",
      tone: healing.rejoined.length > 0 ? "warn" : "default",
      hint: "Sensors that lost their parent and joined another router",
    },
    {
      label: "Orphaned",
      value: orphans,
      unit: orphans === 1 ? "sensor" : "sensors",
      tone: orphans > 0 ? "bad" : "ok",
      hint: "Sensors with no working router in range",
    },
  ];

  const changes: string[] = [];
  if (failed === null) {
    changes.push(
      "All routers are plugged in. Each sensor sends to its parent (the nearest router, or the hub), and the routers pass the message on by the shortest path to the hub.",
    );
  } else {
    changes.push(`${fullName(failed)} is unplugged, so it stops passing messages on.`);
    if (healing.rejoined.length > 0) {
      changes.push(
        `${list(healing.rejoined.map((e) => `${nodeName(e)} re-joined ${nodeName(mesh.parent[e])}`))}.`,
      );
    }
    if (healing.hopChanges.length > 0) {
      changes.push(
        `Longer trips: ${list(healing.hopChanges.map(([id, before, after]) => `${nodeName(id)} ${before} → ${after} hops`))}.`,
      );
    }
    if (healing.orphaned.length > 0) {
      const names = healing.orphaned.map(nodeName);
      changes.push(
        `${list(names)} ${names.length === 1 ? "is" : "are"} orphaned: ${nodeName(failed)} was the only router in range.`,
      );
    } else {
      changes.push("No sensor is orphaned.");
    }
    if (mesh.cutOffRouters.length > 0) {
      changes.push(`${list(mesh.cutOffRouters.map(nodeName))} can no longer reach the hub.`);
    }
    if (healing.rejoined.length === 0 && healing.hopChanges.length === 0 && healing.orphaned.length === 0) {
      changes.push("Nothing else had to change.");
    }
  }

  const lonerNote =
    LONERS.length > 0
      ? `${list(LONERS.map((l) => `${nodeName(l.end)} hears only ${nodeName(l.router)}`))}. Unplug that router and the sensor is orphaned, because there is no other parent in range; adding a router nearby would fix it.`
      : "Every sensor can hear at least two routers, so unplugging any one router never leaves a sensor orphaned.";

  return (
    <ExploreLayout
      scene={
        <div className="grid min-w-0 grid-cols-1 gap-3">
          <Segmented
            label="Unplug a router"
            options={options}
            value={choice}
            onChange={setChoice}
            size="sm"
          />
          <ZigbeeScene active={active} onSelect={setActive} failed={failed} />
          <Key />
          <Readouts items={readouts} />
          <p className="text-sm text-ink-2" aria-live="polite">
            {changes.join(" ")}
          </p>
        </div>
      }
      listTitle="Roles in a Zigbee network"
      items={items}
      active={active}
      onSelect={(id) => setActive(id as ZigbeePart)}
      notice={[
        "End devices never pass messages on: every reading goes first to the sensor's parent, and only routers and the hub carry it further.",
        "Unplug a router and the mesh heals itself: routes re-form over the spare links and sensors re-join the nearest working router, though some trips get longer.",
        lonerNote,
        "Select a role in the list or click a device in the house to highlight every device with that role. Drag to turn the view.",
      ]}
    />
  );
}
