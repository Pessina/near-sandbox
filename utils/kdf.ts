import { ec as EC } from "elliptic";
import crypto from "crypto";
import bs58 from "bs58";

const ec = new EC("secp256k1");
const EPSILON_DERIVATION_PREFIX =
  "near-mpc-recovery v0.1.0 epsilon derivation:";

export function deriveEpsilon(signerId: string, path: string): Buffer {
  console.log(`Deriving epsilon for signerId: ${signerId} and path: ${path}`);
  const derivationPath = `${EPSILON_DERIVATION_PREFIX},${signerId},${path}`;
  const hash = crypto.createHash("sha256").update(derivationPath).digest();
  const epsilon = ec.keyFromPrivate(hash).getPrivate("hex");
  console.log(`Derived epsilon: ${epsilon}`);

  return Buffer.from(epsilon, "hex");
}

export function deriveKey(
  encodedPublicKey: string,
  epsilonBuffer: Buffer
): string {
  const base58PublicKey = encodedPublicKey.split(":")[1];
  try {
    const decodedPublicKey = Buffer.from(bs58.decode(base58PublicKey)).toString(
      "hex"
    );
    const publicKeyPoint = ec
      .keyFromPublic("04" + decodedPublicKey, "hex")
      .getPublic();
    const generatorPoint = ec.g;
    const epsilonPoint = generatorPoint.mul(epsilonBuffer.toString("hex"));
    const combinedPublicKeyPoint = publicKeyPoint.add(epsilonPoint);
    return combinedPublicKeyPoint.encode("hex", false);
  } catch (error) {
    return "";
  }
}
