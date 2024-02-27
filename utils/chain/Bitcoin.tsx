import * as bitcoin from "bitcoinjs-lib";
import axios from "axios";
import { signMPC } from "../contract/signer";
import { ethers } from "ethers";
import { Account } from "near-api-js";
import ECPairFactory from "ecpair";
import ecc from "@bitcoinerlab/secp256k1";

type Transaction = {
  txid: string;
  version: number;
  locktime: number;
  size: number;
  weight: number;
  fee: number;
  vin: Array<{
    txid: string;
    vout: number;
    is_coinbase: boolean;
    scriptsig: string;
    scriptsig_asm: string;
    inner_redeemscript_asm: string;
    inner_witnessscript_asm: string;
    sequence: number;
    witness: string[];
    prevout: any; // Keeping it as any to simplify, replace with actual type if known
    is_pegin: boolean;
    issuance: any; // Keeping it as any to simplify, replace with actual type if known
  }>;
  vout: Array<{
    scriptpubkey: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    scriptpubkey_address: string;
    value: number;
    valuecommitment: string;
    asset: string;
    assetcommitment: string;
    pegout: any; // Keeping it as any to simplify, replace with actual type if known
  }>;
  status: {
    confirmed: boolean;
    block_height: number | null;
    block_hash: string | null;
    block_time: number | null;
  };
};
export class Bitcoin {
  private network: bitcoin.networks.Network;
  private rpcEndpoint: string;

  constructor(config: {
    networkType: "bitcoin" | "testnet";
    rpcEndpoint: string;
  }) {
    this.network =
      config.networkType === "testnet"
        ? bitcoin.networks.testnet
        : bitcoin.networks.bitcoin;
    this.rpcEndpoint = config.rpcEndpoint;
  }

  /**
   * Fetches the balance for a given Bitcoin address.
   * This function retrieves all unspent transaction outputs (UTXOs) for the address,
   * sums their values to calculate the total balance, and returns it as a string.
   *
   * @param {string} address - The Bitcoin address for which to fetch the balance.
   * @returns {Promise<string>} A promise that resolves to the balance of the address as a string.
   */
  async fetchBalance(address: string): Promise<string> {
    const utxos = await this.fetchUTXOs(address);
    return utxos.reduce((acc, utxo) => acc + utxo.value, 0).toString();
  }

