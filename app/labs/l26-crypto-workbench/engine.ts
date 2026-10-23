/**
 * L26 Crypto workbench: real SHA-256 and AES-GCM through the browser's Web
 * Crypto API, plus step-by-step toy RSA and Diffie–Hellman with small numbers
 * (BigInt), so every step can be checked by hand.
 *
 * Web Crypto calls are async and must only run in the browser (handlers and
 * effects), never during pre-rendering. Node 24 also has Web Crypto, so the
 * tests use the same code.
 */

export type Bytes = Uint8Array<ArrayBuffer>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const textBytes = (text: string): Bytes => encoder.encode(text);
export const bytesText = (bytes: Uint8Array) => decoder.decode(bytes);
export const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
export const fromHex = (hex: string): Bytes => Uint8Array.from(hex.replace(/\s+/g, "").match(/../g) ?? [], (h) => Number.parseInt(h, 16));
export const randomBytes = (n: number): Bytes => crypto.getRandomValues(new Uint8Array(n));

/* ------------------------------------------------------------------ */
/* Hashing and the avalanche effect                                    */
/* ------------------------------------------------------------------ */

export async function sha256Hex(text: string): Promise<string> {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", textBytes(text))));
}

/** Each hex digit as 4 bits, e.g. "a" → "1010". */
export const hexBits = (hex: string) => [...hex].map((h) => Number.parseInt(h, 16).toString(2).padStart(4, "0")).join("");

/** How many bits differ between two equal-length hex strings. */
export function bitDiff(a: string, b: string): number {
  const x = hexBits(a);
  const y = hexBits(b);
  let n = 0;
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) n++;
  return n;
}

/* ------------------------------------------------------------------ */
/* AES-GCM: symmetric authenticated encryption                         */
/* ------------------------------------------------------------------ */

export const AES_TAG_BYTES = 16;
export const AES_IV_BYTES = 12;

export interface Sealed {
  ciphertext: Bytes;
  /** The authentication tag: any change to the ciphertext makes it fail */
  tag: Bytes;
}

const aesKey = (key: Bytes) => crypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt", "decrypt"]);

export async function aesGcmEncrypt(key: Bytes, iv: Bytes, plaintext: Bytes): Promise<Sealed> {
  const out = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(key), plaintext));
  return { ciphertext: out.slice(0, out.length - AES_TAG_BYTES), tag: out.slice(out.length - AES_TAG_BYTES) };
}

/** Throws if the key is wrong or the ciphertext or tag was changed. */
export async function aesGcmDecrypt(key: Bytes, iv: Bytes, sealed: Sealed): Promise<Bytes> {
  const joined = new Uint8Array(sealed.ciphertext.length + sealed.tag.length);
  joined.set(sealed.ciphertext);
  joined.set(sealed.tag, sealed.ciphertext.length);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await aesKey(key), joined));
}

/** Flips one bit of one byte: what an attacker changing a message in transit would do. */
export function flipBit(bytes: Bytes, index = 0, bit = 0): Bytes {
  const copy = bytes.slice();
  if (copy.length) copy[index % copy.length] ^= 1 << bit;
  return copy;
}

/* ------------------------------------------------------------------ */
/* Toy RSA (small primes, BigInt)                                      */
/* ------------------------------------------------------------------ */

export function isPrime(n: bigint): boolean {
  if (n < 2n) return false;
  if (n % 2n === 0n) return n === 2n;
  for (let d = 3n; d * d <= n; d += 2n) if (n % d === 0n) return false;
  return true;
}

export function gcd(a: bigint, b: bigint): bigint {
  while (b) [a, b] = [b, a % b];
  return a < 0n ? -a : a;
}

/** x such that a·x ≡ 1 (mod m), by the extended Euclidean algorithm. */
export function modInverse(a: bigint, m: bigint): bigint {
  let [oldR, r] = [((a % m) + m) % m, m];
  let [oldS, s] = [1n, 0n];
  while (r) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  if (oldR !== 1n) throw new Error("No inverse: the numbers share a factor.");
  return ((oldS % m) + m) % m;
}

/** base^exp mod m by repeated squaring. */
export function modPow(base: bigint, exp: bigint, m: bigint): bigint {
  let result = 1n;
  let b = ((base % m) + m) % m;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % m;
    b = (b * b) % m;
    e >>= 1n;
  }
  return result;
}

export interface RsaKeys {
  p: bigint;
  q: bigint;
  n: bigint;
  phi: bigint;
  e: bigint;
  d: bigint;
}

export function rsaKeys(p: bigint, q: bigint, e: bigint): RsaKeys {
  if (!isPrime(p) || !isPrime(q)) throw new Error("p and q must both be prime.");
  if (p === q) throw new Error("p and q must be different primes.");
  const n = p * q;
  const phi = (p - 1n) * (q - 1n);
  if (e <= 1n || e >= phi) throw new Error(`e must be between 1 and φ(n) = ${phi}.`);
  if (gcd(e, phi) !== 1n) throw new Error(`e = ${e} shares a factor with φ(n) = ${phi}; pick another e.`);
  return { p, q, n, phi, e, d: modInverse(e, phi) };
}

const checkMessage = (m: bigint, n: bigint) => {
  if (m < 0n || m >= n) throw new Error(`The number must be from 0 to ${n - 1n} (smaller than n).`);
};

/** Encrypt with the public key (e, n): c = m^e mod n. */
export function rsaEncrypt(m: bigint, k: Pick<RsaKeys, "e" | "n">): bigint {
  checkMessage(m, k.n);
  return modPow(m, k.e, k.n);
}

/** Decrypt with the private key (d, n): m = c^d mod n. */
export function rsaDecrypt(c: bigint, k: Pick<RsaKeys, "d" | "n">): bigint {
  checkMessage(c, k.n);
  return modPow(c, k.d, k.n);
}

/** Sign with the private key: s = h^d mod n. Anyone can check it with the public key. */
export const rsaSign = (h: bigint, k: Pick<RsaKeys, "d" | "n">) => rsaDecrypt(h, k);
export const rsaVerify = (h: bigint, s: bigint, k: Pick<RsaKeys, "e" | "n">) => rsaEncrypt(s, k) === h;

/* ------------------------------------------------------------------ */
/* Toy Diffie–Hellman                                                  */
/* ------------------------------------------------------------------ */

export interface DhRun {
  /** Alice's public value g^a mod p */
  A: bigint;
  /** Bob's public value g^b mod p */
  B: bigint;
  /** What Alice computes: B^a mod p */
  aliceSecret: bigint;
  /** What Bob computes: A^b mod p */
  bobSecret: bigint;
}

export function diffieHellman(p: bigint, g: bigint, a: bigint, b: bigint): DhRun {
  if (!isPrime(p)) throw new Error("p must be prime.");
  if (g <= 1n || g >= p) throw new Error(`g must be between 1 and p = ${p}.`);
  if (a < 1n || b < 1n || a >= p || b >= p) throw new Error(`The secret numbers must be from 1 to ${p - 1n}.`);
  const A = modPow(g, a, p);
  const B = modPow(g, b, p);
  return { A, B, aliceSecret: modPow(B, a, p), bobSecret: modPow(A, b, p) };
}
