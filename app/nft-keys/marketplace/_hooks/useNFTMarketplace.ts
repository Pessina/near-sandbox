import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { NFT, NFTKeysContract } from "../../_contract/NFTKeysContract/types";
import { NFTListed, FormData } from "../types";
import { Chain } from "@/constants/chains";
import { parseTokenAmount } from "../_utils/chains";
import {
  ONE_YOCTO_NEAR,
  NEAR_MAX_GAS,
  KrnlPayload,
  MOCK_KRNL,
} from "../../_contract/constants";
import { useMultiChainWalletTransaction } from "@/hooks/useMultiChainWalletTransaction";
import { useEnv } from "@/hooks/useEnv";
import { ethers } from "ethers";
import { getBalanceBTC, getBalanceETH } from "../_krnl/getBalance";
import { parseNearAmount } from "near-api-js/lib/utils/format";
import { NFTKeysMarketplaceContract } from "../../_contract/NFTKeysMarketplaceContract";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface ListNFTArgs {
  data: FormData;
}

export interface OfferNFTArgs {
  purchaseTokenId: string;
  offerTokenId: string;
  address: string;
}

export interface TransactionArgs {
  nft: NFTListed;
  derivedAddressAndPublicKey: {
    address: string;
    publicKey: string;
  };
  data: {
    to: string;
    value: string;
    chain: Chain;
  };
}

export interface RemoveListingArgs {
  nft: NFTListed;
}

export interface StorageDepositArgs {
  amount: string;
}

export interface UseNFTMarketplaceProps {
  nftContract: NFTKeysContract | null;
  marketplaceContract: NFTKeysMarketplaceContract | null;
  onSuccess?: () => Promise<void>;
  accountId?: string;
}

