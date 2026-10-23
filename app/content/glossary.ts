/**
 * Glossary terms. `id` is what <Term id="…"> refers to; `topic` is the slug of
 * the topic that teaches the term in depth. Definitions: one or two plain
 * sentences a first-year student can follow.
 */
export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  topic?: string;
}

export const glossary: GlossaryTerm[] = [
  // Unit 3, part B: security
  { id: "cia-triad", term: "CIA triad", definition: "The three goals of security: confidentiality (only the right people can read data), integrity (data is not changed without being noticed) and availability (the system works when needed).", topic: "iot-security" },
  { id: "authentication", term: "Authentication", definition: "Proving who or what you are, for example with a password, a fingerprint or a device certificate.", topic: "iot-security" },
  { id: "authorisation", term: "Authorisation", definition: "Deciding what an authenticated person or device is allowed to do, such as reading a sensor but not unlocking a door.", topic: "iot-security" },
  { id: "non-repudiation", term: "Non-repudiation", definition: "Proof that someone did something, so they cannot later deny it, for example a signed, time-stamped log entry.", topic: "iot-security" },
  { id: "attack-surface", term: "Attack surface", definition: "All the places where an attacker could try to get in: devices, ports, radios, apps, cloud accounts and people.", topic: "iot-security" },
  { id: "botnet", term: "Botnet", definition: "A large group of hijacked devices controlled together by an attacker, often used to flood websites. Mirai (2016) built one from IoT devices with default passwords.", topic: "iot-security" },
  { id: "ddos", term: "DDoS attack", definition: "Distributed denial of service: flooding a service with traffic from many machines at once so real users cannot reach it.", topic: "iot-security" },
  { id: "eavesdropping", term: "Eavesdropping", definition: "Secretly listening to network traffic. Without encryption, passwords and readings can be read as plain text.", topic: "need-for-encryption" },
  { id: "mitm", term: "Man-in-the-middle (MITM)", definition: "An attacker secretly sits between two parties, reading or changing messages while each thinks it talks directly to the other.", topic: "need-for-encryption" },
  { id: "replay-attack", term: "Replay attack", definition: "Recording a valid message, such as \"unlock\", and sending it again later. Counters or timestamps stop it.", topic: "need-for-encryption" },
  { id: "plaintext", term: "Plaintext and ciphertext", definition: "Plaintext is readable data; ciphertext is the scrambled form after encryption, which is useless without the key.", topic: "need-for-encryption" },
  { id: "symmetric-encryption", term: "Symmetric encryption", definition: "Encryption where the same secret key locks and unlocks the data. Fast; AES is the standard example.", topic: "encryption-protocols" },
  { id: "asymmetric-encryption", term: "Asymmetric (public-key) encryption", definition: "Encryption with a key pair: a public key that anyone may have and a private key kept secret. RSA and ECC are examples.", topic: "encryption-protocols" },
  { id: "aes", term: "AES", definition: "Advanced Encryption Standard (FIPS 197, 2001): the most widely used symmetric cipher, with 128-bit blocks and 128-, 192- or 256-bit keys.", topic: "encryption-protocols" },
  { id: "rsa", term: "RSA", definition: "A public-key algorithm (1977) based on how hard it is to factor the product of two large primes. Used for key exchange and signatures.", topic: "encryption-protocols" },
  { id: "diffie-hellman", term: "Diffie–Hellman key exchange", definition: "A method (1976) that lets two parties agree on a shared secret over an open network without ever sending the secret itself.", topic: "encryption-protocols" },
  { id: "hash-function", term: "Hash function", definition: "A function that turns any data into a short fixed-size fingerprint, such as SHA-256's 256 bits. It cannot be reversed, and any change gives a different hash.", topic: "encryption-protocols" },
  { id: "digital-signature", term: "Digital signature", definition: "A value made with a private key that proves who created a message and that it has not changed. Anyone can check it with the public key.", topic: "encryption-protocols" },
  { id: "tls", term: "TLS", definition: "Transport Layer Security: the protocol behind HTTPS and MQTT over port 8883. It checks the server's certificate, agrees keys and encrypts the connection. TLS 1.3 is RFC 8446 (2018).", topic: "encryption-protocols" },
  { id: "x509-certificate", term: "X.509 certificate", definition: "A digital document, signed by a certificate authority, that links a public key to a name such as a website or a device ID.", topic: "encryption-protocols" },
  { id: "certificate-authority", term: "Certificate authority (CA)", definition: "A trusted organisation that checks identities and signs certificates. Devices and browsers trust certificates signed by CAs they know.", topic: "encryption-protocols" },
  { id: "avalanche-effect", term: "Avalanche effect", definition: "A tiny change in the input, even one bit, changes about half the bits of a good hash or cipher's output.", topic: "encryption-protocols" },
  { id: "aead", term: "Authenticated encryption (AEAD)", definition: "Encryption that also adds a tag proving the data was not changed, such as AES-GCM, ChaCha20-Poly1305 and Ascon.", topic: "lightweight-cryptography" },
  { id: "lightweight-cryptography", term: "Lightweight cryptography", definition: "Encryption designed for small devices with little memory, CPU power and energy, such as sensors and RFID tags.", topic: "lightweight-cryptography" },
  { id: "ascon", term: "Ascon", definition: "A family of lightweight algorithms chosen by NIST in 2023 and standardised in SP 800-232 (August 2025) for authenticated encryption and hashing on small devices.", topic: "lightweight-cryptography" },
  { id: "present-cipher", term: "PRESENT", definition: "A lightweight block cipher (64-bit blocks, 80- or 128-bit keys) designed for very small chips; standardised in ISO/IEC 29192-2.", topic: "lightweight-cryptography" },
  { id: "speck", term: "SIMON and SPECK", definition: "Lightweight block ciphers published by the US NSA in 2013. ISO declined to standardise them in 2018 after experts raised trust concerns.", topic: "lightweight-cryptography" },
  { id: "chacha20", term: "ChaCha20", definition: "A fast stream cipher by Daniel Bernstein, used with Poly1305 for authenticated encryption in TLS 1.3 (RFC 8439). Quick on chips without AES hardware.", topic: "lightweight-cryptography" },
  { id: "ecc", term: "Elliptic-curve cryptography (ECC)", definition: "Public-key cryptography based on elliptic curves. A 256-bit ECC key is about as strong as a 3072-bit RSA key, so it suits small devices.", topic: "lightweight-cryptography" },
  { id: "quadruple-trust", term: "Quadruple trust", definition: "The four qualities named by the IEEE 2413 IoT architecture standard: protection, security, privacy and safety.", topic: "quadruple-trust-model" },
  { id: "stride", term: "STRIDE", definition: "A threat checklist from Microsoft: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service and Elevation of privilege.", topic: "threat-analysis" },
  { id: "threat-model", term: "Threat model", definition: "A structured look at a system to list what could go wrong, how likely and harmful each threat is, and what to do about it.", topic: "threat-analysis" },
  { id: "risk-matrix", term: "Risk matrix", definition: "A grid of likelihood against impact. Risk = likelihood × impact, so threats can be ranked from low to critical.", topic: "threat-analysis" },
  { id: "dfd", term: "Data-flow diagram (DFD)", definition: "A drawing of a system's people, processes, data stores and the data flowing between them, used as the map for threat modelling.", topic: "threat-analysis" },
  { id: "trust-boundary", term: "Trust boundary", definition: "A line on a DFD where data passes between parts trusted to different degrees, such as from the home network to the internet. Threats cluster there.", topic: "threat-analysis" },
  { id: "shared-responsibility", term: "Shared responsibility model", definition: "The split of security duties in the cloud: the provider secures the data centre and the services it runs; the customer secures their data, accounts and configuration.", topic: "cloud-security" },
  { id: "iam", term: "Identity and access management (IAM)", definition: "The cloud service that controls who and what can do which actions, using users, roles, policies and multi-factor login.", topic: "cloud-security" },
  { id: "mutual-tls", term: "Mutual TLS (mTLS)", definition: "TLS in which both sides show certificates: the server proves itself to the device and the device proves itself to the server.", topic: "cloud-security" },
  { id: "key-management", term: "Key management", definition: "Creating, storing, rotating and destroying encryption keys safely, often with a cloud key management service (KMS) or a hardware security module (HSM).", topic: "cloud-security" },
  { id: "secure-element", term: "Secure element", definition: "A small tamper-resistant chip inside a device that stores its private keys so they can be used but never read out.", topic: "cloud-security" },

  // Unit 3, part A: cloud and big data
  { id: "iaas", term: "IaaS (Infrastructure as a Service)", definition: "Renting virtual machines, storage and networks from a cloud provider. You install and manage the operating system and everything above it.", topic: "cloud-computing" },
  { id: "paas", term: "PaaS (Platform as a Service)", definition: "Renting a ready platform to run your code on. The provider manages the servers, operating system and runtime; you bring the application and data.", topic: "cloud-computing" },
  { id: "saas", term: "SaaS (Software as a Service)", definition: "Using finished software over the internet, such as Gmail or a cloud dashboard. The provider manages everything; you just use it.", topic: "cloud-computing" },
  { id: "public-cloud", term: "Public cloud", definition: "Cloud services that any customer can rent over the internet, sharing the provider's data centres, such as AWS, Azure or Google Cloud.", topic: "cloud-computing" },
  { id: "private-cloud", term: "Private cloud", definition: "A cloud used by one organisation only, run in its own data centre or by a provider just for it.", topic: "cloud-computing" },
  { id: "hybrid-cloud", term: "Hybrid cloud", definition: "A mix of private and public cloud, with data and work moving between them, such as sensitive records kept private and analytics run in public cloud.", topic: "cloud-computing" },
  { id: "community-cloud", term: "Community cloud", definition: "A cloud shared by several organisations with the same needs, such as government departments or hospitals.", topic: "cloud-computing" },
  { id: "elasticity", term: "Rapid elasticity", definition: "Adding or removing computing resources within minutes as demand rises and falls, so you pay only for what you use.", topic: "cloud-computing" },
  { id: "multi-tenancy", term: "Multi-tenancy", definition: "Many customers (tenants) sharing the same physical servers, each kept separate and private from the others.", topic: "cloud-computing" },
  { id: "virtualization", term: "Virtualization", definition: "Software that makes one physical computer behave like several separate virtual computers. It is the base of cloud computing.", topic: "cloud-evolution" },
  { id: "hypervisor", term: "Hypervisor", definition: "The software layer that creates and runs virtual machines and shares the real hardware between them, such as KVM, Hyper-V or VMware ESXi.", topic: "cloud-evolution" },
  { id: "virtual-machine", term: "Virtual machine (VM)", definition: "A complete computer made in software, with its own operating system, running on a hypervisor.", topic: "cloud-evolution" },
  { id: "container", term: "Container", definition: "A lightweight package of an app and everything it needs, sharing the host's operating system kernel. Docker made containers popular in 2013.", topic: "cloud-evolution" },
  { id: "serverless", term: "Serverless computing", definition: "Running small functions in the cloud only when an event arrives, without managing any server, and paying per run. AWS Lambda (2014) is an example.", topic: "cloud-evolution" },
  { id: "grid-computing", term: "Grid computing", definition: "Joining many computers in different places to work together on one large job, popular in science from the late 1990s.", topic: "cloud-evolution" },
  { id: "utility-computing", term: "Utility computing", definition: "Paying for computing by use, like electricity or water. John McCarthy suggested the idea in 1961.", topic: "cloud-evolution" },
  { id: "device-shadow", term: "Device shadow (device twin)", definition: "A copy of a device's state kept in the cloud, with the state the app wants (desired) and the state the device last reported. It lets apps work even when the device is offline.", topic: "commercial-clouds" },
  { id: "digital-twin", term: "Digital twin", definition: "A live digital model of a real machine, building or system, kept up to date with sensor data so it can be watched, tested and predicted in software.", topic: "commercial-clouds" },
  { id: "rules-engine", term: "Rules engine", definition: "The part of an IoT platform that checks incoming messages against rules and acts, such as storing data, sending an alert or calling a function.", topic: "commercial-clouds" },
  { id: "device-registry", term: "Device registry", definition: "The list of devices an IoT platform knows, with each device's identity, credentials and details.", topic: "commercial-clouds" },
  { id: "node-red", term: "Node-RED", definition: "An open-source tool for wiring together devices and services by drawing flows in a web browser. Started at IBM in 2013, now an OpenJS Foundation project.", topic: "open-source-platforms" },
  { id: "flow-based-programming", term: "Flow-based programming", definition: "Building a program by connecting nodes with wires; messages flow along the wires and each node does one job on them.", topic: "open-source-platforms" },
  { id: "open-source-licence", term: "Open-source licence", definition: "A licence that lets anyone use, study, change and share software. Apache 2.0 and EPL-2.0 are permissive; AGPL-3.0 requires sharing changes, even for software run as a web service.", topic: "open-source-platforms" },
  { id: "dashboard", term: "Dashboard", definition: "A screen of widgets that shows live data and alerts at a glance, and often lets you control devices.", topic: "cloud-dashboards" },
  { id: "widget", term: "Widget", definition: "One block on a dashboard, such as a gauge, line chart, map, switch or alert, bound to a data stream.", topic: "cloud-dashboards" },
  { id: "hysteresis", term: "Hysteresis", definition: "A gap between the level that turns an alert on and the level that turns it off, so a value wobbling around the limit does not make the alert flash on and off.", topic: "cloud-dashboards" },
  { id: "big-data", term: "Big data", definition: "Data so large, fast or varied that ordinary databases and single computers cannot store or process it in time.", topic: "big-data-analytics" },
  { id: "five-vs", term: "5 Vs of big data", definition: "Volume (how much), velocity (how fast), variety (how many kinds), veracity (how trustworthy) and value (how useful).", topic: "big-data-analytics" },
  { id: "structured-data", term: "Structured data", definition: "Data in fixed rows and columns, such as a table of meter readings. Semi-structured data (JSON, XML) has tags but no fixed table; unstructured data (images, video) has neither.", topic: "big-data-analytics" },
  { id: "batch-processing", term: "Batch processing", definition: "Collecting data first and processing it later in one large job, such as a nightly report or a monthly bill.", topic: "big-data-analytics" },
  { id: "stream-processing", term: "Stream processing", definition: "Processing each reading as it arrives, within seconds, such as raising a fire alarm or spotting a fault.", topic: "big-data-analytics" },
  { id: "data-lake", term: "Data lake", definition: "One large store that keeps raw data of every kind, as it arrives, until someone needs to analyse it.", topic: "big-data-analytics" },
  { id: "moving-average", term: "Moving average", definition: "The average of the last N readings, recalculated as each new reading arrives. It smooths out noise but trails behind real changes.", topic: "big-data-analytics" },
  { id: "z-score", term: "Z-score", definition: "How many standard deviations a reading is from the recent average. A reading with a z-score above about 3 is unusual.", topic: "big-data-analytics" },
  { id: "anomaly", term: "Anomaly", definition: "A reading or pattern that does not fit the normal behaviour, such as a sudden spike, a stuck sensor or a slow drift.", topic: "big-data-analytics" },
  { id: "hadoop", term: "Hadoop", definition: "An open-source Apache framework that stores huge files across many ordinary computers (HDFS) and processes them in parallel (MapReduce, YARN).", topic: "hadoop" },
  { id: "hdfs", term: "HDFS", definition: "Hadoop Distributed File System: splits files into large blocks and stores copies of each block on several machines, so no single failure loses data.", topic: "hadoop" },
  { id: "namenode", term: "NameNode", definition: "The HDFS master that keeps the file system's index: which blocks make up each file and which DataNodes hold them. It stores no file data itself.", topic: "hadoop" },
  { id: "datanode", term: "DataNode", definition: "An HDFS worker machine that stores blocks, sends a heartbeat to the NameNode every 3 seconds and serves data to clients.", topic: "hadoop" },
  { id: "hdfs-block", term: "Block (HDFS)", definition: "The fixed-size piece a file is cut into, 128 MB by default (64 MB in Hadoop 1). Each block is stored as several copies.", topic: "hadoop" },
  { id: "replication-factor", term: "Replication factor", definition: "How many copies HDFS keeps of each block: 3 by default, placed on at least two racks.", topic: "hadoop" },
  { id: "mapreduce", term: "MapReduce", definition: "A way to process huge data in parallel: mappers turn input into key–value pairs, the shuffle groups them by key, and reducers combine each group into a result.", topic: "hadoop" },
  { id: "shuffle", term: "Shuffle and sort", definition: "The MapReduce step that moves every key–value pair from the mappers to the reducer responsible for that key, sorted by key.", topic: "hadoop" },
  { id: "combiner", term: "Combiner", definition: "A mini-reducer that runs on each mapper's output before the shuffle, so far fewer records cross the network.", topic: "hadoop" },
  { id: "yarn", term: "YARN", definition: "Yet Another Resource Negotiator: Hadoop's resource manager, which shares the cluster's CPU and memory between jobs.", topic: "hadoop" },
  { id: "spark", term: "Apache Spark", definition: "A fast processing engine that keeps data in memory between steps. It handles batch and streaming work and often replaces MapReduce.", topic: "hadoop" },
  { id: "kafka", term: "Apache Kafka", definition: "A platform that collects streams of messages from many producers and stores them in order for many consumers, often used to feed IoT data into analytics.", topic: "hadoop" },

  // Unit 2, part B: wireless
  { id: "ism-band", term: "ISM band", definition: "Radio frequencies anyone may use without a licence, such as 2.4 GHz and, in India, 865–867 MHz, within power limits.", topic: "choosing-wireless" },
  { id: "link-budget", term: "Link budget", definition: "The transmit power plus antenna gains minus all losses on the way. If what is left is above the receiver's sensitivity, the link works.", topic: "lora" },
  { id: "rssi", term: "RSSI", definition: "Received Signal Strength Indicator: how strong a received radio signal is, in dBm. −40 dBm is very strong; −95 dBm is about the weakest a phone can hear.", topic: "bluetooth-ble" },
  { id: "header-compression", term: "Header compression", definition: "Leaving out header fields the receiver can work out for itself, so a small radio frame has more room for data. 6LoWPAN shrinks 48 bytes of IPv6 and UDP headers to as few as 6.", topic: "6lowpan" },
  { id: "fragmentation", term: "Fragmentation", definition: "Splitting a packet that is too big for one frame into several smaller pieces, which the receiver puts back together.", topic: "6lowpan" },
  { id: "edge-router", term: "Border (edge) router", definition: "The device that joins a 6LoWPAN or Thread network to ordinary IP networks such as Wi-Fi or Ethernet.", topic: "6lowpan" },
  { id: "thread", term: "Thread", definition: "A low-power mesh network for homes built on IEEE 802.15.4 and 6LoWPAN, so every device has an IPv6 address. Matter runs over it.", topic: "6lowpan" },
  { id: "zigbee", term: "Zigbee", definition: "A low-power mesh networking standard on IEEE 802.15.4 at 2.4 GHz (250 kbps), used for smart lights, plugs and sensors.", topic: "zigbee" },
  { id: "coordinator", term: "Coordinator", definition: "The one Zigbee device that starts the network, chooses its channel and lets new devices join.", topic: "zigbee" },
  { id: "zigbee-router", term: "Router (Zigbee)", definition: "A mains-powered Zigbee device, such as a smart plug or bulb, that passes messages on for other devices.", topic: "zigbee" },
  { id: "end-device", term: "End device", definition: "A battery-powered Zigbee device, such as a door sensor, that sleeps most of the time and never passes on messages for others.", topic: "zigbee" },
  { id: "matter", term: "Matter", definition: "A smart-home standard from the Connectivity Standards Alliance that lets devices from different makers work together over Wi-Fi, Thread or Ethernet.", topic: "zigbee" },
  { id: "csa", term: "Connectivity Standards Alliance (CSA)", definition: "The industry group, formerly the Zigbee Alliance (renamed in 2021), that looks after Zigbee and Matter.", topic: "zigbee" },
  { id: "wifi", term: "Wi-Fi", definition: "Wireless networking based on IEEE 802.11, giving devices fast IP connections through an access point.", topic: "wifi" },
  { id: "access-point", term: "Access point", definition: "The device that Wi-Fi clients connect to; it joins them to the wired network and the internet.", topic: "wifi" },
  { id: "co-channel", term: "Co-channel and adjacent-channel interference", definition: "Access points on the same channel share it by taking turns (co-channel). Access points on partly overlapping channels corrupt each other's signals (adjacent-channel), which is worse.", topic: "wifi" },
  { id: "wifi-halow", term: "Wi-Fi HaLow", definition: "IEEE 802.11ah: Wi-Fi below 1 GHz for IoT, reaching about 1 km at low data rates and low power.", topic: "wifi" },
  { id: "twt", term: "Target Wake Time (TWT)", definition: "A Wi-Fi 6 feature that lets a device agree when it will next wake up, so it can sleep in between and save battery.", topic: "wifi" },
  { id: "bluetooth-sig", term: "Bluetooth SIG", definition: "The Bluetooth Special Interest Group (founded 1998), which writes the Bluetooth specifications, assigns UUIDs and certifies products.", topic: "bluetooth-ble" },
  { id: "ble", term: "Bluetooth Low Energy (BLE)", definition: "The low-power form of Bluetooth (since 4.0) for small, infrequent data such as fitness bands and sensors.", topic: "bluetooth-ble" },
  { id: "piconet", term: "Piconet", definition: "A small Bluetooth Classic network of one central device and up to seven active peripherals. Linked piconets form a scatternet.", topic: "bluetooth-ble" },
  { id: "frequency-hopping", term: "Frequency hopping", definition: "Changing radio channel many times a second (1600 times for Bluetooth Classic) so that interference on one channel does little harm.", topic: "bluetooth-ble" },
  { id: "advertising", term: "Advertising (BLE)", definition: "Short broadcasts a BLE device sends on channels 37, 38 and 39 so that phones can find it.", topic: "bluetooth-ble" },
  { id: "gatt", term: "GATT", definition: "Generic Attribute Profile: how a connected BLE device organises its data as services that contain characteristics.", topic: "bluetooth-ble" },
  { id: "characteristic", term: "Characteristic", definition: "One piece of data in a BLE service, such as Heart Rate Measurement, with properties saying whether it can be read, written or notified.", topic: "bluetooth-ble" },
  { id: "cccd", term: "CCCD", definition: "Client Characteristic Configuration Descriptor (0x2902): writing 01 00 to it turns on notifications for a characteristic.", topic: "bluetooth-ble" },
  { id: "beacon", term: "Beacon", definition: "A BLE device that only advertises a short ID (such as iBeacon or Eddystone) so phones nearby can tell where they are.", topic: "bluetooth-ble" },
  { id: "nfc", term: "NFC", definition: "Near Field Communication: a 13.56 MHz link that works only over a few centimetres, used for tap-to-pay, tags and pairing.", topic: "nfc" },
  { id: "ndef", term: "NDEF", definition: "NFC Data Exchange Format: the standard way to store records such as a web address or text on an NFC tag.", topic: "nfc" },
  { id: "card-emulation", term: "Card emulation", definition: "An NFC mode in which a phone or watch behaves like a contactless card, as in RuPay contactless and UPI tap-to-pay.", topic: "nfc" },
  { id: "lpwan", term: "LPWAN", definition: "Low-Power Wide-Area Network: radio networks such as LoRaWAN, Sigfox and NB-IoT that send small amounts of data over kilometres on a battery that lasts years.", topic: "lora" },
  { id: "lora", term: "LoRa", definition: "A long-range, low-power radio (physical layer) that spreads each signal as a chirp. LoRaWAN is the network protocol built on it.", topic: "lora" },
  { id: "lorawan", term: "LoRaWAN", definition: "The network protocol on top of LoRa radios: end devices talk to gateways, which forward to a network server in a star-of-stars layout.", topic: "lora" },
  { id: "chirp", term: "Chirp", definition: "A signal whose frequency sweeps steadily up (or down). LoRa sends data as chirps, which can be heard even below the noise.", topic: "lora" },
  { id: "spreading-factor", term: "Spreading factor (SF)", definition: "How long each LoRa chirp lasts, from SF7 to SF12. Each step doubles the time: higher SF reaches farther but sends data more slowly.", topic: "lora" },
  { id: "airtime", term: "Time on air", definition: "How long one radio message takes to send. It decides battery use and how many messages a device may send under the rules.", topic: "lora" },
  { id: "sigfox", term: "Sigfox", definition: "An LPWAN that sends tiny messages (12 bytes, up to 140 a day) over very long distances. The company was sold to UnaBiz in 2022.", topic: "lora" },
  { id: "miracast", term: "Miracast", definition: "A Wi-Fi Alliance standard for mirroring a screen to a TV directly over Wi-Fi Direct, with no router. It replaced Intel WiDi.", topic: "widi" },
  // Unit 2, part A: communication
  {
    id: "point-to-point",
    term: "Point-to-point link",
    definition: "A direct link between exactly two devices, such as a sensor wired to a microcontroller. Nothing else shares it.",
    topic: "point-to-point",
  },
  {
    id: "broadcast",
    term: "Broadcast",
    definition: "Sending one message to every device on a network at once, whether or not each one needs it.",
    topic: "point-to-point",
  },
  {
    id: "topology",
    term: "Topology",
    definition: "The shape in which the devices of a network are connected, such as star, mesh, tree, bus or ring.",
    topic: "point-to-point",
  },
  {
    id: "hop",
    term: "Hop",
    definition: "One step a message takes from one device to the next. A message that passes through two routers on its way takes three hops.",
    topic: "point-to-point",
  },
  {
    id: "single-point-of-failure",
    term: "Single point of failure",
    definition: "One part whose failure stops the whole system, such as the hub of a star network.",
    topic: "point-to-point",
  },
  {
    id: "duplex",
    term: "Simplex, half duplex and full duplex",
    definition:
      "Simplex sends one way only (a TV broadcast). Half duplex sends both ways but one at a time (a walkie-talkie). Full duplex sends both ways at once (a phone call).",
    topic: "point-to-point",
  },
  {
    id: "uart",
    term: "UART",
    definition:
      "Universal Asynchronous Receiver–Transmitter: a simple serial link with one wire each way and no clock wire. Both ends agree on the speed in advance.",
    topic: "point-to-point",
  },
  {
    id: "baud-rate",
    term: "Baud rate",
    definition: "How many signal changes a serial line makes per second. For a UART it is the number of bits per second, such as 9600.",
    topic: "point-to-point",
  },
  {
    id: "parity-bit",
    term: "Parity bit",
    definition: "An extra bit that makes the number of 1s even (or odd), so the receiver can spot a single flipped bit.",
    topic: "point-to-point",
  },
  {
    id: "i2c",
    term: "I²C",
    definition:
      "Inter-Integrated Circuit: a two-wire bus (data and clock) on which one controller talks to many chips, each with its own address. Common for sensors on a board.",
    topic: "point-to-point",
  },
  {
    id: "spi",
    term: "SPI",
    definition:
      "Serial Peripheral Interface: a fast four-wire link between a controller and chips such as displays and SD cards. It is full duplex and uses a clock wire.",
    topic: "point-to-point",
  },
  {
    id: "rs-485",
    term: "RS-485",
    definition:
      "A wired standard that sends signals as the difference between two wires, so it resists noise and reaches about 1200 m. Used by Modbus in factories.",
    topic: "point-to-point",
  },
  {
    id: "wifi-direct",
    term: "Wi-Fi Direct",
    definition: "Lets two Wi-Fi devices connect to each other directly, with no router, for example to share files or a screen.",
    topic: "point-to-point",
  },
  {
    id: "push-pull",
    term: "Push–pull",
    definition:
      "A pattern in which producers push messages into a queue and consumers pull them out when they are ready. Each message goes to one consumer.",
    topic: "communication-patterns",
  },
  {
    id: "exclusive-pair",
    term: "Exclusive pair",
    definition:
      "A pattern in which a client and a server keep one connection open and both can send at any time, as with a WebSocket.",
    topic: "communication-patterns",
  },
  {
    id: "message-queue",
    term: "Message queue",
    definition: "A waiting line of messages held by a server until a consumer takes them, so senders and receivers need not work at the same speed.",
    topic: "communication-patterns",
  },
  {
    id: "websocket",
    term: "WebSocket",
    definition:
      "A protocol that turns one HTTP request into a long-lived, two-way connection, so a server can send data to a browser or device at any moment.",
    topic: "communication-patterns",
  },
  {
    id: "osi-model",
    term: "OSI model",
    definition:
      "A seven-layer reference model of networking: physical, data link, network, transport, session, presentation and application.",
    topic: "protocol-architecture",
  },
  {
    id: "perception-layer",
    term: "Perception layer",
    definition: "The bottom layer of IoT architecture: the sensors and actuators that sense and act on the physical world.",
    topic: "protocol-architecture",
  },
  {
    id: "adaptation-layer",
    term: "Adaptation layer",
    definition: "A layer that fits one protocol onto another, such as 6LoWPAN squeezing IPv6 packets into small IEEE 802.15.4 radio frames.",
    topic: "protocol-architecture",
  },
  {
    id: "6lowpan",
    term: "6LoWPAN",
    definition:
      "IPv6 over Low-power Wireless Personal Area Networks: an adaptation layer that compresses IPv6 headers so they fit in small radio frames.",
    topic: "6lowpan",
  },
  {
    id: "ieee-802-15-4",
    term: "IEEE 802.15.4",
    definition: "A standard for low-power, low-data-rate radios (250 kbit/s at 2.4 GHz). Zigbee, Thread and 6LoWPAN all run on top of it.",
    topic: "protocol-architecture",
  },
  {
    id: "rpl",
    term: "RPL",
    definition: "Routing Protocol for Low-power and lossy networks: finds routes for IPv6 packets through a mesh of small battery devices.",
    topic: "protocol-architecture",
  },
  {
    id: "iot-a",
    term: "IoT-A reference model",
    definition:
      "A European reference architecture (Internet of Things – Architecture) that gives common names and views for designing IoT systems, including security and trust.",
    topic: "protocol-architecture",
  },
  {
    id: "acknowledgement",
    term: "Acknowledgement (ACK)",
    definition:
      "A short reply that confirms a message arrived. If no ACK comes back in time, the sender can send the message again.",
    topic: "udp",
  },
  {
    id: "checksum",
    term: "Checksum",
    definition:
      "A small number worked out from the bytes of a message and sent with it. The receiver works it out again; if the two differ, the data was damaged on the way.",
    topic: "udp",
  },
  {
    id: "retransmission",
    term: "Retransmission",
    definition: "Sending a message again because no acknowledgement came back in time, so the first copy is taken to be lost.",
    topic: "udp",
  },
  {
    id: "head-of-line-blocking",
    term: "Head-of-line blocking",
    definition:
      "When one lost packet holds up the packets behind it. TCP delivers data strictly in order, so later data waits until the missing piece is resent.",
    topic: "udp",
  },
  {
    id: "exponential-backoff",
    term: "Exponential back-off",
    definition:
      "Waiting twice as long before each new retry. CoAP and TCP use it so that a busy network is not flooded with resends.",
    topic: "coap",
  },
  {
    id: "persistent-session",
    term: "Persistent session",
    definition:
      "An MQTT session that the broker keeps after the client disconnects: its subscriptions stay, and QoS 1 and 2 messages are stored until it reconnects. A clean session is forgotten instead.",
    topic: "mqtt",
  },
  {
    id: "deadband",
    term: "Deadband",
    definition:
      "A filter rule that sends a new reading only when it differs from the last one sent by more than a set amount, so tiny changes do not waste bandwidth.",
    topic: "gateway-protocols",
  },
  {
    id: "amqp",
    term: "AMQP",
    definition:
      "Advanced Message Queuing Protocol: a messaging protocol for business systems that routes messages into queues through a broker.",
    topic: "gateway-protocols",
  },
  {
    id: "coap",
    term: "CoAP",
    definition:
      "Constrained Application Protocol: a lightweight, web-like request–response protocol that runs over UDP, made for small devices.",
    topic: "coap",
  },
  {
    id: "dds",
    term: "DDS",
    definition:
      "Data Distribution Service: a publish–subscribe standard without a central broker, used in robots, vehicles and defence systems.",
    topic: "gateway-protocols",
  },
  {
    id: "dtls",
    term: "DTLS",
    definition:
      "Datagram TLS: the version of TLS encryption that works over UDP. CoAP uses it to secure messages.",
    topic: "coap",
  },
  {
    id: "encapsulation",
    term: "Encapsulation",
    definition:
      "Wrapping data inside the headers of each protocol layer as it goes down the stack, like putting a letter in an envelope and then in a parcel.",
    topic: "protocols-overview",
  },
  {
    id: "federation",
    term: "Federation",
    definition:
      "Servers run by different organisations connecting to each other, so users on one server can message users on another, like email.",
    topic: "xmpp",
  },
  {
    id: "handshake",
    term: "Handshake",
    definition:
      "An exchange of messages that sets up a connection before data is sent. TCP uses a three-way handshake: SYN, SYN-ACK, ACK.",
    topic: "udp",
  },
  {
    id: "header",
    term: "Header",
    definition:
      "Control information added in front of the data in a packet, such as addresses, ports and lengths.",
    topic: "protocols-overview",
  },
  {
    id: "jid",
    term: "JID (Jabber ID)",
    definition:
      "The address of an XMPP user or device, written like user@domain/resource, for example sensor1@home.example/kitchen.",
    topic: "xmpp",
  },
  {
    id: "keep-alive",
    term: "Keep-alive",
    definition:
      "Small messages sent regularly to show a connection is still working. MQTT clients send PINGREQ when they have nothing else to send.",
    topic: "mqtt",
  },
  {
    id: "last-will",
    term: "Last Will and Testament (LWT)",
    definition:
      "A message an MQTT client leaves with the broker in advance. The broker publishes it if the client disconnects unexpectedly.",
    topic: "mqtt",
  },
  {
    id: "lwm2m",
    term: "LwM2M",
    definition:
      "Lightweight M2M: a standard from OMA for managing IoT devices remotely, such as updating firmware or reading settings. It runs over CoAP.",
    topic: "gateway-protocols",
  },
  {
    id: "middleware",
    term: "Middleware",
    definition:
      "Software that sits between devices and applications and handles common jobs such as messaging, device management and data storage.",
    topic: "protocols-overview",
  },
  {
    id: "modbus",
    term: "Modbus",
    definition:
      "A simple industrial protocol from 1979 for reading and writing values (registers) in machines, over serial lines or TCP.",
    topic: "gateway-protocols",
  },
  {
    id: "observe",
    term: "Observe (CoAP)",
    definition:
      "A CoAP option that lets a client register interest in a resource once and then receive a notification every time it changes.",
    topic: "coap",
  },
  {
    id: "polling",
    term: "Polling",
    definition:
      "Asking a server again and again whether anything has changed. It is simple but wastes requests when nothing is new.",
    topic: "http",
  },
  {
    id: "port",
    term: "Port",
    definition:
      "A number that identifies which program on a device should receive a message, such as 80 for HTTP or 1883 for MQTT.",
    topic: "udp",
  },
  {
    id: "qos",
    term: "QoS (quality of service)",
    definition:
      "In MQTT, the delivery guarantee for a message: 0 at most once, 1 at least once, 2 exactly once.",
    topic: "mqtt",
  },
  {
    id: "rest",
    term: "REST",
    definition:
      "A style of web API where each thing is a resource with its own URL, read and changed with standard HTTP methods such as GET and PUT.",
    topic: "http",
  },
  {
    id: "retained-message",
    term: "Retained message",
    definition:
      "An MQTT message the broker keeps as the last known value of a topic and sends to every new subscriber straight away.",
    topic: "mqtt",
  },
  {
    id: "rtos",
    term: "RTOS (real-time operating system)",
    definition:
      "A small operating system for microcontrollers that runs tasks on strict schedules, such as FreeRTOS or Zephyr.",
    topic: "protocols-overview",
  },
  {
    id: "stanza",
    term: "Stanza",
    definition:
      "A single XML message in XMPP. There are three kinds: message, presence and iq (info/query).",
    topic: "xmpp",
  },
  {
    id: "status-code",
    term: "Status code",
    definition:
      "A three-digit number in an HTTP response that says how the request went, such as 200 OK or 404 Not Found.",
    topic: "http",
  },
  {
    id: "tcp",
    term: "TCP",
    definition:
      "Transmission Control Protocol: sets up a connection and makes sure every byte arrives, in order, resending anything lost.",
    topic: "udp",
  },
  {
    id: "topic",
    term: "Topic (MQTT)",
    definition:
      "A text label such as home/kitchen/temperature that names what a message is about. Subscribers choose topics to receive.",
    topic: "mqtt",
  },
  {
    id: "udp",
    term: "UDP",
    definition:
      "User Datagram Protocol: sends packets without a connection or delivery checks. It is fast and light, but lost packets stay lost.",
    topic: "udp",
  },
  {
    id: "webhook",
    term: "Webhook",
    definition:
      "A URL a server calls when something happens, so the receiver gets updates without polling.",
    topic: "http",
  },
  {
    id: "wildcard",
    term: "Wildcard (MQTT)",
    definition:
      "A symbol in an MQTT subscription that matches many topics: + matches one level and # matches all remaining levels.",
    topic: "mqtt",
  },
  {
    id: "xmpp",
    term: "XMPP",
    definition:
      "Extensible Messaging and Presence Protocol: an XML-based chat protocol that devices can also use to message each other and share presence.",
    topic: "xmpp",
  },
  {
    id: "adc",
    term: "ADC (analog-to-digital converter)",
    definition:
      "A circuit that turns a voltage into a number. A 10-bit ADC gives numbers from 0 to 1023.",
    topic: "sensor-nodes",
  },
  {
    id: "analog-signal",
    term: "Analog signal",
    definition:
      "A signal that can take any value in a range, such as a voltage that rises smoothly as a room warms up.",
    topic: "sensor-nodes",
  },
  {
    id: "cloudlet",
    term: "Cloudlet",
    definition:
      "A small cloud data centre placed at the edge of the network, close to users. Cloudlets form the peripheral cloud.",
    topic: "edge-fog-cloud",
  },
  {
    id: "digital-signal",
    term: "Digital signal",
    definition: "A signal with only a few fixed values, usually two: HIGH (1) and LOW (0).",
    topic: "sensor-nodes",
  },
  {
    id: "duty-cycle",
    term: "Duty cycle",
    definition:
      "The share of time a device is awake or a signal is on. A node awake 1 second in every 100 has a 1% duty cycle.",
    topic: "sensor-nodes",
  },
  {
    id: "energy-harvesting",
    term: "Energy harvesting",
    definition:
      "Collecting small amounts of energy from the surroundings, such as light, heat or vibration, to power or recharge a device.",
    topic: "sensor-nodes",
  },
  {
    id: "firmware",
    term: "Firmware",
    definition:
      "The program stored inside a device's chip that controls how the device works. Updating it can fix bugs or security holes.",
    topic: "single-board-computers",
  },
  {
    id: "fog-computing",
    term: "Fog computing",
    definition:
      "Processing data on local servers between the devices and the cloud, such as in a factory or at a mobile tower.",
    topic: "edge-fog-cloud",
  },
  {
    id: "gpio",
    term: "GPIO (general-purpose input/output)",
    definition:
      "Pins on a board that a program can set HIGH or LOW, or read, to connect sensors, buttons and LEDs.",
    topic: "single-board-computers",
  },
  {
    id: "interoperability",
    term: "Interoperability",
    definition:
      "The ability of devices from different makers to work together because they follow the same standards and protocols.",
    topic: "iot-characteristics",
  },
  {
    id: "ipv6",
    term: "IPv6",
    definition:
      "The newer version of the Internet Protocol. Its 128-bit addresses are enough to give every IoT device its own address.",
    topic: "iot-characteristics",
  },
  {
    id: "open-source-hardware",
    term: "Open-source hardware",
    definition:
      "Hardware whose design files are published so anyone can study, change, make and sell it, as long as they follow the licence.",
    topic: "single-board-computers",
  },
  {
    id: "pwm",
    term: "PWM (pulse-width modulation)",
    definition:
      "Switching a pin on and off very quickly. The share of on-time sets the average power, for example how bright an LED looks.",
    topic: "single-board-computers",
  },
  {
    id: "quantisation",
    term: "Quantisation",
    definition:
      "Rounding a smooth value to the nearest step an ADC can represent. The small difference is called quantisation error.",
    topic: "sensor-nodes",
  },
  {
    id: "rfid",
    term: "RFID",
    definition:
      "Radio-frequency identification: tags that a reader can identify by radio without touching them. FASTag uses RFID.",
    topic: "iot-characteristics",
  },
  {
    id: "sampling-rate",
    term: "Sampling rate",
    definition:
      "How often a sensor value is measured, for example 10 times per second (10 Hz) or once a minute.",
    topic: "sensor-nodes",
  },
  {
    id: "scalability",
    term: "Scalability",
    definition:
      "The ability of a system to keep working well as it grows from a few devices to thousands or millions.",
    topic: "iot-characteristics",
  },
  {
    id: "sbc",
    term: "Single-board computer (SBC)",
    definition:
      "A complete computer on one circuit board, with processor, memory and ports, that can run an operating system. The Raspberry Pi is one.",
    topic: "single-board-computers",
  },
  {
    id: "smart-grid",
    term: "Smart grid",
    definition:
      "An electricity network that uses sensors, smart meters and two-way communication to balance supply and demand.",
    topic: "iot-infrastructure",
  },
  {
    id: "telematics",
    term: "Telematics",
    definition:
      "Collecting and sending data from vehicles, such as location, speed and engine health, over a mobile network.",
    topic: "iot-infrastructure",
  },
  {
    id: "transceiver",
    term: "Transceiver",
    definition: "A single part that can both transmit and receive radio signals.",
    topic: "sensor-nodes",
  },
  {
    id: "unique-identifier",
    term: "Unique identifier",
    definition:
      "A name or number, such as an IP address, MAC address or RFID code, that belongs to exactly one device.",
    topic: "iot-characteristics",
  },
  {
    id: "wearable",
    term: "Wearable",
    definition:
      "A small IoT device worn on the body, such as a fitness band or smartwatch, that tracks things like steps and heart rate.",
    topic: "iot-infrastructure",
  },
  {
    id: "actuator",
    term: "Actuator",
    definition:
      "A part that does something in the physical world when told to, such as a motor, relay, buzzer or LED.",
    topic: "sensor-nodes",
  },
  {
    id: "bandwidth",
    term: "Bandwidth",
    definition:
      "How much data a link can carry each second, usually given in kilobits or megabits per second (kbps, Mbps).",
  },
  {
    id: "broker",
    term: "Broker",
    definition:
      "A server in the middle that receives messages from publishers and passes them to every subscriber of that topic. MQTT uses a broker.",
    topic: "mqtt",
  },
  {
    id: "cloud",
    term: "Cloud",
    definition:
      "Computers in large data centres that you use over the internet to store and process data, instead of owning the machines yourself.",
    topic: "cloud-computing",
  },
  {
    id: "edge-computing",
    term: "Edge computing",
    definition:
      "Processing data close to where it is produced, on the device or a nearby computer, instead of sending everything to the cloud.",
    topic: "edge-fog-cloud",
  },
  {
    id: "gateway",
    term: "Gateway",
    definition:
      "A device that connects local IoT devices to the internet, often translating between their protocol and an internet protocol.",
    topic: "gateway-protocols",
  },
  {
    id: "iot",
    term: "Internet of Things (IoT)",
    definition:
      "Everyday objects fitted with sensors, processors and network connections so they can collect data and be monitored or controlled over the internet.",
    topic: "iot-components",
  },
  {
    id: "jitter",
    term: "Jitter",
    definition:
      "Variation in delay from one packet to the next. Low jitter means packets arrive at a steady pace.",
  },
  {
    id: "latency",
    term: "Latency",
    definition:
      "The time a packet takes to travel from sender to receiver, usually measured in milliseconds (ms).",
  },
  {
    id: "microcontroller",
    term: "Microcontroller (MCU)",
    definition:
      "A small computer on one chip, with processor, memory and input/output pins, used to control devices. The Arduino Uno uses one.",
    topic: "single-board-computers",
  },
  {
    id: "mqtt",
    term: "MQTT",
    definition:
      "A lightweight publish–subscribe messaging protocol widely used in IoT. Devices publish messages to topics on a broker.",
    topic: "mqtt",
  },
  {
    id: "node",
    term: "Node",
    definition: "Any device that is part of a network, such as a sensor, a gateway or a server.",
    topic: "sensor-nodes",
  },
  {
    id: "packet",
    term: "Packet",
    definition:
      "A small chunk of data sent over a network. It carries the data itself (the payload) plus headers saying where it comes from and where it is going.",
  },
  {
    id: "packet-loss",
    term: "Packet loss",
    definition:
      "When a packet never reaches its destination, for example because of radio interference or a full queue. Usually given as a percentage.",
  },
  {
    id: "payload",
    term: "Payload",
    definition:
      "The useful data inside a packet, such as a temperature reading, as opposed to the headers that help deliver it.",
  },
  {
    id: "protocol",
    term: "Protocol",
    definition:
      "An agreed set of rules for how devices format, send and understand messages. MQTT, HTTP and UDP are protocols.",
    topic: "protocols-overview",
  },
  {
    id: "publish-subscribe",
    term: "Publish–subscribe",
    definition:
      "A messaging pattern where senders publish to a topic and receivers subscribe to topics, without knowing about each other.",
    topic: "communication-patterns",
  },
  {
    id: "sensor",
    term: "Sensor",
    definition:
      "A part that measures something in the physical world, such as temperature, light or motion, and turns it into an electrical signal.",
    topic: "sensor-nodes",
  },
  {
    id: "simulation",
    term: "Simulation",
    definition:
      "A computer model that behaves like a real system, so you can experiment safely and repeat runs without real hardware.",
    topic: "getting-started",
  },
  {
    id: "throughput",
    term: "Throughput",
    definition:
      "How much data actually gets through per second. It is often lower than the bandwidth because of losses and overhead.",
  },
];

const byId = new Map(glossary.map((t) => [t.id, t]));

export function getTerm(id: string): GlossaryTerm | undefined {
  return byId.get(id);
}
