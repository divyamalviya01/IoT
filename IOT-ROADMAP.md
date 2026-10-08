# IoT Simulator Lab: Project Roadmap
*BCA-501 Internet-of-Things · BCA 5th Semester*

An interactive web lab where students **read** each topic in simple English, **see** it through animated 2D/3D visuals, and **do** it in browser simulations. Every line of the BCA-501 syllabus maps to a topic page, and most topics also get a lab experiment with a printable lab record.

## 1. Goals and standards

**Learning outcomes.** After using the lab, a student can:
- **CO1:** Explain IoT components, sensor nodes, edge/fog/cloud and IoT hardware (Unit 1)
- **CO2:** Compare MQTT, CoAP, HTTP, XMPP and UDP, and run pub/sub and request/response exchanges (Unit 1)
- **CO3:** Choose a suitable wireless technology and communication pattern for a given IoT scenario (Unit 2)
- **CO4:** Describe cloud platforms, dashboards, big data analytics and Hadoop for IoT (Unit 3)
- **CO5:** Identify IoT security threats and apply encryption and threat-modeling concepts (Unit 3)
- **CO6:** Analyse real IoT applications: smart city, health, agriculture, smart meters, IIoT (Unit 3)

**Every topic page follows one template, with five tabs:**

| Tab | Contents | Shown when |
|---|---|---|
| Theory | Simple-English explanation with tables, diagrams and charts | Always |
| Visualize | Animated 2D (Motion/SVG) or 3D (three.js) visual with "what to notice" notes | When a visual adds understanding |
| Lab | Interactive simulation: Aim → Steps → Free play → Observations | When a practical is possible |
| Quiz | 8–10 auto-graded MCQs with explanations | Always |
| Viva | 6–8 likely viva/exam questions with short model answers | Always |

**Content style guide (theory):**
- Sentences of 20 words or fewer, one idea per paragraph, and no jargon without a definition. Every term links to the glossary through a tooltip.
- Fixed order: *In one line* → *Explanation* → *Diagram/table* → *Real-life example* → *Advantages / limitations* → *Key points* → *Exam tip* (a 2-mark short answer and a 5/10-mark answer outline).
- Prefer familiar Indian examples where natural: Smart Cities Mission, smart electricity meters, FASTag (RFID), UPI tap-to-pay (NFC).

## 2. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Framework | React Router v7 (framework mode), React 19, TypeScript | Already scaffolded. File-based routes, code splitting. |
| Rendering | `ssr: false` + **pre-render every route** | Static output that runs on any lab PC or LAN server, with no Node server needed |
| Styling | Tailwind CSS v4 (`app/app.css` `@theme` tokens) | Already set up. Light and dark themes. |
| 3D | `three` + `@react-three/fiber` + `@react-three/drei` | three.js with React components. Models are built from primitives (no downloads, works offline). |
| 2D animation | `motion` (Motion for React) | Packet flows, sequence diagrams, timelines, layout transitions |
| Charts | `recharts` | Latency, airtime, battery, analytics and comparison charts |
| Node editors | `@xyflow/react` | Drag-and-wire labs (Build an IoT System, Node-RED-style flows) |
| Theory authoring | MDX (`@mdx-js/rollup` + `remark-gfm`) | Theory written as Markdown with embedded diagram components |
| Crypto lab | Browser Web Crypto API | Real AES-GCM and SHA-256 with no library |
| Fonts | `@fontsource-variable/atkinson-hyperlegible-next` + `@fontsource-variable/jetbrains-mono` (self-hosted) | Atkinson is designed for legibility, which suits long theory reading. JetBrains Mono is used only for real data (packets, topics, code). Self-hosted so the app works offline. |
| Icons | `lucide-react` | Consistent, tree-shakable icons that work offline |
| Tests | Vitest (`npm run test`) | Unit tests for every simulation engine |

## 3. App structure

**Routes**

| URL | Page |
|---|---|
| `/` | Home: 3D "IoT world" hero and syllabus map (3 units → topics) |
| `/unit/:unitId` | Unit overview: topics, labs, outcomes |
| `/learn/:topicSlug` | Topic page with Theory / Visualize / Lab / Quiz / Viva tabs |
| `/labs` | Lab manual index (L01–L34) |
| `/labs/:labSlug` | Full-screen lab simulator |
| `/labs/:labSlug/record` | Printable lab record |
| `/quiz`, `/quiz/:unitId` | Unit tests (mixed MCQs) |
| `/viva` | Searchable viva bank |
| `/glossary` | A–Z glossary |
| `/syllabus` | Coverage matrix: each syllabus line → topic → lab |

**Folders**
```
app/
  content/
    registry.ts            # single source of truth: units → topics → labs (drives nav, routes, prerender)
    modules.ts             # finds topic content by folder convention (no manual registration)
    glossary.ts
    start/getting-started/ # orientation topic built in Phase 0 (demo of every component)
    unit-1/<topic>/        # theory.mdx · Visual.tsx · quiz.ts · viva.ts
    unit-2/… unit-3/…
  labs/
    modules.ts             # finds labs by folder convention
    l00-packet-journey/    # orientation lab built in Phase 0
    l06-mqtt-broker/       # engine.ts (pure TS, tested) · Lab.tsx (UI) · record.ts (aim, procedure, observation columns)
    …
  lib/                     # theme, palette, observations store, sim/ (seeded random, network model)
  components/
    layout/   AppShell, Sidebar, TopicTabs, Breadcrumbs, ThemeToggle
    theory/   Callout, KeyPoints, CompareTable, Timeline, FlowDiagram, SequenceDiagram, LayerStack, ChartCard, Term
    three/    Scene3D, assets/ (SensorNode, Gateway, CloudServer, Router, Phone, House, Building, Tree, Rack, Board, Motor),
              PacketParticle, SignalRings, Label3D
    sim/      useSimClock, SimControls, EventLog, NetworkModel (latency/loss/bandwidth), seededRandom
    lab/      LabLayout, ObservationTable, Readouts (the printable record is routes/lab-record.tsx)
    assess/   Quiz, VivaList
    ui/       Button, Slider, Segmented, UnitTag
    home/     HeroBoard (3D circuit-board hero)
  routes/     shell, home, unit, topic, labs, lab, lab-record, quiz, viva, glossary, syllabus, not-found
```

