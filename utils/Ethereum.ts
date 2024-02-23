import { UnsignedTransaction, ethers } from "ethers";

export const SEPOLIA_CHAIN_ID = 11155111;

class Ethereum {
  provider: ethers.providers.JsonRpcProvider;
  chainId: number;

  /**
   * Initializes an Ethereum object with a specified JSON RPC provider and chain ID.
   *
   * @param {string} [providerUrl] - Optional. The URL for the Ethereum JSON RPC provider. Defaults to the NEXT_PUBLIC_INFURA_URL environment variable if not specified.
   * @param {number} [chainId] - Optional. The chain ID for the Ethereum network. Defaults to 1 (mainnet) if not specified.
   */
  constructor(config: { providerUrl?: string; chainId?: number }) {
    this.provider = new ethers.providers.JsonRpcProvider(
      config.providerUrl || process.env.NEXT_PUBLIC_INFURA_URL
    );
    this.chainId = config.chainId || 1;
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
   * Enhances a transaction with current gas price, estimated gas limit, and chain ID.
   *
   * This method fetches the current gas price and estimates the gas limit required for the transaction.
   * It then returns a new transaction object that includes the original transaction details
   * along with the fetched gas price, estimated gas limit, and the chain ID of the Ethereum object.
   *
   * @param {ethers.providers.TransactionRequest} transaction - The initial transaction object without gas details.
   * @returns {Promise<ethers.providers.TransactionRequest>} A new transaction object augmented with gas price, gas limit, and chain ID.
   */
  async attachGasAndNonce(
    transaction: ethers.providers.TransactionRequest
  ): Promise<UnsignedTransaction> {
    const gasPrice = await this.provider.getGasPrice();
    const gasLimit = await this.provider.estimateGas(transaction);

    return {
      ...transaction,
      gasLimit,
      gasPrice,
      chainId: this.chainId,
      nonce: 11,
    };
  }
}

export default Ethereum;
