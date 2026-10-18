import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is NFC?",
    a: "Near Field Communication: a 13.56 MHz wireless link that works only over a few centimetres, used for tap-to-pay, smart tags and quick pairing.",
  },
  {
    q: "How does NFC work?",
    a: "By magnetic induction. The reader's coil makes a changing magnetic field at 13.56 MHz, which induces a current in the tag's coil. A passive tag is powered by this field and answers by changing how much power it draws.",
  },
  {
    q: "Name the three NFC modes with examples.",
    a: "Reader/writer (a phone reads a smart poster), card emulation (paying with a phone or RuPay contactless card) and peer-to-peer (two phones exchanging data, now mostly history).",
  },
  {
    q: "What is NDEF?",
    a: "NFC Data Exchange Format, the standard way to store records such as a URI or text on a tag. Each record has a header, a type and a payload.",
  },
  {
    q: "Why is the working range of NFC so short?",
    a: "The magnetic field fades very quickly with distance, so reads are reliable only up to about 4 cm, with about 10 cm as the limit.",
  },
  {
    q: "Differentiate NFC and RFID.",
    a: "RFID is the broader family: low-frequency, high-frequency and UHF bands, mostly one-way reading of tags, with ranges up to several metres for UHF. NFC is a 13.56 MHz form of high-frequency RFID that also allows two-way communication between devices.",
  },
  {
    q: "Is FASTag an example of NFC?",
    a: "No. FASTag uses UHF RFID, read from several metres away by the toll plaza reader. NFC works only over a few centimetres.",
  },
];

export default viva;
