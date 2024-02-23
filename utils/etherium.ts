import { UnsignedTransaction, ethers } from "ethers";

class Ethereum {
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
   * @param {UnsignedTransaction} transaction - The original transaction payload.
   * @param {ethers.Signer} signer - The signer object to sign the transaction.
   * @returns {Promise<string>} The transaction hash of the executed transaction.
   */
  static async sendSignedTransaction(
    transaction: UnsignedTransaction,
    signer: ethers.Signer
  ): Promise<string> {
    try {
      if (transaction.type === null) {
        transaction.type = 0;
      }

      const transactionRequest = {
        ...transaction,
        type: transaction.type,
      };

      const signedTransaction = await signer.signTransaction(
        transactionRequest
      );
      const transactionResponse = await Ethereum.getProvider().sendTransaction(
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
  static async getCurrentGasPrice(): Promise<ethers.BigNumber> {
    const gasPrice = await Ethereum.getProvider().getGasPrice();
    console.log(`Current gas price: ${gasPrice.toString()}`);
    return gasPrice;
  }

  /**
   * Estimates the gas limit for a given transaction.
   *
   * @param {ethers.providers.TransactionRequest} transaction - The transaction for which to estimate the gas limit.
   * @returns {Promise<ethers.BigNumber>} The estimated gas limit as a BigNumber.
   */
  static async estimateGasLimit(
    transaction: ethers.providers.TransactionRequest
  ): Promise<ethers.BigNumber> {
    const estimatedGas = await Ethereum.getProvider().estimateGas(transaction);
    console.log(`Estimated gas limit: ${estimatedGas.toString()}`);
    return estimatedGas;
  }

  /**
   * Creates and returns a new JsonRpcProvider instance.
   *
   * This function will create a new ethers.js JsonRpcProvider which can be used to interact with the Ethereum blockchain.
   * If a URL is provided, it will be used as the endpoint for the provider. Otherwise, it will default to the URL specified
   * in the NEXT_PUBLIC_INFURA_URL environment variable.
   *
   * @param {string} [url] - The URL of the Ethereum node to connect to. Optional.
   * @returns {ethers.providers.JsonRpcProvider} A new JsonRpcProvider instance connected to the specified URL or the default URL.
   */
  static getProvider(url?: string): ethers.providers.JsonRpcProvider {
    const provider = new ethers.providers.JsonRpcProvider(
      url || process.env.NEXT_PUBLIC_INFURA_URL
    );
    return provider;
  }
}

export default Ethereum;
