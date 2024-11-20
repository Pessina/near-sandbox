import { Contract, Account } from "near-api-js";
import { NFTKeysContract } from "./types";

const createNFTContract = (args: { account: Account; contractId: string }) => {
  return new Contract(args.account, args.contractId, {
    viewMethods: [
      "storage_balance_of",
      "nft_metadata",
      "nft_token",
      "nft_tokens",
      "nft_tokens_for_owner",
      "ckt_public_key_for",
      "nft_is_approved",
    ],
    changeMethods: [
      "new",
      "mint",
      "storage_deposit",
      "storage_withdraw",
      "storage_unregister",
      "nft_transfer",
      "nft_transfer_call",
      "nft_approve",
      "nft_revoke",
      "nft_revoke_all",
      "ckt_sign_hash",
    ],
    useLocalViewExecution: false,
  }) as unknown as NFTKeysContract;
};

export { createNFTContract };
