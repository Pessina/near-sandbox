"use client";

import { useState } from "react";
import { usePublicClient } from "wagmi";
import { decodeAbiParameters, formatEther } from "viem";
import { Chain, CHAIN_CONFIGS } from "@/constants/chains";

export type DecodedTxData = {
  from: `0x${string}`;
  to: string;
  chain: Chain;
  amount: string;
} | null;

export function useGetTxData() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const publicClient = usePublicClient();

  const getTxData = async (txHash: string): Promise<DecodedTxData> => {
    try {
      setError("");
      setIsLoading(true);

      if (!txHash) {
        throw new Error("Please enter a transaction hash");
      }

      const tx = await publicClient?.getTransaction({
        hash: txHash as `0x${string}`,
      });

      if (!tx?.input) {
        throw new Error("No data field found in transaction");
      }

      const decoded = decodeAbiParameters(
        [
          { name: "to", type: "string" },
          { name: "chain", type: "uint256" },
        ],
        tx?.input as `0x${string}`
      );

      const chainId = Number(decoded[1]);
      const chain = Object.entries(CHAIN_CONFIGS).find(
        ([_, config]) => config.chainId === chainId
      )?.[0] as Chain;

      if (!chain) {
        throw new Error("Invalid chain ID");
      }

      return {
        from: tx.from,
        to: decoded[0],
        chain,
        amount: formatEther(tx.value),
      };
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to decode transaction"
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getTxData,
    isLoading,
    error,
  };
}
