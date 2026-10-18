import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "Simulated phone and NFC tags (NTAG213, NTAG215, NTAG216) with an NDEF record builder",
  ],
  theory:
    "NFC works at 13.56 MHz by magnetic induction: the phone's coil makes a magnetic field that powers a passive tag and lets it answer. The field fades very quickly with distance, so reads are reliable only up to about 4 cm and fail beyond about 8 cm (10 cm is the theoretical limit). Tags store data as NDEF records: a header byte, the type length, the payload length, the type (U for URI, T for Text) and the payload. On the tag, the message is wrapped in a TLV (03, length, message, FE). Tags have small memories, such as 144 bytes on an NTAG213.",
  procedure: [
    "Open lab L18, NFC tap lab. Keep the URI record https://example.com, read its bytes and press Write to tag.",
    "Set the distance to 2 cm, press Tap 10 times and press Record observation.",
    "Repeat at 4 cm, 6 cm and 8 cm, recording each.",
    "Choose a Text record, set the language to Hindi, note the bytes for नमस्ते, write it and tap at 2 cm. Record it.",
    "Type a very long web address and find which tag it fits on.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "record", label: "Record" },
    { key: "bytes", label: "Bytes on tag" },
    { key: "tag", label: "Tag" },
    { key: "distance", label: "Distance", unit: "cm" },
    { key: "reads", label: "Successful reads" },
  ],
  resultHint:
    "Describe how the number of successful reads changed with distance, and explain why. Compare the bytes used by your records with the tag's memory.",
  viva: [
    {
      q: "Why did reads fail beyond about 8 cm?",
      a: "The magnetic field weakens very steeply with distance, so far from the phone it is too weak to power the tag's chip.",
    },
    {
      q: "Why does a URI record store https:// as the single byte 04?",
      a: "URI prefix codes replace common beginnings with one byte to save space on tags with very little memory.",
    },
    {
      q: "Why does the Hindi word नमस्ते take 18 bytes for 6 characters?",
      a: "NDEF text is stored in UTF-8, where each Devanagari character takes 3 bytes, while English letters take 1 byte each.",
    },
    {
      q: "What is the TLV wrapper on the tag?",
      a: "Type 03 (NDEF message), the length, the message itself, then FE to mark the end of the data.",
    },
    {
      q: "Where does a passive tag get its power?",
      a: "From the phone's 13.56 MHz magnetic field, which induces a current in the tag's coil while the phone is close.",
    },
    {
      q: "Why is the short range of NFC an advantage for payments?",
      a: "The card or phone must be brought deliberately close, so a payment cannot be made by accident from across the room.",
    },
  ],
};

export default record;
