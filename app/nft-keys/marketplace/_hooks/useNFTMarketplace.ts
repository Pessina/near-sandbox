import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { NFTKeysContract } from "../../_contract/NFTKeysContract/types";
import { NFTListed, FormData } from "../types";
import { Chain } from "@/constants/chains";
import { parseTokenAmount } from "../_utils/chains";
import {
  ONE_YOCTO_NEAR,
  NEAR_MAX_GAS,
  MOCK_KRNL,
} from "../../_contract/constants";
import { useMultiChainTransaction } from "@/hooks/useMultiChainTransaction";
import { useEnv } from "@/hooks/useEnv";
import { ethers } from "ethers";

interface UseNFTMarketplaceProps {
  nftContract: NFTKeysContract | null;
  accountId: string;
  onSuccess?: () => Promise<void>;
}

export function useNFTMarketplace({
  nftContract,
  accountId,
  onSuccess,
}: UseNFTMarketplaceProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { signEvmTransaction, signBtcTransaction, signCosmosTransaction } =
    useMultiChainTransaction();
  const { nftKeysMarketplaceContract } = useEnv();

  const withErrorHandling = useCallback(
    async (
      operation: () => Promise<void>,
      successMessage: string,
      errorPrefix: string
    ) => {
      if (isProcessing) return;
      setIsProcessing(true);
      try {
        await operation();
        toast({
          title: "Success",
          description: successMessage,
        });
        await onSuccess?.();
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

  const handleListNFT = useCallback(
    async (data: FormData) => {
      if (!nftContract || !data.saleConditions.amount) return;

      const amount = parseTokenAmount(
        data.saleConditions.amount,
        data.saleConditions.token as Chain
      );

      await withErrorHandling(
        async () => {
          await nftContract.nft_approve({
            args: {
              token_id: data.tokenId,
              account_id: nftKeysMarketplaceContract,
              msg: JSON.stringify({
                path: data.path,
                token: data.token,
                sale_conditions: {
                  token: data.saleConditions.token,
                  amount,
                },
              }),
            },
            amount: ONE_YOCTO_NEAR,
          });
        },
        `NFT Key ${data.tokenId} listed successfully`,
        "Failed to list NFT"
      );
    },
    [nftContract, nftKeysMarketplaceContract, withErrorHandling]
  );

  const handleOfferNFT = useCallback(
    async (purchaseTokenId: string, offerTokenId: string) => {
      if (!nftContract) return;

      await withErrorHandling(
        async () => {
          await nftContract.nft_approve({
            args: {
              token_id: offerTokenId,
              account_id: nftKeysMarketplaceContract,
              msg: JSON.stringify({
                token_id: purchaseTokenId,
                krnl_payload: MOCK_KRNL,
              }),
            },
            amount: ONE_YOCTO_NEAR,
            gas: NEAR_MAX_GAS,
          });
        },
        `Offer submitted for NFT Key ${purchaseTokenId}`,
        "Failed to submit offer"
      );
    },
    [nftContract, nftKeysMarketplaceContract, withErrorHandling]
  );

  // TODO: The path should not be hardcoded
  const handleTransaction = useCallback(
    async (
      nft: NFTListed,
      derivedAddressAndPublicKey: { address: string; publicKey: string },
      data: { to: string; value: string; chain: Chain }
    ) => {
      try {
        let res: any;
        switch (data.chain) {
          case Chain.ETH:
            res = await signEvmTransaction(
              {
                from: derivedAddressAndPublicKey.address,
                to: data.to,
                value: ethers.parseEther(data.value).toString(),
              },
              "",
              nft.token_id
            );
            break;
          case Chain.BTC:
            res = await signBtcTransaction(
              {
                from: derivedAddressAndPublicKey.address,
                publicKey: derivedAddressAndPublicKey.publicKey,
                to: data.to,
                value: data.value,
              },
              "",
              nft.token_id
            );
            break;
          case Chain.OSMOSIS:
            res = await signCosmosTransaction(
              {
                address: derivedAddressAndPublicKey.address,
                publicKey: derivedAddressAndPublicKey.publicKey,
                messages: [
                  {
                    typeUrl: "/cosmos.bank.v1beta1.MsgSend",
                    value: {
                      toAddress: data.to,
                      amount: [{ denom: "uosmo", amount: data.value }],
                    },
                  },
                ],
              },
              "",
              nft.token_id
            );
            break;
          default:
            throw new Error(`Unsupported chain: ${data.chain}`);
        }
        toast({
          title: "Transaction Sent",
          description: "Your transaction has been successfully sent.",
          duration: 5000,
        });
        console.log(res);
      } catch (e) {
        console.error("Transaction failed:", e);
        toast({
          title: "Transaction Failed",
          description:
            e instanceof Error ? e.message : "An unknown error occurred",
          variant: "destructive",
          duration: 5000,
        });
      }
    },
    [signEvmTransaction, signBtcTransaction, signCosmosTransaction, toast]
  );

  return {
    isProcessing,
    handleListNFT,
    handleOfferNFT,
    handleTransaction,
  };
}
