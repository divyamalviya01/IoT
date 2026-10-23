import type { LabRecordDef } from "~/content/types";

const record: LabRecordDef = {
  apparatus: [
    "IoT Simulator Lab running in a web browser",
    "The browser's Web Crypto API, for real SHA-256 hashing and AES-128-GCM encryption",
    "Toy RSA and Diffie–Hellman with small numbers, worked step by step",
  ],
  theory:
    "Symmetric encryption, such as AES, uses one shared secret key to encrypt and decrypt; it is fast, so it protects the bulk of the data. Asymmetric encryption, such as RSA, uses a key pair: the public key (e, n) encrypts or verifies, and the private key (d, n) decrypts or signs. In RSA, n = p × q, φ(n) = (p − 1)(q − 1), d is the inverse of e modulo φ(n), c = m^e mod n and m = c^d mod n. A hash such as SHA-256 turns any input into a fixed 256-bit value: the same input always gives the same hash, one changed character changes about half the bits, and the input cannot be worked back. AES-GCM adds a 16-byte authentication tag, so a changed ciphertext or a wrong key is refused. Diffie–Hellman lets two devices agree on a secret over an open network: each sends g^secret mod p, both compute the same value, and an eavesdropper cannot work it out when p is large.",
  procedure: [
    "Open lab L26, Crypto workbench. In the SHA-256 tool, hash abc and check that the hash begins ba7816bf. Press Record observation.",
    "Type a reading such as temp=31.2, press Change one character, count the changed bits and record.",
    "In the AES-GCM tool, encrypt the message, decrypt it and record. Change one bit of the ciphertext, decrypt and record. Undo it, use a different key, decrypt and record.",
    "In the Toy RSA tool, use p = 61, q = 53 and e = 17. Write down n, φ(n) and d, check that 65 encrypts to 2790 and decrypts back, and record. Change the signed message and record.",
    "In the Toy Diffie–Hellman tool, use p = 23, g = 5, a = 6 and b = 15. Check the shared secret, let Eve try every secret and record.",
    "Open the lab record, write your result and print it.",
  ],
  observationColumns: [
    { key: "tool", label: "Tool" },
    { key: "input", label: "Input" },
    { key: "params", label: "Key / parameters" },
    { key: "output", label: "Output" },
    { key: "check", label: "Check" },
  ],
  resultHint:
    "State how many hash bits changed when one character changed, what AES-GCM did with a changed bit and a wrong key, the RSA values n, φ(n) and d with the 65 → 2790 → 65 round trip, and the Diffie–Hellman shared secret.",
  viva: [
    {
      q: "What is the difference between symmetric and asymmetric encryption?",
      a: "Symmetric encryption, like AES, uses one shared key to lock and unlock. Asymmetric encryption, like RSA, uses a public key and a private key.",
    },
    {
      q: "Why did one changed character change about half the bits of the SHA-256 hash?",
      a: "SHA-256 is built for the avalanche effect: every output bit depends on every input bit, so a tiny change gives an unrelated-looking hash.",
    },
    {
      q: "Why did AES-GCM refuse the ciphertext after one bit was changed?",
      a: "GCM works out an authentication tag from the ciphertext. The tag from the changed data did not match the 16-byte tag that was sent, so decryption was refused.",
    },
    {
      q: "With p = 61, q = 53 and e = 17, find n, φ(n) and d.",
      a: "n = 61 × 53 = 3233 and φ(n) = 60 × 52 = 3120. d = 2753, because 17 × 2753 = 46801 = 15 × 3120 + 1.",
    },
    {
      q: "How is an RSA signature different from RSA encryption?",
      a: "To sign, the owner uses the private key d and anyone checks it with the public key e. To encrypt, anyone uses the public key and only the owner can decrypt.",
    },
    {
      q: "In Diffie–Hellman, what does an eavesdropper see, and why can't she find the secret?",
      a: "She sees p, g, A and B. To get the secret she must find a from A = g^a mod p, which is far too slow when p is very large.",
    },
  ],
};

export default record;
