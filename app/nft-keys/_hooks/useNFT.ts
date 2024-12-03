import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { NFTKeysContract } from "../_contract/NFTKeysContract/types";
import { ONE_YOCTO_NEAR, NEAR_MAX_GAS } from "../_contract/constants";
import { parseNearAmount } from "near-api-js/lib/utils/format";

export interface FormData {
  tokenId: string;
  accountId: string;
  amount?: string;
  action: string;
  path?: string;
  payload?: string;
  msg?: string;
  approvalId?: string;
  memo?: string;
}

export interface UseNFTProps {
  nftContract: NFTKeysContract | null;
  onSuccess?: () => Promise<void>;
  accountId?: string;
}

export interface NFTActions {
  isProcessing: boolean;
  handleMint: () => Promise<void>;
  handleGetPublicKey: (data: FormData) => Promise<string | undefined>;
  handleSignHash: (data: FormData) => Promise<void>;
  handleApprove: (data: FormData) => Promise<void>;
  handleCheckApproval: (data: FormData) => Promise<void>;
  handleRevoke: (data: FormData) => Promise<void>;
  handleRevokeAll: (data: FormData) => Promise<void>;
  handleTransfer: (data: FormData) => Promise<void>;
  handleStorageDeposit: (amount: string) => Promise<void>;
  handleStorageWithdraw: (amount: string) => Promise<void>;
}

export function useNFT({
  nftContract,
  accountId,
  onSuccess,
}: UseNFTProps): NFTActions {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

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

  const handleMint = useCallback(async () => {
    if (!nftContract) return;
    await withErrorHandling(
      async () => await nftContract.mint(),
      "NFT minted successfully",
      "Failed to mint NFT"
    );
  }, [nftContract, withErrorHandling]);

  const handleGetPublicKey = useCallback(
    async (data: FormData): Promise<string | undefined> => {
      if (!nftContract || !data.tokenId) return;
      return await withErrorHandling(
        async () =>
          await nftContract.ckt_public_key_for({
            args: {
              token_id: data.tokenId,
              path: data.path,
            },
          }),
        "Public key retrieved",
        "Failed to get public key"
      );
    },
    [nftContract, withErrorHandling]
  );

  const handleSignHash = useCallback(
    async (data: FormData) => {
      const payload = data.payload;
      if (!nftContract || !data.tokenId || !payload) return;

      await withErrorHandling(
        async () => {
          const payloadArray = payload.split(",").map((num) => parseInt(num));
          return await nftContract.ckt_sign_hash({
            args: {
              token_id: data.tokenId,
              path: data.path,
              payload: payloadArray,
              approval_id: data.approvalId
                ? parseInt(data.approvalId)
                : undefined,
            },
            gas: NEAR_MAX_GAS,
            amount: parseNearAmount("0.005") ?? "0",
          });
        },
        "Hash signed successfully",
        "Failed to sign hash"
      );
    },
    [nftContract, withErrorHandling]
  );

  const handleApprove = useCallback(
    async (data: FormData) => {
      if (!nftContract || !data.tokenId || !data.accountId) return;
      await withErrorHandling(
        async () =>
          await nftContract.nft_approve({
            args: {
              token_id: data.tokenId,
              account_id: data.accountId,
              msg: data.msg,
            },
            amount: ONE_YOCTO_NEAR,
          }),
        "Approval successful",
        "Failed to approve"
      );
    },
    [nftContract, withErrorHandling]
  );

  const handleCheckApproval = useCallback(
    async (data: FormData) => {
      if (!nftContract || !data.tokenId || !data.accountId) return;
      await withErrorHandling(
        async () =>
          await nftContract.nft_is_approved({
            token_id: data.tokenId,
            approved_account_id: data.accountId,
            approval_id: data.approvalId
              ? parseInt(data.approvalId)
              : undefined,
          }),
        "Approval check completed",
        "Failed to check approval"
      );
    },
    [nftContract, withErrorHandling]
  );

  const handleRevoke = useCallback(
    async (data: FormData) => {
      if (!nftContract || !data.tokenId || !data.accountId) return;
      await withErrorHandling(
        async () =>
          await nftContract.nft_revoke({
            args: {
              token_id: data.tokenId,
              account_id: data.accountId,
            },
            amount: ONE_YOCTO_NEAR,
          }),
        "Approval revoked successfully",
        "Failed to revoke approval"
      );
    },
    [nftContract, withErrorHandling]
  );

  const handleRevokeAll = useCallback(
    async (data: FormData) => {
      if (!nftContract || !data.tokenId) return;
      await withErrorHandling(
        async () =>
          await nftContract.nft_revoke_all({
            args: {
              token_id: data.tokenId,
            },
            amount: ONE_YOCTO_NEAR,
          }),
        "All approvals revoked successfully",
        "Failed to revoke all approvals"
      );
    },
    [nftContract, withErrorHandling]
  );

  const handleTransfer = useCallback(
    async (data: FormData) => {
      if (!nftContract || !data.tokenId || !data.accountId) return;
      await withErrorHandling(
        async () =>
          await nftContract.nft_transfer({
            args: {
              receiver_id: data.accountId,
              token_id: data.tokenId,
              approval_id: data.approvalId
                ? parseInt(data.approvalId)
                : undefined,
              memo: data.memo,
            },
            amount: ONE_YOCTO_NEAR,
          }),
        "Transfer successful",
        "Failed to transfer NFT"
      );
    },
    [nftContract, withErrorHandling]
  );

  const handleStorageDeposit = useCallback(
    async (amount: string) => {
      if (!nftContract || !amount) return;
      const amountNumber = parseNearAmount(amount);
      if (!amountNumber || !accountId) return;

      await withErrorHandling(
        async () =>
          await nftContract.storage_deposit({
            args: {
              account_id: accountId,
              registration_only: false,
            },
            amount: amountNumber,
          }),
        "Storage deposit successful",
        "Failed to deposit storage"
      );
    },
    [accountId, nftContract, withErrorHandling]
  );

  const handleStorageWithdraw = useCallback(
    async (amount: string) => {
      if (!nftContract || !amount) return;
      const amountNumber = parseNearAmount(amount);
      if (!amountNumber) return;

      await withErrorHandling(
        async () =>
          await nftContract.storage_withdraw({
            args: { amount: amountNumber },
            amount: ONE_YOCTO_NEAR,
          }),
        "Storage withdrawal successful",
        "Failed to withdraw storage"
      );
    },
    [nftContract, withErrorHandling]
  );

  return {
    isProcessing,
    handleMint,
    handleGetPublicKey,
    handleSignHash,
    handleApprove,
    handleCheckApproval,
    handleRevoke,
    handleRevokeAll,
    handleTransfer,
    handleStorageDeposit,
    handleStorageWithdraw,
  };
}
