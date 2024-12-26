import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { BridgeContract, BitcoinTransactionRequest, EvmTransactionRequest } from "./types";
import { useQuery } from "@tanstack/react-query";
import { NEAR_MAX_GAS } from "@/constants/near";
import { useEnv } from "@/hooks/useEnv";
import { BN } from "bn.js";
import axios from "axios";
import { Chain, CHAINS } from "@/constants/chains";
import { useKeyPairAuth } from "@/providers/KeyPairAuthProvider";
import { createBridgeContract } from "./BridgeContract";
import { useChainSignaturesContract } from "@/hooks/useChainSignaturesContracts";

export interface BridgeActions {
  isProcessing: boolean;
  handleSignBTC: (args: BitcoinTransactionRequest) => Promise<string>;
  handleSignEVM: (args: EvmTransactionRequest) => Promise<string>;
  handleSwapBTCKrnl: (args: {
    auth: string;
    sender: string;
    recipient: string;
    kernel_response: string;
  }) => Promise<string>;
  isLoading: boolean;
  error: Error | null;
}

export function useBridgeContract(): BridgeActions {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { nearNetworkId, chainSignatureContract } = useEnv();
  const chainSignaturesContract = useChainSignaturesContract();

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

  const handleSignBTC = useCallback(
    async (args: BitcoinTransactionRequest) => {
      if (!bridgeContract) {
        throw new Error("Bridge contract not available");
      }

      return await withErrorHandling(
        async () => {
          const fee = await chainSignaturesContract.getCurrentSignatureDeposit();
          const totalFee = fee?.mul(new BN(args.inputs.length));

          const txHex = await bridgeContract.sign_btc({
            gas: NEAR_MAX_GAS,
            amount: totalFee?.toString() || "0",
            args,
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

  const handleSignEVM = useCallback(
    async (tx: EvmTransactionRequest) => {
      if (!bridgeContract) {
        throw new Error("Bridge contract not available");
      }

      return await withErrorHandling(
        async () => {
          const fee = await chainSignaturesContract.getCurrentSignatureDeposit();

          const txHex = await bridgeContract.sign_evm({
            gas: NEAR_MAX_GAS,
            amount: fee?.toString() || "0",
            args: tx,
          });

          const response = await axios.post<string>(
            `${CHAINS[Chain.ETH].providerUrl}`,
            {
              jsonrpc: "2.0",
              method: "eth_sendRawTransaction",
              params: [txHex],
              id: 1
            }
          );

          if (response.status === 200 && response.data) {
            const explorerUrl = `${CHAINS[Chain.ETH].explorerUrl}/tx/${response.data}`;
            return {
              txHash: response.data,
              explorerUrl,
            };
          }

          throw new Error(`Failed to broadcast transaction: ${response.data || 'Unknown error'}`);
        },
        "Failed to initiate EVM swap"
      );
    },
    [bridgeContract, withErrorHandling]
  );

  const handleSwapBTCKrnl = useCallback(
    async (args: {
      auth: string;
      sender: string;
      recipient: string;
      kernel_response: string;
    }) => {
      if (!bridgeContract) {
        throw new Error("Bridge contract not available");
      }

      return await withErrorHandling(
        async () => {
          const fee = await chainSignaturesContract.getCurrentSignatureDeposit();

          const txHex = await bridgeContract.swap_btc_krnl({
            gas: NEAR_MAX_GAS,
            amount: fee?.toString() || "0",
            args,
          });

          const response = await axios.post<string>(
            `${CHAINS[Chain.BTC].rpcEndpoint}/tx`,
            txHex
          );

          if (response.status === 200 && response.data) {
            const explorerUrl = `${CHAINS[Chain.BTC].explorerUrl}/tx/${response.data}`;
            return {
              txHash: response.data,
              explorerUrl,
            };
          }

          throw new Error(`Failed to broadcast transaction: ${response.data || 'Unknown error'}`);
        },
        "Failed to initiate BTC Kernel swap"
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
    handleSignBTC,
    handleSignEVM,
    handleSwapBTCKrnl,
    isLoading,
    error,
  };
}
