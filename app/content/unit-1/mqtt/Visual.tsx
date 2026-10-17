import { useId, useState } from "react";
import { ExploreLayout, type ExploreItem } from "~/components/theory/ExploreLayout";
import { Segmented } from "~/components/ui/Segmented";
import { usePalette } from "~/lib/palette";
import BrokerScene, {
  SUBSCRIPTIONS,
  TOPICS,
  type BrokerPart,
  type MessageSource,
} from "./BrokerScene";

const parts: (ExploreItem & { id: BrokerPart })[] = [
  {
    id: "broker",
    group: "Server",
    name: "Broker",
    text: "Receives every message and forwards a copy to each client whose subscription matches the topic. Publishers and subscribers never talk to each other directly.",
  },
  {
    id: "temp",
    group: "Publisher",
    name: "Temperature sensor",
    text: "Publishes the room temperature to the topic home/livingroom/temperature. It does not know who, if anyone, is listening.",
  },
  {
    id: "door",
    group: "Publisher",
    name: "Door sensor",
    text: "Publishes “open” or “closed” to the topic home/door/status whenever the door changes.",
  },
  {
    id: "phone",
    group: "Subscriber",
    name: "Phone app",
    text: "Subscribed to home/#. The # wildcard matches every topic under home, so it receives both kinds of message.",
  },
  {
    id: "dashboard",
    group: "Subscriber",
    name: "Dashboard",
    text: "Subscribed to home/+/temperature. The + wildcard matches exactly one level, so it receives temperatures from any room but not door events.",
  },
  {
    id: "alarm",
    group: "Subscriber",
    name: "Door alarm",
    text: "Subscribed to home/door/status only, so it receives door events and nothing else.",
  },
];

const sourceOptions: { value: MessageSource; label: string }[] = [
  { value: "both", label: "Both" },
  { value: "temp", label: "Temperature sensor" },
  { value: "door", label: "Door sensor" },
];

const subscriptions = [
  { name: "Phone app", filter: SUBSCRIPTIONS.phone },
  { name: "Dashboard", filter: SUBSCRIPTIONS.dashboard },
  { name: "Door alarm", filter: SUBSCRIPTIONS.alarm },
];

/** Colour key for the two kinds of message, and the subscriptions the broker matches against. */
function TopicsKey() {
  const p = usePalette();
  const keyId = useId();
  const subsId = useId();
  const keys = [
    { label: "Temperature reading", topic: TOPICS.temp, color: p.u1 },
    { label: "Door event", topic: TOPICS.door, color: p.u3 },
  ];

  return (
    <div className="mt-3 flex flex-wrap gap-x-10 gap-y-3 text-sm">
      <div>
        <p id={keyId} className="font-semibold text-ink">
          Messages
        </p>
        <ul aria-labelledby={keyId} className="mt-1 grid gap-1 text-ink-2">
          {keys.map((key) => (
            <li key={key.label} className="flex items-baseline gap-2">
              <span
                aria-hidden="true"
                className="inline-block size-3 shrink-0 translate-y-0.5 rounded-full"
                style={{ backgroundColor: key.color }}
              />
              <span>
                {key.label}: <span className="font-mono whitespace-nowrap text-ink">{key.topic}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p id={subsId} className="font-semibold text-ink">
          Subscriptions
        </p>
        <ul aria-labelledby={subsId} className="mt-1 grid gap-1 text-ink-2">
          {subscriptions.map((sub) => (
            <li key={sub.name}>
              {sub.name}: <span className="font-mono text-ink">{sub.filter}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function MqttVisual() {
  const [active, setActive] = useState<BrokerPart>("broker");
  const [source, setSource] = useState<MessageSource>("both");

  return (
    <ExploreLayout
      scene={
        <>
          <BrokerScene active={active} onSelect={setActive} source={source} />
          <TopicsKey />
        </>
      }
      listTitle="Parts of the system"
      items={parts}
      active={active}
      onSelect={(id) => setActive(id as BrokerPart)}
      controls={
        <Segmented
          label="Show messages from"
          options={sourceOptions}
          value={source}
          onChange={setSource}
          size="sm"
          className="mb-2"
        />
      }
      notice={[
        "Publishers send each message once; the broker makes one copy per matching subscriber.",
        "The broker decides who receives a message by matching topics, not by looking at the content.",
        "Wildcards let one subscription cover many topics: + matches one level, # matches all remaining levels.",
        "Select a part in the scene or in the list to read what it does. Drag to turn the scene.",
      ]}
    />
  );
}
