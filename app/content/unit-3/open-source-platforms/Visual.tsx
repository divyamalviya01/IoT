import { BarChart3, Boxes, Check, Copy, Database, Minus, Radio, Router, Workflow } from "lucide-react";
import { useState } from "react";
import { cn } from "~/lib/cn";

type Part = "connect" | "registry" | "rules" | "storage" | "dashboards" | "edge" | "twin";

const PARTS: { id: Part; label: string; text: string; icon: typeof Radio }[] = [
  { id: "connect", label: "Connect devices", text: "Accept MQTT, HTTP or CoAP messages from devices.", icon: Radio },
  { id: "registry", label: "Device registry", text: "Know every device, its identity and credentials.", icon: Boxes },
  { id: "rules", label: "Rules and flows", text: "Act on messages: convert, filter, alert, control.", icon: Workflow },
  { id: "storage", label: "Storage", text: "Keep readings for history, reports and analysis.", icon: Database },
  { id: "dashboards", label: "Dashboards", text: "Show live data and let people control devices.", icon: BarChart3 },
  { id: "edge", label: "Edge gateway", text: "Run locally near the devices, even without internet.", icon: Router },
  { id: "twin", label: "Digital twin", text: "Keep each device's live state, desired and reported.", icon: Copy },
];

interface Platform {
  id: string;
  name: string;
  licence: string;
  covers: Part[];
  note: string;
}

const PLATFORMS: Platform[] = [
  {
    id: "nodered",
    name: "Node-RED",
    licence: "Apache 2.0",
    covers: ["connect", "rules", "dashboards", "edge"],
    note: "A flow tool rather than a full platform. Dashboards come from an add-on, and it runs happily on a gateway or Raspberry Pi.",
  },
  {
    id: "thingsboard",
    name: "ThingsBoard",
    licence: "Apache 2.0 to v4.3; BUSL 1.1 from v4.4",
    covers: ["connect", "registry", "rules", "storage", "dashboards", "edge"],
    note: "An all-in-one platform with a separate edge product. Check the licence: from version 4.4 it is source-available, not open source.",
  },
  {
    id: "kura",
    name: "Eclipse Kura",
    licence: "EPL-2.0",
    covers: ["connect", "edge"],
    note: "Gateway software: it talks to local devices and forwards their data to a cloud platform.",
  },
  {
    id: "hono",
    name: "Eclipse Hono",
    licence: "EPL-2.0",
    covers: ["connect", "registry"],
    note: "The connectivity layer: lets very many devices connect over MQTT, HTTP and AMQP. Usually paired with Ditto.",
  },
  {
    id: "ditto",
    name: "Eclipse Ditto",
    licence: "EPL-2.0",
    covers: ["twin"],
    note: "Digital twins only: the live state of every device, which apps can read and change.",
  },
  {
    id: "homeassistant",
    name: "Home Assistant",
    licence: "Apache 2.0",
    covers: ["connect", "registry", "rules", "storage", "dashboards", "edge"],
    note: "A smart-home hub that runs in the house itself, so lights and locks keep working when the internet is down.",
  },
  {
    id: "openremote",
    name: "OpenRemote",
    licence: "AGPL-3.0",
    covers: ["connect", "registry", "rules", "storage", "dashboards", "edge"],
    note: "Aimed at smart cities and energy, with maps. AGPL means changes offered as a service must be shared.",
  },
  {
    id: "stack",
    name: "DIY stack",
    licence: "Mixed open-source tools",
    covers: ["connect", "rules", "storage", "dashboards", "edge"],
    note: "Mosquitto (connect) + Node-RED (rules) + a time-series database (storage) + Grafana (dashboards), all on one Raspberry Pi. No device registry or twins unless you add them.",
  },
];

export default function PlatformMapVisual() {
  const [id, setId] = useState("thingsboard");
  const p = PLATFORMS.find((x) => x.id === id)!;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5">
      <p className="max-w-prose text-ink-2">An IoT platform does several jobs. Pick a platform to see which jobs it covers. Some do everything; others do one job well and are combined.</p>

      <div className="flex min-w-0 flex-wrap gap-1.5" role="radiogroup" aria-label="Platform">
        {PLATFORMS.map((x) => (
          <button
            key={x.id}
            type="button"
            role="radio"
            aria-checked={x.id === id}
            onClick={() => setId(x.id)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              x.id === id ? "border-u3 bg-u3-soft text-ink" : "border-line bg-surface text-ink-2 hover:bg-surface-2",
            )}
          >
            {x.name}
          </button>
        ))}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
        {PARTS.map((part) => {
          const on = p.covers.includes(part.id);
          const Icon = part.icon;
          return (
            <div
              key={part.id}
              className={cn(
                "grid min-w-0 gap-1 rounded-lg border p-3 transition-colors duration-300 motion-reduce:transition-none",
                on ? "border-u3 bg-u3-soft" : "border-dashed border-line bg-surface opacity-70",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold text-ink">
                  <Icon size={16} aria-hidden className={on ? "text-u3" : "text-ink-3"} /> {part.label}
                </span>
                <span className={cn("flex shrink-0 items-center gap-1 text-xs", on ? "text-ink" : "text-ink-3")}>
                  {on ? <Check size={13} aria-hidden /> : <Minus size={13} aria-hidden />}
                  {on ? "Covered" : "Not covered"}
                </span>
              </div>
              <p className="text-sm text-ink-2">{part.text}</p>
            </div>
          );
        })}
      </div>

      <div className="grid min-w-0 gap-1 rounded-lg border border-line bg-surface p-3">
        <p className="font-bold text-ink">
          {p.name} <span className="font-normal text-ink-3">· {p.licence}</span>
        </p>
        <p className="text-ink-2">{p.note}</p>
        <p className="text-sm text-ink-3">
          Covers {p.covers.length} of {PARTS.length} jobs.
        </p>
      </div>

      <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
        <p className="font-semibold text-ink">What to notice</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Kura, Hono and Ditto each cover one or two jobs. Together they make a complete platform.</li>
          <li>The DIY stack covers most jobs for free, but has no device registry or twins.</li>
          <li>Coverage is not everything: check the licence, the community and who will run it.</li>
        </ul>
      </div>
    </div>
  );
}
