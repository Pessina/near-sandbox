import { toHex } from "viem";
import { P256Signature } from "../_types";
import { AsnParser } from "@peculiar/asn1-schema";
import { ECDSASigValue } from "@peculiar/asn1-ecc";

export function shouldRemoveLeadingZero(bytes: Uint8Array): boolean {
  return bytes[0] === 0x0 && (bytes[1] & (1 << 7)) !== 0;
}

export function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  let pointer = 0;
  const totalLength = arrays.reduce((prev, curr) => prev + curr.length, 0);

  const toReturn = new Uint8Array(totalLength);

  arrays.forEach((arr) => {
    toReturn.set(arr, pointer);
    pointer += arr.length;
  });

  return toReturn;
}

// Parse the signature from the authenticator and remove the leading zero if necessary
export function parseSignature(signature: Uint8Array): P256Signature {
  const parsedSignature = AsnParser.parse(signature, ECDSASigValue);
  let rBytes = new Uint8Array(parsedSignature.r);
  let sBytes = new Uint8Array(parsedSignature.s);
  if (shouldRemoveLeadingZero(rBytes)) {
    rBytes = rBytes.slice(1);
  }
  if (shouldRemoveLeadingZero(sBytes)) {
    sBytes = sBytes.slice(1);
  }
  const finalSignature = concatUint8Arrays([rBytes, sBytes]);
  return {
    r: toHex(finalSignature.slice(0, 32)),
    s: toHex(finalSignature.slice(32)),
  };
}

// Helper functions

export function hexStringToUint8Array(hexString: string): Uint8Array {
  if (hexString.startsWith("0x") || hexString.startsWith("0X")) {
    hexString = hexString.slice(2);
  }
  if (hexString.length % 2 !== 0) {
    hexString = "0" + hexString;
  }
  const byteArray = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < byteArray.length; i++) {
    byteArray[i] = parseInt(hexString.substr(i * 2, 2), 16);
  }
  return byteArray;
}

export function hexToBase64Url(hexString: string): string {
  const byteArray = hexStringToUint8Array(hexString);
  const binaryString = String.fromCharCode(...byteArray);
  const base64String = btoa(binaryString);
  const base64UrlString = base64String
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return base64UrlString;
}