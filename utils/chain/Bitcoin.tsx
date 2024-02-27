import * as bitcoin from "bitcoinjs-lib";
import axios from "axios";
import crypto from "crypto";
import { signMPC } from "../contract/signer";
import { ethers } from "ethers";
import { Account } from "near-api-js";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";

const ECPair = ECPairFactory(ecc);

export class Bitcoin {
  private network: bitcoin.networks.Network;
  private explorerUrl: string;

  constructor(config: {
    networkType: "bitcoin" | "testnet";
    explorerUrl: string;
  }) {
    this.network =
      config.networkType === "testnet"
        ? bitcoin.networks.testnet
        : bitcoin.networks.bitcoin;
    this.explorerUrl = config.explorerUrl;
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
        `${this.explorerUrl}address/${address}/utxo`
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
    const response = await axios.get(`${this.explorerUrl}fee-estimates`);
    const confirmationTarget = 6;
    if (response.data && response.data[confirmationTarget]) {
      return response.data[confirmationTarget];
    } else {
      throw new Error(
        `Fee rate data for ${confirmationTarget} blocks confirmation target is missing in the response`
      );
    }
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
      const spoofedPrivateKey = constructSpoofKey(predecessor, path);

      const keyPair = ECPair.fromPrivateKey(spoofedPrivateKey, {
        network: bitcoin.networks.bitcoin,
      });

      const { address } = bitcoin.payments.p2pkh({
        pubkey: keyPair.publicKey,
        network: bitcoin.networks.bitcoin,
      });

      if (!address) {
        throw new Error("Failed to derive MPC address");
      }

      return { address, publicKey: keyPair.publicKey };
    }

    return getBitcoinAddress(predecessor, path);
  }

  constructDERFromRS(r: string, s: string) {
    const rBuffer = Buffer.from(r, "hex");
    const sBuffer = Buffer.from(s, "hex");

    const signatureBuffer = Buffer.concat([rBuffer, sBuffer]);

    const derSignature = bitcoin.script.signature.encode(signatureBuffer, 0x01);

    const derSignatureHex = derSignature.slice(0, -1).toString("hex");

    return derSignatureHex;
  }

  async createTransaction(
    data: {
      fromAddress: string;
      toAddress: string;
      amountToSend: number;
      changeAddress: string;
    },
    account: Account,
    derivedPath: string,
    contract: "production" | "canhazgas"
  ) {
    const utxos = await this.fetchUTXOs(data.fromAddress);
    const feeRate = await this.fetchFeeRate();

    const psbt = new bitcoin.Psbt({ network: this.network });

    let totalInput = 0;
    utxos.forEach((utxo) => {
      totalInput += utxo.value;
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo: Buffer.alloc(0),
      });
    });

    psbt.addOutput({
      address: data.toAddress,
      value: data.amountToSend,
    });

    const estimatedSize = utxos.length * 148 + 2 * 34 + 10;
    const fee = estimatedSize * feeRate;

    const change = totalInput - data.amountToSend - fee;
    if (change > 0) {
      psbt.addOutput({
        address: data.changeAddress,
        value: change,
      });
    }

    const { address, publicKey } = Bitcoin.deriveCanhazgasMPCAddress(
      account.accountId,
      derivedPath
    );

    console.log(address, publicKey);

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

        return Buffer.from(this.constructDERFromRS(signature?.r, signature?.s));
      },
    };

    utxos.forEach((_, index) => {
      psbt.signInputAsync(index, mpcKeyPair);
    });
    psbt.finalizeAllInputs();

    const txHex = psbt.extractTransaction().toHex();

    console.log(`Transaction Fee: ${fee} satoshis`);
    // console.log(`Transaction Hex: ${txHex}`);
  }
}
