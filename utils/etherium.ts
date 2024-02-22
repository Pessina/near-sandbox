import { ethers } from "ethers";

export async function logAccountAddress() {
  if (
    !process.env.NEXT_PUBLIC_MNEMONIC ||
    !process.env.NEXT_PUBLIC_INFURA_URL
  ) {
    throw new Error("Please set a valid mnemonic and Infura URL");
  }

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_INFURA_URL
  );

  const wallet = ethers.Wallet.fromMnemonic(
    process.env.NEXT_PUBLIC_MNEMONIC
  ).connect(provider);

  for (let i = 0; i < 3; i++) {
    const hdNode = ethers.utils.HDNode.fromMnemonic(
      process.env.NEXT_PUBLIC_MNEMONIC
    ).derivePath(`m/44'/60'/0'/0/${i}`);
    console.log(hdNode.address);
  }

  // Transfer Ether from the wallet to another address
  // In Ethers.js v6, the transaction sending process remains the same
  // const tx = await wallet.sendTransaction({
  //   to: "0xADDRESS", // Replace with a valid Ethereum address
  //   value: ethers.utils.parseEther("0.01"),
  // });

  // console.log(`Transfer successful: ${tx.hash}`);
}

export async function recoverSenderAddress() {
  const transaction = {
    nonce: 0,
    gasLimit: 21000,
    gasPrice: ethers.utils.parseUnits("10", "gwei"),
    to: "0x4174678c78fEaFd778c1ff319D5D326701449b25",
    from: "0x4174678c78fEaFd778c1ff319D5D326701449b25",
    value: ethers.utils.parseEther("0.01"),
    chainId: 11155111,
  };

  const mnemonic = process.env.NEXT_PUBLIC_MNEMONIC;
  if (!mnemonic) {
    throw new Error("Mnemonic not found in environment variables");
  }

  const wallet = ethers.Wallet.fromMnemonic(mnemonic);
  const signature = await wallet.signTransaction(transaction);
  try {
    const { r, s, v } = ethers.utils.splitSignature(signature);
    const serializedTx = ethers.utils.serializeTransaction(transaction);
    const msgHash = ethers.utils.keccak256(serializedTx);
    const recoveredAddress = ethers.utils.recoverAddress(msgHash, { r, s, v });

    console.log(`Recovered Address: ${recoveredAddress}`);
  } catch (error) {
    console.error("Error splitting signature or recovering address:", error);
  }
}

/**
 * Attempts to recover the signer's address from a signature using r, s, and the original message.
 *
 * @param {string} message - The original message that was signed.
 * @param {string} r - The r component of the signature.
 * @param {string} s - The s component of the signature.
 * @returns {string | undefined} The recovered address, or undefined if address could not be recovered.
 */
export function recoverAddressFromSignature(
  messageHash: string,
  r: string,
  s: string
): string | undefined {
  const chainId = 11155111;
  const possibleVs = [chainId * 2 + 35, chainId * 2 + 36];

  for (let v of possibleVs) {
    try {
      const recoveredAddress = ethers.utils.recoverAddress(messageHash, {
        r,
        s,
        v,
      });

      console.log(recoveredAddress);
    } catch (error) {
      console.error(`Recovery with v=${v} failed:`, error);
    }
  }

  return undefined;
}