  /**
   * Fetches the Unspent Transaction Outputs (UTXOs) for a given Bitcoin address.
   * UTXOs are important for understanding the available balance of a Bitcoin address
   * and are necessary for constructing new transactions.
   *
   * @param {string} address - The Bitcoin address for which to fetch the UTXOs.
   * @returns {Promise<Array<{ txid: string; vout: number; value: number }>>} A promise that resolves to an array of UTXOs.
   * Each UTXO is represented as an object containing the transaction ID (`txid`), the output index within that transaction (`vout`),
   * and the value of the output in satoshis (`value`).
   */
  async fetchUTXOs(
    address: string
  ): Promise<Array<{ txid: string; vout: number; value: number }>> {
    try {
      const response = await axios.get(
        `${this.rpcEndpoint}address/${address}/utxo`
      );
      const utxos = response.data.map((utxo: any) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.value,
      }));
      return utxos;
    } catch (error) {
      console.error("Failed to fetch UTXOs:", error);
      return [];
    }
  }

  /**
   * Fetches the current fee rate from the Bitcoin network.
   * This method queries the RPC endpoint for fee estimates and returns the fee rate
   * expected for a transaction to be confirmed within a certain number of blocks.
   * The confirmation target is set to 6 blocks by default, which is commonly used
   * for a balance between confirmation time and cost.
   *
   * @returns {Promise<number>} A promise that resolves to the fee rate in satoshis per byte.
   * @throws {Error} Throws an error if the fee rate data for the specified confirmation target is missing.
   */
  async fetchFeeRate(): Promise<number> {
    const response = await axios.get(`${this.rpcEndpoint}fee-estimates`);
    const confirmationTarget = 6;
    if (response.data && response.data[confirmationTarget]) {
      return response.data[confirmationTarget];
    } else {
      throw new Error(
        `Fee rate data for ${confirmationTarget} blocks confirmation target is missing in the response`
      );
    }
  }

  /**
   * Fetches a Bitcoin transaction by its ID and constructs a transaction object.
   * This function retrieves the transaction details from the blockchain using the RPC endpoint,
   * then parses the input and output data to construct a `bitcoin.Transaction` object.
   *
   * @param {string} transactionId - The ID of the transaction to fetch.
   * @returns {Promise<bitcoin.Transaction>} A promise that resolves to a `bitcoin.Transaction` object representing the fetched transaction.
   */
  async fetchTransaction(transactionId: string): Promise<bitcoin.Transaction> {
    
    const { data } = await axios.get<Transaction>(
      `${this.rpcEndpoint}tx/${transactionId}`
    );
    const tx = new bitcoin.Transaction();

    
    tx.version = data.version;
    tx.locktime = data.locktime;

    
    data.vin.forEach((vin) => {
      const txHash = Buffer.from(vin.txid, "hex").reverse(); 
      const vout = vin.vout; 
      const scriptSig = Buffer.alloc(0); 
      const sequence = vin.sequence; 
      tx.addInput(txHash, vout, sequence, scriptSig); 
    });

    data.vout.forEach((vout) => {
      const value = vout.value;
      const scriptPubKey = Buffer.from(vout.scriptpubkey, "hex");
      tx.addOutput(scriptPubKey, value);
    });
  
    
    data.vin.forEach((vin, index) => {
      if (vin.witness && vin.witness.length > 0) {
        const witness = vin.witness.map((w) => Buffer.from(w, "hex")); 
        tx.setWitness(index, witness); 
      }
    });

    return tx; 
  }

  /**
   * Derives a spoofed Bitcoin address and public key for testing purposes using a Multi-Party Computation (MPC) approach.
   * This method simulates the derivation of a Bitcoin address and public key from a given predecessor and path,
   * using a spoofed key generation process. It is intended for use in test environments where actual Bitcoin transactions
   * are not feasible.
   *
   * @param {string} predecessor - A string representing the initial input or seed for the spoofed key generation.
   * @param {string} path - A derivation path that influences the final generated spoofed key.
   * @returns {{ address: string; publicKey: Buffer }} An object containing the derived spoofed Bitcoin address and public key.
   */
  static deriveCanhazgasMPCAddressAndPublicKey(
    predecessor: string,
    path: string
  ): { address: string; publicKey: Buffer } {
    
    function constructSpoofKey(predecessor: string, path: string): Buffer {
      const data = Buffer.from(`${predecessor},${path}`);
      const hash = bitcoin.crypto.sha256(data);
      return hash;
    }

    function getBitcoinAddressAndPublicKey(
      predecessor: string,
      path: string
    ): { address: string; publicKey: Buffer } {
      const ECPair = ECPairFactory(ecc);

      const spoofedPrivateKey = constructSpoofKey(predecessor, path);

      const keyPair = ECPair.fromPrivateKey(spoofedPrivateKey, {
        network: bitcoin.networks.testnet,
      });

      const { address } = bitcoin.payments.p2pkh({
        pubkey: keyPair.publicKey,
        network: bitcoin.networks.testnet,
      });

      if (!address) {
        throw new Error("Failed to derive MPC address");
      }

      return { address, publicKey: keyPair.publicKey };
    }

    return getBitcoinAddressAndPublicKey(predecessor, path);
  }

  /**
   * Joins the r and s components of a signature into a single Buffer.
   * This function takes an object containing the r and s components of a signature,
   * pads them to ensure they are each 64 characters long, concatenates them,
   * and then converts the concatenated string into a Buffer. This Buffer represents
   * the full signature in hexadecimal format. If the resulting Buffer is not exactly
   * 64 bytes long, an error is thrown.
   *
   * @param {Object} signature - An object containing the r and s components of a signature.
   * @param {string} signature.r - The r component of the signature.
   * @param {string} signature.s - The s component of the signature.
   * @returns {Buffer} A Buffer representing the concatenated r and s components of the signature.
   * @throws {Error} Throws an error if the resulting Buffer is not exactly 64 bytes long.
   */
  static joinSignature(signature: { r: string; s: string }): Buffer {
    const r = signature.r.padStart(64, "0");
    const s = signature.s.padStart(64, "0");

    const rawSignature = Buffer.from(r + s, "hex");

    if (rawSignature.length !== 64) {
      throw new Error("Invalid signature length.");
    }

    return rawSignature;
  }

  /**
   * Sends a signed transaction to the Bitcoin network.
   * This function takes the hexadecimal representation of a signed transaction
   * and broadcasts it to the network using a proxy URL to bypass CORS restrictions.
   * It logs the transaction ID if the broadcast is successful, or an error message otherwise.
   *
   * @param {string} txHex - The hexadecimal string of the signed transaction.
   * @param {Object} [options] - Optional parameters.
   * @param {boolean} [options.proxy=false] - Whether to use a proxy URL for the transaction broadcast.
   * @returns {Promise<void>} A promise that resolves once the transaction is successfully broadcast.
   */
  async sendTransaction(txHex: string, options?: { proxy?:boolean }): Promise<void> {
    try {
      const proxyUrl = options?.proxy ? "https://corsproxy.io/?" : '';
      const broadcastResult = await axios.post(
        `${proxyUrl}${this.rpcEndpoint}tx`,
        txHex
      );

      if (broadcastResult.status === 200) {
        console.log(
          `Transaction successfully broadcasted. TXID: ${broadcastResult.data}`
        );
      } else {
        console.error("Failed to broadcast transaction:", broadcastResult.data);
      }
    } catch (error) {
      console.error("Error broadcasting transaction:", error);
    }
  }

  async handleTransaction(
    data: {
      to: string;
      value: number;
    },
    account: Account,
    derivedPath: string,
  ) {
    const { address, publicKey } = Bitcoin.deriveCanhazgasMPCAddressAndPublicKey(
      account.accountId,
      derivedPath
    );

    const utxos = await this.fetchUTXOs(address);
    const feeRate = await this.fetchFeeRate();

    const psbt = new bitcoin.Psbt({ network: this.network });

    let totalInput = 0;
    await Promise.all(
      utxos.map(async (utxo) => {
        totalInput += utxo.value;

        const transaction = await this.fetchTransaction(utxo.txid);
        const nonWitnessUtxo = transaction.toBuffer();

        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          nonWitnessUtxo,
        });
      })
    );

    psbt.addOutput({
      address: data.to,
      value: data.value,
    });

    const estimatedSize = utxos.length * 148 + 2 * 34 + 10;
    const fee = estimatedSize * feeRate;

    const change = totalInput - data.value - fee;
    if (change > 0) {
      psbt.addOutput({
        address: address,
        value: change,
      });
    }

    const mpcKeyPair = {
      publicKey,
      sign: async (transactionHash: Buffer): Promise<Buffer> => {
        const signature = await signMPC(
          account,
          Array.from(ethers.utils.arrayify(transactionHash)),
          derivedPath
        );

        if (!signature) {
          throw new Error("Failed to sign transaction");
        }

        return Buffer.from(Bitcoin.joinSignature(signature));
      },
    };

    await Promise.all(
      utxos.map(async (_, index) => {
        await psbt.signInputAsync(index, mpcKeyPair);
      })
    );

    psbt.finalizeAllInputs();
    await this.sendTransaction(psbt.extractTransaction().toHex(), {proxy: true})
  }
}
