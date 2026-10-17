import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is point-to-point communication? Give two IoT examples.",
    a: "A direct link between exactly two devices. Examples: a GPS module connected to a microcontroller over UART, and a fitness band paired with a phone over Bluetooth.",
  },
  {
    q: "Differentiate between simplex, half duplex and full duplex.",
    a: "Simplex sends one way only, like a beacon. Half duplex sends both ways but one at a time, like I²C or a walkie-talkie. Full duplex sends both ways at once, like UART or a phone call.",
  },
  {
    q: "What is a network topology? Name five.",
    a: "The pattern in which devices are connected. Five common ones are star, mesh, tree, bus and ring.",
  },
  {
    q: "What is a single point of failure? Which topologies have one?",
    a: "A part whose failure stops the whole system. The hub of a star is one; in a bus, the shared cable is one; in a tree, every parent is one for the devices below it.",
  },
  {
    q: "Why is a mesh more reliable than a star?",
    a: "Each device in a mesh has links to several neighbours, so if one device or link fails, messages take another route. In a star, losing the hub cuts everyone off.",
  },
  {
    q: "Describe a UART frame.",
    a: "The line idles high. A start bit (0) begins the frame, then eight data bits are sent lowest bit first, then an optional parity bit, and finally a stop bit (1).",
  },
  {
    q: "Compare I²C and SPI.",
    a: "I²C uses two wires (data and clock), is half duplex and gives each chip an address. SPI uses four wires, is full duplex and faster, and chooses each chip with a chip-select wire.",
  },
  {
    q: "Name three wireless point-to-point technologies.",
    a: "Bluetooth or BLE (phone to band), NFC (tap to pay) and Wi-Fi Direct (phone to printer without a router).",
  },
];

export default viva;
