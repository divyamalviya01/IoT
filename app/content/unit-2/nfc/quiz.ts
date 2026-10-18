import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "At what frequency does NFC work?",
    options: ["125 kHz", "13.56 MHz", "865 MHz", "2.4 GHz"],
    answer: 1,
    explanation: "NFC uses 13.56 MHz, the same as high-frequency RFID.",
  },
  {
    id: "q2",
    question: "How does an NFC reader communicate with a tag?",
    options: ["By light", "By magnetic induction between coils", "By sound", "Through Wi-Fi"],
    answer: 1,
    explanation: "The reader's coil makes a changing magnetic field that induces a current in the tag's coil.",
  },
  {
    id: "q3",
    question: "Where does a passive NFC tag get its power?",
    options: ["A coin cell", "Solar cells", "The reader's magnetic field", "The mains"],
    answer: 2,
    explanation: "Passive tags have no battery; the reader's field powers the chip while it is close.",
  },
  {
    id: "q4",
    question: "About how close must a phone be to read a tag reliably?",
    options: ["4 cm", "1 m", "10 m", "100 m"],
    answer: 0,
    explanation: "Reads are reliable up to about 4 cm; about 10 cm is the absolute limit.",
  },
  {
    id: "q5",
    question: "Paying with a phone at a card machine uses which NFC mode?",
    options: ["Reader/writer", "Card emulation", "Peer-to-peer", "Broadcast"],
    answer: 1,
    explanation: "In card emulation the phone behaves like a contactless card.",
  },
  {
    id: "q6",
    question: "What format do NFC tags use to store data such as a web address?",
    options: ["JSON", "NDEF", "MQTT", "CSV"],
    answer: 1,
    explanation: "NFC Data Exchange Format (NDEF) stores records such as URI and Text.",
  },
  {
    id: "q7",
    question: "Why does a URI record store \"https://\" as a single byte 04?",
    options: [
      "To encrypt it",
      "To save space on tags with little memory",
      "Because https is not allowed",
      "To make it readable by people",
    ],
    answer: 1,
    explanation: "Prefix codes replace common URL beginnings with one byte, saving precious tag memory.",
  },
  {
    id: "q8",
    question: "Which technology does FASTag use?",
    options: ["NFC", "UHF RFID", "Bluetooth", "LoRaWAN"],
    answer: 1,
    explanation: "FASTag is UHF RFID, read from several metres away by the toll plaza reader.",
  },
  {
    id: "q9",
    question: "Why is NFC's short range an advantage for payments?",
    options: [
      "It saves the bank money",
      "The card or phone must be brought close deliberately, so payments cannot happen by accident from far away",
      "It makes payments slower",
      "It removes the need for encryption",
    ],
    answer: 1,
    explanation: "A deliberate tap is needed, which protects against accidental or distant reads (encryption is still used).",
  },
  {
    id: "q10",
    question: "Which NFC mode is now mostly history on phones?",
    options: ["Reader/writer", "Card emulation", "Peer-to-peer (such as Android Beam)", "None"],
    answer: 2,
    explanation: "Android Beam, the best-known peer-to-peer use, was removed in Android 10.",
  },
];

export default quiz;
