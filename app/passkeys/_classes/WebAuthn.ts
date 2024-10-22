// TODO: code copied from: https://github.com/passkeys-4337/smart-wallet
// Check the license requirements and include it in the project if you still use it later

import crypto from "crypto";
import { Hex, toHex } from "viem";
import cbor from "cbor";
import { parseAuthenticatorData } from "@simplewebauthn/server/helpers";
import { AsnParser } from "@peculiar/asn1-schema";
import { ECDSASigValue } from "@peculiar/asn1-ecc";
import { concatUint8Arrays, shouldRemoveLeadingZero } from "../_utils";
import { CreateCredential, P256Credential, P256Signature } from "../_types";

export class WebAuthn {
  private static _generateRandomBytes(): Buffer {
    return crypto.randomBytes(16);
  }

  public static isSupportedByBrowser(): boolean {
    console.log(
      "isSupportedByBrowser",
      window?.PublicKeyCredential !== undefined &&
        typeof window.PublicKeyCredential === "function"
    );
    return (
      window?.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential === "function"
    );
  }

  public static async platformAuthenticatorIsAvailable(): Promise<boolean> {
    if (
      !this.isSupportedByBrowser() &&
      typeof window.PublicKeyCredential
        .isUserVerifyingPlatformAuthenticatorAvailable !== "function"
    ) {
      return false;
    }
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  }

  public static async isConditionalSupported(): Promise<boolean> {
    if (
      !this.isSupportedByBrowser() &&
      typeof window.PublicKeyCredential.isConditionalMediationAvailable !==
        "function"
    ) {
      return false;
    }
    return await PublicKeyCredential.isConditionalMediationAvailable();
  }

  public static async isConditional() {
    if (
      typeof window.PublicKeyCredential !== "undefined" &&
      typeof window.PublicKeyCredential.isConditionalMediationAvailable ===
        "function"
    ) {
      const available =
        await PublicKeyCredential.isConditionalMediationAvailable();

      if (available) {
        this.get();
      }
    }
  }

