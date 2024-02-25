import { ethers } from "ethers";
import { ec as EC } from "elliptic";
import bs58 from "bs58";
import BN from "bn.js";
import crypto from "crypto";

const EPSILON_DERIVATION_PREFIX =
  "near-mpc-recovery v0.1.0 epsilon derivation:";

const secp256k1 = new EC("secp256k1");

export function deriveEpsilon(signerId: string, path: string): string {
  const derivationPath = `${EPSILON_DERIVATION_PREFIX}${signerId},${path}`;
  const hash = crypto.createHash("sha256").update(derivationPath).digest();
  // Convert ethers.js hash (hex string with 0x prefix) to Buffer
  const ret = new BN(hash, "le").toString("hex");

  console.log("Epsilon: ", ret);

  return ret;
}

export function deriveKey(publicKeyStr: string, epsilon: string): string {
  const base58PublicKey = publicKeyStr.split(":")[1];

  const decodedPublicKey = Buffer.from(bs58.decode(base58PublicKey)).toString(
    "hex"
  );

  const publicKey = secp256k1.keyFromPublic("04" + decodedPublicKey, "hex");

  // Multiply epsilon with the curve's generator point and add it to the public key point
  const derivedPoint = publicKey.getPublic().add(secp256k1.g.mul(epsilon));
  const derivedPublicKey = derivedPoint.encode("hex", false);

  console.log("Derived PublicKey: ", derivedPublicKey);

  return derivedPublicKey;
}

export function deriveEthAddress(derivedPublicKeyStr: string): string {
  // Remove the '04' prefix if present (indicating an uncompressed public key)
  const publicKeyNoPrefix = derivedPublicKeyStr.startsWith("04")
    ? derivedPublicKeyStr.substring(2)
    : derivedPublicKeyStr;
  const hash = ethers.utils.keccak256(Buffer.from(publicKeyNoPrefix, "hex"));
  // Ethereum addresses are the last 20 bytes of the Keccak-256 hash of the public key
  const ethAddress = "0x" + hash.substring(hash.length - 40);
  return ethAddress;
}
