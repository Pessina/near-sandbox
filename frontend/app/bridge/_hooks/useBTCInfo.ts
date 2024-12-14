"use client";

import { useState } from "react";
import { Chain, CHAINS } from "@/constants/chains";

interface UTXO {
  txid: string;
  vout: number;
  value: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
  tx?: {
    txid: string;
    version: number;
    locktime: number;
    vin: {
      txid: string;
      vout: number;
      prevout: {
        scriptpubkey: string;
        scriptpubkey_asm: string;
        scriptpubkey_type: string;
        scriptpubkey_address: string;
        value: number;
      };
      scriptsig: string;
      scriptsig_asm: string;
      witness: string[];
      is_coinbase: boolean;
      sequence: number;
    }[];
    vout: {
      scriptpubkey: string;
      scriptpubkey_asm: string;
      scriptpubkey_type: string;
      scriptpubkey_address: string;
      value: number;
    }[];
    size: number;
    weight: number;
    sigops?: number;
    fee: number;
    status: {
      confirmed: boolean;
      block_height?: number;
      block_hash?: string;
      block_time?: number;
    };
  };
}

interface BTCInfo {
  feeRate: number;
  utxos: UTXO[];
  balance: number;
}

export function useBTCInfo() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getBTCInfo = async (address: string): Promise<BTCInfo> => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch fee rate from mempool.space testnet API
      const feeResponse = await fetch(
        `${CHAINS[Chain.BTC].rpcEndpoint}/v1/fees/recommended`
      );
      if (!feeResponse.ok) throw new Error("Failed to fetch fee data");
      const feeData = await feeResponse.json();

      // Fetch UTXOs from mempool.space testnet API
      const utxoResponse = await fetch(
        `${CHAINS[Chain.BTC].rpcEndpoint}/address/${address}/utxo`
      );
      if (!utxoResponse.ok) throw new Error("Failed to fetch UTXO data");
      const utxoData: UTXO[] = await utxoResponse.json();

      const utxosWithTx = await Promise.all(
        utxoData.map(async (utxo) => {
          const txResponse = await fetch(
            `${CHAINS[Chain.BTC].rpcEndpoint}/tx/${utxo.txid}`
          );
          if (!txResponse.ok)
            throw new Error(`Failed to fetch tx data for ${utxo.txid}`);
          const txData = await txResponse.json();
          return {
            ...utxo,
            tx: txData,
          };
        })
      );

      const balance = utxosWithTx.reduce((sum, utxo) => sum + utxo.value, 0);

      return {
        feeRate: feeData.hourFee,
        utxos: utxosWithTx,
        balance,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch BTC info";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getBTCInfo,
    isLoading,
    error,
  };
}
