import { ec as EC } from "elliptic";
import crypto from "crypto";
import bs58 from "bs58";
import { ethers } from "ethers";
import createKeccakHash from "keccak";

const ec = new EC("secp256k1");
const EPSILON_DERIVATION_PREFIX =
  "near-mpc-recovery v0.1.0 epsilon derivation:";

export function deriveEpsilon(signerId: string, path: string): string {
  const derivationPath = `${EPSILON_DERIVATION_PREFIX}${signerId},${path}`;
  const hash = crypto.createHash("sha256").update(derivationPath).digest();
  const epsilon = ec.keyFromPrivate(hash).getPrivate("hex");

  return epsilon;
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

    const x = combinedPublicKeyPoint.getX().toString(16); // Get x coordinate in hexadecimal
    const y = combinedPublicKeyPoint.getY().toString(16);
    const serializedPublicKey = "04" + x + y;

    // Compute Keccak-256 hash of the serialized public key
    const hash = createKeccakHash("keccak256")
      .update(Buffer.from(serializedPublicKey, "hex"))
      .digest("hex");

    // Ethereum address is the last 20 bytes of the hash (40 characters in hex)
    const ethAddress = "0x" + hash.substring(hash.length - 40);

    return ethAddress;

    // // Derive EVM address from the public key
    // const rawEvmAddress = `0x${ethers.utils
    //   .keccak256("0x" + derivedKey.slice(2))
    //   .slice(-40)}`;
    // // Convert the derived address into its checksummed version
    // const evmAddress = ethers.utils.getAddress(rawEvmAddress);

    // return evmAddress;
  } catch (error) {
    console.log(error);
    return "error";
  }
}
