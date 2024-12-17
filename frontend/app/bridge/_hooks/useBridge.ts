import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { BridgeContract, UTXO } from "../../../contracts/BridgeContract/types";
import { useQuery } from "@tanstack/react-query";
import { NEAR_MAX_GAS } from "@/contracts/constants";
import { ChainSignaturesContract } from "multichain-tools";
import { useEnv } from "@/hooks/useEnv";
import { BN } from "bn.js";

export interface UseBridgeProps {
  bridgeContract: BridgeContract | null;
  onSuccess?: () => Promise<void>;
}

export interface BridgeActions {
  isProcessing: boolean;
  handleSwapBTC: (args: {
    inputUtxos: UTXO[];
    outputUtxos: UTXO[];
    senderPublicKey: string;
  }) => Promise<string>;
  isLoading: boolean;
  error: Error | null;
}

export function useBridge({
  bridgeContract,
  onSuccess,
}: UseBridgeProps): BridgeActions {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { nearNetworkId, chainSignatureContract } = useEnv();

  const withErrorHandling = useCallback(
    async (
      operation: () => Promise<any>,
      successMessage: string,
      errorPrefix: string
    ) => {
      if (isProcessing) return;
      setIsProcessing(true);
      try {
        const result = await operation();
        toast({
          title: "Success",
          description:
            successMessage + (result ? `: ${JSON.stringify(result)}` : ""),
        });
        await onSuccess?.();
        return result;
      } catch (error) {
        toast({
          title: "Error",
          description: `${errorPrefix}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, onSuccess, toast]
  );

  const handleSwapBTC = useCallback(
    async ({
      inputUtxos,
      outputUtxos,
      senderPublicKey,
    }: {
      inputUtxos: UTXO[];
      outputUtxos: UTXO[];
      senderPublicKey: string;
    }) => {
      if (!bridgeContract) {
        throw new Error("Bridge contract not available");
      }

      return await withErrorHandling(
        async () => {
          const fee = await ChainSignaturesContract.getCurrentFee({
            networkId: nearNetworkId,
            contract: chainSignatureContract,
          });

          const totalFee = fee?.mul(new BN(inputUtxos.length));

          return await bridgeContract.swap_btc({
            gas: NEAR_MAX_GAS,
            amount: totalFee?.toString() || "0",
            args: {
              input_utxos: inputUtxos,
              output_utxos: outputUtxos,
              sender_public_key: senderPublicKey,
            },
          });
        },
        "BTC swap initiated successfully",
        "Failed to initiate BTC swap"
      );
    },
    [bridgeContract, withErrorHandling]
  );

  const { isLoading, error } = useQuery({
    queryKey: ["bridge"],
    queryFn: async () => {
      if (!bridgeContract) throw new Error("Bridge contract not available");
      return null;
    },
    enabled: !!bridgeContract,
  });

  return {
    isProcessing,
    handleSwapBTC,
    isLoading,
    error,
  };
}
