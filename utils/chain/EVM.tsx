import { ethers, parseEther } from "ethers";

import { signMPC } from "../contract/signer";
import { Account } from "near-api-js";
import Link from "next/link";
import { toast } from "react-toastify";
import { KeyDerivation } from "../kdf";

class EVM {
  private provider: ethers.JsonRpcProvider;
  private scanUrl: string;
  private name: string;

  /**
   * Constructs an EVM instance with the provided configuration.
   *
   * @param {Object} config - The configuration object for the EVM instance.
   * @param {string} config.providerUrl - The URL of the Ethereum JSON RPC provider.
   * @param {string} config.scanUrl - The base URL of the blockchain explorer.
   * @param {string} config.name - The name of the EVM network.
   */
  constructor(config: { providerUrl: string; scanUrl: string; name: string }) {
    this.provider = new ethers.JsonRpcProvider(config.providerUrl);
    this.scanUrl = config.scanUrl;
    this.name = config.name;
  }

  /**
   * Prepares a transaction object for signature by serializing and hashing it.
   *
   * @param {object} transaction - The transaction object to prepare.
   * @returns {string} The hashed transaction ready for signature.
   */
  static prepareTransactionForSignature(
    transaction: ethers.TransactionLike
  ): string {
    const serializedTransaction =
      ethers.Transaction.from(transaction).unsignedSerialized;
    const transactionHash = ethers.keccak256(serializedTransaction);

    return transactionHash;
  }

  /**
   * Sends a signed transaction to the blockchain.
   *
   * This method takes a transaction object and its corresponding signature,
   * combines them into a single serialized transaction, and broadcasts it to the network
   * using the current provider. If the transaction is successfully broadcasted,
   * it returns the transaction response. If there is an error during the process,
   * it logs the error and throws a custom error message.
   *
   * @param {ethers.TransactionLike} transaction - The transaction object to be sent.
   * @param {ethers.SignatureLike} signature - The signature of the transaction.
   * @returns {Promise<ethers.TransactionResponse>} The response of the broadcasted transaction.
   * @throws {Error} If the transaction fails to be executed or sent.
   */
  async sendSignedTransaction(
    transaction: ethers.TransactionLike,
    signature: ethers.SignatureLike
  ): Promise<ethers.TransactionResponse> {
    try {
      const serializedTransaction = ethers.Transaction.from({
        ...transaction,
        signature,
      }).serialized;
      return this.provider.broadcastTransaction(serializedTransaction);
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
   * along with the fetched gas price, estimated gas limit, and the chain ID of the EVM object.
   *
   * @param {ethers.providers.TransactionRequest} transaction - The initial transaction object without gas details.
   * @returns {Promise<ethers.providers.TransactionRequest>} A new transaction object augmented with gas price, gas limit, and chain ID.
   */
  async attachGasAndNonce(
    transaction: Omit<ethers.TransactionLike, "from"> & {
      from: string;
    }
  ): Promise<ethers.TransactionLike> {
    const feeData = await this.provider.getFeeData();
    const gasLimit = await this.provider.estimateGas(transaction);
    const nonce = await this.provider.getTransactionCount(
      transaction.from,
      "latest"
    );

    const { from, ...rest } = transaction;

    return {
      ...rest,
      gasPrice: feeData.gasPrice,
      gasLimit,
      chainId: this.provider._network.chainId,
      nonce,
      type: 0,
    };
  }

  /**
   * Fetches the balance of the given EVM address.
   *
   * This method uses the current provider to query the balance of the specified address.
   * The balance is returned in ethers as a string.
   *
   * @param {string} address - The EVM address to fetch the balance for.
   * @returns {Promise<string>} The balance of the address in ethers.
   */
  async getBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error(`Failed to fetch balance for address ${address}:`, error);
      throw new Error("Failed to fetch balance.");
    }
  }

  /**
   * Derives an EVM address from a given signer ID, derivation path, and public key.
   *
   * This method combines the provided signer ID and path to generate an epsilon value,
   * which is then used to derive a new public key. The EVM address is then computed
   * from this derived public key.
   *
   * @param {string} signerId - The unique identifier of the signer.
   * @param {string} path - The derivation path.
   * @param {string} derivationRootPublicKey - The root public key for derivation
   * @returns {string} The derived EVM address.
   *
   * @example
   * const signerId = "felipe.near";
   * const path = ",ethereum,near.org";
   * const derivationRootPublicKey = "secp256k1:37aFybhUHCxRdDkuCcB3yHzxqK7N8EQ745MujyAQohXSsYymVeHzhLxKvZ2qYeRHf3pGFiAsxqFJZjpF9gP2JV5u";
   * const address = deriveProductionAddress(signerId, path, derivationRootPublicKey);
   * console.log(address); // 0x...
   */
  static deriveProductionAddress(
    signerId: string,
    path: string,
    derivationRootPublicKey: string
  ): string {
    const epsilon = KeyDerivation.deriveEpsilon(signerId, path);
    const derivedKey = KeyDerivation.deriveKey(
      derivationRootPublicKey,
      epsilon
    );

    const publicKeyNoPrefix = derivedKey.startsWith("04")
      ? derivedKey.substring(2)
      : derivedKey;
    const hash = ethers.keccak256(Buffer.from(publicKeyNoPrefix, "hex"));

    return "0x" + hash.substring(hash.length - 40);
  }

  /**
   * Orchestrates the transaction execution process by attaching necessary gas and nonce, signing, and then sending the transaction.
   * This method leverages the provided chain instance, transaction details, account credentials, and a specific derived path
   * to facilitate the execution of a transaction on the blockchain network.
   *
   * @param {Transaction} tx - Contains the transaction details such as the recipient's address and the transaction value.
   * @param {Account} account - Holds the account credentials including the unique account ID.
   * @param {string} keyPath - Specifies the key derivation path.
   * @param {string} derivationRootPublicKey - The root public key for derivation
   * @returns {Promise<void>} A promise that is fulfilled once the transaction has been successfully processed.
   */
  async handleTransaction(
    tx: Transaction,
    account: Account,
    keyPath: string,
    derivationRootPublicKey: string
  ): Promise<ethers.TransactionLike | undefined> {
    const from = EVM.deriveProductionAddress(
      account?.accountId,
      keyPath,
      derivationRootPublicKey
    );

    const transaction = await this.attachGasAndNonce({
      from,
      to: tx.to,
      value: parseEther(tx.value),
      data: tx.data || "0x",
    });

    const transactionHash = EVM.prepareTransactionForSignature(transaction);

    const signature = await signMPC(
      account,
      Array.from(ethers.getBytes(transactionHash)),
      keyPath
    );

    if (signature) {
      const r = `0x${signature.r}`;
      const s = `0x${signature.s}`;
      const v = [0, 1].find((currV) => {
        const address = ethers.recoverAddress(transactionHash, {
          r,
          s,
          v: currV,
        });

        return from.toLowerCase() === address.toLowerCase();
      });

      if (v === undefined) {
        throw new Error("Failed to recover address from signature.");
      }

      const transactionResponse = await this.sendSignedTransaction(
        transaction,
        ethers.Signature.from({ r, s, v })
      );

      toast.success(
        <span>
          View on {this.name}:{" "}
          <Link
            href={`${this.scanUrl}/tx/${transactionResponse.hash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Transaction Details
          </Link>
        </span>
      );

      return transactionResponse;
    }

    return undefined;
  }
}

export default EVM;
