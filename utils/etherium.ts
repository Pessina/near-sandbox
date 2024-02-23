import { UnsignedTransaction, ethers } from "ethers";

/**
 * Attempts to recover the signer's address from a signature using r, s, and the original message.
 *
 * @param {string} messageHash - The original message that was signed.
 * @param {string} r - The r component of the signature.
 * @param {string} s - The s component of the signature.
 * @param {string} v - The v component of the signature.
 * @returns {string | undefined} The recovered address, or undefined if address could not be recovered.
 */
export function recoverAddressFromSignature(
  messageHash: string,
  r: string,
  s: string,
  v: number
): string | undefined {
  try {
    const recoveredAddress = ethers.utils.recoverAddress(messageHash, {
      r,
      s,
      v,
    });

    return recoveredAddress;
  } catch (error) {
    console.error(`Address recovery failed:`, error);
  }

  return undefined;
}

/**
 * Prepares a transaction object for signature by serializing and hashing it.
 *
 * @param {object} transaction - The transaction object to prepare.
 * @returns {string} The hashed transaction ready for signature.
 */
export function prepareTransactionForSignature(
  transaction: UnsignedTransaction
): string {
  const serializedTransaction = ethers.utils.serializeTransaction(transaction);
  const transactionHash = ethers.utils.keccak256(serializedTransaction);

  return transactionHash;
}

/**
 * Sends a signed transaction for execution.
 *
 * @param {UnsignedTransaction} transaction - The original transaction payload.
 * @param {ethers.Signer} signer - The signer object to sign the transaction.
 * @returns {Promise<string>} The transaction hash of the executed transaction.
 */
export async function sendSignedTransaction(
  transaction: UnsignedTransaction,
  signer: ethers.Signer
): Promise<string> {
  try {
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_INFURA_URL
    );

    if (transaction.type === null) {
      transaction.type = 0;
    }

    const transactionRequest = {
      ...transaction,
      type: transaction.type,
    };

    const signedTransaction = await signer.signTransaction(transactionRequest);
    const transactionResponse = await provider.sendTransaction(
      signedTransaction
    );
    const transactionHash = transactionResponse.hash;

    return transactionHash;
  } catch (error) {
    console.error(`Transaction execution failed:`, error);
    throw new Error("Failed to send signed transaction.");
  }
}
