import { Contract } from "near-api-js";

// Types
type ContractChangeMethodArgs<T = void> = {
  args?: T;
  gas?: string;
  amount?: string;
};

type StorageBalanceResult = {
  total: string;
  available: string;
};

type SaleCondition = {
  token: string;
  amount: number;
};

type Sale = {
  owner_id: string;
  approval_id: number;
  nft_contract_id: string;
  token_id: string;
  sale_conditions: SaleCondition;
};

type Payout = {
  payout: Record<string, string>;
};

export type NFTKeysMarketplaceContract = Contract & {
  new: (
    args: ContractChangeMethodArgs<{
      owner_id: string;
    }>
  ) => Promise<void>;

  storage_deposit: (
    args: ContractChangeMethodArgs<{
      account_id?: string;
    }>
  ) => Promise<StorageBalanceResult>;

  storage_withdraw: (
    args: ContractChangeMethodArgs<{}>
  ) => Promise<StorageBalanceResult>;

  storage_minimum_balance: () => Promise<string>;

  storage_balance_of: (args: { account_id: string }) => Promise<string>;

  get_supply_sales: () => Promise<string>;

  get_supply_by_owner_id: (args: { account_id: string }) => Promise<string>;

  get_sales_by_owner_id: (args: {
    account_id: string;
    from_index?: string;
    limit?: number;
  }) => Promise<Sale[]>;

  get_supply_by_nft_contract_id: (args: {
    nft_contract_id: string;
  }) => Promise<string>;

  get_sales_by_nft_contract_id: (args: {
    nft_contract_id: string;
    from_index?: string;
    limit?: number;
  }) => Promise<Sale[]>;

  get_sale: (args: { nft_contract_token: string }) => Promise<Sale | null>;

  list_nft_for_sale: (
    args: ContractChangeMethodArgs<{
      nft_contract_id: string;
      token_id: string;
      approval_id: number;
      sale_conditions: SaleCondition;
    }>
  ) => Promise<void>;

  remove_sale: (
    args: ContractChangeMethodArgs<{
      nft_contract_id: string;
      token_id: string;
    }>
  ) => Promise<void>;

  offer: (
    args: ContractChangeMethodArgs<{
      nft_contract_id: string;
      token_id: string;
      offer_price: SaleCondition;
    }>
  ) => Promise<void>;
};
