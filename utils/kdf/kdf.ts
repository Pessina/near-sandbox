import { ec as EC } from "elliptic";
import crypto from "crypto";
import bs58 from "bs58";
import BN from "bn.js";
import { ethers } from "ethers";

const ec = new EC("secp256k1");
const EPSILON_DERIVATION_PREFIX =
  "near-mpc-recovery v0.1.0 epsilon derivation:";

export function deriveEpsilon(signerId: string, path: string): string {
  const derivationPath = `${EPSILON_DERIVATION_PREFIX}${signerId},${path}`;
  const hash = crypto.createHash("sha256").update(derivationPath).digest();
  return new BN(hash, "le").toString();
}

export function deriveKey(encodedPublicKey: string, epsilon: string): string {
  const base58PublicKey = encodedPublicKey.split(":")[1];
  try {
    const decodedPublicKey = Buffer.from(bs58.decode(base58PublicKey)).toString(
      "hex"
    );
    const publicKeyPoint = ec
      .keyFromPublic("04" + decodedPublicKey, "hex")
      .getPublic();
    const epsilonPoint = ec.g.mul(epsilon);
    const combinedPublicKeyPoint = publicKeyPoint.add(epsilonPoint);
    const derivedKey = combinedPublicKeyPoint.encode("hex", false);

    // Derive EVM address from the public key
    const rawEvmAddress = `0x${ethers.utils
      .keccak256("0x" + derivedKey.slice(2))
      .slice(-40)}`;
    // Convert the derived address into its checksummed version
    const evmAddress = ethers.utils.getAddress(rawEvmAddress);

    return evmAddress;
  } catch (error) {
    console.log(error);
    return "error";
  }
}
