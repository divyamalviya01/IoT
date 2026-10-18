import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Simulated Zigbee network on a 34 m × 20 m house floor plan: one coordinator, four routers and six end devices, with an adjustable radio range",
  ],
  theory:
    "Zigbee is a low-power wireless standard, built on IEEE 802.15.4, that forms a mesh network. It has three kinds of device: one coordinator, which starts and manages the network (here it is also the gateway); routers, which are mains-powered and pass messages on for others; and end devices, which run on batteries, sleep most of the time and never route. Each end device joins a nearby parent, a router or the coordinator, and messages hop from router to router until they reach the coordinator. When a router fails, the mesh heals itself: routes form again round the failure and end devices re-join another parent in range, usually with more hops. A device is orphaned only when no working parent is within radio range.",
  procedure: [
    "Open lab L16, Zigbee mesh self-healing. Look at the floor plan with every router working and press Record observation.",
    "Click router R1 (or choose Fail R1 in Fail or repair a router). Read the status line and the readouts, then press Record observation.",
    "Click R1 again to repair it, then fail R3. Note that E7 is orphaned and press Record observation.",
    "Press Repair all routers, set Radio range to 15 m and fail R4. Press Record observation.",
    "Set Radio range back to 12 m and fail R3 again. Drag a router, or press Add router and drag the new router, until E7 re-joins. Press Record observation.",
    "Open the lab record, write your result and print it. Press Reset layout to start again.",
  ],
  observationColumns: [
    { key: "failed", label: "Failed routers" },
    { key: "range", label: "Range", unit: "m" },
    { key: "avgHops", label: "Average hops" },
    { key: "longest", label: "Longest route", unit: "hops" },
    { key: "orphans", label: "Orphans" },
    { key: "cutOff", label: "Cut-off routers" },
    { key: "rejoined", label: "Re-joined" },
    { key: "layout", label: "Layout" },
  ],
  resultHint:
    "Say what happened to the average hops and the orphans as routers failed, and why. Then say how a longer radio range, or moving a router, changed the result.",
  viva: [
    {
      q: "What are the three kinds of Zigbee device?",
      a: "The coordinator starts and manages the network. Routers pass messages on for others. End devices only send their own data and never route.",
    },
    {
      q: "Why did no device lose its connection when R1 failed?",
      a: "R3 still had another route to the coordinator, through R4 and R2, and E5 re-joined R3. The mesh re-routed by itself, but E5's route grew to 4 hops.",
    },
    {
      q: "Why was E7 orphaned when R3 failed?",
      a: "An end device can only join a parent within radio range, and R3 was the only router close enough to E7. A mesh helps only if a second router is in range.",
    },
    {
      q: "Why are end devices not allowed to route?",
      a: "They run on batteries and sleep most of the time to save power, so they cannot stay awake to pass on other devices' messages.",
    },
    {
      q: "How did a longer radio range help?",
      a: "More routers could hear each other, which added links such as R1 to R4. More links mean more backup routes, so losing R4 orphaned nobody at 15 m.",
    },
    {
      q: "What does self-healing mean in a mesh network?",
      a: "When a node fails, the other nodes find new routes and end devices re-join another parent automatically, without anyone setting up the network again.",
    },
  ],
};

export default record;
