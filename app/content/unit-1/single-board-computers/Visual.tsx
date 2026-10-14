import { useState } from "react";
import { ExploreLayout, type ExploreItem } from "~/components/theory/ExploreLayout";
import { Segmented } from "~/components/ui/Segmented";
import BoardsScene, { type BoardKind, type PiPart, type UnoPart } from "./BoardsScene";
import PinoutDiagrams from "./PinoutDiagrams";

type Item<T extends string> = ExploreItem & { id: T; short: string };

const piParts: Item<PiPart>[] = [
  {
    id: "soc",
    short: "SoC",
    name: "SoC (processor)",
    text: "A system on a chip: a quad-core ARM processor and graphics on one chip. It runs a full operating system such as Raspberry Pi OS, a version of Linux.",
  },
  {
    id: "ram",
    short: "RAM",
    name: "RAM",
    text: "Working memory, from 1 to 8 GB on a Raspberry Pi 4. More RAM lets it run more programs at once.",
  },
  {
    id: "wireless",
    short: "Wi-Fi and Bluetooth",
    name: "Wi-Fi and Bluetooth",
    text: "Built-in wireless, so the board can join a network without a cable.",
  },
  {
    id: "gpio",
    short: "GPIO header",
    name: "GPIO header",
    text: "40 pins for connecting sensors, LEDs and other parts. The signal pins work at 3.3 V, not 5 V.",
  },
  {
    id: "usb",
    short: "USB ports",
    name: "USB ports",
    text: "Connect a keyboard, mouse, camera or storage.",
  },
  {
    id: "ethernet",
    short: "Ethernet",
    name: "Ethernet port",
    text: "A wired network connection.",
  },
  {
    id: "hdmi",
    short: "Micro-HDMI",
    name: "Micro-HDMI ports",
    text: "Connect up to two monitors.",
  },
  {
    id: "power",
    short: "USB-C power",
    name: "USB-C power",
    text: "The 5 V power input.",
  },
  {
    id: "sd",
    short: "microSD",
    name: "microSD slot",
    text: "Holds the memory card with the operating system and your files.",
  },
];

const unoParts: Item<UnoPart>[] = [
  {
    id: "mcu",
    short: "ATmega328P",
    name: "ATmega328P microcontroller",
    text: "The 8-bit chip that runs your sketch at 16 MHz, with 32 KB of flash for the program and 2 KB of RAM. There is no operating system.",
  },
  {
    id: "digital",
    short: "Digital pins",
    name: "Digital pins 0–13",
    text: "Read or write HIGH and LOW. Pins marked ~ (3, 5, 6, 9, 10 and 11) can also output PWM. Pins 0 and 1 are used for serial communication.",
  },
  {
    id: "analog",
    short: "Analog pins",
    name: "Analog pins A0–A5",
    text: "Read voltages between 0 and 5 V as numbers from 0 to 1023, using a 10-bit ADC.",
  },
  {
    id: "usb",
    short: "USB-B port",
    name: "USB-B port",
    text: "Uploads sketches from the computer and powers the board.",
  },
  {
    id: "jack",
    short: "Power jack",
    name: "Power jack",
    text: "Accepts 7–12 V from a battery or adapter when no USB cable is connected.",
  },
  {
    id: "powerpins",
    short: "Power pins",
    name: "Power pins",
    text: "5 V, 3.3 V and GND for powering sensors and modules.",
  },
  {
    id: "reset",
    short: "Reset button",
    name: "Reset button",
    text: "Restarts your sketch from the beginning.",
  },
];

const shortNames = (items: Item<string>[]) =>
  Object.fromEntries(items.map((item) => [item.id, item.short]));
const PI_SHORT = shortNames(piParts);
const UNO_SHORT = shortNames(unoParts);

const boardOptions: { value: BoardKind; label: string }[] = [
  { value: "pi", label: "Raspberry Pi" },
  { value: "uno", label: "Arduino Uno" },
];

export default function SingleBoardComputersVisual() {
  const [board, setBoard] = useState<BoardKind>("pi");
  const [piActive, setPiActive] = useState<PiPart>("soc");
  const [unoActive, setUnoActive] = useState<UnoPart>("mcu");

  const isPi = board === "pi";
  const items = isPi ? piParts : unoParts;
  const active = isPi ? piActive : unoActive;
  const select = (id: string) => {
    if (isPi) setPiActive(id as PiPart);
    else setUnoActive(id as UnoPart);
  };

  return (
    <div className="grid grid-cols-1 gap-10">
      <ExploreLayout
        scene={
          <BoardsScene
            board={board}
            active={active}
            onSelect={select}
            labels={isPi ? PI_SHORT : UNO_SHORT}
          />
        }
        listTitle={isPi ? "Parts of the Raspberry Pi" : "Parts of the Arduino Uno"}
        items={items}
        active={active}
        onSelect={select}
        controls={
          <Segmented
            label="Board"
            options={boardOptions}
            value={board}
            onChange={setBoard}
            className="mb-2"
          />
        }
        notice={[
          "A Raspberry Pi is a full computer that runs an operating system. An Arduino runs a single program directly on a microcontroller.",
          "Raspberry Pi GPIO pins use 3.3 V logic. Connecting 5 V to a signal pin can damage the board.",
          "Select a part on the board or in the list to read what it does.",
        ]}
      />
      <PinoutDiagrams board={board} />
    </div>
  );
}
