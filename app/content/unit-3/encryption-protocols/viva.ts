import type { VivaItem } from "~/content/types";

const viva: VivaItem[] = [
  {
    q: "Differentiate symmetric and asymmetric encryption.",
    a: "Symmetric encryption uses one shared secret key and is fast (AES). Asymmetric encryption uses a public and a private key; it is slow but solves key sharing and allows digital signatures (RSA, ECC).",
  },
  {
    q: "What is AES?",
    a: "The Advanced Encryption Standard (FIPS 197, 2001), a symmetric block cipher with 128-bit blocks and 128-, 192- or 256-bit keys, using 10, 12 or 14 rounds.",
  },
  {
    q: "Explain RSA key generation briefly.",
    a: "Choose primes p and q, compute n = p × q and φ(n) = (p−1)(q−1), choose e with no common factor with φ(n), and compute d so that d × e ≡ 1 mod φ(n). The public key is (e, n); the private key is d.",
  },
  {
    q: "How does Diffie–Hellman work?",
    a: "Both sides agree public numbers p and g. Each picks a secret, sends g raised to it mod p, and raises the other side's value to its own secret. Both get the same shared secret, which is never sent.",
  },
  {
    q: "What are the properties of a hash function?",
    a: "It gives a fixed-size output, is one-way, changes completely when the input changes slightly (avalanche effect), and makes it practically impossible to find two inputs with the same hash.",
  },
  {
    q: "What is a digital signature and what is it used for in IoT?",
    a: "A hash of a message signed with a private key, which anyone can check with the public key. IoT devices use it to accept only firmware signed by the maker.",
  },
  {
    q: "Describe the TLS 1.3 handshake.",
    a: "The client sends Client Hello with a key share; the server replies with its key share, certificate, signature and Finished; the client checks the certificate and sends Finished. Both then encrypt data with AES-GCM or ChaCha20, after one round trip.",
  },
];

export default viva;
