import type { MCQ } from "~/content/types";

const quiz: MCQ[] = [
  {
    id: "q1",
    question: "What is the main difference between symmetric and asymmetric encryption?",
    options: [
      "Symmetric uses one shared key; asymmetric uses a public and a private key",
      "Symmetric is slower than asymmetric",
      "Asymmetric needs no keys at all",
      "Symmetric only works on images",
    ],
    answer: 0,
    explanation: "Symmetric: one shared secret. Asymmetric: a public key anyone may have and a private key kept secret.",
  },
  {
    id: "q2",
    question: "What block size does AES use?",
    options: ["64 bits", "128 bits", "256 bits", "2048 bits"],
    answer: 1,
    explanation: "AES always uses 128-bit blocks; its key can be 128, 192 or 256 bits.",
  },
  {
    id: "q3",
    question: "What does AES-GCM add that plain encryption does not?",
    options: ["Compression", "An authentication tag that detects any change", "A public key", "A longer key"],
    answer: 1,
    explanation: "GCM produces a tag; if any bit of the ciphertext changes, decryption fails.",
  },
  {
    id: "q4",
    question: "In toy RSA with p = 61 and q = 53, what is n?",
    options: ["114", "3120", "3233", "2753"],
    answer: 2,
    explanation: "n = p × q = 61 × 53 = 3233. φ(n) = 60 × 52 = 3120.",
  },
  {
    id: "q5",
    question: "Why is RSA considered secure?",
    options: [
      "Its keys are short",
      "Splitting a huge number into its two prime factors is extremely hard",
      "It hides the algorithm",
      "It uses a shared key",
    ],
    answer: 1,
    explanation: "Multiplying primes is easy; factoring their product is believed to be infeasible for large keys.",
  },
  {
    id: "q6",
    question: "With Diffie–Hellman p = 23, g = 5, Alice's a = 6 and Bob's b = 15, what shared secret do they get?",
    options: ["8", "19", "2", "23"],
    answer: 2,
    explanation: "A = 8, B = 19; Alice computes 19⁶ mod 23 = 2 and Bob 8¹⁵ mod 23 = 2.",
  },
  {
    id: "q7",
    question: "Which is NOT a property of a good hash function such as SHA-256?",
    options: ["One-way", "Fixed output size", "Easy to reverse to get the input", "Avalanche effect"],
    answer: 2,
    explanation: "A hash must be one-way: you cannot recover the input from the hash.",
  },
  {
    id: "q8",
    question: "How is a digital signature checked?",
    options: ["With the signer's private key", "With the signer's public key", "With a shared symmetric key", "It cannot be checked"],
    answer: 1,
    explanation: "The signer signs with the private key; anyone verifies with the matching public key.",
  },
  {
    id: "q9",
    question: "In a TLS 1.3 handshake, what proves that the server is genuine?",
    options: ["Its IP address", "Its X.509 certificate and a signature made with its private key", "The port number 8883", "The cipher it chooses"],
    answer: 1,
    explanation: "The client checks the certificate against trusted CAs and the signature proves the server holds the key.",
  },
  {
    id: "q10",
    question: "Which protocol secures CoAP over UDP?",
    options: ["TLS 1.3 over TCP", "DTLS", "SSH", "IPsec only"],
    answer: 1,
    explanation: "DTLS is the datagram version of TLS; DTLS 1.3 is RFC 9147.",
  },
];

export default quiz;
