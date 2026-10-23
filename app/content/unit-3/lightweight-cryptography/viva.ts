import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "What is lightweight cryptography?",
    a: "Cryptography designed for constrained devices with little memory, slow processors, few logic gates and limited energy, while still giving strong security.",
  },
  {
    q: "What makes a cipher lightweight?",
    a: "Small code and RAM, few logic gates in hardware, simple operations such as add, rotate and XOR, sometimes smaller blocks, and authenticated encryption in one pass.",
  },
  {
    q: "Describe PRESENT.",
    a: "A lightweight block cipher from 2007 with 64-bit blocks, 80- or 128-bit keys and 31 rounds, built in about 1,600 logic gates, standardised in ISO/IEC 29192-2.",
  },
  {
    q: "What is Ascon and why is it important?",
    a: "A family of lightweight algorithms for authenticated encryption and hashing. It won NIST's competition in 2023 and became the NIST standard SP 800-232 in August 2025.",
  },
  {
    q: "Why is ECC preferred over RSA in IoT?",
    a: "ECC gives the same security with much smaller keys (256-bit ECC ≈ 3072-bit RSA), so it needs less memory, computation and energy.",
  },
  {
    q: "When is ChaCha20 a better choice than AES?",
    a: "On processors without AES hardware or instructions, where ChaCha20 runs faster in plain software, as on many phones and the Raspberry Pi 4.",
  },
  {
    q: "Does encryption drain an IoT battery much?",
    a: "Usually not: encrypting a short message costs far less energy than sending it by radio, so strong authenticated encryption barely changes battery life.",
  },
];

export default viva;