export interface NFTMarketplaceActions {
  isProcessing: boolean;
  handleListNFT: (args: ListNFTArgs) => Promise<void>;
  handleOfferNFT: (args: OfferNFTArgs) => Promise<void>;
  handleTransaction: (args: TransactionArgs) => Promise<void>;
  handleRemoveListing: (args: RemoveListingArgs) => Promise<void>;
  handleRegisterMarketplace: () => Promise<void>;
  handleAddStorage: (args: StorageDepositArgs) => Promise<void>;
  handleWithdrawStorage: () => Promise<void>;
  handleMint: () => Promise<void>;
  ownedNfts: NFT[];
  listedNfts: NFTListed[];
  isRegistered: boolean;
  storageBalance: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useNFTMarketplace({
  nftContract,
  marketplaceContract,
  onSuccess,
  accountId,
}: UseNFTMarketplaceProps): NFTMarketplaceActions {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { signEvmTransaction, signBtcTransaction, signCosmosTransaction } =
    useMultiChainWalletTransaction();
  const { nftKeysMarketplaceContract } = useEnv();
  const queryClient = useQueryClient();

  const {
    data: marketplaceData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["marketplaceData", accountId],
    queryFn: async () => {
      if (!nftContract || !marketplaceContract || !accountId) {
        throw new Error("Required contracts or account not available");
      }

      const [allNfts, userNfts, sales, storageBalance] = await Promise.all([
        nftContract.nft_tokens({ from_index: "0", limit: 100 }),
        nftContract.nft_tokens_for_owner({
          account_id: accountId,
          from_index: "0",
          limit: 100,
        }),
        marketplaceContract.get_sales_by_nft_contract_id({
          nft_contract_id: process.env.NEXT_PUBLIC_NFT_KEYS_CONTRACT!,
          from_index: "0",
          limit: 100,
        }),
        marketplaceContract.storage_balance_of({ account_id: accountId }),
      ]);

      const listedNftsWithPrice: NFTListed[] = await Promise.all(
        sales.map(async (sale) => {
          const nft = allNfts.find((nft) => nft.token_id === sale.token_id);
          if (!nft || !sale) return null;
          return {
            ...nft,
            approved_account_ids: nft.approved_account_ids,
            saleConditions: {
              amount: sale.sale_conditions.amount.toString(),
              token: sale.sale_conditions.token || "",
            },
            token: sale.token,
            path: sale.path,
          };
        })
      ).then((results) =>
        results.flatMap((item) => (item !== null ? [item] : []))
      );

      const ownedNftsWithPrice = userNfts
        .filter((nft) => nft.owner_id === accountId)
        .map((nft) => {
          const listedNft = listedNftsWithPrice.find(
            (listed) => listed.token_id === nft.token_id
          );
          return listedNft
            ? {
                ...nft,
                saleConditions: listedNft.saleConditions,
                token: listedNft.token,
                path: listedNft.path,
              }
            : nft;
        });

      return {
        ownedNfts: ownedNftsWithPrice,
        listedNfts: listedNftsWithPrice,
        isRegistered: storageBalance !== null && storageBalance !== "0",
        storageBalance,
      };
    },
    enabled: !!nftContract && !!marketplaceContract && !!accountId,
    refetchOnWindowFocus: false,
  });

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
        await queryClient.invalidateQueries({
          queryKey: ["marketplaceData", accountId],
        });
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
    [isProcessing, onSuccess, toast, queryClient, accountId]
  );

  const handleListNFT = useCallback(
    async ({ data }: ListNFTArgs) => {
      if (!nftContract || !data.saleConditions.amount) return;

      const amount = parseTokenAmount(
        data.saleConditions.amount,
        data.saleConditions.token as Chain
      );

      await withErrorHandling(
        async () => {
          // Not ideal but temporary solution - check if approved, revoke and approve again
          const isApproved = await nftContract.nft_is_approved({
            token_id: data.tokenId,
            approved_account_id: nftKeysMarketplaceContract,
          });

          if (isApproved) {
            await nftContract.nft_revoke({
              args: {
                token_id: data.tokenId,
                account_id: nftKeysMarketplaceContract,
              },
              amount: ONE_YOCTO_NEAR,
            });
          }

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
    async ({ purchaseTokenId, offerTokenId, address }: OfferNFTArgs) => {
      if (!nftContract) return;

      let res: any;
      if (address.startsWith("0x")) {
        res = await getBalanceETH(address);
      } else {
        res = await getBalanceBTC(address);
      }

      if (!res.result) {
        throw new Error("Failed to get balance");
      }

      const krnlPayload: KrnlPayload = {
        auth: {
          auth: res.result.auth,
          kernel_responses: res.result.kernel_responses,
          kernel_param_objects: res.result.kernel_params,
        },
        sender: "0x4174678c78fEaFd778c1ff319D5D326701449b25",
        function_params:
          "0x00000000000000000000000000000000000000000000000000000000000000640000000000000000000000000000000000000000000000000000000000000001",
      };

      await withErrorHandling(
        async () => {
          // Not ideal but temporary solution - check if approved, revoke and approve again
          const isApproved = await nftContract.nft_is_approved({
            token_id: offerTokenId,
            approved_account_id: nftKeysMarketplaceContract,
          });

          if (isApproved) {
            await nftContract.nft_revoke({
              args: {
                token_id: offerTokenId,
                account_id: nftKeysMarketplaceContract,
              },
              amount: ONE_YOCTO_NEAR,
            });
          }

          await nftContract.nft_approve({
            args: {
              token_id: offerTokenId,
              account_id: nftKeysMarketplaceContract,
              msg: JSON.stringify({
                token_id: purchaseTokenId,
                krnl_payload: krnlPayload,
                // krnl_payload: MOCK_KRNL,
                debug_disable_check: false,
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
    async ({ nft, derivedAddressAndPublicKey, data }: TransactionArgs) => {
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

  const handleRemoveListing = useCallback(
    async ({ nft }: RemoveListingArgs) => {
      if (!marketplaceContract || !nftContract) return;

      await withErrorHandling(
        async () => {
          await marketplaceContract.remove_sale({
            args: {
              nft_contract_id: process.env.NEXT_PUBLIC_NFT_KEYS_CONTRACT!,
              token_id: nft.token_id,
            },
            amount: ONE_YOCTO_NEAR,
          });
          await nftContract.nft_revoke({
            args: {
              token_id: nft.token_id,
              account_id:
                process.env.NEXT_PUBLIC_NFT_KEYS_MARKETPLACE_CONTRACT!,
            },
            amount: ONE_YOCTO_NEAR,
          });
        },
        `NFT Key ${nft.token_id} removed from marketplace`,
        "Failed to remove listing"
      );
    },
    [marketplaceContract, nftContract, withErrorHandling]
  );

  const handleRegisterMarketplace = useCallback(async () => {
    if (!marketplaceContract) return;

    await withErrorHandling(
      async () => {
        const storageMinimum =
          await marketplaceContract.storage_minimum_balance();
        await marketplaceContract.storage_deposit({
          args: {},
          amount: storageMinimum,
        });
      },
      "Successfully registered with marketplace",
      "Failed to register with marketplace"
    );
  }, [marketplaceContract, withErrorHandling]);

  const handleAddStorage = useCallback(
    async ({ amount }: StorageDepositArgs) => {
      if (!marketplaceContract) return;

      await withErrorHandling(
        async () => {
          await marketplaceContract.storage_deposit({
            args: {},
            amount: parseNearAmount(amount)!,
          });
        },
        `Added ${amount} NEAR to storage`,
        "Failed to add storage"
      );
    },
    [marketplaceContract, withErrorHandling]
  );

  const handleWithdrawStorage = useCallback(async () => {
    if (!marketplaceContract) return;

    await withErrorHandling(
      async () => {
        await marketplaceContract.storage_withdraw({
          args: {},
          amount: ONE_YOCTO_NEAR,
        });
      },
      "Storage withdrawn successfully",
      "Failed to withdraw storage"
    );
  }, [marketplaceContract, withErrorHandling]);

  const handleMint = useCallback(async () => {
    if (!nftContract) return;

    await withErrorHandling(
      async () => {
        await nftContract.mint();
      },
      "NFT minted successfully",
      "Failed to mint NFT"
    );
  }, [nftContract, withErrorHandling]);

  return {
    isProcessing,
    handleListNFT,
    handleOfferNFT,
    handleTransaction,
    handleRemoveListing,
    handleRegisterMarketplace,
    handleAddStorage,
    handleWithdrawStorage,
    handleMint,
    ownedNfts: marketplaceData?.ownedNfts ?? [],
    listedNfts: marketplaceData?.listedNfts ?? [],
    isRegistered: marketplaceData?.isRegistered ?? false,
    storageBalance: marketplaceData?.storageBalance ?? null,
    isLoading,
    error,
  };
}
