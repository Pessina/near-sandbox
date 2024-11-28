import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { NFTKeysContract } from "../../_contract/NFTKeysContract/types";
import { NFTListed, FormData, TransactionData, DerivedKeys } from "../types";
import { Chain } from "@/constants/chains";
import { parseTokenAmount } from "../_utils/chains";
import { ONE_YOCTO_NEAR, NEAR_MAX_GAS } from "../../_contract/constants";
import { KeyDerivationPath } from "multichain-tools";
import { useMultiChainTransaction } from "@/hooks/useMultiChainTransaction";
import { useEnv } from "@/hooks/useEnv";

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
    async (purchaseTokenId: string, offerTokenId: string, path: string) => {
      if (!nftContract) return;

      await withErrorHandling(
        async () => {
          await nftContract.nft_approve({
            args: {
              token_id: offerTokenId,
              account_id: nftKeysMarketplaceContract,
              msg: JSON.stringify({
                token_id: purchaseTokenId,
                path,
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

  const handleTransaction = useCallback(
    async (
      nft: NFTListed,
      derivedAddressAndPublicKey: { address: string; publicKey: string },
      data: { to: string; value: string }
    ) => {
      if (!nft.path || !nft.token) {
        throw new Error("Missing path or token information");
      }

      const path = nft.path as KeyDerivationPath;
      const baseRequest = {
        from: derivedAddressAndPublicKey.address,
        to: data.to,
        value: data.value,
        publicKey: derivedAddressAndPublicKey.publicKey,
      };

      let txOutcome;
      switch (nft.token) {
        case Chain.ETH:
          // case Chain.BNB:
          txOutcome = await signEvmTransaction(baseRequest, path);
          break;
        case Chain.BTC:
          txOutcome = await signBtcTransaction(
            {
              ...baseRequest,
            },
            path
          );
          break;
        case Chain.OSMOSIS:
          txOutcome = await signCosmosTransaction(
            {
              ...baseRequest,
              address: accountId,
              messages: [],
            },
            path
          );
          break;
        default:
          throw new Error(`Unsupported token: ${nft.token}`);
      }
    },
    [accountId, signEvmTransaction, signBtcTransaction, signCosmosTransaction]
  );

  return {
    isProcessing,
    handleListNFT,
    handleOfferNFT,
    handleTransaction,
  };
}