  public static async create({
    username,
  }: {
    username: string;
  }): Promise<CreateCredential | null> {
    this.isSupportedByBrowser();

    const options: PublicKeyCredentialCreationOptions = {
      timeout: 60000,
      rp: {
        name: "passkeys-4337/smart-wallet",
        id: window.location.hostname,
      },
      user: {
        id: this._generateRandomBytes(),
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
      authenticatorSelection: {
        requireResidentKey: true,
        userVerification: "required",
        authenticatorAttachment: "platform",
      },
      attestation: "direct",
      challenge: Uint8Array.from(
        "random-challenge",
        (c) => c.charCodeAt(0)
      ),
    };

    const credential = await navigator.credentials.create({
      publicKey: options,
    });

    if (!credential) {
      return null;
    }

    let cred = credential as unknown as {
      rawId: ArrayBuffer;
      response: {
        clientDataJSON: ArrayBuffer;
        attestationObject: ArrayBuffer;
      };
    };

    // Decode attestation object and get public key
    const decodedAttestationObj = cbor.decode(
      cred.response.attestationObject
    );
    const authData = parseAuthenticatorData(decodedAttestationObj.authData);
    const publicKey = cbor.decode(
      authData?.credentialPublicKey?.buffer as ArrayBuffer
    );
    const x = toHex(publicKey.get(-2));
    const y = toHex(publicKey.get(-3));

    // SAVE PUBKEY TO FACTORY
    return {
      rawId: toHex(new Uint8Array(cred.rawId)),
      pubKey: {
        x,
        y,
      },
    };
  }

  public static async get(challenge?: Hex): Promise<P256Credential | null> {
    this.isSupportedByBrowser();

    const options: PublicKeyCredentialRequestOptions = {
      timeout: 60000,
      challenge: challenge
        ? Buffer.from(challenge.slice(2), "hex")
        : Uint8Array.from(
            "random-challenge",
            (c) => c.charCodeAt(0)
          ),
      rpId: window.location.hostname,
      userVerification: "preferred",
    } as PublicKeyCredentialRequestOptions;

    const credential = await window.navigator.credentials.get({
      publicKey: options,
    });

    if (!credential) {
      return null;
    }

    let cred = credential as unknown as {
      rawId: ArrayBuffer;
      response: {
        clientDataJSON: ArrayBuffer;
        authenticatorData: ArrayBuffer;
        signature: ArrayBuffer;
        userHandle: ArrayBuffer;
      };
    };

    const utf8Decoder = new TextDecoder("utf-8");

    const decodedClientData = utf8Decoder.decode(
      cred.response.clientDataJSON
    );
    const clientDataObj = JSON.parse(decodedClientData);

    let authenticatorData = toHex(
      new Uint8Array(cred.response.authenticatorData)
    );
    let signature = parseSignature(
      new Uint8Array(cred?.response?.signature)
    );

    return {
      rawId: toHex(new Uint8Array(cred.rawId)),
      clientData: {
        type: clientDataObj.type,
        challenge: clientDataObj.challenge,
        origin: clientDataObj.origin,
        crossOrigin: clientDataObj.crossOrigin,
      },
      authenticatorData,
      signature,
    };
  }

  // New method to validate the signature
  public static async validateSignature({
    publicKey,
    signature,
    authenticatorData,
    clientData,
  }: {
    publicKey: { x: string; y: string }; // Hex strings
    signature: P256Signature; // { r: string, s: string } in hex
    authenticatorData: string; // Hex string
    clientData: {
      type: string;
      challenge: string;
      origin: string;
      crossOrigin?: boolean;
    };
  }): Promise<boolean> {

    // Convert authenticatorData from hex to Uint8Array
    const authenticatorDataArray = hexStringToUint8Array(authenticatorData);

    // Reconstruct clientDataJSON from clientData object
    const clientDataJSON = JSON.stringify(clientData);
    const clientDataArray = new TextEncoder().encode(clientDataJSON);

    // Compute hash of clientDataJSON
    const clientDataHash = new Uint8Array(
      await window.crypto.subtle.digest("SHA-256", clientDataArray)
    );

    // Concatenate authenticatorData and clientDataHash
    const signedData = concatUint8Arrays([
      authenticatorDataArray,
      clientDataHash,
    ]);

    // Convert publicKey x and y from hex to base64url
    const xBase64Url = hexToBase64Url(publicKey.x);
    const yBase64Url = hexToBase64Url(publicKey.y);

    // Construct the JWK public key
    const jwk = {
      kty: "EC",
      crv: "P-256",
      x: xBase64Url,
      y: yBase64Url,
    };

    // Import the public key
    const publicKeyCryptoKey = await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      false,
      ["verify"]
    );

    // Convert signature from hex to Uint8Array
    const rBytes = hexStringToUint8Array(signature.r);
    const sBytes = hexStringToUint8Array(signature.s);
    const signatureArray = concatUint8Arrays([rBytes, sBytes]);

    // Verify the signature
    const isValid = await window.crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" },
      },
      publicKeyCryptoKey,
      signatureArray,
      signedData
    );

    console.log('Signature validation result:', isValid);

    return isValid;
  }
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

function hexStringToUint8Array(hexString: string): Uint8Array {
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

function hexToBase64Url(hexString: string): string {
  const byteArray = hexStringToUint8Array(hexString);
  const binaryString = String.fromCharCode(...byteArray);
  const base64String = btoa(binaryString);
  const base64UrlString = base64String
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return base64UrlString;
}

function padStart(
  str: string,
  targetLength: number,
  padString: string
): string {
  while (str.length < targetLength) {
    str = padString + str;
  }
  return str;
}

function encodeDERSignature(
  rBytes: Uint8Array,
  sBytes: Uint8Array
): Uint8Array {
  // Construct DER encoded signature
  // ASN.1 SEQUENCE
  const sequence = [];
  sequence.push(0x30); // SEQUENCE tag

  const rDer = integerToDer(rBytes);
  const sDer = integerToDer(sBytes);

  const totalLength = rDer.length + sDer.length;
  sequence.push(totalLength);

  return new Uint8Array([...sequence, ...rDer, ...sDer]);
}

function integerToDer(integerBytes: Uint8Array): Uint8Array {
  // Ensure integer is positive (prepend 0x00 if MSB is set)
  if (integerBytes[0] & 0x80) {
    integerBytes = concatUint8Arrays([new Uint8Array([0x00]), integerBytes]);
  }

  const length = integerBytes.length;
  const der = [0x02, length, ...integerBytes];
  return new Uint8Array(der);
}