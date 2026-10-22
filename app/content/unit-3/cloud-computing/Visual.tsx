import { Check, Minus } from "lucide-react";
import { useState } from "react";
import { cn } from "~/lib/cn";
import { CUSTOMER_LAYERS, LAYERS, MODELS, ResponsibilityStack, type CloudModel } from "./ResponsibilityStack";

const ABOUT: Record<CloudModel, { title: string; text: string; iot: string }> = {
  onprem: {
    title: "On-premises: you run everything",
    text: "You buy the servers, set up the network, install the operating system and look after it all, day and night.",
    iot: "Your own server room running an MQTT broker and a database for the factory's sensors.",
  },
  iaas: {
    title: "IaaS: rent the hardware",
    text: "The provider gives you virtual machines, disks and networks. You install and patch the operating system and everything on it.",
    iot: "A virtual machine on Amazon EC2 where you install Mosquitto, Node-RED and a database yourself.",
  },
  paas: {
    title: "PaaS: rent a ready platform",
    text: "The provider runs the servers, operating system and runtime. You bring only your application and your data.",
    iot: "AWS IoT Core or Azure IoT Hub: you register devices, write rules and build your app; the platform does the rest.",
  },
  saas: {
    title: "SaaS: use finished software",
    text: "Everything is run for you. You sign in, change settings and use your data.",
    iot: "A ready IoT dashboard service where you add a device by scanning its QR code and watch its readings.",
  },
};

export default function CloudModelsVisual() {
  const [model, setModel] = useState<CloudModel>("iaas");
  const about = ABOUT[model];

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <ResponsibilityStack value={model} onChange={setModel} caption="Who manages each layer?" />
        <div className="grid min-w-0 content-start gap-3">
          <h3 className="text-lg font-bold text-ink">{about.title}</h3>
          <p className="text-ink-2">{about.text}</p>
          <div className="rounded-lg border border-line bg-surface p-3">
            <p className="text-sm font-semibold text-ink-3">IoT example</p>
            <p className="text-ink">{about.iot}</p>
          </div>
          <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-2">
            <p className="font-semibold text-ink">What to notice</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Moving from on-premises to SaaS, the dashed line rises: the provider takes over more layers.</li>
              <li>Your data is yours in every model, even SaaS. You still decide who may see it.</li>
              <li>Less to manage also means less control: you cannot change what the provider runs.</li>
            </ul>
          </div>
        </div>
      </div>

      <figure className="grid min-w-0 gap-2">
        <figcaption className="font-bold">All four models side by side</figcaption>
        <div className="relative overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <thead>
              <tr className="bg-surface-2 text-left">
                <th scope="col" className="px-3 py-2 font-semibold text-ink">
                  Layer
                </th>
                {MODELS.map((m) => (
                  <th key={m.value} scope="col" className={cn("px-3 py-2 text-center font-semibold text-ink", m.value === model && "bg-brand-soft")}>
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LAYERS.map((layer, i) => (
                <tr key={layer} className="border-t border-line">
                  <th scope="row" className="px-3 py-1.5 text-left font-medium text-ink">
                    {layer}
                  </th>
                  {MODELS.map((m) => {
                    const yours = i < CUSTOMER_LAYERS[m.value];
                    return (
                      <td key={m.value} className={cn("px-3 py-1.5 text-center", yours ? "bg-u1-soft text-ink" : "bg-u3-soft text-ink-2", m.value === model && "font-semibold")}>
                        <span className="inline-flex items-center gap-1">
                          {yours ? <Check size={13} aria-hidden className="text-u1" /> : <Minus size={13} aria-hidden className="text-u3" />}
                          {yours ? "You" : "Provider"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </figure>
    </div>
  );
}
