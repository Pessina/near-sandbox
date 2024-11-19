import { Contract } from "near-api-js";

type ContractChangeMethodArgs<T = void> = {
  args?: T;
  gas?: string;
  amount?: string;
};

type StorageBalanceResult = {
  total: string;
  available: string;
};

export type NFTKeysContract = Contract & {
  new: (
    args: ContractChangeMethodArgs<{
      signer_contract_id: string;
    }>
  ) => Promise<void>;

  mint: () => Promise<number>;

  nft_metadata: (args: { token_id?: string }) => Promise<any>;

  nft_token: (args: { token_id: string }) => Promise<any>;

  nft_tokens: (args: { from_index?: string; limit?: number }) => Promise<any[]>;

  nft_tokens_for_owner: (args: {
    account_id: string;
    from_index: string;
    limit: number;
  }) => Promise<any[]>;

  nft_transfer: (args: {
    receiver_id: string;
    token_id: string;
    approval_id?: number;
    memo?: string;
  }) => Promise<void>;

  storage_balance_of: (args: {
    account_id: string;
  }) => Promise<StorageBalanceResult | null>;

  storage_deposit: (
    args: ContractChangeMethodArgs<{
      account_id: string;
      registration_only: boolean;
    }> &
      Required<Pick<ContractChangeMethodArgs, "gas" | "amount">>
  ) => Promise<StorageBalanceResult>;

  storage_unregister: (
    args: ContractChangeMethodArgs<{
      force?: boolean;
    }>
  ) => Promise<boolean>;

  storage_withdraw: (
    args: ContractChangeMethodArgs<{
      amount?: string;
    }>
  ) => Promise<StorageBalanceResult>;
};