**Lab record template** (printed or saved as PDF from `/labs/:slug/record`): Student name / Roll no. / Date → Experiment no. and title → Aim → Software/apparatus → Theory (short) → Procedure → **Observation table (filled automatically from the student's run)** → Result / Conclusion → Viva questions.

## 4. Syllabus coverage matrix

T = Theory · V = Visualization (2D/3D) · L = Lab · "—" = not applicable, so the topic is covered by theory (and visuals) only.

| # | Topic (syllabus wording) | Phase | T | V | L |
|---|---|---|---|---|---|
| 1.1 | Introduction to IoT and IoT components | 1 | ✔ | 3D | L01 |
| 1.2 | Characteristics of IoT | 1 | ✔ | 2D | — |
| 1.3 | IoT sensor nodes | 1 | ✔ | 3D | L02 |
| 1.4 | Edge computer, cloud and peripheral cloud | 1 | ✔ | 3D | L03 |
| 1.5 | Single board computers and open-source hardware | 1 | ✔ | 3D | L04 |
| 1.6 | Examples of IoT infrastructure | 1 | ✔ | 2D | — |
| 1.7 | IoT protocols and software (overview) | 2 | ✔ | 2D | — |
| 1.8 | UDP (vs TCP) | 2 | ✔ | 2D | L05 |
| 1.9 | MQTT, MQTT brokers, publish–subscribe modes | 2 | ✔ | 3D | L06 |
| 1.10 | HTTP | 2 | ✔ | 2D | L07 |
| 1.11 | CoAP | 2 | ✔ | 2D | L08 |
| 1.12 | XMPP | 2 | ✔ | 2D | L09 |
| 1.13 | Gateway protocols | 2 | ✔ | 2D | L10 |
| 1.14 | Protocol comparison (summary) | 2 | ✔ | Chart | L11 |
| 2.1 | IoT point-to-point communication technologies | 3 | ✔ | 3D | L12 |
| 2.2 | IoT communication patterns | 3 | ✔ | 2D | L13 |
| 2.3 | IoT protocol architecture | 3 | ✔ | 3D | L14 |
| 2.4 | Selection of wireless technologies (criteria) | 4 | ✔ | 3D | L15 |
| 2.5 | 6LoWPAN | 4 | ✔ | 2D (interactive) | — |
| 2.6 | Zigbee | 4 | ✔ | 3D | L16 |
| 2.7 | Wi-Fi | 4 | ✔ | 2D (interactive) | — |
| 2.8 | Bluetooth (BT), BLE and Bluetooth SIG | 4 | ✔ | 2D | L17 |
| 2.9 | NFC | 4 | ✔ | 3D | L18 |
| 2.10 | LoRa / LoRaWAN (+ Sigfox note) | 4 | ✔ | 3D | L19 |
| 2.11 | WiDi | 4 | ✔ | — | — |
| 3.1 | Introduction to cloud computing | 5 | ✔ | 2D | — |
| 3.2 | Evolution of cloud computing | 5 | ✔ | 2D | — |
| 3.3 | Commercial clouds and their features | 5 | ✔ | 2D | — |
| 3.4 | Open-source IoT platforms | 5 | ✔ | 2D | L20 |
| 3.5 | Cloud dashboards | 5 | ✔ | Chart | L21 |
| 3.6 | Introduction to big data analytics | 5 | ✔ | 2D | L22 |
| 3.7 | Hadoop | 5 | ✔ | 3D | L23 |
| 3.8 | IoT security | 6 | ✔ | 3D | L24 |
| 3.9 | Need for encryption | 6 | ✔ | 2D | L25 |
| 3.10 | Standard encryption protocols | 6 | ✔ | 2D | L26 |
| 3.11 | Lightweight cryptography | 6 | ✔ | Chart | L27 |
| 3.12 | Quadruple Trust Model for IoT-A | 6 | ✔ | 2D (interactive) | — |
| 3.13 | Threat analysis and model for IoT-A | 6 | ✔ | 2D | L28 |
| 3.14 | Cloud security | 6 | ✔ | 2D | — |
| 3.15 | IoT applications and their variants | 7 | ✔ | 2D | — |
| 3.16 | Case study: IoT for smart cities | 7 | ✔ | 3D | L29 |
| 3.17 | Case study: health care | 7 | ✔ | Chart | L30 |
| 3.18 | Case study: agriculture | 7 | ✔ | 3D | L31 |
| 3.19 | Case study: smart meters | 7 | ✔ | Chart | L32 |
| 3.20 | M2M | 8 | ✔ | 2D | — |
| 3.21 | Web of Things | 8 | ✔ | 2D | L33 |
| 3.22 | Cellular IoT | 8 | ✔ | Chart | — |
| 3.23 | Industrial IoT | 8 | ✔ | 3D | L34 |
| 3.24 | Industry 4.0 | 8 | ✔ | 2D | — |
| 3.25 | IoT standards | 8 | ✔ | — | — |

**Totals:** 50 topics · 34 labs · about 17 three.js scenes · 2 theory-only topics (WiDi, IoT standards).

## 5. Lab index

| Lab | Title | Topic | Main tech |
|---|---|---|---|
| L01 | Build an IoT System | 1.1 | @xyflow/react, Motion |
| L02 | Sensor Node Simulator (ADC, thresholds, battery) | 1.3 | Motion, Recharts |
| L03 | Edge vs Fog vs Cloud: Latency and Bandwidth | 1.4 | three.js, Recharts |
| L04 | Virtual Arduino and GPIO | 1.5 | SVG, Motion |
| L05 | TCP vs UDP Packet Lab | 1.8 | Motion |
| L06 | MQTT Broker Simulator (topics, wildcards, QoS, retained, LWT) | 1.9 | three.js, Motion |
| L07 | REST API Playground | 1.10 | Motion |
| L08 | CoAP Client–Server Simulator | 1.11 | Motion |
| L09 | XMPP Device Messaging | 1.12 | Motion |
| L10 | Gateway Protocol Translator | 1.13 | Motion |
| L11 | Protocol Race: MQTT vs CoAP vs HTTP vs XMPP | 1.14 | Recharts |
| L12 | Network Topology Simulator | 2.1 | three.js |
| L13 | Communication Pattern Playground | 2.2 | Motion, Recharts |
| L14 | Protocol Stack Builder | 2.3 | Drag and drop |
| L15 | Wireless Technology Selector | 2.4 | Recharts |
| L16 | Zigbee Mesh Self-Healing | 2.6 | three.js |
| L17 | BLE Explorer (advertising, GATT, RSSI) | 2.8 | Motion |
| L18 | NFC Tap Lab | 2.9 | three.js |
| L19 | LoRa Airtime and Range Calculator | 2.10 | Recharts |
| L20 | Flow-Based IoT Programming (Node-RED style) | 3.4 | @xyflow/react |
| L21 | IoT Dashboard Builder | 3.5 | Recharts |
| L22 | Stream Analytics (moving average, anomaly detection) | 3.6 | Recharts |
| L23 | Hadoop: HDFS Blocks and MapReduce | 3.7 | three.js, Motion |
| L24 | Smart Home Security Audit | 3.8 | three.js |
| L25 | Packet Sniffer: Plaintext vs Encrypted | 3.9 | Motion |
| L26 | Crypto Workbench (AES, SHA-256, RSA toy, Diffie–Hellman) | 3.10 | Web Crypto |
| L27 | Lightweight Crypto Cost Estimator | 3.11 | Recharts |
| L28 | STRIDE Threat Modeling Workshop | 3.13 | Motion |
| L29 | Smart City Control Room | 3.16 | three.js |
| L30 | Remote Patient Monitor | 3.17 | Recharts |
| L31 | Smart Irrigation | 3.18 | three.js, Recharts |
| L32 | Smart Meter and Tariff Simulator | 3.19 | Recharts |
| L33 | Thing Description Explorer | 3.21 | Motion |
| L34 | Predictive Maintenance (IIoT) | 3.23 | three.js, Recharts |

## 6. Phases and checklists

### Phase 0: Foundation and Lab Framework
**Goal:** Build the shell, design system and reusable building blocks that every later phase plugs into.

**Setup**
- [x] Install `three`, `@react-three/fiber`, `@react-three/drei`, `motion`, `recharts`, `@xyflow/react`, `@mdx-js/rollup`, `remark-gfm`, `lucide-react`, the Atkinson Hyperlegible Next and JetBrains Mono fonts, and `vitest` (dev)
- [x] `react-router.config.ts`: set `ssr: false` and pre-render all paths listed in `registry.ts` (135 pages)
- [x] `vite.config.ts`: add the MDX plugin (plus a `~/` alias so MDX files can import components)
- [x] Remove the template welcome screen (`app/welcome/`) and replace Google Fonts in `app/root.tsx` with self-hosted fonts
- [x] Add `test` script (Vitest) to `package.json`

**Design system**
- [x] Color tokens in `app/app.css`: one accent per unit (Unit 1 copper, Unit 2 blue, Unit 3 violet), semantic success/warning/danger, light and dark, plus 8 chart series colours validated for colour-blind separation
- [x] Typography scale, card and panel styles, theme toggle (light/dark/system, no flash on load)

**Content registry and layout**
- [x] `app/content/registry.ts`: units → topics → labs (slug, title, syllabus line, which tabs exist)
- [x] AppShell: sidebar (units → topics), top bar, breadcrumbs, mobile drawer
- [x] All routes from §3 wired in `app/routes.ts`. Topics and labs from later phases show a "built in phase N" placeholder.
- [x] Home page: syllabus map and 3D circuit-board hero (each chip is a unit)

**Theory components**
- [x] `Callout` (Definition / Remember / Exam tip / Real-life example / Note), `ExamTip`, `KeyPoints`, `CompareTable` (scrolls on mobile)
- [x] `Timeline`, `FlowDiagram` (animated arrows, stacks vertically when narrow), `SequenceDiagram` (step-through), `LayerStack`, `ChartCard` (legend + data-table view), `Term` (glossary tooltip)

**3D kit**
- [x] `Scene3D`: client-only Canvas, OrbitControls, capped pixel ratio, on-demand frame loop, stops rendering off screen, paused for reduced motion, loading fallback, no-WebGL fallback, error boundary
- [x] Primitive-built assets: SensorNode, Gateway, CloudServer, Router, Phone, House, Building, Tree, Rack, Board, Motor
- [x] Effects: `PacketParticle` (along a curve or a polyline path), `SignalRings`, `Link3D`, `Label3D` (one shared HTML label layer)

**Simulation and lab framework**
- [x] `useSimClock` (play / pause / step / reset / speed 0.25×–4×), `SimControls`, `EventLog`
- [x] Network model (`app/lib/sim/network.ts`: latency, jitter, packet loss %, bandwidth) and seeded random (`app/lib/sim/random.ts`, repeatable runs)
- [x] `LabLayout` (Aim → Steps → Setup → Simulation → Readouts → Observations) and observation store (`app/lib/observations.ts`)
- [x] Printable lab record page (`/labs/:slug/record`) with `@media print` styles, student details and a "Print or save as PDF" button

**Assessment components**
- [x] `Quiz` (shuffle, instant feedback with explanation, score summary, retry; also powers the unit tests)
- [x] `VivaList` (searchable accordion)

**Demo content**
- [x] Orientation topic "Getting started with the lab" (`start/getting-started`) using every theory component
- [x] Lab L00 "Packet journey" with engine tests, auto-filled observations and an auto-written result

**Exit criteria**
- [x] A demo topic shows all five tabs and a demo lab prints a record
- [x] `npm run typecheck`, `npm run test` and `npm run build` pass
- [ ] A sample 3D scene runs smoothly (30 fps or better) on an integrated-graphics PC. Baseline so far: 17–20 fps with CPU-only software rendering in a headless browser, which is far slower than any GPU. Still needs a check on a real lab PC.

---

### Phase 1: IoT Fundamentals and Hardware (Unit 1, Part A)
**Syllabus:** Introduction to IoT components, characteristics, IoT sensor nodes, edge computer, cloud and peripheral cloud, single board computers, open-source hardware, examples of IoT infrastructure.

**1.1 Introduction to IoT and components**
- [ ] Theory: definition, short history timeline (1982 CMU Coke machine → 1999 "Internet of Things" coined by Kevin Ashton → today), four building blocks (things/sensors, connectivity, data processing, user interface), table of component → role → example
- [ ] Visualize (3D): smart home where clicking any component highlights it and explains its role, with packets flowing sensor → gateway → cloud → phone app
- [ ] Lab **L01 Build an IoT System**: drag sensor, MCU, gateway, cloud and app blocks into a chain. The system comes alive only when the chain is valid, and hints explain mistakes.

**1.2 Characteristics of IoT**
- [ ] Theory: dynamic and self-adapting, self-configuring, interoperable protocols, unique identity, integrated into the information network, scalability, heterogeneity, intelligence, energy limits, security (table with examples)
- [ ] Visualize (2D): animated card per characteristic (for example, scalability shows nodes multiplying, unique identity shows IP/ID tags)

**1.3 IoT sensor nodes**
- [ ] Theory: node anatomy (sensing unit + ADC, processing unit, transceiver, power unit/energy harvesting), sensor and actuator table (DHT11, LM35, PIR, HC-SR04, LDR, MQ-2, soil moisture, accelerometer), analog vs digital, sampling, duty cycling
- [ ] Visualize (3D): exploded view of a sensor node. Layers separate on hover, and the data path animates from physical signal → ADC → MCU → radio.
- [ ] Lab **L02 Sensor Node Simulator**: pick a sensor and change the environment, see the analog waveform become ADC samples (8/10/12-bit, sampling rate) that trigger an actuator at a threshold, plus a battery-life vs duty-cycle chart

**1.4 Edge computer, cloud and peripheral cloud**
- [ ] Theory: edge, fog, cloud and peripheral cloud (cloudlets at the network edge), comparison table (latency, bandwidth, compute, storage, examples), 3-tier diagram
- [ ] Visualize (3D): stacked tiers (devices → edge → fog → cloud) with packets showing round-trip latency
- [ ] Lab **L03 Edge vs Fog vs Cloud**: vary the number of devices, data rate and processing location, and watch live charts of latency, bandwidth use and cost. Scenario cards include "car braking must happen at the edge".

**1.5 Single board computers and open-source hardware**
- [ ] Theory: SBC vs microcontroller board, comparison table (Raspberry Pi, BeagleBone, Arduino Uno, ESP8266/ESP32, NodeMCU, Jetson Nano: CPU, RAM, GPIO, wireless, OS, power, price range), meaning and licences of open-source hardware (OSHW, CERN-OHL), benefits
- [ ] Visualize (3D): interactive Raspberry Pi and Arduino Uno boards built from primitives. Hovering labels the parts (CPU, GPIO, USB, HDMI), alongside a GPIO pinout diagram.
- [ ] Lab **L04 Virtual Arduino and GPIO**: virtual board with LED, push button and potentiometer, and ready-made sketches (Blink, Button→LED, analogRead) whose highlighted values (pin, delay, threshold) students can edit, plus a serial monitor. No free-form code execution.

**1.6 Examples of IoT infrastructure**
- [ ] Theory: smart home, smart grid, connected cars, wearables, supply chain/logistics, with a general reference infrastructure (devices → gateways → network → cloud platform → apps) in a table
- [ ] Visualize (2D): animated infographic where each example highlights its path through the reference infrastructure

**Assessment and exit**
- [ ] Quiz (8–10 MCQs) and viva (6–8 Q&A) for topics 1.1–1.6
- [ ] Lab records for L01–L04 with auto-filled observation tables
- [ ] Engine unit tests (L01 chain validation, L02 ADC/battery math, L03 latency model)
- [ ] Glossary terms added. Typecheck, test and build pass.

---

### Phase 2: IoT Protocols and Software (Unit 1, Part B)
**Syllabus:** IoT protocols and software, MQTT, UDP, MQTT brokers, publish–subscribe modes, HTTP, CoAP, XMPP and gateway protocols.

**1.7 IoT protocols and software overview**
- [ ] Theory: IoT protocol stack vs TCP/IP (application: MQTT, CoAP, HTTP, XMPP, AMQP, DDS; transport: TCP, UDP; network: IPv6, 6LoWPAN, RPL; link: 802.15.4, BLE, Wi-Fi), IoT software (FreeRTOS, Contiki, RIOT, Zephyr, Arduino IDE, Node-RED, middleware)
- [ ] Visualize (2D, interactive): encapsulation explorer. Type a sensor reading, watch headers wrap it layer by layer, and see the byte count grow.

**1.8 UDP (vs TCP)**
- [ ] Theory: connectionless delivery, 8-byte UDP header fields, TCP 3-way handshake, TCP vs UDP comparison table, when IoT uses UDP
- [ ] Visualize (2D): side-by-side animation of the TCP handshake and ACKs next to UDP "fire and forget" under packet loss
- [ ] Lab **L05 TCP vs UDP**: set loss % and latency, send N packets, and record delivered, lost, retransmitted and total time. Includes a UDP header field inspector.

**1.9 MQTT, brokers and publish–subscribe modes**
- [ ] Theory: pub/sub vs request/response, broker role, topics and wildcards (`+`, `#`), **QoS 0/1/2** (animated sequence diagrams), retained messages, Last Will and Testament, keep-alive, clean vs persistent session, packet types, topic-based vs content-based filtering, MQTT-SN; broker comparison table (Mosquitto, HiveMQ, EMQX, VerneMQ, AWS IoT Core)
- [ ] Visualize (3D): broker hub with publishers and subscribers around it. Messages fly as glowing particles and fan out only to matching subscribers.
- [ ] Lab **L06 MQTT Broker Simulator**: create clients, subscribe with wildcards, and publish with a QoS level and retained flag. Network loss shows QoS 1 duplicates vs QoS 2 exactly-once, and disconnecting a client fires its LWT. Includes a packet-level log and a topic-matcher tester.

**1.10 HTTP**
- [ ] Theory: request/response, methods, status codes, REST, header overhead, polling vs webhooks
- [ ] Visualize (2D): request/response animation with header-size bars and a "polling waste" timeline
- [ ] Lab **L07 REST API Playground**: send `GET /sensors/temp` or `PUT /actuators/led` to a simulated device, see status codes and response bodies, and watch a virtual LED change state

**1.11 CoAP**
- [ ] Theory: CoAP over UDP, 4-byte header, CON/NON/ACK/RST, methods, Observe, `/.well-known/core` discovery, block-wise transfer, CoAP vs HTTP table
- [ ] Visualize (2D): CON retransmission with exponential backoff, and the Observe pattern
- [ ] Lab **L08 CoAP Simulator**: send CON/NON requests to a constrained node under loss, see a backoff timeline, observe a resource, and inspect header bytes

**1.12 XMPP**
- [ ] Theory: XML streams, JID (`user@domain/resource`), stanzas (message, presence, iq), client–server–federation, IoT extensions (XEPs), pros and cons
- [ ] Visualize (2D): federated servers relaying presence and message stanzas while the XML builds up live
- [ ] Lab **L09 XMPP Device Messaging**: two devices exchange presence and message stanzas, with a raw XML view and a size comparison against MQTT

**1.13 Gateway protocols**
- [ ] Theory: gateway roles (protocol translation, aggregation, filtering, security, edge processing), field and gateway protocols (Modbus, BACnet, OPC-UA, LwM2M, AMQP, DDS: short table), gateway architecture diagram
- [ ] Visualize (2D): a Zigbee/BLE/Modbus frame enters the gateway and leaves as a JSON MQTT message
- [ ] Lab **L10 Gateway Protocol Translator**: devices send raw frames, students set mapping rules (topic template, unit conversion, "send only if change > X") and see the output and bandwidth saved

**1.14 Protocol comparison (summary)**
- [ ] Theory: MQTT vs CoAP vs HTTP vs XMPP vs AMQP master table, plus a radar chart (overhead, latency, reliability, power, complexity)
- [ ] Lab **L11 Protocol Race**: the same payload is sent over each protocol under identical network conditions, compared on bytes on the wire, time and battery cost

**Assessment and exit**
- [ ] Quiz and viva for 1.7–1.14, lab records for L05–L11
- [ ] Engine unit tests: MQTT wildcard matching, QoS 1/2 state machines, retained/LWT, CoAP backoff, gateway rules
- [ ] Unit 1 test available at `/quiz/unit-1`

---

### Phase 3: Communication Technologies, Patterns and Architecture (Unit 2, Part A)
**Syllabus:** IoT point-to-point communication technologies, IoT communication pattern, IoT protocol architecture.

**2.1 Point-to-point communication technologies**
- [ ] Theory: point-to-point vs point-to-multipoint vs broadcast vs mesh, topologies (star, mesh, tree, bus, ring) pros/cons table, simplex/half/full duplex, wired short-range links (UART, I²C, SPI, RS-485) and wireless P2P (Bluetooth, NFC, Wi-Fi Direct)
- [ ] Visualize (3D): nodes morph between topologies while packets show the routes. Includes a 2D UART frame animation (start bit, data bits, parity, stop bit).
- [ ] Lab **L12 Network Topology Simulator**: pick a topology and node count, then fail a node or link to see who loses connectivity, hop counts and redundant paths

**2.2 IoT communication patterns**
- [ ] Theory: request–response, publish–subscribe, push–pull, exclusive pair, plus communication models (device-to-device, device-to-gateway, device-to-cloud, back-end data sharing), with a comparison table
- [ ] Visualize (2D): one temperature-monitoring scenario animated under each pattern, with a toggle to switch
- [ ] Lab **L13 Communication Pattern Playground**: run the scenario under each pattern and compare messages sent, latency and server load on a chart

**2.3 IoT protocol architecture**
- [ ] Theory: 3-layer (perception, network, application) and 5-layer (perception, transport, processing, application, business) models, IoT stack mapped to OSI, IETF stack (802.15.4 → 6LoWPAN → IPv6/RPL → UDP → CoAP), short intro to the IoT-A reference model (linked from Phase 6)
- [ ] Visualize (3D): translucent stacked layers with protocol tokens, as a packet travels down the sender stack and up the receiver stack
- [ ] Lab **L14 Protocol Stack Builder**: drag protocol tokens into the correct layers, with instant validation and explanations

**Assessment and exit**
- [ ] Quiz and viva for 2.1–2.3, lab records for L12–L14
- [ ] Engine unit tests: topology connectivity (BFS) and pattern message counts

---

### Phase 4: Wireless Technologies (Unit 2, Part B)
**Syllabus:** Selection of wireless technologies: 6LoWPAN, Zigbee, Wi-Fi, BT, BLE, SIG, NFC, LoRa, WiDi.

**2.4 Selecting a wireless technology**
- [ ] Theory: selection criteria (range, data rate, power, cost, topology, band, network size, security), master comparison table, range vs data-rate scatter chart (log scales)
- [ ] Visualize (3D): range rings around a device for each technology (NFC cm → BLE/Wi-Fi tens of metres → LoRa km), with a log-scale toggle
- [ ] Lab **L15 Wireless Technology Selector**: enter requirements and get a recommended technology with reasons. Scenario cards: farm 5 km → LoRa, wearable → BLE, tap-to-pay → NFC, CCTV → Wi-Fi, home lighting mesh → Zigbee. NB-IoT/LTE-M are added in Phase 8.

**2.5 6LoWPAN**
- [ ] Theory: IPv6 over IEEE 802.15.4, header compression (40-byte IPv6 header → a few bytes), fragmentation (127-byte frames), mesh-under vs route-over, edge router
- [ ] Visualize (2D, interactive): header-compression animation and a fragmentation calculator (payload size → frames and overhead, with and without compression)

**2.6 Zigbee**
- [ ] Theory: 802.15.4 base, coordinator/router/end device, mesh, 2.4 GHz at 250 kbps, application profiles, Zigbee 3.0 and Matter (mention)
- [ ] Visualize (3D): Zigbee mesh across a house
- [ ] Lab **L16 Zigbee Mesh Self-Healing**: place routers and end devices, remove a node and watch traffic re-route, recording hop count before and after

**2.7 Wi-Fi**
- [ ] Theory: 802.11 b/g/n/ac/ax, 2.4/5/6 GHz, infrastructure vs ad-hoc, Wi-Fi HaLow (802.11ah) for IoT, power trade-offs
- [ ] Visualize (2D, interactive): 2.4 GHz channel-overlap chart. Assign channels to access points and see interference (why channels 1, 6 and 11).

**2.8 Bluetooth Classic, BLE and Bluetooth SIG**
- [ ] Theory: Classic (piconet/scatternet, frequency hopping), BLE (advertising channels 37/38/39, central/peripheral, GATT services and characteristics, beacons), Bluetooth Mesh, and the **Bluetooth SIG** (who maintains the standards and profiles); Classic vs BLE table
- [ ] Visualize (2D): advertising packets hopping across channels, and a GATT tree
- [ ] Lab **L17 BLE Explorer**: scan for simulated peripherals (heart-rate band, beacon), connect, browse services and characteristics, read or subscribe to notifications, and drag the phone to see RSSI → distance

**2.9 NFC**
- [ ] Theory: 13.56 MHz, under ~10 cm, modes (reader/writer, peer-to-peer, card emulation), NDEF, NFC vs RFID (FASTag example)
- [ ] Visualize (3D): a phone taps a tag inside an animated magnetic field
- [ ] Lab **L18 NFC Tap Lab**: write an NDEF record (URL/text) to a virtual tag and tap to read it. A distance slider shows reads failing beyond a few centimetres.

**2.10 LoRa / LoRaWAN (+ Sigfox note)**
- [ ] Theory: chirp spread spectrum, spreading factor SF7–SF12 trade-off, star-of-stars architecture (end device → gateway → network server → app), device classes A/B/C, duty-cycle limits; short Sigfox sidebar as another LPWAN
- [ ] Visualize (3D): farm with gateways and km-range coverage, plus a 2D chirp waveform
- [ ] Lab **L19 LoRa Airtime and Range Calculator**: choose SF, bandwidth and payload to get time-on-air (standard Semtech formula), maximum messages per day under 1 % duty cycle and an indicative range, charted across SFs

**2.11 WiDi (theory only)**
- [ ] Theory: Intel Wireless Display, peer-to-peer screen mirroring over Wi-Fi, discontinued and succeeded by Miracast / Wi-Fi Direct; simple static diagram and comparison with Miracast and Chromecast

**Assessment and exit**
- [ ] Quiz and viva for 2.4–2.11, lab records for L15–L19
- [ ] Engine unit tests: selector scoring, mesh re-routing, LoRa airtime formula against known reference values, 6LoWPAN fragment math
- [ ] Unit 2 test available at `/quiz/unit-2`

---

### Phase 5: Cloud Computing and Big Data (Unit 3, Part A)
**Syllabus:** Introduction to cloud computation and big data analytics, evolution of cloud computation, commercial clouds and their features, open-source IoT platforms, cloud dashboards, introduction to big data analytics and Hadoop.

**3.1 Introduction to cloud computing**
- [ ] Theory: NIST definition and 5 essential characteristics, IaaS/PaaS/SaaS ("pizza as a service" table), public/private/hybrid/community, why IoT needs the cloud
- [ ] Visualize (2D): "who manages what" stack that animates as students toggle on-premises / IaaS / PaaS / SaaS

**3.2 Evolution of cloud computing**
- [ ] Theory and visualize (2D): scroll-animated timeline (mainframe time-sharing → client–server → grid → utility computing → virtualization → SaaS → public cloud (AWS 2006) → containers/serverless → edge)

**3.3 Commercial clouds and their features**
- [ ] Theory: AWS IoT Core, Azure IoT Hub and others in a feature table (device registry, MQTT support, rules engine, device shadow/twin, analytics, pricing model); retired services (for example Google Cloud IoT Core, 2023) shown as history
- [ ] Visualize (2D): device shadow / digital twin sync (desired vs reported state)

**3.4 Open-source IoT platforms**
- [ ] Theory: ThingsBoard, Node-RED, Eclipse IoT (Kura, Ditto, Hono), Kaa, Home Assistant, OpenRemote (licence and features table), with ThingSpeak noted as free but not open source
- [ ] Lab **L20 Flow-Based IoT Programming**: Node-RED-style editor. Wire sensor → function (threshold/convert) → MQTT out / dashboard / alert nodes, deploy, and watch messages flow along the wires.

**3.5 Cloud dashboards**
- [ ] Theory: widget types (gauge, line chart, map, switch, alert), real-time updates, good dashboard design
- [ ] Lab **L21 IoT Dashboard Builder**: place widgets on a grid, bind them to simulated sensor streams, set alert thresholds, and use a switch widget to control a virtual 3D bulb

**3.6 Introduction to big data analytics**
- [ ] Theory: 5 Vs (volume, velocity, variety, veracity, value), structured/semi-structured/unstructured data, descriptive/diagnostic/predictive/prescriptive analytics, batch vs stream, IoT data pipeline
- [ ] Visualize (2D): animated pipeline (ingest → store → process → visualize)
- [ ] Lab **L22 Stream Analytics**: a live sensor stream with moving average, min/max and z-score anomaly flags. Changing the window size shows its effect.

**3.7 Hadoop**
- [ ] Theory: HDFS (NameNode, DataNodes, 128 MB blocks, replication factor 3), MapReduce (map → shuffle/sort → reduce), YARN, ecosystem table (Hive, Pig, HBase, Spark, Kafka, Flume, Sqoop)
- [ ] Visualize (3D): cluster racks with file blocks replicated across nodes. Killing a DataNode triggers re-replication.
- [ ] Lab **L23 Hadoop Simulator**: IoT log lines go through mappers emitting key–value pairs, a shuffle, and reducers producing average temperature per sensor. Students can change mapper/reducer counts and the replication factor.

**Assessment and exit**
- [ ] Quiz and viva for 3.1–3.7, lab records for L20–L23
- [ ] Engine unit tests: flow execution, analytics math, MapReduce output, HDFS block placement

---

### Phase 6: IoT Security (Unit 3, Part B)
**Syllabus:** IoT security, need for encryption, standard encryption protocol, lightweight cryptography, Quadruple Trust Model for IoT-A, threat analysis and model for IoT-A, cloud security.

**3.8 IoT security**
- [ ] Theory: CIA triad plus authentication, authorization and non-repudiation; why IoT is vulnerable (constrained devices, default passwords, physical access, scale); attacks by layer (table); case timeline (Stuxnet 2010, Jeep hack 2015, Mirai 2016); OWASP IoT Top 10
- [ ] Visualize (3D): smart home attack surface with vectors highlighted per layer
- [ ] Lab **L24 Smart Home Security Audit**: find and fix weaknesses in a simulated home (default passwords, open Telnet, plaintext MQTT, outdated firmware) while a security score rises (defensive)

**3.9 Need for encryption**
- [ ] Theory: eavesdropping, man-in-the-middle, data integrity, privacy laws in brief
- [ ] Lab **L25 Packet Sniffer: Plaintext vs Encrypted**: watch MQTT traffic in a sniffer view, then turn on TLS and see the payloads become ciphertext

**3.10 Standard encryption protocols**
- [ ] Theory: symmetric vs asymmetric (table), AES, RSA, Diffie–Hellman, hashing (SHA-256), digital signatures, TLS/DTLS handshake
- [ ] Visualize (2D): Diffie–Hellman paint-mixing analogy and an animated TLS handshake
- [ ] Lab **L26 Crypto Workbench**: real AES-GCM encrypt/decrypt and SHA-256 (Web Crypto API), an avalanche-effect bit view, and step-by-step toy RSA with small primes

**3.11 Lightweight cryptography**
- [ ] Theory: why it is needed (CPU, RAM, energy limits), PRESENT, SIMON/SPECK, ChaCha20, **Ascon** (NIST lightweight standard), ECC vs RSA key sizes table
- [ ] Visualize: comparison charts (key/block size, rounds, relative cost)
- [ ] Lab **L27 Lightweight Crypto Cost Estimator**: pick an algorithm and a device (8-bit MCU, ESP32, Raspberry Pi) to get the time and energy per message and the battery-life impact (illustrative values, clearly labelled)

**3.12 Quadruple Trust Model for IoT-A**
- [ ] Theory: the IoT-A reference architecture in brief, and the "quadruple" trust of **protection, security, privacy and safety** (IEEE P2413, as taught in Raj Kamal), with a table and examples for each
- [ ] Visualize (2D, interactive): four pillars around an IoT system and a "classify the scenario" exercise (for example, "smart lock fails open in a power cut" is safety)

**3.13 Threat analysis and model for IoT-A**
- [ ] Theory: assets → threats → vulnerabilities → risk → countermeasures, **STRIDE** categories mapped to IoT, risk matrix (likelihood × impact)
- [ ] Visualize (2D): data-flow diagram with threats appearing on each element
- [ ] Lab **L28 STRIDE Threat Modeling Workshop**: choose system elements to auto-list STRIDE threats, rate each on a risk heat map, and assign mitigations

**3.14 Cloud security**
- [ ] Theory: shared responsibility model, IAM, encryption at rest and in transit, key management, device identity (X.509, mutual TLS), top cloud threats (misconfiguration, insecure APIs, account hijacking)
- [ ] Visualize (2D): shared-responsibility matrix (reuses the 3.1 component) and a mutual-TLS device authentication animation

**Assessment and exit**
- [ ] Quiz and viva for 3.8–3.14, lab records for L24–L28
- [ ] Engine unit tests: audit scoring, toy RSA math, STRIDE threat generation and risk scoring
- [ ] Quadruple Trust and IoT-A threat content checked against the reference textbook (see §9)

---

### Phase 7: IoT Applications and Case Studies (Unit 3, Part C-1)
**Syllabus:** IoT application and its variants. Case studies: IoT for smart cities, health care, agriculture, smart meters.

**3.15 IoT applications and variants**
- [ ] Theory: application domains table; variants (Consumer IoT, IIoT, IoMT, IoV, IoE, AIoT) with a comparison table
- [ ] Visualize (2D): animated domain wheel

**3.16 Case study: smart cities**
- [ ] Theory: smart parking, adaptive street lighting, traffic management, waste management, air quality, with architecture and Smart Cities Mission examples
- [ ] Visualize (3D): **capstone smart-city scene** with clickable districts
- [ ] Lab **L29 Smart City Control Room**: motion-dimmed streetlights, parking occupancy, and traffic signals timed by queue length, with energy and wait-time metrics

**3.17 Case study: health care**
- [ ] Theory: wearables, remote patient monitoring, hospital asset tracking, privacy concerns
- [ ] Lab **L30 Remote Patient Monitor**: simulated vitals (HR, SpO₂, temperature, ECG waveform) with thresholds and doctor-dashboard alerts. Students can inject events such as fever or arrhythmia.

**3.18 Case study: agriculture**
- [ ] Theory: precision farming (soil moisture, weather, drip irrigation, drones, livestock tracking), LPWAN connectivity
- [ ] Visualize (3D): field with a sensor grid
- [ ] Lab **L31 Smart Irrigation**: sensor-driven rules vs a fixed schedule, with a rain-forecast toggle, comparing water used and crop health over a simulated season

**3.19 Case study: smart meters**
- [ ] Theory: AMI, smart grid, two-way communication, time-of-use tariffs, demand response, theft detection
- [ ] Lab **L32 Smart Meter and Tariff Simulator**: schedule household appliances, see 15-minute readings under a ToU tariff, and shift loads to lower the bill

**Assessment and exit**
- [ ] Quiz and viva for 3.15–3.19, lab records for L29–L32
- [ ] Engine unit tests: city rules, vitals thresholds, irrigation model, tariff calculation

---

### Phase 8: Emerging Paradigms and Standards (Unit 3, Part C-2)
**Syllabus:** M2M, Web of Things, cellular IoT, Industrial IoT, Industry 4.0, IoT standards.

**3.20 M2M**
- [ ] Theory: definition, M2M vs IoT table, ETSI M2M architecture (device, network and application domains)
- [ ] Visualize (2D): animated ETSI M2M architecture

**3.21 Web of Things**
- [ ] Theory: WoT vs IoT, web standards (HTTP, REST, WebSockets), W3C WoT Thing Description, WoT layers (access, find, share, compose)
- [ ] Lab **L33 Thing Description Explorer**: load a Thing Description (lamp, thermostat). The app builds controls for its properties, actions and events automatically, and students can edit the JSON to see the UI change.

**3.22 Cellular IoT**
- [ ] Theory: 2G → 5G, LTE-M (Cat-M1), NB-IoT, 5G use cases (eMBB, mMTC, URLLC), PSM and eDRX power saving
- [ ] Visualize: comparison charts and the 5G use-case triangle. NB-IoT and LTE-M are added to the L15 selector.

**3.23 Industrial IoT**
- [ ] Theory: IIoT architecture, SCADA, PLC, OPC-UA, predictive maintenance, digital twin
- [ ] Visualize (3D): factory conveyor and motor with sensors
- [ ] Lab **L34 Predictive Maintenance**: a bearing slowly degrades. Students spot vibration/temperature anomalies before failure and compare reactive vs predictive maintenance cost.

**3.24 Industry 4.0**
- [ ] Theory and visualize (2D): industrial revolutions 1.0 → 4.0 timeline, the nine technology pillars, cyber-physical systems, Industry 5.0 mention

**3.25 IoT standards (theory only)**
- [ ] Theory: standards bodies → standards table (IEEE 802.15.4/802.11/802.15.1, IETF 6LoWPAN/CoAP/RPL, OASIS MQTT, W3C WoT, oneM2M, ETSI, 3GPP NB-IoT/LTE-M, Bluetooth SIG, CSA Zigbee/Matter, OMA LwM2M, ISO/IEC 30141, IEEE P2413, ITU-T) and a static bodies-to-standards diagram

**Assessment and exit**
- [ ] Quiz and viva for 3.20–3.25, lab records for L33–L34
- [ ] Engine unit tests: Thing Description parsing, degradation and anomaly model
- [ ] Unit 3 test available at `/quiz/unit-3`

---

### Phase 9: Assessment Hub, Lab Manual and Release
**Goal:** Pull everything together, polish it, and make it ready for a college lab.

- [ ] `/quiz`: unit tests (20 random MCQs per unit) with a score breakdown by topic
- [ ] `/viva`: all Q&A, searchable, filterable by unit and topic
- [ ] `/labs`: L01–L34 index with aims, plus "Print full lab manual"
- [ ] `/glossary`: A–Z with links back to topics
- [ ] `/syllabus`: coverage matrix linking every BCA-501 line to its topic and lab, with all lines ticked
- [ ] Accessibility pass: keyboard navigation, focus states, colour-blind-safe palettes, ARIA labels on diagrams, reduced motion respected everywhere
- [ ] Performance pass: per-topic and per-lab code splitting, 3D lazy-loaded, "2D / low-graphics mode" toggle, testing on a low-end PC
- [ ] Cross-browser check: Chrome, Edge, Firefox. Mobile layouts checked at 360 px.
- [ ] Final content review: simple English, no factual errors, every topic meets the Definition of Done
- [ ] Update `Dockerfile` to serve the static build (`build/client`), and write `README.md` (install, run, offline lab deployment, teacher demo guide per lab)

## 7. Definition of Done

**Topic**
- [ ] Theory follows the style guide and has at least one table, diagram or chart
- [ ] The visualization (if any) works in light and dark, has "what to notice" notes, and has a reduced-motion fallback
- [ ] Quiz (8–10 MCQs with explanations) and viva (6–8 Q&A) are written
- [ ] The topic is in the registry, the coverage matrix and the glossary

**Lab**
- [ ] Has an aim, guided steps, a free-play mode and an observation table
- [ ] The engine is pure TypeScript with Vitest tests, and runs are repeatable (seeded)
- [ ] The lab record prints correctly (A4) with observations filled in automatically

## 8. Non-functional requirements
- **Offline:** no CDNs, no remote models, self-hosted fonts. It works after a one-time install or from a static build on the lab LAN.
- **Low-end hardware:** a target of 30 fps or better on integrated graphics with 4–8 GB RAM, capped pixel ratio, on-demand rendering, and a 2D fallback.
- **Responsive:** desktop first, but every page works on tablets and on phones from 360 px.
- **Accessible:** keyboard-friendly, sufficient contrast, `prefers-reduced-motion` honoured.
- **Private:** no backend, no login, no data collection.

## 9. Syllabus interpretation notes
- **"Cloud and peripheral cloud":** taught as central cloud vs cloud resources at the network periphery (edge, fog, cloudlets).
- **"Publish–subscribe modes":** covered as QoS levels, retained and persistent sessions, and topic-based vs content-based filtering.
- **"SIG":** treated as the **Bluetooth SIG** (standards body, profiles, Bluetooth Mesh), as in comparable university syllabi. Sigfox gets a short LPWAN sidebar under LoRa in case that was the intended meaning.
- **"Widi":** Intel Wireless Display. It is discontinued, so it is theory only and covered alongside Miracast and Wi-Fi Direct.
- **"Quadruple Trust Model for IoT-A":** protection, security, privacy and safety (IEEE P2413, as presented in Raj Kamal's textbook). To be verified against the textbook when Phase 6 is written.
- **"Threat analysis and model for IoT-A":** taught with the IoT-A security perspective plus STRIDE and a risk matrix.
- **Commercial clouds:** services that have been retired are shown as history, and the current status of each service is checked when Phase 5 is written.

## 10. References
- Raj Kamal, *Internet of Things: Architecture and Design Principles*, McGraw Hill. This is the primary reference, and the syllabus wording mirrors it.
- Arshdeep Bahga and Vijay Madisetti, *Internet of Things: A Hands-On Approach* (communication patterns, IoT levels).
- NPTEL, *Introduction to Internet of Things*, Prof. Sudip Misra (IIT Kharagpur).
- Specifications: OASIS MQTT 3.1.1/5.0, RFC 7252 (CoAP), RFC 6120 (XMPP), RFC 4944/6282 (6LoWPAN), W3C WoT Thing Description, NIST SP 800-145 (cloud), NIST SP 800-232 (Ascon), IEEE P2413.
