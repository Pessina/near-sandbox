import { base_decode } from "near-api-js/lib/utils/serialize";
import { ec as EC } from "elliptic";
import BN from "bn.js";
import keccak256 from "keccak";
import hash from "hash.js";
import bs58check from "bs58check";

function najPublicKeyStrToUncompressedHexPoint(
  najPublicKeyStr: string
): string {
  return (
    "04" +
    Buffer.from(base_decode(najPublicKeyStr.split(":")[1])).toString("hex")
  );
}

async function sha256Hash(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sha256StringToScalarLittleEndian(hashString: string): BN {
  const littleEndianString = hashString.match(/../g)?.reverse().join("") || "";

  const scalar = new BN(littleEndianString, 16, "le");

  return scalar;
}

async function deriveChildPublicKey(
  parentUncompressedPublicKeyHex: string,
  signerId: string,
  path: string = ""
): Promise<string> {
  const ec = new EC("secp256k1");
  let scalar = await sha256Hash(
    `near-mpc-recovery v0.1.0 epsilon derivation:${signerId},${path}`
  );
  scalar = sha256StringToScalarLittleEndian(scalar).toString(16);

  const x = parentUncompressedPublicKeyHex.substring(2, 66);
  const y = parentUncompressedPublicKeyHex.substring(66);

  // Create a point object from X and Y coordinates
  const oldPublicKeyPoint = ec.curve.point(x, y);

  // Multiply the scalar by the generator point G
  const scalarTimesG = ec.g.mul(new BN(scalar, 16));

  // Add the result to the old public key point
  const newPublicKeyPoint = oldPublicKeyPoint.add(scalarTimesG);

  return (
    "04" +
    (newPublicKeyPoint.getX().toString("hex") +
      newPublicKeyPoint.getY().toString("hex"))
  );
}

function uncompressedHexPointToEvmAddress(
  uncompressedHexPoint: string
): string {
  const address = keccak256("keccak256")
    .update(Buffer.from(uncompressedHexPoint.substring(2), "hex"))
    .digest("hex");

  // Ethereum address is last 20 bytes of hash (40 characters), prefixed with 0x
  return "0x" + address.substring(address.length - 40);
}

async function uncompressedHexPointToBtcAddress(
  publicKeyHex: string
): Promise<string> {
  // Step 1: SHA-256 hashing of the public key
  const publicKeyBytes = Uint8Array.from(Buffer.from(publicKeyHex, "hex"));

  const sha256HashOutput = await crypto.subtle.digest(
    "SHA-256",
    publicKeyBytes
  );

  // Step 2: RIPEMD-160 hashing on the result of SHA-256
  const ripemd160 = hash
    .ripemd160()
    .update(Buffer.from(sha256HashOutput))
    .digest();

  // Step 3: Adding network byte (0x00 for Bitcoin Mainnet)
  const networkByte = Buffer.from([0x00]);
  const networkByteAndRipemd160 = Buffer.concat([
    networkByte,
    Buffer.from(ripemd160),
  ]);

  // Step 4: Base58Check encoding
  const address = bs58check.encode(networkByteAndRipemd160);

  return address;
}

export async function generateEthereumAddress({
  publicKey,
  accountId,
  path,
}: {
  publicKey: string;
  accountId: string;
  path?: string;
}): Promise<string> {
  const childPublicKey = await deriveChildPublicKey(
    najPublicKeyStrToUncompressedHexPoint(publicKey),
    accountId,
    path
  );
  const evmAddress = uncompressedHexPointToEvmAddress(childPublicKey);
  return evmAddress;
}
