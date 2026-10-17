import { useMemo, useState } from "react";
import { ExploreLayout, type ExploreItem } from "~/components/theory/ExploreLayout";
import { Segmented } from "~/components/ui/Segmented";
import { STACK_LABEL, type StackId } from "~/content/unit-1/protocols-overview/stacks";
import StackScene, { describeStack, ipUdpBytes, type LayerId, type StackSpec } from "./StackScene";

/** What each layer does, in plain words. The stack-specific part is added below. */
const JOB: Record<LayerId, string> = {
  application:
    "Builds the message the app cares about: the reading and where it should go (a topic, a path such as /temp, or a web address).",
  transport: "Carries data between the right programs on the two devices, using port numbers.",
  network: "Gives every device an address and moves the packet across networks, one hop at a time.",
  adaptation:
    "Fits IPv6 packets into small IEEE 802.15.4 radio frames, which carry at most 127 bytes.",
  link: "Sends the frame across one hop of radio or cable, using hardware (MAC) addresses and an error check. Its physical part turns the bits into radio waves or electrical signals.",
};

function inThisStack(spec: StackSpec, id: LayerId): { group: string; text: string } {
  const layer = spec.layers.find((l) => l.id === id);
  if (!layer) return { group: "", text: "" };
  const { protocol, bytes } = layer;
  const squeezed = spec.compress && (id === "transport" || id === "network");

  switch (id) {
    case "application":
      if (spec.stack === "http") {
        return { group: `${protocol} · ${bytes} bytes`, text: `Here it is HTTP, which adds ${bytes} bytes of readable text headers.` };
      }
      if (spec.stack === "mqtt") {
        return { group: `${protocol} · ${bytes} bytes`, text: `Here it is MQTT, whose PUBLISH header (with the topic home/temp) is ${bytes} bytes.` };
      }
      return { group: `${protocol} · ${bytes} bytes`, text: `Here it is CoAP, whose compact binary header (with the path /temp) is ${bytes} bytes.` };
    case "transport":
      if (protocol === "TCP") {
        return { group: `TCP · ${bytes} bytes`, text: `Here it is TCP, with a ${bytes}-byte header. TCP numbers the data and resends anything that is lost.` };
      }
      return squeezed
        ? { group: "UDP · compressed", text: `Here it is UDP. Its ${bytes}-byte header is squeezed by 6LoWPAN into the ${spec.compressedBytes}-byte compressed header.` }
        : { group: `UDP · ${bytes} bytes`, text: `Here it is UDP, with an ${bytes}-byte header. UDP just sends; CoAP itself resends if needed.` };
    case "network":
      if (protocol === "IPv4") {
        return { group: `IPv4 · ${bytes} bytes`, text: `Here it is IPv4, with a ${bytes}-byte header holding two 4-byte addresses.` };
      }
      return {
        group: squeezed ? "IPv6 · compressed" : `IPv6 · ${bytes} bytes`,
        text: `${
          squeezed
            ? `Here it is IPv6. Its ${bytes}-byte header is squeezed by 6LoWPAN into the ${spec.compressedBytes}-byte compressed header.`
            : `Here it is IPv6, with a ${bytes}-byte header holding two 16-byte addresses.`
        } In low-power mesh networks, IPv6 routes are found by RPL, a routing protocol.`,
      };
    case "adaptation":
      return spec.compress
        ? { group: `6LoWPAN · ${ipUdpBytes(spec)} → ${spec.compressedBytes} bytes`, text: `Here 6LoWPAN compression is on: the ${ipUdpBytes(spec)} bytes of IPv6 and UDP headers become ${spec.compressedBytes} bytes, by leaving out values the receiver can work out.` }
        : { group: "6LoWPAN · no compression", text: `Here 6LoWPAN compression is off, so the ${ipUdpBytes(spec)} bytes of IPv6 and UDP headers pass through at full size.` };
    case "link":
      return {
        group: `${protocol} · ${bytes} bytes`,
        text: `Here it is ${protocol === "Wi-Fi" ? "Wi-Fi, which adds about" : `${protocol}, which adds`} ${bytes} bytes.`,
      };
  }
}

const stackOptions = (Object.keys(STACK_LABEL) as StackId[]).map((s) => ({ value: s, label: STACK_LABEL[s] }));

export default function ProtocolArchitectureVisual() {
  const [stack, setStack] = useState<StackId>("coap");
  const [compress, setCompress] = useState(false);
  const [active, setActive] = useState<LayerId>("application");

  const spec = useMemo(() => describeStack(stack, compress), [stack, compress]);
  const coapPlain = useMemo(() => describeStack("coap", false), []);
  const coapSqueezed = useMemo(() => describeStack("coap", true), []);

  const items: (ExploreItem & { id: LayerId })[] = useMemo(
    () =>
      spec.layers.map((layer) => {
        const here = inThisStack(spec, layer.id);
        return { id: layer.id, group: here.group, name: layer.name, text: `${JOB[layer.id]} ${here.text}` };
      }),
    [spec],
  );

  // The adaptation layer only exists in the CoAP stack.
  const current: LayerId = items.some((i) => i.id === active) ? active : "application";

  return (
    <ExploreLayout
      scene={<StackScene stack={stack} compress={compress} active={current} onSelect={setActive} />}
      listTitle="Layers of the stack"
      items={items}
      active={current}
      onSelect={(id) => setActive(id as LayerId)}
      controls={
        <div className="grid min-w-0 gap-3">
          <Segmented<StackId>
            label="Protocol stack"
            options={stackOptions}
            value={stack}
            onChange={setStack}
            size="sm"
            className="min-w-0 max-w-full"
          />
          {stack === "coap" && (
            <label className="flex items-center gap-2 text-[0.95rem]">
              <input
                type="checkbox"
                checked={compress}
                onChange={(e) => setCompress(e.target.checked)}
                className="size-4 accent-[var(--brand)]"
              />
              Compress headers with 6LoWPAN
            </label>
          )}
        </div>
      }
      notice={[
        "Going down the sender's stack, each layer wraps the packet in its own header; going up the receiver's stack, each layer removes the header its partner added.",
        "Each layer only talks to the same layer on the other side (the dashed lines): the receiver's transport layer reads only the transport header and passes the rest up.",
        `The reading is a tiny part of what is sent: here ${spec.payloadBytes} bytes of data travel inside a ${spec.totalBytes}-byte packet.`,
        `6LoWPAN shrinks the headers: with compression on, CoAP's ${ipUdpBytes(coapPlain)} bytes of IPv6 and UDP headers become ${coapSqueezed.compressedBytes}, and the whole packet drops from ${coapPlain.totalBytes} to ${coapSqueezed.totalBytes} bytes.`,
      ]}
    />
  );
}
