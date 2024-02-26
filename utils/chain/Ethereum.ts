import { UnsignedTransaction, ethers } from "ethers";
import { ec as EC } from "elliptic";
import bs58 from "bs58";
import BN from "bn.js";
import crypto from "crypto";

class Ethereum {
  provider: ethers.providers.JsonRpcProvider;
  wallet: ethers.Wallet;

  /**
   * Initializes an Ethereum object with a specified configuration.
   *
   * @param {object} config - The configuration object for the Ethereum instance.
   * @param {string} [config.providerUrl] - Optional. The URL for the Ethereum JSON RPC provider. Defaults to the NEXT_PUBLIC_INFURA_URL environment variable if not specified.
   */
  constructor(config: { providerUrl?: string }) {
    this.provider = new ethers.providers.JsonRpcProvider(
      config.providerUrl || process.env.NEXT_PUBLIC_INFURA_URL
    );

    const hdNode = ethers.utils.HDNode.fromMnemonic(
      process.env.NEXT_PUBLIC_ETH_MNEMONIC!
    );
    const path = "m/44'/60'/0'/0/0";
    const privateKey = hdNode.derivePath(path).privateKey;

    this.wallet = new ethers.Wallet(privateKey, this.provider);
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
  async sendSignedTransaction(
    transaction: UnsignedTransaction,
    signature: string
  ): Promise<ethers.providers.TransactionResponse> {
    try {
      const serializedTransaction = ethers.utils.serializeTransaction(
        transaction,
        ethers.utils.joinSignature(signature)
      );
      return this.provider.sendTransaction(serializedTransaction);
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
    transaction: Omit<ethers.providers.TransactionRequest, "from"> & {
      from: string;
    }
  ): Promise<UnsignedTransaction> {
    const gasPrice = await this.provider.getGasPrice();
    const gasLimit = await this.provider.estimateGas(transaction);
    const nonce = await this.provider.getTransactionCount(
      transaction.from,
      "latest"
    );

    const { from, ...rest } = transaction;

    return {
      ...rest,
      gasLimit: ethers.utils.hexlify(gasLimit),
      gasPrice: ethers.utils.hexlify(gasPrice),
      chainId: this.provider.network.chainId,
      nonce,
      type: 0,
    };
  }

  /**
   * Fetches the balance of the given Ethereum address.
   *
   * This method uses the current provider to query the balance of the specified address.
   * The balance is returned in ethers as a string.
   *
   * @param {string} address - The Ethereum address to fetch the balance for.
   * @returns {Promise<string>} The balance of the address in ethers.
   */
  async getBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error(`Failed to fetch balance for address ${address}:`, error);
      throw new Error("Failed to fetch balance.");
    }
  }

  /**
   * Derives an Ethereum address from a given signer ID, derivation path, and public key.
   *
   * This method combines the provided signer ID and path to generate an epsilon value,
   * which is then used to derive a new public key. The Ethereum address is then computed
   * from this derived public key.
   *
   * @param {string} signerId - The unique identifier of the signer.
   * @param {string} path - The derivation path.
   * @param {string} publicKey - The public key in base58 format.
   * @returns {string} The derived Ethereum address.
   *
   * @example
   * const signerId = "felipe.near";
   * const path = ",ethereum,near.org";
   * const publicKey = "secp256k1:37aFybhUHCxRdDkuCcB3yHzxqK7N8EQ745MujyAQohXSsYymVeHzhLxKvZ2qYeRHf3pGFiAsxqFJZjpF9gP2JV5u";
   * const address = deriveAddress(signerId, path, publicKey);
   * console.log(address); // 0x...
   */
  static deriveProductionAddress(
    signerId: string,
    path: string,
    publicKey: string
  ): string {
    const EPSILON_DERIVATION_PREFIX =
      "near-mpc-recovery v0.1.0 epsilon derivation:";

    const secp256k1 = new EC("secp256k1");

    function deriveEpsilon(signerId: string, path: string): string {
      const derivationPath = `${EPSILON_DERIVATION_PREFIX}${signerId},${path}`;
      const hash = crypto.createHash("sha256").update(derivationPath).digest();
      const ret = new BN(hash, "le").toString("hex");

      return ret;
    }

    function deriveKey(publicKeyStr: string, epsilon: string): string {
      const base58PublicKey = publicKeyStr.split(":")[1];

      const decodedPublicKey = Buffer.from(
        bs58.decode(base58PublicKey)
      ).toString("hex");

      const publicKey = secp256k1.keyFromPublic("04" + decodedPublicKey, "hex");
      const derivedPoint = publicKey.getPublic().add(secp256k1.g.mul(epsilon));
      const derivedPublicKey = derivedPoint.encode("hex", false);

      return derivedPublicKey;
    }

    function deriveEthAddress(derivedPublicKeyStr: string): string {
      const publicKeyNoPrefix = derivedPublicKeyStr.startsWith("04")
        ? derivedPublicKeyStr.substring(2)
        : derivedPublicKeyStr;
      const hash = ethers.utils.keccak256(
        Buffer.from(publicKeyNoPrefix, "hex")
      );

      return "0x" + hash.substring(hash.length - 40);
    }

    const epsilon = deriveEpsilon(signerId, path);
    const derivedKey = deriveKey(publicKey, epsilon);
    const address = deriveEthAddress(derivedKey);

    return address;
  }

  /**
   * Derives a fake MPC (Multi-Party Computation) address for testing purposes.
   * This method simulates the derivation of an Ethereum address from a given signer ID and path,
   * using a spoofed key generation process.
   *
   * @param {string} signerId - The unique identifier of the signer.
   * @param {string} path - The derivation path used for generating the address.
   * @returns {string} A promise that resolves to the derived Ethereum address.
   */
  static deriveCanhazgasMPCAddress(signerId: string, path: string): string {
    function constructSpoofKey(
      predecessor: string,
      path: string
    ): ethers.utils.SigningKey {
      const data = ethers.utils.toUtf8Bytes(`${predecessor},${path}`);
      const hash = ethers.utils.sha256(data);
      const signingKey = new ethers.utils.SigningKey(hash);
      return signingKey;
    }

    function getEvmAddress(predecessor: string, path: string): string {
      const signingKey = constructSpoofKey(predecessor, path);
      const publicKey = signingKey.publicKey;
      const evmAddress = ethers.utils.computeAddress(publicKey);
      return evmAddress;
    }

    return getEvmAddress(signerId, path);
  }
}

export default Ethereum;
