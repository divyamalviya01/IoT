import { useState } from "react";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { ExploreLayout, type ExploreItem } from "~/components/theory/ExploreLayout";
import { Segmented } from "~/components/ui/Segmented";
import AttackSurfaceScene from "./AttackSurfaceScene";
import {
  LAYER_ABOUT,
  LAYER_SHORT,
  THREAT_BY_ID,
  spotName,
  spotPhrase,
  threatsIn,
  type LayerChoice,
  type ThreatId,
} from "./threats";

const layerOptions: { value: LayerChoice; label: string }[] = [
  { value: "perception", label: "Perception" },
  { value: "network", label: "Network" },
  { value: "application", label: "Application and cloud" },
  { value: "all", label: "All layers" },
];

function Key({ defended }: { defended: boolean }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2" aria-label="Key">
      <li className="flex items-center gap-1.5">
        <TriangleAlert size={15} aria-hidden className="text-bad" />
        Attack point{defended ? " (before defences)" : ""}
      </li>
      <li className="flex items-center gap-1.5">
        <ShieldCheck size={15} aria-hidden className="text-ok" />
        Defended: the fix is in place
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-0 w-5 border-t-2 border-dashed border-ink-3" />
        Wireless or internet link
      </li>
    </ul>
  );
}

export default function IotSecurityVisual() {
  const [layer, setLayer] = useState<LayerChoice>("perception");
  const [active, setActive] = useState<ThreatId>("tamper");
  const [defended, setDefended] = useState(false);

  const shown = threatsIn(layer);
  const items: (ExploreItem & { id: ThreatId })[] = shown.map((t) => ({
    id: t.id,
    group: `${LAYER_SHORT[t.layer]} · ${spotName(t.spot)}`,
    name: t.name,
    text: t.text,
  }));

  const changeLayer = (next: LayerChoice) => {
    setLayer(next);
    const inLayer = threatsIn(next);
    if (!inLayer.some((t) => t.id === active)) setActive(inLayer[0].id);
  };

  const current = THREAT_BY_ID[active];

  return (
    <ExploreLayout
      scene={
        <div className="grid min-w-0 grid-cols-1 gap-3">
          <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <Segmented label="Layer" options={layerOptions} value={layer} onChange={changeLayer} />
            <label className="flex cursor-pointer items-center gap-2 font-semibold text-ink">
              <input
                type="checkbox"
                className="size-4 accent-[var(--brand)]"
                checked={defended}
                onChange={(e) => setDefended(e.target.checked)}
              />
              Defences on
            </label>
          </div>
          <p className="text-ink-2">{LAYER_ABOUT[layer]}</p>
          <AttackSurfaceScene layer={layer} active={active} defended={defended} onSelect={setActive} />
          <Key defended={defended} />
          <p className="flex items-start gap-2 text-sm text-ink-2" aria-live="polite">
            {defended ? (
              <ShieldCheck size={16} aria-hidden className="mt-0.5 shrink-0 text-ok" />
            ) : (
              <TriangleAlert size={16} aria-hidden className="mt-0.5 shrink-0 text-bad" />
            )}
            <span>
              <strong className="text-ink">{defended ? "Defended" : "Threat"}:</strong> {current.name}, on{" "}
              {spotPhrase(current.spot)}.{defended && <> Fix shown: {current.defence}.</>}
            </span>
          </p>
        </div>
      }
      listTitle={`Attack points (${shown.length})`}
      items={items}
      active={active}
      onSelect={(id) => setActive(id as ThreatId)}
      notice={[
        "Every device, link and login is a possible way in. Together they make the attack surface.",
        "Perception attacks need someone near the device. Network and cloud attacks can come from far away.",
        "One weak point is enough. A single default password can expose the whole home.",
        "Turn defences on: every threat has a matching fix, such as encryption, unique passwords or updates.",
        "Select a threat in the list, or click a warning sign or a device in the scene. Drag to turn the scene.",
      ]}
    />
  );
}
