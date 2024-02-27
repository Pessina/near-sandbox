import * as bitcoin from "bitcoinjs-lib";
import axios from "axios";
import crypto from "crypto";
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

  async fetchBalance(address: string): Promise<string> {
    const utxos = await this.fetchUTXOs(address);
    return utxos.reduce((acc, utxo) => acc + utxo.value, 0).toString();
  }

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

  async fetchTransaction(transactionId: string): Promise<Transaction> {
    const response = await axios.get(`${this.rpcEndpoint}tx/${transactionId}`);
    return response.data;
  }

  static deriveCanhazgasMPCAddress(
    predecessor: string,
    path: string
  ): { address: string; publicKey: Buffer } {
    function constructSpoofKey(predecessor: string, path: string): Buffer {
      const data = Buffer.from(`${predecessor},${path}`);
      const hash = bitcoin.crypto.sha256(data);
      return hash;
    }

    function getBitcoinAddress(
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

    return getBitcoinAddress(predecessor, path);
  }

  constructRawSignatureFromRS(r: string, s: string): Buffer {
    // Remove the '0x' prefix
    r = r.slice(2);
    s = s.slice(2);

    // Ensure both r and s are 64 characters (32 bytes) long
    r = r.padStart(64, "0");
    s = s.padStart(64, "0");

    // Concatenate r and s, and convert to a Buffer
    const rawSignature = Buffer.from(r + s, "hex");

    // Ensure the resulting Buffer is exactly 64 bytes long
    if (rawSignature.length !== 64) {
      throw new Error("Invalid signature length.");
    }

    return rawSignature;
  }

  async createTransaction(
    data: {
      toAddress: string;
      amountToSend: number;
    },
    account: Account,
    derivedPath: string,
    contract: "production" | "canhazgas"
  ) {
    const { address, publicKey } = Bitcoin.deriveCanhazgasMPCAddress(
      account.accountId,
      derivedPath
    );

    console.log(address, publicKey);

    const utxos = await this.fetchUTXOs(address);
    const feeRate = await this.fetchFeeRate();

    const psbt = new bitcoin.Psbt({ network: this.network });

    let totalInput = 0;
    await Promise.all(
      utxos.map(async (utxo) => {
        totalInput += utxo.value;

        const transactionData = await this.fetchTransaction(utxo.txid);
        const tx = new bitcoin.Transaction();

        tx.version = transactionData.version;
        tx.locktime = transactionData.locktime;

        transactionData.vin.forEach((vin) => {
          const txHash = Buffer.from(vin.txid, "hex").reverse();
          const vout = vin.vout;
          const scriptSig = Buffer.alloc(0); // scriptsig is empty for segwit inputs
          const sequence = vin.sequence;
          tx.addInput(txHash, vout, sequence, scriptSig);
        });

        transactionData.vout.forEach((vout) => {
          const value = vout.value; // Make sure this is in satoshis
          const scriptPubKey = Buffer.from(vout.scriptpubkey, "hex");
          tx.addOutput(scriptPubKey, value);
        });

        // For segwit transactions, we need to add the witness
        transactionData.vin.forEach((vin, index) => {
          if (vin.witness && vin.witness.length > 0) {
            const witness = vin.witness.map((w) => Buffer.from(w, "hex"));
            tx.setWitness(index, witness);
          }
        });

        // Serialize the transaction to a Buffer
        const nonWitnessUtxo = tx.toBuffer();

        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          nonWitnessUtxo,
        });
      })
    );

    psbt.addOutput({
      address: data.toAddress,
      value: data.amountToSend,
    });

    const estimatedSize = utxos.length * 148 + 2 * 34 + 10;
    const fee = estimatedSize * feeRate;

    const change = totalInput - data.amountToSend - fee;
    if (change > 0) {
      psbt.addOutput({
        address: address,
        value: change,
      });
    }

    console.log(psbt.data.inputs);

    const mpcKeyPair = {
      publicKey,
      sign: async (transactionHash: Buffer): Promise<Buffer> => {
        const signature = await signMPC(
          account,
          Array.from(ethers.utils.arrayify(transactionHash)),
          derivedPath
        );

        if (!signature) {
          console.error("Failed to sign transaction");
          return Buffer.alloc(0);
        }

        return Buffer.from(
          this.constructRawSignatureFromRS(signature?.r, signature?.s)
        );
      },
    };

    await Promise.all(
      utxos.map(async (_, index) => {
        await psbt.signInputAsync(index, mpcKeyPair);
      })
    );

    psbt.finalizeAllInputs();

    const txHex = psbt.extractTransaction().toHex();

    try {
      const proxyUrl = "https://corsproxy.io/?";
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

    console.log(`Transaction Fee: ${fee} satoshis`);
  }
}
