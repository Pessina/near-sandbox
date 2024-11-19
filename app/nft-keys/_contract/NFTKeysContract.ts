import { Contract, Account } from "near-api-js";
import { NFTKeysContract } from "./types";

export class NFTKeysContractClient {
  private contract: NFTKeysContract;

  constructor({
    account,
    contractId,
  }: {
    account: Account;
    contractId: string;
  }) {
    this.contract = new Contract(account, contractId, {
      viewMethods: [
        "storage_balance_of",
        "nft_metadata",
        "nft_token",
        "nft_tokens",
        "nft_tokens_for_owner",
      ],
      changeMethods: [
        "new",
        "mint",
        "storage_deposit",
        "storage_withdraw",
        "storage_unregister",
        "nft_transfer",
      ],
      useLocalViewExecution: false,
    }) as unknown as NFTKeysContract;
  }

  async new(args: { signer_contract_id: string }): Promise<void> {
    return await this.contract.new({ args });
  }

  async mint(): Promise<number> {
    return await this.contract.mint();
  }

  async getStorageBalanceOf(
    accountId: string
  ): Promise<{ total: string; available: string } | null> {
    return await this.contract.storage_balance_of({
      account_id: accountId,
    });
  }

  async storageDeposit(
    accountId: string,
    registrationOnly: boolean,
    gas: string,
    deposit: string
  ): Promise<{ total: string; available: string }> {
    return await this.contract.storage_deposit({
      args: { account_id: accountId, registration_only: registrationOnly },
      gas,
      amount: deposit,
    });
  }

  async storageUnregister(args: { force?: boolean }): Promise<boolean> {
    return await this.contract.storage_unregister({ args });
  }

  async storageWithdraw(
    amount?: string
  ): Promise<{ total: string; available: string }> {
    return await this.contract.storage_withdraw({ amount });
  }

  async nftTokens(args: {
    from_index?: string;
    limit?: number;
  }): Promise<any[]> {
    return await this.contract.nft_tokens(args);
  }

  async nftTokensForOwner(args: {
    account_id: string;
    from_index: string;
    limit: number;
  }): Promise<any[]> {
    return await this.contract.nft_tokens_for_owner(args);
  }
}
