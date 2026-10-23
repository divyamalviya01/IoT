import { describe, expect, it } from "vitest";
import {
  aesGcmDecrypt,
  aesGcmEncrypt,
  bitDiff,
  diffieHellman,
  flipBit,
  fromHex,
  gcd,
  isPrime,
  modInverse,
  modPow,
  rsaDecrypt,
  rsaEncrypt,
  rsaKeys,
  rsaSign,
  rsaVerify,
  sha256Hex,
  textBytes,
  toHex,
} from "./engine";

describe("SHA-256", () => {
  it("matches the standard test vectors", async () => {
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(await sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("changes about half the bits when one character changes (avalanche)", async () => {
    const a = await sha256Hex("temperature=31.2");
    const b = await sha256Hex("temperature=31.3");
    const d = bitDiff(a, b);
    expect(d).toBeGreaterThan(90);
    expect(d).toBeLessThan(166);
    expect(bitDiff(a, a)).toBe(0);
  });
});

describe("AES-GCM", () => {
  const zeroKey = new Uint8Array(16);
  const zeroIv = new Uint8Array(12);

  it("matches NIST GCM test case 2", async () => {
    const s = await aesGcmEncrypt(zeroKey, zeroIv, new Uint8Array(16));
    expect(toHex(s.ciphertext)).toBe("0388dace60b6a392f328c2b971b2fe78");
    expect(toHex(s.tag)).toBe("ab6e47d42cec13bdf53a67b21257bddf");
  });

  it("decrypts back to the message", async () => {
    const key = fromHex("000102030405060708090a0b0c0d0e0f");
    const s = await aesGcmEncrypt(key, zeroIv, textBytes("unlock door 3"));
    expect(new TextDecoder().decode(await aesGcmDecrypt(key, zeroIv, s))).toBe("unlock door 3");
  });

  it("refuses a changed ciphertext or the wrong key", async () => {
    const key = fromHex("000102030405060708090a0b0c0d0e0f");
    const s = await aesGcmEncrypt(key, zeroIv, textBytes("lock"));
    await expect(aesGcmDecrypt(key, zeroIv, { ...s, ciphertext: flipBit(s.ciphertext) })).rejects.toThrow();
    await expect(aesGcmDecrypt(zeroKey, zeroIv, s)).rejects.toThrow();
  });
});

describe("toy RSA", () => {
  const k = rsaKeys(61n, 53n, 17n);

  it("builds the textbook key", () => {
    expect(k).toMatchObject({ n: 3233n, phi: 3120n, d: 2753n });
    expect((k.e * k.d) % k.phi).toBe(1n);
  });

  it("encrypts 65 to 2790 and back", () => {
    expect(rsaEncrypt(65n, k)).toBe(2790n);
    expect(rsaDecrypt(2790n, k)).toBe(65n);
  });

  it("signs with the private key and verifies with the public key", () => {
    const s = rsaSign(123n, k);
    expect(rsaVerify(123n, s, k)).toBe(true);
    expect(rsaVerify(124n, s, k)).toBe(false);
  });

  it("explains bad choices", () => {
    expect(() => rsaKeys(61n, 52n, 17n)).toThrow(/prime/);
    expect(() => rsaKeys(61n, 53n, 3n)).toThrow(/shares a factor/);
    expect(() => rsaEncrypt(4000n, k)).toThrow(/smaller than n/);
  });

  it("has working number helpers", () => {
    expect(isPrime(97n)).toBe(true);
    expect(isPrime(91n)).toBe(false);
    expect(gcd(3120n, 17n)).toBe(1n);
    expect(modInverse(17n, 3120n)).toBe(2753n);
    expect(modPow(4n, 13n, 497n)).toBe(445n);
  });
});

describe("toy Diffie–Hellman", () => {
  it("gives both sides the same secret", () => {
    expect(diffieHellman(23n, 5n, 6n, 15n)).toEqual({ A: 8n, B: 19n, aliceSecret: 2n, bobSecret: 2n });
  });

  it("rejects a non-prime modulus", () => {
    expect(() => diffieHellman(24n, 5n, 6n, 15n)).toThrow(/prime/);
  });
});
