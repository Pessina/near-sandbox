"use client";

import { useState } from "react";
import { chainsConfig } from "@/constants/chains";

interface UTXO {
  txid: string;
  vout: number;
  value: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_time?: number;
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
        `${chainsConfig.btc.rpcEndpoint}/v1/fees/recommended`
      );
      if (!feeResponse.ok) throw new Error("Failed to fetch fee data");
      const feeData = await feeResponse.json();

      // Fetch UTXOs from mempool.space testnet API
      const utxoResponse = await fetch(
        `${chainsConfig.btc.rpcEndpoint}/address/${address}/utxo`
      );
      if (!utxoResponse.ok) throw new Error("Failed to fetch UTXO data");
      const utxoData: UTXO[] = await utxoResponse.json();

      // Calculate total balance from UTXOs
      const balance = utxoData.reduce((sum, utxo) => sum + utxo.value, 0);

      return {
        feeRate: feeData.hourFee, // Using hourly fee rate
        utxos: utxoData,
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
