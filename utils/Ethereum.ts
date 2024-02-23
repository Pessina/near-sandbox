import { UnsignedTransaction, ethers } from "ethers";

export const SEPOLIA_CHAIN_ID = 11155111;

class Ethereum {
  provider: ethers.providers.JsonRpcProvider;

  /**
   * Constructs an Ethereum instance with a JSON RPC provider.
   *
   * @param {string} [providerUrl] - The URL of the Ethereum JSON RPC provider. If not provided, it defaults to the NEXT_PUBLIC_INFURA_URL environment variable.
   */
  constructor(providerUrl?: string) {
    this.provider = new ethers.providers.JsonRpcProvider(
      providerUrl || process.env.NEXT_PUBLIC_INFURA_URL
    );
  }

  /**
   * Attempts to recover the signer's address from a signature using r, s, and the original message.
   *
   * @param {string} messageHash - The original message that was signed.
   * @param {string} r - The r component of the signature.
   * @param {string} s - The s component of the signature.
   * @param {string} v - The v component of the signature.
   * @returns {string | undefined} The recovered address, or undefined if address could not be recovered.
   */
  static recoverAddressFromSignature(
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
  static prepareTransactionForSignature(
    transaction: UnsignedTransaction
  ): string {
    const serializedTransaction =
      ethers.utils.serializeTransaction(transaction);
    const transactionHash = ethers.utils.keccak256(serializedTransaction);

    return transactionHash;
  }

  /**
   * Sends a signed transaction for execution.
   *
   * @param {string} signedTransaction - The signed transaction payload as a hex string.
   * @returns {Promise<string>} The transaction hash of the executed transaction.
   */
  async sendSignedTransaction(signedTransaction: string): Promise<string> {
    try {
      const transactionResponse = await this.provider.sendTransaction(
        signedTransaction
      );
      const transactionHash = transactionResponse.hash;

      return transactionHash;
    } catch (error) {
      console.error(`Transaction execution failed:`, error);
      throw new Error("Failed to send signed transaction.");
    }
  }

  /**
   * Retrieves the current gas price from the provider.
   *
   * @returns {Promise<ethers.BigNumber>} The current gas price as a BigNumber.
   */
  async getCurrentGasPrice(): Promise<ethers.BigNumber> {
    return this.provider.getGasPrice();
  }

  /**
   * Estimates the gas limit for a given transaction.
   *
   * @param {ethers.providers.TransactionRequest} transaction - The transaction for which to estimate the gas limit.
   * @returns {Promise<ethers.BigNumber>} The estimated gas limit as a BigNumber.
   */
  async estimateGasLimit(
    transaction: ethers.providers.TransactionRequest
  ): Promise<ethers.BigNumber> {
    return this.provider.estimateGas(transaction);
  }
}

export default Ethereum;
