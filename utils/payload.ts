import { createHash } from "crypto";

export function hexStringToUint8Array(hexString: string): Uint8Array {
  if (hexString.length % 2 !== 0) {
    throw new Error("Hex string must have an even length");
  }

  const arrayLength = hexString.length / 2;
  const uint8Array = new Uint8Array(arrayLength);

  for (let i = 0; i < arrayLength; i++) {
    const byteValue = parseInt(hexString.substr(i * 2, 2), 16);
    uint8Array[i] = byteValue;
  }

  return uint8Array;
}

export function uint8ArrayToHexString(uint8Array: Uint8Array): string {
  let hexString = "";
  for (let i = 0; i < uint8Array.length; i++) {
    const hex = uint8Array[i].toString(16);
    hexString += hex.length === 1 ? "0" + hex : hex;
  }
  return hexString;
}

/**
 * Hashes a serialized payload using SHA-256.
 *
 * @param {string} payload - The serialized payload to hash.
 * @returns {string} The SHA-256 hash of the payload.
 */
export function sha256(payload: string): string {
  const hash = createHash("sha256");
  hash.update(payload);
  return hash.digest("hex");
}
