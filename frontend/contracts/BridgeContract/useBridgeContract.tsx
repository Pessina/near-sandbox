import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { BridgeContract, UTXO } from "./types";
import { useQuery } from "@tanstack/react-query";
import { NEAR_MAX_GAS } from "@/constants/near";
import { ChainSignaturesContract } from "multichain-tools";
import { useEnv } from "@/hooks/useEnv";
import { BN } from "bn.js";
import axios from "axios";
import { Chain, CHAINS } from "@/constants/chains";
import { useKeyPairAuth } from "@/providers/KeyPairAuthProvider";
import { createBridgeContract } from "./BridgeContract";

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

export function useBridgeContract(): BridgeActions {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { nearNetworkId, chainSignatureContract } = useEnv();

  const [bridgeContract, setBridgeContract] = useState<BridgeContract>()
  const { selectedAccount } = useKeyPairAuth()
  const { bridgeContract: bridgeContractAccountId } = useEnv()

  useEffect(() => {
    if (!selectedAccount) return

    const contract = createBridgeContract({
      account: selectedAccount,
      contractId: bridgeContractAccountId
    })
    setBridgeContract(contract)
  }, [selectedAccount, bridgeContractAccountId])

  const withErrorHandling = useCallback(
    async (
      operation: () => Promise<any>,
      errorPrefix: string
    ) => {
      if (isProcessing) return;
      setIsProcessing(true);
      try {
        const result = await operation();
        toast({
          title: "Success",
          description: (
            <div>
              <a
                href={result.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View transaction on explorer
              </a>
            </div>
          ),
        });
        return result;
      } catch (error) {
        toast({
          title: "Error",
          description: `${errorPrefix}: ${error instanceof Error ? error.message : String(error)
            }`,
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, toast]
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

          const txHex = await bridgeContract.swap_btc({
            gas: NEAR_MAX_GAS,
            amount: totalFee?.toString() || "0",
            args: {
              input_utxos: inputUtxos,
              output_utxos: outputUtxos,
              sender_public_key: senderPublicKey,
            },
          });

          const response = await axios.post<string>(
            `${CHAINS[Chain.BTC].rpcEndpoint}/tx`,
            txHex
          );

          if (response.status === 200 && response.data) {
            const explorerUrl = `${CHAINS[Chain.BTC].explorerUrl}/tx/${response.data
              }`;
            return {
              txHash: response.data,
              explorerUrl,
            };
          }

          throw new Error(`Failed to broadcast transaction: ${response.data}`);
        },
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
