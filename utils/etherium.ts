import { ethers } from "ethers";

// export async function createAndTransfer() {
//   if (
//     !process.env.NEXT_PUBLIC_MNEMONIC ||
//     !process.env.NEXT_PUBLIC_INFURA_URL
//   ) {
//     throw new Error("Please set a valid mnemonic and Infura URL");
//   }

//   const provider = new ethers.JsonRpcProvider(
//     process.env.NEXT_PUBLIC_INFURA_URL
//   );

//   const wallet = ethers.Wallet.fromPhrase(
//     process.env.NEXT_PUBLIC_MNEMONIC
//   ).connect(provider);

//   for (let i = 0; i < 3; i++) {
//     const hdNode = ethers.HDNodeWallet.fromMnemonic(
//       ethers.Mnemonic.fromPhrase(process.env.NEXT_PUBLIC_MNEMONIC),
//       `m/44'/60'/0'/0/${i}`
//     );
//     if (i === 0) console.log(hdNode.address);
//     if (i === 1) console.log(hdNode.address);
//     if (i === 2) console.log(hdNode.address);
//   }

//   // // Transfer Ether from the wallet to another address
//   // // In Ethers.js v6, the transaction sending process remains the same
//   // const tx = await wallet.sendTransaction({
//   //   to: randomWallet1.address, // Replace with a valid Ethereum address
//   //   value: ethers.parseEther("0.01"),
//   // });

//   // console.log(`Transfer successful: ${tx.hash}`);
// }

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
  // Ethereum mainnet chain ID
  const chainId = 1; // Adjust this if you're working with a different network

  // Calculate potential v values (for non-EIP-155 and EIP-155 transactions)
  const possibleVs = [27, 28, chainId * 2 + 35, chainId * 2 + 36, 0, 1];

  for (let v of possibleVs) {
    try {
      const signature = ethers.utils.joinSignature({
        r: `0x${r}`,
        s: `0x${s}`,
        v,
      });

      const recoveredAddress = ethers.utils.recoverAddress(
        messageHash,
        signature
      );

      // Assuming the first successful recovery is correct
      return recoveredAddress;
    } catch (error) {
      // If recovery fails, try the next v value
      console.error(`Recovery with v=${v} failed:`, error);
    }
  }

  // If none of the v values resulted in a successful recovery
  return undefined;
}
